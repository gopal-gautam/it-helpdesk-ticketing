import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InternalNotesService } from './internal-notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('internal-notes')
export class InternalNotesController {
  constructor(private internalNotesService: InternalNotesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Post()
  async create(@Request() req, @Body() dto: CreateNoteDto) {
    return this.internalNotesService.createNote(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'TEAM_LEAD', 'ADMIN')
  @Get('ticket/:ticketId')
  async findByTicket(@Param('ticketId') ticketId: string) {
    return this.internalNotesService.findByTicket(ticketId);
  }
}
