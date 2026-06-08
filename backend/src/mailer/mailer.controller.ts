import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { MailerService, UpsertSmtpDto } from './mailer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('smtp-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @Get()
  getConfig() {
    return this.mailerService.getConfig();
  }

  @Put()
  upsert(@Body() dto: UpsertSmtpDto) {
    return this.mailerService.upsertConfig(dto);
  }

  @Post('test')
  test() {
    return this.mailerService.testConnection();
  }
}
