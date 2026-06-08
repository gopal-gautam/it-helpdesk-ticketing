import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private mailer: MailerService,
  ) {}

  async createComment(dto: CreateCommentDto, userId: string) {
    // Check if ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
      include: { requester: true, assignedAgent: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${dto.ticketId} not found`);
    }

    // Check if user has permission to comment on this ticket
    // Requesters can only comment on their own tickets
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.role) {
      throw new ForbiddenException('User or role not found');
    }

    if (user.role.name === 'REQUESTER' && ticket.requesterId !== userId) {
      throw new ForbiddenException('You can only comment on your own tickets');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        ticketId: dto.ticketId,
        authorId: userId,
      },
      include: {
        author: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'COMMENT_CREATED',
      entityType: 'COMMENT',
      entityId: comment.id,
      newValues: comment,
    });

    const isAgentReply = user.role.name !== 'REQUESTER';

    // First agent reply stamps the first-response time (for SLA + reporting).
    if (isAgentReply && !ticket.firstRespondedAt) {
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { firstRespondedAt: new Date() },
      });
    }

    // Email the other party about the new reply (best-effort).
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/tickets/${ticket.id}`;
    const html = (name: string) => `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <div style="background:#2563eb;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-weight:700">IT Helpdesk</div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 12px;font-size:18px">New reply on ${ticket.ticketNumber}</h2>
          <p>Hi ${name},</p>
          <p>${user.firstName} ${user.lastName} added a reply on <strong>${ticket.subject}</strong>:</p>
          <blockquote style="border-left:3px solid #2563eb;margin:12px 0;padding:4px 12px;color:#334155">${dto.content}</blockquote>
          <p><a href="${link}" style="color:#2563eb">View the ticket</a></p>
        </div>
      </div>`;

    if (isAgentReply && ticket.requester?.email) {
      void this.mailer.sendMail(ticket.requester.email, `[${ticket.ticketNumber}] New reply: ${ticket.subject}`, html(ticket.requester.firstName));
    } else if (!isAgentReply && ticket.assignedAgent?.email) {
      void this.mailer.sendMail(ticket.assignedAgent.email, `[${ticket.ticketNumber}] New reply: ${ticket.subject}`, html(ticket.assignedAgent.firstName));
    }

    return comment;
  }

  async findByTicket(ticketId: string) {
    return this.prisma.comment.findMany({
      where: { ticketId },
      include: {
        author: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
