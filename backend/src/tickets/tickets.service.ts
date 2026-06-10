import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Priority, TicketStatus, TicketSource } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailerService } from '../mailer/mailer.service';

import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';

// Allowed status transitions. Each key lists the statuses you may move TO from it.
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_ON_USER', 'WAITING_ON_THIRD_PARTY', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['OPEN', 'WAITING_ON_USER', 'WAITING_ON_THIRD_PARTY', 'RESOLVED', 'CANCELLED'],
  WAITING_ON_USER: ['IN_PROGRESS', 'OPEN', 'RESOLVED', 'CANCELLED'],
  WAITING_ON_THIRD_PARTY: ['IN_PROGRESS', 'OPEN', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'OPEN', 'IN_PROGRESS'], // reopening goes through reopenTicket
  CLOSED: ['OPEN', 'IN_PROGRESS'], // reopen only
  CANCELLED: ['OPEN'],
};

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsString()
  @IsNotEmpty()
  requesterId: string;

  @IsString()
  @IsOptional()
  teamId?: string;
}

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsString()
  @IsOptional()
  assignedAgentId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;
}

export class BulkActionDto {
  @IsArray()
  @IsString({ each: true })
  ticketIds: string[];

  @IsEnum(['ASSIGN', 'CLOSE', 'PRIORITY', 'STATUS'] as any)
  action: 'ASSIGN' | 'CLOSE' | 'PRIORITY' | 'STATUS';

  @IsString()
  @IsOptional()
  value?: string; // agentId for ASSIGN, Priority for PRIORITY, TicketStatus for STATUS
}

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private mailer: MailerService,
  ) {}

  // --- Email helpers (best-effort) ---
  private appUrl() {
    return process.env.APP_URL || 'http://localhost:3000';
  }

  private wrapHtml(title: string, body: string) {
    return `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <div style="background:#2563eb;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-weight:700">IT Helpdesk</div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
          ${body}
        </div>
      </div>`;
  }

  private ticketLink(id: string, label: string) {
    return `<a href="${this.appUrl()}/tickets/${id}" style="color:#2563eb">${label}</a>`;
  }

  async createTicket(dto: CreateTicketDto, userId: string) {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.prisma.ticket.create({
      data: {
        ...dto,
        ticketNumber,
        status: TicketStatus.NEW,
        source: TicketSource.PORTAL,
      },
      include: {
        category: true,
        requester: true,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'TICKET_CREATED',
      entityType: 'TICKET',
      entityId: ticket.id,
      newValues: ticket,
    });

    // Notify requester that their ticket was received.
    if (ticket.requester?.email) {
      void this.mailer.sendMail(
        ticket.requester.email,
        `[${ticket.ticketNumber}] Ticket received: ${ticket.subject}`,
        this.wrapHtml(
          'Your ticket has been received',
          `<p>Hi ${ticket.requester.firstName},</p>
           <p>We've logged your request <strong>${ticket.ticketNumber}</strong> and our team will respond shortly.</p>
           <p><strong>Subject:</strong> ${ticket.subject}<br/>
           <strong>Priority:</strong> ${ticket.priority}</p>
           <p>${this.ticketLink(ticket.id, 'View your ticket')}</p>`,
        ),
      );
    }

    return ticket;
  }

  async findAll(params: {
    userId?: string;
    role?: string;
    status?: TicketStatus;
    priority?: Priority;
    categoryId?: string;
    assignedAgentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, role, status, priority, categoryId, assignedAgentId, search, page = 1, limit = 20 } = params;
    const skip = (Number(page) - 1) * Number(limit);

    let where: any = {};

    if (role === 'REQUESTER') {
      where.requesterId = userId;
    } else if (role === 'AGENT') {
      where = { OR: [{ assignedAgentId: userId }, { requesterId: userId }] };
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (assignedAgentId) where.assignedAgentId = assignedAgentId;
    if (search) {
      const searchClause = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
      // Merge with existing OR if RBAC already set one
      where = where.OR
        ? { AND: [{ OR: where.OR }, { OR: searchClause }] }
        : { ...where, OR: searchClause };
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          requester: { select: { firstName: true, lastName: true, email: true } },
          assignedAgent: { select: { firstName: true, lastName: true, email: true } },
          category: true,
          team: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { tickets, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: true,
        assignedAgent: true,
        category: true,
        team: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { firstName: true, lastName: true, email: true } } },
        },
        internalNotes: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { firstName: true, lastName: true, email: true } } },
        },
        attachments: {
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        },
        ticketHistory: { orderBy: { createdAt: 'asc' } },
        customFieldValues: { include: { field: true } },
      },
    });
  }

  async updateTicket(id: string, dto: UpdateTicketDto, userId: string) {
    const oldTicket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { requester: true },
    });
    if (!oldTicket) throw new NotFoundException(`Ticket ${id} not found`);

    // Enforce the status lifecycle when status is being changed.
    if (dto.status && dto.status !== oldTicket.status) {
      const allowed = ALLOWED_TRANSITIONS[oldTicket.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot move ticket from ${oldTicket.status} to ${dto.status}`,
        );
      }
    }

    // Stamp lifecycle timestamps for terminal transitions.
    const data: any = { ...dto };
    if (dto.status === 'RESOLVED' && oldTicket.status !== 'RESOLVED') data.resolvedAt = new Date();
    if (dto.status === 'CLOSED' && oldTicket.status !== 'CLOSED') data.closedAt = new Date();

    const ticket = await this.prisma.ticket.update({ where: { id }, data });

    if (dto.status && dto.status !== oldTicket.status) {
      await this.recordHistory(id, userId, 'STATUS_CHANGED', 'status', oldTicket.status, dto.status);

      // Notify requester of meaningful status changes.
      if (oldTicket.requester?.email) {
        void this.mailer.sendMail(
          oldTicket.requester.email,
          `[${oldTicket.ticketNumber}] Status updated: ${dto.status.replace(/_/g, ' ')}`,
          this.wrapHtml(
            'Your ticket status changed',
            `<p>Hi ${oldTicket.requester.firstName},</p>
             <p>Ticket <strong>${oldTicket.ticketNumber}</strong> is now <strong>${dto.status.replace(/_/g, ' ')}</strong>.</p>
             <p>${this.ticketLink(id, 'View your ticket')}</p>`,
          ),
        );
      }
    }

    await this.auditLogService.log({
      userId,
      action: 'TICKET_UPDATED',
      entityType: 'TICKET',
      entityId: id,
      oldValues: oldTicket,
      newValues: ticket,
    });

    return ticket;
  }

  private async recordHistory(
    ticketId: string,
    actorId: string,
    action: string,
    fieldName?: string,
    oldValue?: string,
    newValue?: string,
  ) {
    await this.prisma.ticketHistory.create({
      data: { ticketId, actorId, action, fieldName, oldValue, newValue },
    });
  }

  async assignTicket(id: string, agentId: string, userId: string, teamId?: string) {
    const oldTicket = await this.prisma.ticket.findUnique({ where: { id } });

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        assignedAgentId: agentId,
        teamId: teamId,
        // Keep IN_PROGRESS/WAITING states; only bump NEW → OPEN on assignment.
        status: oldTicket?.status === TicketStatus.NEW ? TicketStatus.OPEN : oldTicket?.status,
      },
      include: { assignedAgent: true },
    });

    await this.recordHistory(id, userId, 'ASSIGNED', 'assignedAgentId', oldTicket?.assignedAgentId ?? '', agentId);

    await this.auditLogService.log({
      userId,
      action: 'TICKET_ASSIGNED',
      entityType: 'TICKET',
      entityId: id,
      oldValues: oldTicket,
      newValues: ticket,
    });

    // Notify the newly assigned agent.
    if (ticket.assignedAgent?.email && oldTicket?.assignedAgentId !== agentId) {
      void this.mailer.sendMail(
        ticket.assignedAgent.email,
        `[${ticket.ticketNumber}] Ticket assigned to you: ${ticket.subject}`,
        this.wrapHtml(
          'A ticket was assigned to you',
          `<p>Hi ${ticket.assignedAgent.firstName},</p>
           <p>You've been assigned ticket <strong>${ticket.ticketNumber}</strong>.</p>
           <p><strong>Subject:</strong> ${ticket.subject}<br/>
           <strong>Priority:</strong> ${ticket.priority}</p>
           <p>${this.ticketLink(id, 'Open the ticket')}</p>`,
        ),
      );
    }

    return ticket;
  }

  async resolveTicket(id: string, userId: string) {
    const oldTicket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { requester: true },
    });

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    await this.recordHistory(id, userId, 'STATUS_CHANGED', 'status', oldTicket?.status, 'RESOLVED');

    await this.auditLogService.log({
      userId,
      action: 'TICKET_RESOLVED',
      entityType: 'TICKET',
      entityId: id,
      oldValues: oldTicket,
      newValues: ticket,
    });

    if (oldTicket?.requester?.email) {
      void this.mailer.sendMail(
        oldTicket.requester.email,
        `[${oldTicket.ticketNumber}] Resolved: ${oldTicket.subject}`,
        this.wrapHtml(
          'Your ticket has been resolved',
          `<p>Hi ${oldTicket.requester.firstName},</p>
           <p>Ticket <strong>${oldTicket.ticketNumber}</strong> has been marked resolved. If your issue persists, reopen the ticket and we'll take another look.</p>
           <p>${this.ticketLink(id, 'View your ticket')}</p>`,
        ),
      );
    }

    return ticket;
  }

  /**
   * Reopen a RESOLVED or CLOSED ticket. Increments reopenCount and clears
   * resolution/close timestamps so SLA + reporting reflect the reopen.
   */
  async reopenTicket(id: string, userId: string) {
    const oldTicket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { requester: true },
    });
    if (!oldTicket) throw new NotFoundException(`Ticket ${id} not found`);
    if (oldTicket.status !== 'RESOLVED' && oldTicket.status !== 'CLOSED') {
      throw new BadRequestException('Only resolved or closed tickets can be reopened');
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.OPEN,
        reopenCount: { increment: 1 },
        reopenedAt: new Date(),
        resolvedAt: null,
        closedAt: null,
      },
    });

    await this.recordHistory(id, userId, 'REOPENED', 'status', oldTicket.status, 'OPEN');

    await this.auditLogService.log({
      userId,
      action: 'TICKET_REOPENED',
      entityType: 'TICKET',
      entityId: id,
      oldValues: oldTicket,
      newValues: ticket,
    });

    return ticket;
  }

  /** Per-agent open-ticket counts for the workload queue view. */
  async getAgentWorkload() {
    const openStatuses: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'WAITING_ON_THIRD_PARTY'];

    const agents = await this.prisma.user.findMany({
      where: { role: { name: { in: ['AGENT', 'TEAM_LEAD'] } } },
      select: { id: true, firstName: true, lastName: true, email: true, team: { select: { name: true } } },
    });

    const grouped = await this.prisma.ticket.groupBy({
      by: ['assignedAgentId', 'status'],
      where: { assignedAgentId: { not: null }, status: { in: openStatuses } },
      _count: { _all: true },
    });

    const unassigned = await this.prisma.ticket.count({
      where: { assignedAgentId: null, status: { in: openStatuses } },
    });

    const byAgent = agents.map((a) => {
      const rows = grouped.filter((g) => g.assignedAgentId === a.id);
      const byStatus: Record<string, number> = {};
      let open = 0;
      for (const r of rows) {
        byStatus[r.status] = r._count._all;
        open += r._count._all;
      }
      return {
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        email: a.email,
        team: a.team?.name ?? null,
        openCount: open,
        byStatus,
      };
    });

    byAgent.sort((x, y) => y.openCount - x.openCount);
    return { agents: byAgent, unassigned };
  }

  /** Apply one action to many tickets at once (agent/lead/admin tooling). */
  async bulkAction(dto: BulkActionDto, userId: string) {
    const { ticketIds, action, value } = dto;
    if (!ticketIds?.length) throw new BadRequestException('No tickets selected');

    let data: any = {};
    let auditAction = 'TICKET_BULK_UPDATED';

    switch (action) {
      case 'ASSIGN':
        if (!value) throw new BadRequestException('agentId required for ASSIGN');
        data = { assignedAgentId: value };
        auditAction = 'TICKET_BULK_ASSIGNED';
        break;
      case 'CLOSE':
        data = { status: TicketStatus.CLOSED, closedAt: new Date() };
        auditAction = 'TICKET_BULK_CLOSED';
        break;
      case 'PRIORITY':
        if (!value) throw new BadRequestException('priority required for PRIORITY');
        data = { priority: value as Priority };
        auditAction = 'TICKET_BULK_PRIORITY';
        break;
      case 'STATUS':
        if (!value) throw new BadRequestException('status required for STATUS');
        data = { status: value as TicketStatus };
        break;
      default:
        throw new BadRequestException('Unknown bulk action');
    }

    const result = await this.prisma.ticket.updateMany({
      where: { id: { in: ticketIds } },
      data,
    });

    await this.auditLogService.log({
      userId,
      action: auditAction,
      entityType: 'TICKET',
      entityId: ticketIds.join(','),
      newValues: { ...data, count: result.count },
    });

    return { updated: result.count };
  }

  async closeTicket(id: string, userId: string) {
    const oldTicket = await this.prisma.ticket.findUnique({ where: { id } });

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'TICKET_CLOSED',
      entityType: 'TICKET',
      entityId: id,
      oldValues: oldTicket,
      newValues: ticket,
    });

    return ticket;
  }

  private async generateTicketNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const count = await this.prisma.ticket.count({
      where: {
        ticketNumber: { startsWith: `HD-${year}-` },
      },
    });

    return `HD-${year}-${(count + 1).toString().padStart(6, '0')}`;
  }
}
