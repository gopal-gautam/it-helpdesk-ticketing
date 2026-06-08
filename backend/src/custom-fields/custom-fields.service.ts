import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsArray, IsInt, IsIn } from 'class-validator';

const FIELD_TYPES = ['TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE'];

export class UpsertCustomFieldDto {
  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsIn(FIELD_TYPES)
  fieldType: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

@Injectable()
export class CustomFieldsService {
  constructor(private prisma: PrismaService) {}

  /** Active fields that apply to a category (global fields + that category's). */
  findApplicable(categoryId?: string) {
    return this.prisma.customField.findMany({
      where: {
        isActive: true,
        OR: [{ categoryId: null }, ...(categoryId ? [{ categoryId }] : [])],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** All field definitions (admin view). */
  findAll() {
    return this.prisma.customField.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  create(dto: UpsertCustomFieldDto) {
    return this.prisma.customField.create({
      data: {
        name: dto.name,
        label: dto.label,
        fieldType: dto.fieldType,
        options: dto.options ?? [],
        isRequired: dto.isRequired ?? false,
        categoryId: dto.categoryId || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpsertCustomFieldDto) {
    const existing = await this.prisma.customField.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Custom field not found');
    return this.prisma.customField.update({
      where: { id },
      data: {
        name: dto.name,
        label: dto.label,
        fieldType: dto.fieldType,
        options: dto.options ?? [],
        isRequired: dto.isRequired ?? false,
        categoryId: dto.categoryId || null,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.customField.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Custom field not found');
    // Soft-delete to preserve historical values on tickets.
    await this.prisma.customField.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  getValuesForTicket(ticketId: string) {
    return this.prisma.customFieldValue.findMany({
      where: { ticketId },
      include: { field: true },
    });
  }

  /** Upsert the supplied { fieldId: value } map for a ticket; validates required + SELECT. */
  async setValuesForTicket(ticketId: string, values: Record<string, string>) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const fields = await this.findApplicable(ticket.categoryId);
    const byId = new Map(fields.map((f) => [f.id, f]));

    for (const [fieldId, raw] of Object.entries(values ?? {})) {
      const field = byId.get(fieldId);
      if (!field) continue; // ignore unknown / inapplicable fields
      const value = (raw ?? '').toString();

      if (field.isRequired && !value) {
        throw new BadRequestException(`${field.label} is required`);
      }
      if (field.fieldType === 'SELECT' && value && !field.options.includes(value)) {
        throw new BadRequestException(`Invalid option for ${field.label}`);
      }

      await this.prisma.customFieldValue.upsert({
        where: { fieldId_ticketId: { fieldId, ticketId } },
        update: { value },
        create: { fieldId, ticketId, value },
      });
    }

    return this.getValuesForTicket(ticketId);
  }
}
