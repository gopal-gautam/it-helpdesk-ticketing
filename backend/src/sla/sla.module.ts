import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SlaService } from './sla.service';
import { SlaProcessor } from './processors/sla.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SlaScheduler } from './sla.scheduler';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'sla-checker',
    }),
  ],
  providers: [SlaService, SlaProcessor, SlaScheduler],
  exports: [SlaService],
})
export class SlaModule {}
