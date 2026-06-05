import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForbiddenException } from '@nestjs/common';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getLogs(
    @Request() req,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('userId') userId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access audit logs');
    }

    return this.auditLogService.getLogs({
      entityType,
      entityId,
      userId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }
}
