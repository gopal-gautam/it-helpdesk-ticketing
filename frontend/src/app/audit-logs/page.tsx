"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Search, Calendar, User, Info, ChevronLeft, ChevronRight, Eye, RefreshCw, Database } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function AuditLogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [entityType, setEntityType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      let url = `/audit-logs?limit=${limit}&offset=${offset}`;
      if (entityType) {
        url += `&entityType=${entityType}`;
      }
      const data = await api.get<AuditLog[]>(url);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchLogs();
    }
  }, [user, page, entityType]);

  const handleRefresh = () => {
    if (page === 1) {
      fetchLogs();
    } else {
      setPage(1);
    }
  };

  if (authLoading || (!user || user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  // Client-side filtering for search term (action, user name, email, or entity ID)
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const actionMatch = log.action.toLowerCase().includes(term);
    const userMatch = log.user 
      ? `${log.user.firstName} ${log.user.lastName} ${log.user.email}`.toLowerCase().includes(term)
      : 'system'.includes(term);
    const entityIdMatch = log.entityId?.toLowerCase().includes(term) || false;
    return actionMatch || userMatch || entityIdMatch;
  });

  const getActionBadgeClass = (action: string) => {
    if (action.includes('CREATED') || action.includes('UPLOADED')) {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (action.includes('DELETED') || action.includes('CLOSED')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('UPDATED') || action.includes('ASSIGNED')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="text-rose-500" /> System Audit Logs
              </h1>
              <p className="text-slate-500 text-sm">Track user actions, data modifications, and security events</p>
            </div>
            <Button variant="outline" size="sm" className="self-start md:self-auto gap-2" onClick={handleRefresh}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Logs
            </Button>
          </div>

          {/* Filters Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Search by action, actor, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 placeholder-slate-400 rounded-xl outline-none transition-all text-sm h-[46px]"
              />
            </div>

            <div>
              <select
                value={entityType}
                onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
                className="w-full px-4 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 placeholder-slate-400 rounded-xl outline-none transition-all text-sm h-[46px] appearance-none cursor-pointer"
              >
                <option value="">All Entity Types</option>
                <option value="TICKET">Tickets</option>
                <option value="COMMENT">Comments</option>
                <option value="ATTACHMENT">Attachments</option>
                <option value="USER">Users</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
              <span>Page {page}</span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1 || loading} 
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="px-2"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={logs.length < limit || loading} 
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-2"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Logs Table Card */}
          <Card className="border-slate-200 bg-white overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Timestamp</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Actor</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Entity Type</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Entity ID</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
                            <span className="text-sm">Loading logs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-red-600 text-sm">
                          {error}
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                          No audit logs matching filters found.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-500" />
                              {new Date(log.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {log.user ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900">{log.user.firstName} {log.user.lastName}</span>
                                <span className="text-xs text-slate-500">{log.user.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <Database size={14} />
                                <span className="text-xs font-medium uppercase tracking-wider">System</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold tracking-wide ${getActionBadgeClass(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                            {log.entityType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                            {log.entityId ? (
                              <span className="truncate max-w-[120px] block" title={log.entityId}>
                                {log.entityId.substring(0, 8)}...
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
                            >
                              <Eye size={14} /> View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Audit Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-xl">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Info className="text-blue-600" /> Log Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">ID: {selectedLog.id}</p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                {/* Event Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Action</span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold inline-block ${getActionBadgeClass(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Timestamp</span>
                    <span className="text-slate-700 font-medium">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Actor</span>
                    <span className="text-slate-700 font-medium">
                      {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName} (${selectedLog.user.email})` : 'System'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Entity</span>
                    <span className="text-slate-700 font-medium">{selectedLog.entityType} ({selectedLog.entityId || 'N/A'})</span>
                  </div>
                  {selectedLog.ipAddress && (
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">IP Address</span>
                      <span className="text-slate-700 font-mono">{selectedLog.ipAddress}</span>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div className="md:col-span-2">
                      <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">User Agent</span>
                      <span className="text-slate-700 text-xs font-mono break-all">{selectedLog.userAgent}</span>
                    </div>
                  )}
                </div>

                {/* Values Comparison */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Data Changes</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Old Values */}
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold block mb-2">Previous State (Old)</span>
                      <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto max-h-[300px] text-xs font-mono text-slate-700">
                        {selectedLog.oldValues 
                          ? JSON.stringify(selectedLog.oldValues, null, 2) 
                          : 'No old values (Created / Uploaded)'}
                      </pre>
                    </div>

                    {/* New Values */}
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold block mb-2">Current State (New)</span>
                      <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto max-h-[300px] text-xs font-mono text-green-700">
                        {selectedLog.newValues 
                          ? JSON.stringify(selectedLog.newValues, null, 2) 
                          : 'No new values (Deleted)'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
