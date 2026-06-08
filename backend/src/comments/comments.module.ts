import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PrismaModule, AuditLogModule, MailerModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
