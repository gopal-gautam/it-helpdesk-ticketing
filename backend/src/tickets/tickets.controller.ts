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
import { TicketsService, CreateTicketDto, UpdateTicketDto } from './tickets.service';
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
    });
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.updateTicket(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Patch(':id/assign')
  async assign(@Param('id') id: string, @Body() dto: { agentId: string; teamId?: string }) {
    return this.ticketsService.assignTicket(id, dto.agentId, dto.teamId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Patch(':id/resolve')
  async resolve(@Param('id') id: string) {
    return this.ticketsService.resolveTicket(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Patch(':id/close')
  async close(@Param('id') id: string) {
    return this.ticketsService.closeTicket(id);
  }
}
