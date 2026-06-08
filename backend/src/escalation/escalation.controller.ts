import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { EscalationService, UpsertEscalationRuleDto } from './escalation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('escalation-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Get()
  findAll() {
    return this.escalationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.escalationService.findOne(id);
  }

  @Post()
  create(@Body() dto: UpsertEscalationRuleDto) {
    return this.escalationService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertEscalationRuleDto) {
    return this.escalationService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.escalationService.remove(id);
  }
}
