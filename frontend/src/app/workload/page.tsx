"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

type AgentWorkload = {
  id: string;
  name: string;
  email: string;
  team: string | null;
  openCount: number;
  byStatus: Record<string, number>;
};

type WorkloadResponse = {
  agents: AgentWorkload[];
  unassigned: number;
};

export default function WorkloadPage() {
  const [data, setData] = useState<WorkloadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.get<WorkloadResponse>('/tickets/workload');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkload();
  }, [fetchWorkload]);

  const agents = data?.agents ?? [];
  const unassigned = data?.unassigned ?? 0;
  const maxOpen = agents.reduce((max, a) => Math.max(max, a.openCount), 0);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Agent Workload</h1>
              <p className="text-sm text-slate-500 mt-1">Open ticket distribution across the team</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Unassigned stat */}
              <Link href="/tickets?status=NEW">
                <Card className="mb-6 hover:border-blue-200 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unassigned open tickets</p>
                      <p className="text-3xl font-extrabold text-slate-900 mt-1">{unassigned}</p>
                    </div>
                    <span className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors">View →</span>
                  </CardContent>
                </Card>
              </Link>

              {/* Agents table */}
              {agents.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center text-slate-500">
                    <p className="text-lg font-medium mb-2">No agents found</p>
                    <p className="text-sm">There are no agents to display workload for.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Agent</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Open</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">New</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Open</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">In Progress</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Waiting</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {agents.map((agent) => {
                          const waiting =
                            (agent.byStatus.WAITING_ON_USER ?? 0) +
                            (agent.byStatus.WAITING_ON_THIRD_PARTY ?? 0);
                          const barPct = maxOpen > 0 ? (agent.openCount / maxOpen) * 100 : 0;
                          return (
                            <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{agent.name}</div>
                                <div className="text-xs text-slate-500">{agent.email}</div>
                                {agent.team && (
                                  <div className="text-xs text-slate-400 mt-0.5">{agent.team}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900">{agent.openCount}</div>
                                <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100">
                                  <div
                                    className="h-1.5 rounded-full bg-blue-600"
                                    style={{ width: `${barPct}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{agent.byStatus.NEW ?? 0}</td>
                              <td className="px-4 py-3 text-slate-700">{agent.byStatus.OPEN ?? 0}</td>
                              <td className="px-4 py-3 text-slate-700">{agent.byStatus.IN_PROGRESS ?? 0}</td>
                              <td className="px-4 py-3 text-slate-700">{waiting}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
