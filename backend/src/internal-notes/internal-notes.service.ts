import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class InternalNotesService {
  constructor(private prisma: PrismaService) {}

  async createNote(dto: CreateNoteDto, userId: string) {
    // Check if ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${dto.ticketId} not found`);
    }

    // Check if user is a requester
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.role) {
      throw new ForbiddenException('User or role not found');
    }

    if (user.role.name === 'REQUESTER') {
      throw new ForbiddenException('Requesters cannot create internal notes');
    }

    return this.prisma.internalNote.create({
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
    return this.prisma.internalNote.findMany({
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
