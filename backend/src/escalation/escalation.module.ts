import { Module } from '@nestjs/common';
import { EscalationService } from './escalation.service';
import { EscalationController } from './escalation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EscalationController],
  providers: [EscalationService],
  exports: [EscalationService],
})
export class EscalationModule {}
