"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type SLAProfile = {
  id: string;
  name: string;
  priority: string;
  firstResponseHours: number;
  resolutionHours: number;
  isActive: boolean;
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const EMPTY_FORM = { name: '', priority: 'MEDIUM', firstResponseHours: 4, resolutionHours: 24 };

export default function AdminSLAPage() {
  const [profiles, setProfiles] = useState<SLAProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SLAProfile | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SLAProfile[]>('/sla-profiles');
      setProfiles(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const openCreate = () => {
    setEditingProfile(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (profile: SLAProfile) => {
    setEditingProfile(profile);
    setForm({
      name: profile.name,
      priority: profile.priority,
      firstResponseHours: profile.firstResponseHours,
      resolutionHours: profile.resolutionHours,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        firstResponseHours: Number(form.firstResponseHours),
        resolutionHours: Number(form.resolutionHours),
      };
      if (editingProfile) {
        await api.patch(`/sla-profiles/${editingProfile.id}`, payload);
      } else {
        await api.post('/sla-profiles', payload);
      }
      setShowModal(false);
      fetchProfiles();
    } catch (err: any) {
      setFormError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (profile: SLAProfile) => {
    try {
      await api.patch(`/sla-profiles/${profile.id}`, { isActive: !profile.isActive });
      fetchProfiles();
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">SLA Profiles</h1>
          <p className="text-sm text-slate-500">Define response and resolution time targets</p>
        </div>
        <Button onClick={openCreate}>+ New Profile</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>
      ) : profiles.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No SLA profiles configured.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">First Response</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Resolution</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {profiles.map((profile) => (
                  <tr key={profile.id} className={`hover:bg-slate-50 transition-colors ${!profile.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{profile.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[profile.priority] ?? ''}`}>
                        {profile.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold">{profile.firstResponseHours}h</span>
                      <span className="text-slate-500 text-xs ml-1">business hrs</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold">{profile.resolutionHours}h</span>
                      <span className="text-slate-500 text-xs ml-1">business hrs</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${profile.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {profile.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(profile)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                        <button
                          onClick={() => toggleActive(profile)}
                          className={`text-xs font-medium ${profile.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                        >
                          {profile.isActive ? 'Disable' : 'Enable'}
                        </button>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-5">{editingProfile ? 'Edit SLA Profile' : 'Create SLA Profile'}</h2>
            {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Profile Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Critical - 1h Response"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">First Response (hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.firstResponseHours}
                    onChange={(e) => setForm({ ...form, firstResponseHours: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Resolution (hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.resolutionHours}
                    onChange={(e) => setForm({ ...form, resolutionHours: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">Hours are in business hours (Mon–Fri, 9am–5pm)</p>
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
