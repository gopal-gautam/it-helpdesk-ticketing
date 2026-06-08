import { Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CustomFieldsService, UpsertCustomFieldDto } from './custom-fields.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  // Any authenticated user: fields applicable to a category (for the ticket form).
  @Get()
  findApplicable(@Query('categoryId') categoryId?: string) {
    return this.service.findApplicable(categoryId);
  }

  @Get('all')
  @Roles('ADMIN')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: UpsertCustomFieldDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpsertCustomFieldDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('ticket/:ticketId')
  getValues(@Param('ticketId') ticketId: string) {
    return this.service.getValuesForTicket(ticketId);
  }

  @Put('ticket/:ticketId')
  setValues(@Param('ticketId') ticketId: string, @Body() body: { values: Record<string, string> }) {
    return this.service.setValuesForTicket(ticketId, body.values);
  }
}
