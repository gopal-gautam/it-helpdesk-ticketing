import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { BusinessHoursService, UpdateDayDto, CreateHolidayDto } from './business-hours.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('business-hours')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BusinessHoursController {
  constructor(private readonly service: BusinessHoursService) {}

  @Get()
  getHours() {
    return this.service.getHours();
  }

  @Put('day')
  updateDay(@Body() dto: UpdateDayDto) {
    return this.service.updateDay(dto);
  }

  @Get('holidays')
  getHolidays() {
    return this.service.getHolidays();
  }

  @Post('holidays')
  createHoliday(@Body() dto: CreateHolidayDto) {
    return this.service.createHoliday(dto);
  }

  @Delete('holidays/:id')
  removeHoliday(@Param('id') id: string) {
    return this.service.removeHoliday(id);
  }
}
