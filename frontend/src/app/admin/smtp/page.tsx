"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type SmtpConfig = {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  fromEmail: string;
  fromName: string | null;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  hasPassword: boolean;
};

type TestResult = { ok: boolean; error?: string };

const INPUT_CLASS =
  'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500';

export default function AdminSmtpPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [lastTestOk, setLastTestOk] = useState<boolean | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [form, setForm] = useState({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'IT Helpdesk',
    isActive: true,
  });

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SmtpConfig | null>('/smtp-config');
      if (data) {
        setForm({
          host: data.host ?? '',
          port: data.port ?? 587,
          secure: data.secure ?? false,
          username: data.username ?? '',
          password: '',
          fromEmail: data.fromEmail ?? '',
          fromName: data.fromName ?? 'IT Helpdesk',
          isActive: data.isActive ?? true,
        });
        setHasPassword(!!data.hasPassword);
        setLastTestedAt(data.lastTestedAt ?? null);
        setLastTestOk(data.lastTestOk ?? null);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load SMTP configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    setTestResult(null);
    try {
      const body: Record<string, unknown> = {
        host: form.host.trim(),
        port: Number(form.port),
        secure: form.secure,
        username: form.username.trim() || undefined,
        fromEmail: form.fromEmail.trim(),
        fromName: form.fromName.trim() || undefined,
        isActive: form.isActive,
      };
      // Only send password if the user typed a new one.
      if (form.password.trim()) {
        body.password = form.password;
      }
      await api.put('/smtp-config', body);
      setForm((f) => ({ ...f, password: '' }));
      await fetchConfig();
      setSuccess('SMTP configuration saved.');
    } catch (err: any) {
      setError(err.message ?? 'Failed to save SMTP configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setSuccess('');
    setTestResult(null);
    try {
      const result = await api.post<TestResult>('/smtp-config/test');
      setTestResult(result);
      await fetchConfig();
    } catch (err: any) {
      setTestResult({ ok: false, error: err.message ?? 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-900">Email (SMTP)</h1>
        <p className="text-sm text-slate-500">Configure the outgoing mail server for ticket notifications</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="py-6">
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>}
            {testResult && (
              testResult.ok ? (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">Connection OK</div>
              ) : (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{testResult.error ?? 'Connection failed'}</div>
              )
            )}

            <div className="flex flex-col gap-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Host</label>
                  <input
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="smtp.example.com"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Port</label>
                  <input
                    type="number"
                    min={1}
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.secure}
                  onChange={(e) => setForm({ ...form, secure: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Use SSL/TLS (secure)
              </label>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Username <span className="text-slate-400">(optional)</span></label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="apikey or user@example.com"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={hasPassword ? '•••••••• (unchanged)' : ''}
                  className={INPUT_CLASS}
                />
                {hasPassword && (
                  <p className="text-xs text-slate-400 mt-1">Leave blank to keep the existing password.</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">From Email</label>
                <input
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                  placeholder="noreply@example.com"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">From Name</label>
                <input
                  value={form.fromName}
                  onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                  placeholder="IT Helpdesk"
                  className={INPUT_CLASS}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Active
              </label>

              {lastTestedAt && (
                <p className="text-xs text-slate-500">
                  Last tested: {new Date(lastTestedAt).toLocaleString()}
                  {lastTestOk === true && <span className="ml-1 text-green-600 font-medium">(OK)</span>}
                  {lastTestOk === false && <span className="ml-1 text-red-600 font-medium">(Failed)</span>}
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" onClick={handleTest} disabled={testing}>{testing ? 'Testing…' : 'Send Test / Test Connection'}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
