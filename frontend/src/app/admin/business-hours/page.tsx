"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type BusinessHour = {
  id?: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

type Holiday = {
  id: string;
  date: string;
  name: string;
};

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const INPUT_CLASS =
  'bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500';

export default function AdminBusinessHoursPage() {
  const [days, setDays] = useState<BusinessHour[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [savedDay, setSavedDay] = useState<number | null>(null);

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [hours, hol] = await Promise.all([
        api.get<BusinessHour[]>('/business-hours'),
        api.get<Holiday[]>('/business-hours/holidays'),
      ]);
      const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      setDays(sorted);
      setHolidays(hol);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load business hours');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateDay = (dayOfWeek: number, patch: Partial<BusinessHour>) => {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)),
    );
  };

  const saveDay = async (day: BusinessHour) => {
    setSavingDay(day.dayOfWeek);
    setSavedDay(null);
    setError('');
    try {
      await api.put('/business-hours/day', {
        dayOfWeek: day.dayOfWeek,
        isOpen: day.isOpen,
        startTime: day.startTime,
        endTime: day.endTime,
      });
      setSavedDay(day.dayOfWeek);
      setTimeout(() => {
        setSavedDay((cur) => (cur === day.dayOfWeek ? null : cur));
      }, 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save day');
    } finally {
      setSavingDay(null);
    }
  };

  const addHoliday = async () => {
    setHolidayError('');
    if (!holidayDate || !holidayName.trim()) {
      setHolidayError('Date and name are required');
      return;
    }
    setAddingHoliday(true);
    try {
      await api.post('/business-hours/holidays', {
        date: holidayDate,
        name: holidayName.trim(),
      });
      setHolidayDate('');
      setHolidayName('');
      const hol = await api.get<Holiday[]>('/business-hours/holidays');
      setHolidays(hol);
    } catch (err: any) {
      setHolidayError(err?.message ?? 'Failed to add holiday');
    } finally {
      setAddingHoliday(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      await api.delete(`/business-hours/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete holiday');
    }
  };

  const formatHolidayDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-900">Business Hours</h1>
        <p className="text-sm text-slate-500">
          Working hours and holidays used for SLA calculations
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Section 1 — Weekly Hours */}
          <Card>
            <CardContent>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Weekly Hours</h2>
              <p className="text-sm text-slate-500 mb-4">
                Set the open hours for each day of the week.
              </p>
              <div className="flex flex-col divide-y divide-slate-200">
                {days.map((day) => (
                  <div
                    key={day.dayOfWeek}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="w-28 font-medium text-slate-900">
                      {DAY_NAMES[day.dayOfWeek] ?? `Day ${day.dayOfWeek}`}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700 w-20">
                      <input
                        type="checkbox"
                        checked={day.isOpen}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, { isOpen: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Open
                    </label>
                    <input
                      type="time"
                      value={day.startTime}
                      disabled={!day.isOpen}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { startTime: e.target.value })
                      }
                      className={`${INPUT_CLASS} ${
                        !day.isOpen ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    />
                    <span className="text-slate-400 text-sm">to</span>
                    <input
                      type="time"
                      value={day.endTime}
                      disabled={!day.isOpen}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { endTime: e.target.value })
                      }
                      className={`${INPUT_CLASS} ${
                        !day.isOpen ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    />
                    <div className="flex items-center gap-2 ml-auto">
                      {savedDay === day.dayOfWeek && (
                        <span className="text-xs text-green-600 font-medium">
                          Saved
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => saveDay(day)}
                        disabled={savingDay === day.dayOfWeek}
                      >
                        {savingDay === day.dayOfWeek ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 2 — Holidays */}
          <Card>
            <CardContent>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Holidays</h2>
              <p className="text-sm text-slate-500 mb-4">
                Days the help desk is closed. SLA timers are paused on these dates.
              </p>

              <div className="flex flex-wrap items-end gap-3 mb-5">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex-1 min-w-[12rem]">
                  <label className="block text-xs text-slate-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={holidayName}
                    placeholder="e.g. New Year's Day"
                    onChange={(e) => setHolidayName(e.target.value)}
                    className={`${INPUT_CLASS} w-full`}
                  />
                </div>
                <Button onClick={addHoliday} disabled={addingHoliday}>
                  {addingHoliday ? 'Adding…' : 'Add Holiday'}
                </Button>
              </div>

              {holidayError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {holidayError}
                </div>
              )}

              {holidays.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No holidays configured.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-200">
                  {holidays.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className="w-32 text-sm text-slate-700 font-medium">
                        {formatHolidayDate(h.date)}
                      </div>
                      <div className="flex-1 text-sm text-slate-900">{h.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteHoliday(h.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
