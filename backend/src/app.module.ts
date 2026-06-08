import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TicketsModule } from './tickets/tickets.module';
import { CommentsModule } from './comments/comments.module';
import { InternalNotesModule } from './internal-notes/internal-notes.module';
import { CategoriesModule } from './categories/categories.module';
import { SlaModule } from './sla/sla.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ReportingModule } from './reporting/reporting.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { MailerModule } from './mailer/mailer.module';
import { EscalationModule } from './escalation/escalation.module';
import { BusinessHoursModule } from './business-hours/business-hours.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TicketsModule,
    CommentsModule,
    InternalNotesModule,
    CategoriesModule,
    SlaModule,
    NotificationsModule,
    AttachmentsModule,
    ReportingModule,
    AuditLogModule,
    UsersModule,
    TeamsModule,
    MailerModule,
    EscalationModule,
    BusinessHoursModule,
    CustomFieldsModule,
  ],
})
export class AppModule {}
