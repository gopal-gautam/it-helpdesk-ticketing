import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addHours, addDays, isWeekend, setHours, setMinutes, startOfDay, nextMonday } from 'date-fns';
import { TicketStatus, Priority } from '@prisma/client';
import { BusinessHoursService } from '../business-hours/business-hours.service';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  // Fallback business hours (used when no configurable service is present).
  private readonly BUSINESS_START_HOUR = 9;
  private readonly BUSINESS_END_HOUR = 17;
  private readonly BUSINESS_HOURS_PER_DAY = this.BUSINESS_END_HOUR - this.BUSINESS_START_HOUR;

  constructor(
    private prisma: PrismaService,
    @Optional() private businessHours?: BusinessHoursService,
  ) {}

  /**
   * Config-driven deadline: respects admin-configured working days/hours and
   * holidays. Falls back to the static 9–5 weekday calculation when the
   * business-hours service isn't available.
   */
  async calculateBusinessDeadline(startTime: Date, businessHoursRequired: number): Promise<Date> {
    if (!this.businessHours) return this.calculateDeadline(startTime, businessHoursRequired);

    const { byDay, holidaySet } = await this.businessHours.getCalcConfig();

    const isWorkingDay = (d: Date) => {
      const key = d.toISOString().slice(0, 10);
      if (holidaySet.has(key)) return false;
      const cfg = byDay.get(d.getDay());
      return cfg ? cfg.isOpen : !isWeekend(d);
    };
    const dayStart = (d: Date) => byDay.get(d.getDay())?.startHour ?? this.BUSINESS_START_HOUR;
    const dayEnd = (d: Date) => byDay.get(d.getDay())?.endHour ?? this.BUSINESS_END_HOUR;

    const nextWorkingDayStart = (d: Date): Date => {
      let next = addDays(d, 1);
      while (!isWorkingDay(next)) next = addDays(next, 1);
      return setMinutes(setHours(next, dayStart(next)), 0);
    };

    let deadline = new Date(startTime);
    let remaining = businessHoursRequired;

    while (remaining > 0) {
      if (!isWorkingDay(deadline)) {
        deadline = nextWorkingDayStart(deadline);
        continue;
      }
      const startHour = dayStart(deadline);
      const endHour = dayEnd(deadline);
      const currentHour = deadline.getHours();

      if (currentHour < startHour) {
        deadline = setMinutes(setHours(deadline, startHour), 0);
      } else if (currentHour >= endHour) {
        deadline = nextWorkingDayStart(deadline);
        continue;
      }

      const hoursUntilEnd = endHour - deadline.getHours();
      const consume = Math.min(remaining, hoursUntilEnd);
      remaining -= consume;
      deadline = addHours(deadline, consume);

      if (deadline.getHours() >= endHour && remaining > 0) {
        deadline = nextWorkingDayStart(deadline);
      }
    }
    return deadline;
  }

  /**
   * Calculates a deadline date based on the number of business hours required.
   * Respects business hours (9-5) and excludes weekends.
   */
  calculateDeadline(startTime: Date, businessHoursRequired: number): Date {
    let deadline = new Date(startTime);
    let remainingHours = businessHoursRequired;

    while (remainingHours > 0) {
      // Move to next business day if it's a weekend
      if (isWeekend(deadline)) {
        deadline = this.moveToNextBusinessDay(deadline);
        continue;
      }

      const currentHour = deadline.getHours();

      // If we are before business hours, jump to start of business day
      if (currentHour < this.BUSINESS_START_HOUR) {
        deadline = setMinutes(setHours(deadline, this.BUSINESS_START_HOUR), 0);
      }
      // If we are after business hours, jump to start of next business day
      else if (currentHour >= this.BUSINESS_END_HOUR) {
        deadline = this.moveToNextBusinessDay(deadline);
        continue;
      }

      // Calculate available hours today
      const hoursUntilEndOfDay = this.BUSINESS_END_HOUR - currentHour;
      const hoursToConsume = Math.min(remainingHours, hoursUntilEndOfDay);

      remainingHours -= hoursToConsume;
      deadline = addHours(deadline, hoursToConsume);

      // If we exactly hit the end of the day, move to the next business day start
      if (deadline.getHours() === this.BUSINESS_END_HOUR) {
        deadline = this.moveToNextBusinessDay(deadline);
      }
    }

    return deadline;
  }

  private moveToNextBusinessDay(date: Date): Date {
    let next = addDays(date, 1);
    while (isWeekend(next)) {
      next = addDays(next, 1);
    }
    return setMinutes(setHours(next, this.BUSINESS_START_HOUR), 0);
  }

  /**
   * Assigns SLA deadlines to a ticket based on its SLA Profile.
   */
  async applySlaProfile(ticketId: string, slaProfileId: string) {
    const profile = await this.prisma.sLAProfile.findUnique({
      where: { id: slaProfileId },
    });

    if (!profile) throw new Error('SLA Profile not found');

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new Error('Ticket not found');

    const firstResponseDeadline = await this.calculateBusinessDeadline(ticket.createdAt, profile.firstResponseHours);
    const resolutionDeadline = await this.calculateBusinessDeadline(ticket.createdAt, profile.resolutionHours);

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        firstResponseDueAt: firstResponseDeadline,
        resolutionDueAt: resolutionDeadline,
        slaProfileId: profile.id,
      },
    });
  }

  /**
   * Checks for tickets that have breached their SLA.
   */
  async checkSlaBreaches() {
    const now = new Date();
    this.logger.log(`Checking SLA breaches at ${now.toISOString()}`);

    // 1. Check First Response Breaches
    const firstResponseBreaches = await this.prisma.ticket.findMany({
      where: {
        AND: [
          { status: { not: 'RESOLVED' } },
          { firstResponseDueAt: { lt: now } },
          { status: 'NEW' },
        ],
      },
    });

    // 2. Check Resolution Breaches
    const resolutionBreaches = await this.prisma.ticket.findMany({
      where: {
        AND: [
          { status: { not: 'RESOLVED' } },
          { status: { not: 'CLOSED' } },
          { resolutionDueAt: { lt: now } },
        ],
      },
    });

    return {
      firstResponseBreaches,
      resolutionBreaches,
    };
  }
}
