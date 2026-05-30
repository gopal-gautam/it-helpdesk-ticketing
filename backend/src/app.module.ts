import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TicketsModule } from './tickets/tickets.module';
import { CommentsModule } from './comments/comments.module';
import { InternalNotesModule } from './internal-notes/internal-notes.module';
import { CategoriesModule } from './categories/categories.module';
import { SlaModule } from './sla/sla.module';
import { NotificationsModule } from './notifications/notifications.module';

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
  ],
})
export class AppModule {}
