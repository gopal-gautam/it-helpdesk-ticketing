import { Module } from '@nestjs/common';
import { InternalNotesController } from './internal-notes.controller';
import { InternalNotesService } from './internal-notes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InternalNotesController],
  providers: [InternalNotesService],
})
export class InternalNotesModule {}
