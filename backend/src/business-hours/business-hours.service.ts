import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsBoolean, IsInt, IsString, IsOptional, Min, Max, Matches } from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_HOURS = [
  { dayOfWeek: 0, isOpen: false, startTime: '09:00', endTime: '17:00' }, // Sun
  { dayOfWeek: 1, isOpen: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 2, isOpen: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 3, isOpen: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 4, isOpen: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 5, isOpen: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 6, isOpen: false, startTime: '09:00', endTime: '17:00' }, // Sat
];

export class UpdateDayDto {
  @IsInt() @Min(0) @Max(6)
  dayOfWeek: number;

  @IsBoolean()
  isOpen: boolean;

  @IsString() @Matches(TIME_RE, { message: 'startTime must be HH:mm' })
  startTime: string;

  @IsString() @Matches(TIME_RE, { message: 'endTime must be HH:mm' })
  endTime: string;
}

export class CreateHolidayDto {
  @IsString()
  date: string; // YYYY-MM-DD

  @IsString()
  name: string;
}

@Injectable()
export class BusinessHoursService {
  constructor(private prisma: PrismaService) {}

  /** Returns all 7 days, seeding defaults on first access. */
  async getHours() {
    const count = await this.prisma.businessHours.count();
    if (count === 0) {
      await this.prisma.businessHours.createMany({ data: DEFAULT_HOURS });
    }
    return this.prisma.businessHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
  }

  async updateDay(dto: UpdateDayDto) {
    return this.prisma.businessHours.upsert({
      where: { dayOfWeek: dto.dayOfWeek },
      update: { isOpen: dto.isOpen, startTime: dto.startTime, endTime: dto.endTime },
      create: { dayOfWeek: dto.dayOfWeek, isOpen: dto.isOpen, startTime: dto.startTime, endTime: dto.endTime },
    });
  }

  getHolidays() {
    return this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  }

  createHoliday(dto: CreateHolidayDto) {
    return this.prisma.holiday.create({
      data: { date: new Date(dto.date), name: dto.name },
    });
  }

  async removeHoliday(id: string) {
    await this.prisma.holiday.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Config consumed by the SLA calculator: a map of dayOfWeek -> {isOpen,start,end}
   * and a Set of holiday date keys (YYYY-MM-DD).
   */
  async getCalcConfig() {
    const [hours, holidays] = await Promise.all([this.getHours(), this.getHolidays()]);
    const byDay = new Map<number, { isOpen: boolean; startHour: number; endHour: number }>();
    for (const h of hours) {
      byDay.set(h.dayOfWeek, {
        isOpen: h.isOpen,
        startHour: parseInt(h.startTime.split(':')[0], 10),
        endHour: parseInt(h.endTime.split(':')[0], 10),
      });
    }
    const holidaySet = new Set(holidays.map((h) => new Date(h.date).toISOString().slice(0, 10)));
    return { byDay, holidaySet };
  }
}
