import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  leadId?: string;
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  leadId?: string;
}

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip,
        take: limit,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, email: true } },
          members: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { tickets: true, members: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.team.count({ where }),
    ]);

    return { teams, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } } },
        _count: { select: { tickets: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(dto: CreateTeamDto) {
    const existing = await this.prisma.team.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Team name already in use');
    return this.prisma.team.create({
      data: dto,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);
    return this.prisma.team.update({
      where: { id },
      data: dto,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async addMember(teamId: string, userId: string) {
    await this.findOne(teamId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { teamId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  async removeMember(teamId: string, userId: string) {
    await this.findOne(teamId);
    return this.prisma.user.update({
      where: { id: userId, teamId },
      data: { teamId: null },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }
}
