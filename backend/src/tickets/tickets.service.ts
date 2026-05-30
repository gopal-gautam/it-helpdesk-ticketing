import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Priority, TicketStatus, TicketSource } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

  async createTicket(dto: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber();

    return this.prisma.ticket.create({
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

  async updateTicket(id: string, dto: UpdateTicketDto) {
    return this.prisma.ticket.update({
      where: { id },
      data: dto,
    });
  }

  async assignTicket(id: string, agentId: string, teamId?: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        assignedAgentId: agentId,
        teamId: teamId,
        status: TicketStatus.OPEN, // Auto-open when assigned
      },
    });
  }

  async resolveTicket(id: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }

  async closeTicket(id: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
    });
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
