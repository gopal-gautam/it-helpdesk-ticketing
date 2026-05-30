import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async createComment(dto: CreateCommentDto, userId: string) {
    // Check if ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
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

    return this.prisma.comment.create({
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
