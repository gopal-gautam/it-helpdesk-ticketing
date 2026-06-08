"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';

type GroupCount<K extends string> = { _count: { _all: number } } & { [P in K]: string };

type OverviewData = {
  metrics: {
    totalTickets: number;
    statusDistribution: GroupCount<'status'>[];
    priorityDistribution: GroupCount<'priority'>[];
    slaBreaches: number;
  };
  avgResolutionTime: number;
};

// Prisma groupBy returns an array of { status/priority, _count: { _all } } — fold it to a lookup map.
function toCountMap<K extends string>(rows: GroupCount<K>[] | undefined, key: K): Record<string, number> {
  return Object.fromEntries((rows ?? []).map((r) => [r[key], r._count._all]));
}

const quickLinks = [
  { href: '/admin/users', label: 'Manage Users', desc: 'Create, edit, deactivate accounts', color: 'violet' },
  { href: '/admin/teams', label: 'Manage Teams', desc: 'Organize agents into teams', color: 'emerald' },
  { href: '/admin/categories', label: 'Categories', desc: 'Ticket category taxonomy', color: 'amber' },
  { href: '/admin/sla', label: 'SLA Profiles', desc: 'Response & resolution targets', color: 'rose' },
  { href: '/audit-logs', label: 'Audit Logs', desc: 'Full system activity trail', color: 'indigo' },
  { href: '/reporting', label: 'Reports', desc: 'Analytics & metrics', color: 'cyan' },
];

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<OverviewData>('/reporting/overview')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusDist = toCountMap(data?.metrics.statusDistribution, 'status');
  const priorityDist = toCountMap(data?.metrics.priorityDistribution, 'priority');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Overview</h1>
        <p className="text-sm text-slate-500 mt-1">System health at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tickets', value: loading ? '–' : data?.metrics.totalTickets ?? 0, color: 'text-blue-600' },
          { label: 'SLA Breaches', value: loading ? '–' : data?.metrics.slaBreaches ?? 0, color: 'text-red-600' },
          { label: 'Avg Resolution', value: loading ? '–' : `${Math.round(data?.avgResolutionTime ?? 0)}h`, color: 'text-amber-600' },
          { label: 'Open Tickets', value: loading ? '–' : (statusDist['NEW'] ?? 0) + (statusDist['OPEN'] ?? 0) + (statusDist['IN_PROGRESS'] ?? 0), color: 'text-green-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 font-medium mb-1">{stat.label}</p>
              <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status + Priority breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">By Status</h3>
            <div className="flex flex-col gap-2">
              {Object.entries(statusDist).map(([s, count]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{s.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
              {Object.keys(statusDist).length === 0 && !loading && (
                <p className="text-slate-400 text-sm">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">By Priority</h3>
            <div className="flex flex-col gap-2">
              {Object.entries(priorityDist).map(([p, count]) => (
                <div key={p} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{p}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
              {Object.keys(priorityDist).length === 0 && !loading && (
                <p className="text-slate-400 text-sm">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-blue-200 transition-colors cursor-pointer h-full">
              <CardContent className="p-4">
                <p className="font-semibold text-slate-900 text-sm mb-1">{link.label}</p>
                <p className="text-xs text-slate-500">{link.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
