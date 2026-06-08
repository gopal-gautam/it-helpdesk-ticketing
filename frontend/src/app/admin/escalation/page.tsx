"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type TriggerType = 'SLA_BREACH' | 'PRIORITY';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type SlaBreachType = 'FIRST_RESPONSE' | 'RESOLUTION';
type ActionType = 'REASSIGN' | 'NOTIFY' | 'INCREASE_PRIORITY';

type EscalationRule = {
  id: string;
  name: string;
  triggerType: TriggerType;
  priorityThreshold: Priority | null;
  slaBreachType: SlaBreachType | null;
  actionType: ActionType;
  notifyUserIds: string[];
  reassignToId: string | null;
  isActive: boolean;
};

type UserOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type UsersResponse = {
  users: UserOption[];
  total: number;
};

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

const TRIGGER_TYPES: TriggerType[] = ['SLA_BREACH', 'PRIORITY'];
const SLA_BREACH_TYPES: SlaBreachType[] = ['FIRST_RESPONSE', 'RESOLUTION'];
const ACTION_TYPES: ActionType[] = ['NOTIFY', 'REASSIGN', 'INCREASE_PRIORITY'];

const TRIGGER_LABELS: Record<TriggerType, string> = {
  SLA_BREACH: 'SLA Breach',
  PRIORITY: 'Priority',
};
const SLA_BREACH_LABELS: Record<SlaBreachType, string> = {
  FIRST_RESPONSE: 'First Response',
  RESOLUTION: 'Resolution',
};
const ACTION_LABELS: Record<ActionType, string> = {
  NOTIFY: 'Notify',
  REASSIGN: 'Reassign',
  INCREASE_PRIORITY: 'Increase Priority',
};

type FormState = {
  name: string;
  triggerType: TriggerType;
  priorityThreshold: Priority;
  slaBreachType: SlaBreachType;
  actionType: ActionType;
  notifyUserIds: string[];
  reassignToId: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  triggerType: 'SLA_BREACH',
  priorityThreshold: 'HIGH',
  slaBreachType: 'FIRST_RESPONSE',
  actionType: 'NOTIFY',
  notifyUserIds: [],
  reassignToId: '',
  isActive: true,
};

export default function AdminEscalationPage() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const userName = useCallback(
    (id: string | null) => {
      if (!id) return '—';
      const u = users.find((x) => x.id === id);
      return u ? `${u.firstName} ${u.lastName}` : id;
    },
    [users],
  );

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<EscalationRule[]>('/escalation-rules');
      setRules(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const [agents, leads] = await Promise.all([
        api.get<UsersResponse>('/users?role=AGENT&limit=100'),
        api.get<UsersResponse>('/users?role=TEAM_LEAD&limit=100'),
      ]);
      const merged = [...(agents.users ?? []), ...(leads.users ?? [])];
      const unique = Array.from(new Map(merged.map((u) => [u.id, u])).values());
      setUsers(unique);
    } catch {}
  }, []);

  useEffect(() => {
    fetchRules();
    fetchUsers();
  }, [fetchRules, fetchUsers]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (rule: EscalationRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      triggerType: rule.triggerType,
      priorityThreshold: rule.priorityThreshold ?? 'HIGH',
      slaBreachType: rule.slaBreachType ?? 'FIRST_RESPONSE',
      actionType: rule.actionType,
      notifyUserIds: rule.notifyUserIds ?? [],
      reassignToId: rule.reassignToId ?? '',
      isActive: rule.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        triggerType: form.triggerType,
        actionType: form.actionType,
        isActive: form.isActive,
        priorityThreshold: form.triggerType === 'PRIORITY' ? form.priorityThreshold : null,
        slaBreachType: form.triggerType === 'SLA_BREACH' ? form.slaBreachType : null,
        notifyUserIds: form.actionType === 'NOTIFY' ? form.notifyUserIds : [],
        reassignToId: form.actionType === 'REASSIGN' ? form.reassignToId || null : null,
      };
      if (editingRule) {
        await api.patch(`/escalation-rules/${editingRule.id}`, payload);
      } else {
        await api.post('/escalation-rules', payload);
      }
      setShowModal(false);
      fetchRules();
    } catch (err: any) {
      setFormError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule: EscalationRule) => {
    try {
      await api.patch(`/escalation-rules/${rule.id}`, { isActive: !rule.isActive });
      fetchRules();
    } catch {}
  };

  const handleDelete = async (rule: EscalationRule) => {
    if (!window.confirm(`Delete escalation rule "${rule.name}"?`)) return;
    try {
      await api.delete(`/escalation-rules/${rule.id}`);
      fetchRules();
    } catch {}
  };

  const toggleNotifyUser = (id: string) => {
    setForm((prev) => ({
      ...prev,
      notifyUserIds: prev.notifyUserIds.includes(id)
        ? prev.notifyUserIds.filter((x) => x !== id)
        : [...prev.notifyUserIds, id],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Escalation Rules</h1>
          <p className="text-sm text-slate-500">Automate actions when SLAs breach or priorities rise</p>
        </div>
        <Button onClick={openCreate}>+ New Rule</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>
      ) : rules.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No escalation rules configured.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trigger</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rules.map((rule) => (
                  <tr key={rule.id} className={`hover:bg-slate-50 transition-colors ${!rule.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{rule.name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold">{TRIGGER_LABELS[rule.triggerType]}</span>
                      {rule.triggerType === 'PRIORITY' && rule.priorityThreshold && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[rule.priorityThreshold] ?? ''}`}>
                          {rule.priorityThreshold}
                        </span>
                      )}
                      {rule.triggerType === 'SLA_BREACH' && rule.slaBreachType && (
                        <span className="ml-2 text-xs text-slate-500">{SLA_BREACH_LABELS[rule.slaBreachType]}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold">{ACTION_LABELS[rule.actionType]}</span>
                      {rule.actionType === 'REASSIGN' && (
                        <span className="ml-2 text-xs text-slate-500">→ {userName(rule.reassignToId)}</span>
                      )}
                      {rule.actionType === 'NOTIFY' && rule.notifyUserIds.length > 0 && (
                        <span className="ml-2 text-xs text-slate-500">{rule.notifyUserIds.length} user(s)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rule.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(rule)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                        <button
                          onClick={() => toggleActive(rule)}
                          className={`text-xs font-medium ${rule.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                        >
                          {rule.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleDelete(rule)} className="text-xs text-red-600 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-5">{editingRule ? 'Edit Escalation Rule' : 'Create Escalation Rule'}</h2>
            {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Escalate critical breaches"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Trigger Type</label>
                <select value={form.triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value as TriggerType })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>)}
                </select>
              </div>

              {form.triggerType === 'PRIORITY' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Priority Threshold</label>
                  <select value={form.priorityThreshold} onChange={(e) => setForm({ ...form, priorityThreshold: e.target.value as Priority })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              {form.triggerType === 'SLA_BREACH' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">SLA Breach Type</label>
                  <select value={form.slaBreachType} onChange={(e) => setForm({ ...form, slaBreachType: e.target.value as SlaBreachType })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                    {SLA_BREACH_TYPES.map((s) => <option key={s} value={s}>{SLA_BREACH_LABELS[s]}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-500 mb-1">Action Type</label>
                <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value as ActionType })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  {ACTION_TYPES.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
                </select>
              </div>

              {form.actionType === 'REASSIGN' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Reassign to</label>
                  <select value={form.reassignToId} onChange={(e) => setForm({ ...form, reassignToId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                    <option value="">Select a user…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {form.actionType === 'NOTIFY' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Notify users</label>
                  <div className="max-h-44 overflow-y-auto border border-slate-300 rounded-lg p-2 flex flex-col gap-1">
                    {users.length === 0 ? (
                      <span className="text-xs text-slate-400 px-1 py-1">No agents or team leads found.</span>
                    ) : (
                      users.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm text-slate-700 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.notifyUserIds.includes(u.id)}
                            onChange={() => toggleNotifyUser(u.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{u.firstName} {u.lastName} <span className="text-slate-400 text-xs">({u.email})</span></span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
