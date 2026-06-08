import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('sla-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SlaController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'TEAM_LEAD', 'AGENT')
  findAll() {
    return this.prisma.sLAProfile.findMany({ orderBy: { priority: 'asc' } });
  }

  @Get(':id')
  @Roles('ADMIN', 'TEAM_LEAD', 'AGENT')
  findOne(@Param('id') id: string) {
    return this.prisma.sLAProfile.findUnique({ where: { id } });
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: { name: string; priority: string; firstResponseHours: number; resolutionHours: number }) {
    return this.prisma.sLAProfile.create({ data: { ...dto, isActive: true } as any });
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: { name?: string; firstResponseHours?: number; resolutionHours?: number; isActive?: boolean }) {
    return this.prisma.sLAProfile.update({ where: { id }, data: dto });
  }
}
