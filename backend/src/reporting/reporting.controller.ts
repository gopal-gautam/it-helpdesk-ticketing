import {
  Controller,
  Get,
  UseGuards,
  Request,
  ForbiddenException
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reporting')
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('overview')
  async getOverview(@Request() req) {
    // In a real app, we would check if user.role is NOT 'REQUESTER'
    if (req.user.role === 'REQUESTER') {
      throw new ForbiddenException('Requesters cannot access reporting data');
    }

    const metrics = await this.reportingService.getGeneralMetrics();
    const ticketsOverTime = await this.reportingService.getTicketsOverTime();
    const categories = await this.reportingService.getCategoryPerformance();
    const avgResolutionTime = await this.reportingService.getAverageResolutionTime();

    return {
      metrics,
      ticketsOverTime,
      categories,
      avgResolutionTime,
    };
  }
}
