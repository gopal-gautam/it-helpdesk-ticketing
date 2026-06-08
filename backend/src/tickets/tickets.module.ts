import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PrismaModule, AuditLogModule, MailerModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
