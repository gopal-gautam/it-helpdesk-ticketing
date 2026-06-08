import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TicketsService, CreateTicketDto, UpdateTicketDto, BulkActionDto } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() dto: CreateTicketDto) {
    // Force requesterId to be the current user
    return this.ticketsService.createTicket({
      ...dto,
      requesterId: req.user.id,
    }, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async findAll(@Request() req, @Query() query: any) {
    return this.ticketsService.findAll({
      userId: req.user.id,
      role: req.user.role,
      ...query,
    });
  }

  // Static routes must precede the ':id' param route.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Get('workload')
  async workload() {
    return this.ticketsService.getAgentWorkload();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Post('bulk')
  async bulk(@Request() req, @Body() dto: BulkActionDto) {
    return this.ticketsService.bulkAction(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.updateTicket(id, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Patch(':id/assign')
  async assign(@Request() req, @Param('id') id: string, @Body() dto: { agentId: string; teamId?: string }) {
    return this.ticketsService.assignTicket(id, dto.agentId, req.user.id, dto.teamId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Patch(':id/resolve')
  async resolve(@Request() req, @Param('id') id: string) {
    return this.ticketsService.resolveTicket(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Patch(':id/close')
  async close(@Request() req, @Param('id') id: string) {
    return this.ticketsService.closeTicket(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/reopen')
  async reopen(@Request() req, @Param('id') id: string) {
    return this.ticketsService.reopenTicket(id, req.user.id);
  }
}
