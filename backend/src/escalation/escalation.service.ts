import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Priority } from '@prisma/client';
import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsIn } from 'class-validator';

export class UpsertEscalationRuleDto {
  @IsString()
  name: string;

  @IsIn(['SLA_BREACH', 'PRIORITY'])
  triggerType: string;

  @IsEnum(Priority)
  @IsOptional()
  priorityThreshold?: Priority;

  @IsString()
  @IsOptional()
  slaBreachType?: string; // FIRST_RESPONSE | RESOLUTION

  @IsIn(['REASSIGN', 'NOTIFY', 'INCREASE_PRIORITY'])
  actionType: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notifyUserIds?: string[];

  @IsString()
  @IsOptional()
  reassignToId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

@Injectable()
export class EscalationService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.escalationRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const rule = await this.prisma.escalationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Escalation rule not found');
    return rule;
  }

  create(dto: UpsertEscalationRuleDto) {
    return this.prisma.escalationRule.create({
      data: {
        name: dto.name,
        triggerType: dto.triggerType,
        priorityThreshold: dto.priorityThreshold ?? null,
        slaBreachType: dto.slaBreachType ?? null,
        actionType: dto.actionType,
        notifyUserIds: dto.notifyUserIds ?? [],
        reassignToId: dto.reassignToId ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpsertEscalationRuleDto) {
    await this.findOne(id);
    return this.prisma.escalationRule.update({
      where: { id },
      data: {
        name: dto.name,
        triggerType: dto.triggerType,
        priorityThreshold: dto.priorityThreshold ?? null,
        slaBreachType: dto.slaBreachType ?? null,
        actionType: dto.actionType,
        notifyUserIds: dto.notifyUserIds ?? [],
        reassignToId: dto.reassignToId ?? null,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.escalationRule.delete({ where: { id } });
    return { success: true };
  }
}
