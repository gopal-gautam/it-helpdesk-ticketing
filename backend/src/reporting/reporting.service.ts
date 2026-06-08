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

  /** Average first-response time (hours) across tickets that have been responded to. */
  async getFirstResponseMetrics() {
    const tickets = await this.prisma.ticket.findMany({
      where: { firstRespondedAt: { not: null } },
      select: { createdAt: true, firstRespondedAt: true },
    });

    if (tickets.length === 0) return { avgFirstResponseHours: 0, respondedCount: 0 };

    const totalMs = tickets.reduce(
      (acc, t) => acc + (new Date(t.firstRespondedAt!).getTime() - new Date(t.createdAt).getTime()),
      0,
    );
    const avgHours = totalMs / tickets.length / (1000 * 60 * 60);
    return { avgFirstResponseHours: Math.round(avgHours * 100) / 100, respondedCount: tickets.length };
  }

  /** Reopen rate = reopened tickets / tickets that were ever resolved-or-closed. */
  async getReopenMetrics() {
    const reopenedCount = await this.prisma.ticket.count({ where: { reopenCount: { gt: 0 } } });
    const resolvedEver = await this.prisma.ticket.count({
      where: { OR: [{ resolvedAt: { not: null } }, { closedAt: { not: null } }, { reopenCount: { gt: 0 } }] },
    });
    const rate = resolvedEver === 0 ? 0 : Math.round((reopenedCount / resolvedEver) * 1000) / 10;
    return { reopenedCount, resolvedEver, reopenRatePct: rate };
  }

  /** Per-agent performance: assigned/open/resolved counts + avg resolution & first-response hours. */
  async getAgentPerformance() {
    const agents = await this.prisma.user.findMany({
      where: { role: { name: { in: ['AGENT', 'TEAM_LEAD'] } } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const results = await Promise.all(
      agents.map(async (a) => {
        const tickets = await this.prisma.ticket.findMany({
          where: { assignedAgentId: a.id },
          select: { status: true, createdAt: true, resolvedAt: true, firstRespondedAt: true, reopenCount: true },
        });

        const assigned = tickets.length;
        const resolved = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
        const open = tickets.filter((t) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)).length;
        const reopened = tickets.filter((t) => t.reopenCount > 0).length;

        const resolvedWithTime = tickets.filter((t) => t.resolvedAt);
        const avgResolutionHours = resolvedWithTime.length
          ? Math.round(
              (resolvedWithTime.reduce(
                (acc, t) => acc + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()),
                0,
              ) /
                resolvedWithTime.length /
                (1000 * 60 * 60)) *
                100,
            ) / 100
          : 0;

        const respondedWithTime = tickets.filter((t) => t.firstRespondedAt);
        const avgFirstResponseHours = respondedWithTime.length
          ? Math.round(
              (respondedWithTime.reduce(
                (acc, t) => acc + (new Date(t.firstRespondedAt!).getTime() - new Date(t.createdAt).getTime()),
                0,
              ) /
                respondedWithTime.length /
                (1000 * 60 * 60)) *
                100,
            ) / 100
          : 0;

        return {
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          email: a.email,
          assigned,
          open,
          resolved,
          reopened,
          avgResolutionHours,
          avgFirstResponseHours,
        };
      }),
    );

    results.sort((x, y) => y.resolved - x.resolved);
    return results;
  }
}
