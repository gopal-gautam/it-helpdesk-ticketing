import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getGeneralMetrics() {
    const totalTickets = await this.prisma.ticket.count();

    const statusDistribution = await this.prisma.ticket.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    const priorityDistribution = await this.prisma.ticket.groupBy({
      by: ['priority'],
      _count: {
        _all: true,
      },
    });

    const slaBreaches = await this.prisma.sLABreach.count();

    return {
      totalTickets,
      statusDistribution,
      priorityDistribution,
      slaBreaches,
    };
  }

  async getTicketsOverTime() {
    // Returns count of tickets created per day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const countsByDate = {};
    tickets.forEach(ticket => {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      countsByDate[date] = (countsByDate[date] || 0) + 1;
    });

    return Object.entries(countsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCategoryPerformance() {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });

    return categories.map(c => ({
      name: c.name,
      ticketCount: c._count.tickets,
    }));
  }

  async getAverageResolutionTime() {
    const resolvedTickets = await this.prisma.ticket.findMany({
      where: {
        status: 'RESOLVED',
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (resolvedTickets.length === 0) return 0;

    const totalDiff = resolvedTickets.reduce((acc, t) => {
      return acc + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
    }, 0);

    const avgDiffMs = totalDiff / resolvedTickets.length;
    const avgHours = avgDiffMs / (1000 * 60 * 60);

    return Math.round(avgHours * 100) / 100;
  }
}
