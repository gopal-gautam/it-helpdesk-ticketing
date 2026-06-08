"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type TeamMember = { id: string; firstName: string; lastName: string; email: string };
type Team = {
  id: string;
  name: string;
  description?: string;
  lead?: TeamMember;
  members: TeamMember[];
  _count: { tickets: number; members: number };
};

type TeamsResponse = { teams: Team[]; total: number; totalPages: number; page: number };
type UserOption = { id: string; firstName: string; lastName: string; email: string };

const EMPTY_FORM = { name: '', description: '', leadId: '' };

export default function AdminTeamsPage() {
  const [data, setData] = useState<TeamsResponse | null>(null);
  const [agents, setAgents] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [memberModal, setMemberModal] = useState<Team | null>(null);
  const [memberUserId, setMemberUserId] = useState('');
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      const result = await api.get<TeamsResponse>(`/teams?${params}`);
      setData(result);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  useEffect(() => {
    api.get<{ users: UserOption[] }>('/users?limit=200').then((r) => {
      setAllUsers(r.users);
      setAgents(r.users);
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingTeam(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setForm({ name: team.name, description: team.description ?? '', leadId: team.lead?.id ?? '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, leadId: form.leadId || undefined, description: form.description || undefined };
      if (editingTeam) {
        await api.patch(`/teams/${editingTeam.id}`, payload);
      } else {
        await api.post('/teams', payload);
      }
      setShowModal(false);
      fetchTeams();
    } catch (err: any) {
      setFormError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const openMemberModal = (team: Team) => {
    setMemberModal(team);
    setMemberUserId('');
  };

  const addMember = async () => {
    if (!memberModal || !memberUserId) return;
    try {
      await api.post(`/teams/${memberModal.id}/members/${memberUserId}`, {});
      fetchTeams();
      setMemberModal(null);
    } catch {}
  };

  const removeMember = async (teamId: string, userId: string) => {
    try {
      await api.delete(`/teams/${teamId}/members/${userId}`);
      fetchTeams();
    } catch {}
  };

  const teams = data?.teams ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Teams</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} teams</p>
        </div>
        <Button onClick={openCreate}>+ New Team</Button>
      </div>

      {/* Search */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search teams…"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </CardContent>
      </Card>

      {/* Team Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>
      ) : teams.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No teams found.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{team.name}</h3>
                    {team.description && <p className="text-sm text-slate-500 mt-0.5">{team.description}</p>}
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>{team._count.members} member{team._count.members !== 1 ? 's' : ''}</span>
                      <span>{team._count.tickets} ticket{team._count.tickets !== 1 ? 's' : ''}</span>
                      {team.lead && <span>Lead: {team.lead.firstName} {team.lead.lastName}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openMemberModal(team)}>Members</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(team)}>Edit</Button>
                  </div>
                </div>
                {team.members.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1 text-xs text-slate-700">
                        <span>{m.firstName} {m.lastName}</span>
                        <button onClick={() => removeMember(team.id, m.id)} className="text-slate-500 hover:text-red-600 ml-1">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-5">{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
            {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Team Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Team Lead</label>
                <select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  <option value="">No lead</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} ({a.email})</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {memberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Add Member to {memberModal.name}</h2>
            <p className="text-xs text-slate-500 mb-5">Select a user to add to this team.</p>
            <select
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 mb-4"
            >
              <option value="">Select user…</option>
              {allUsers
                .filter((u) => !memberModal.members.some((m) => m.id === u.id))
                .map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMemberModal(null)}>Cancel</Button>
              <Button onClick={addMember} disabled={!memberUserId}>Add Member</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
