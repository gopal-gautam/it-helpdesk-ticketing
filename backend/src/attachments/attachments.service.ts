import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Attachment, Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: Prisma.AttachmentCreateInput): Promise<Attachment> {
    const attachment = await this.prisma.attachment.create({
      data,
    });

    const userId = data.uploadedBy?.connect?.id;

    await this.auditLogService.log({
      userId,
      action: 'ATTACHMENT_UPLOADED',
      entityType: 'ATTACHMENT',
      entityId: attachment.id,
      newValues: attachment,
    });

    return attachment;
  }

  async findManyByTicket(ticketId: string): Promise<Attachment[]> {
    return this.prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string): Promise<Attachment> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }

  async delete(id: string, userId: string): Promise<void> {
    const attachment = await this.findOne(id);

    try {
      await fs.unlink(attachment.filePath);
    } catch (error) {
      console.error(`Failed to delete file ${attachment.filePath}:`, error);
      // We continue even if file deletion fails so the DB record is removed
    }

    await this.prisma.attachment.delete({
      where: { id },
    });

    await this.auditLogService.log({
      userId,
      action: 'ATTACHMENT_DELETED',
      entityType: 'ATTACHMENT',
      entityId: id,
      oldValues: attachment,
    });
  }

  async getFilePath(id: string): Promise<string> {
    const attachment = await this.findOne(id);
    return attachment.filePath;
  }
}
