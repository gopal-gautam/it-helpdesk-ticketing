import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SlaScheduler implements OnModuleInit {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(@InjectQueue('sla-checker') private slaQueue: Queue) {}

  async onModuleInit() {
    this.logger.log('SLA Scheduler initialized');
  }

  @Cron('*/15 * * * *') // Every 15 minutes
  async handleSlaCheckCron() {
    this.logger.log('Scheduling SLA check job...');
    await this.slaQueue.add('check-slas', {}, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
