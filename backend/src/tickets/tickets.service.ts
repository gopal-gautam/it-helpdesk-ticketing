import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Priority, TicketStatus, TicketSource } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

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

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService
  ) {}

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

    return ticket;
  }

  async findAll(params: {
    userId?: string;
    role?: string;
    status?: TicketStatus;
    priority?: Priority;
    categoryId?: string;
    search?: string;
  }) {
    const { userId, role, status, priority, categoryId, search } = params;

    let where: any = {};

    // RBAC filtering
    if (role === 'REQUESTER') {
      where.requesterId = userId;
    } else if (role === 'AGENT') {
      where = {
        OR: [
          { assignedAgentId: userId },
          { requesterId: userId },
        ],
      };
    } else if (role === 'TEAM_LEAD') {
      // Handled via team filtering usually, but we can let them see all by default or filter by team
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.ticket.findMany({
      where,
      include: {
        requester: { select: { firstName: true, lastName: true, email: true } },
        assignedAgent: { select: { firstName: true, lastName: true, email: true } },
        category: true,
        team: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: true,
        assignedAgent: true,
        category: true,
        team: true,
        comments: { orderBy: { createdAt: 'asc' } },
        internalNotes: { orderBy: { createdAt: 'asc' } },
        attachments: true,
        ticketHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async updateTicket(id: string, dto: UpdateTicketDto, userId: string) {
    const oldTicket = await this.prisma.ticket.findUnique({ where: { id } });

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: dto,
    });

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

  async assignTicket(id: string, agentId: string, userId: string, teamId?: string) {
    const oldTicket = await this.prisma.ticket.findUnique({ where: { id } });

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        assignedAgentId: agentId,
        teamId: teamId,
        status: TicketStatus.OPEN, // Auto-open when assigned
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'TICKET_ASSIGNED',
      entityType: 'TICKET',
      entityId: id,
      oldValues: oldTicket,
      newValues: ticket,
    });

    return ticket;
  }

  async resolveTicket(id: string, userId: string) {
    const oldTicket = await this.prisma.ticket.findUnique({ where: { id } });

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'TICKET_RESOLVED',
      entityType: 'TICKET',
      entityId: id,
      oldValues: oldTicket,
      newValues: ticket,
    });

    return ticket;
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
