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

type AgentPerf = {
  id: string;
  name: string;
  email: string;
  assigned: number;
  open: number;
  resolved: number;
  reopened: number;
  avgResolutionHours: number;
  avgFirstResponseHours: number;
};

export default function ReportingPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [agents, setAgents] = useState<AgentPerf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReportingData() {
      try {
        const [result, agentPerf] = await Promise.all([
          api.get('/reporting/overview'),
          api.get<AgentPerf[]>('/reporting/agents').catch(() => []),
        ]);
        setData(result);
        setAgents(agentPerf);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReportingData();
  }, []);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-600 bg-slate-50 min-h-screen">{error}</div>;
  if (!data) return <div className="p-8 text-center text-slate-500 bg-slate-50 min-h-screen">No data available</div>;

  const COLORS = ['#2563eb', '#0891b2', '#d97706', '#dc2626', '#16a34a', '#64748b'];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <LayoutDashboard className="text-blue-600" /> System Analytics
              </h1>
              <p className="text-slate-500 text-sm">Overview of helpdesk performance and ticket trends</p>
            </div>
            <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <Ticket size={24} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Total Tickets</p>
                  <p className="text-2xl font-bold text-slate-900">{data.metrics.totalTickets}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-xl text-red-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">SLA Breaches</p>
                  <p className="text-2xl font-bold text-slate-900">{data.metrics.slaBreaches}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-xl text-green-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Avg. Resolution</p>
                  <p className="text-2xl font-bold text-slate-900">{data.avgResolutionTime}h</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-cyan-50 rounded-xl text-cyan-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Avg. First Response</p>
                  <p className="text-2xl font-bold text-slate-900">{data.firstResponse?.avgFirstResponseHours ?? 0}h</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Reopen Rate</p>
                  <p className="text-2xl font-bold text-slate-900">{data.reopen?.reopenRatePct ?? 0}%</p>
                  <p className="text-[11px] text-slate-400">{data.reopen?.reopenedCount ?? 0} reopened</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <BarChartIcon size={24} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Active Categories</p>
                  <p className="text-2xl font-bold text-slate-900">{data.categories.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-600" /> Ticket Volume Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.ticketsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#2563eb' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieIcon size={18} className="text-blue-600" /> Status Distribution
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
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {data.metrics.statusDistribution.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-xs text-slate-500">{entry.status}: {entry._count._all}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChartIcon size={18} className="text-blue-600" /> Volume by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.categories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }} />
                    <Bar dataKey="ticketCount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-600" /> Agent Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agents.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">No agent data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Agent</th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Assigned</th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Open</th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Resolved</th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Reopened</th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Avg 1st Response</th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Avg Resolution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {agents.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-900">{a.name}</div>
                              <div className="text-xs text-slate-500">{a.email}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{a.assigned}</td>
                            <td className="px-3 py-2 text-slate-700">{a.open}</td>
                            <td className="px-3 py-2 font-semibold text-green-700">{a.resolved}</td>
                            <td className="px-3 py-2 text-amber-700">{a.reopened}</td>
                            <td className="px-3 py-2 text-slate-700">{a.avgFirstResponseHours}h</td>
                            <td className="px-3 py-2 text-slate-700">{a.avgResolutionHours}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
