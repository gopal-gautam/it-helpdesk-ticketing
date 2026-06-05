"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { LayoutDashboard, TrendingUp, Clock, AlertTriangle, PieChart as PieIcon, BarChart as BarChartIcon } from 'lucide-react';

type Metrics = {
  totalTickets: number;
  statusDistribution: { status: string, _count: { _all: number } }[];
  priorityDistribution: { priority: string, _count: { _all: number } }[];
  slaBreaches: number;
};

type TimeSeriesData = { date: string, count: number }[];
type CategoryData = { name: string, ticketCount: number }[];

export default function ReportingPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReportingData() {
      try {
        const result = await api.get('/reporting/overview');
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReportingData();
  }, []);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-zinc-950"><div className="w-12 h-12 rounded-full border-4 border-violet-600/30 border-t-violet-600 animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-400 bg-zinc-950 min-h-screen">{error}</div>;
  if (!data) return <div className="p-8 text-center text-zinc-500 bg-zinc-950 min-h-screen">No data available</div>;

  const COLORS = ['#8b5cf6', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <LayoutDashboard className="text-violet-400" /> System Analytics
              </h1>
              <p className="text-zinc-400 text-sm">Overview of helpdesk performance and ticket trends</p>
            </div>
            <div className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
                  <Ticket size={24} />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase font-semibold">Total Tickets</p>
                  <p className="text-2xl font-bold text-white">{data.metrics.totalTickets}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase font-semibold">SLA Breaches</p>
                  <p className="text-2xl font-bold text-white">{data.metrics.slaBreaches}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase font-semibold">Avg. Resolution</p>
                  <p className="text-2xl font-bold text-white">{data.avgResolutionTime}h</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase font-semibold">Active Categories</p>
                  <p className="text-2xl font-bold text-white">{data.categories.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp size={18} className="text-violet-400" /> Ticket Volume Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.ticketsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', color: '#fff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#8b5cf6' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieIcon size={18} className="text-violet-400" /> Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80 w-full flex flex-col items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.metrics.statusDistribution}
                      dataKey="value"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {data.metrics.statusDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {data.metrics.statusDistribution.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-xs text-zinc-400">{entry.status}: {entry._count._all}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChartIcon size={18} className="text-violet-400" /> Volume by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.categories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="name"
                      stroke="#71717a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', color: '#fff' }} />
                    <Bar dataKey="ticketCount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Ticket({ size, className = '' }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
  );
}
