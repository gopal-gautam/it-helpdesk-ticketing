"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  role?: { id: string; name: string };
  team?: { id: string; name: string };
};

type UsersResponse = {
  users: User[];
  total: number;
  totalPages: number;
  page: number;
};

type Role = { id: string; name: string };
type Team = { id: string; name: string };

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-700 border-red-200',
  TEAM_LEAD: 'bg-amber-50 text-amber-700 border-amber-200',
  AGENT: 'bg-green-50 text-green-700 border-green-200',
  REQUESTER: 'bg-blue-50 text-blue-700 border-blue-200',
};

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', roleId: '', teamId: '' };

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const result = await api.get<UsersResponse>(`/users?${params}`);
      setData(result);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    api.get<Role[]>('/users/roles').then(setRoles).catch(() => {});
    api.get<{ teams: Team[] }>('/teams?limit=100').then((r) => setTeams(r.teams)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      roleId: user.role?.id ?? '',
      teamId: user.team?.id ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      if (editingUser) {
        const payload: any = { firstName: form.firstName, lastName: form.lastName, roleId: form.roleId || undefined, teamId: form.teamId || undefined };
        await api.patch(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', { ...form, roleId: form.roleId || undefined, teamId: form.teamId || undefined });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch {}
  };

  const users = data?.users ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} total users</p>
        </div>
        <Button onClick={openCreate}>+ New User</Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="flex-1 min-w-48 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Roles</option>
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Team</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Joined</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No users found.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.firstName} {user.lastName}</td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[user.role.name] ?? ''}`}>
                        {user.role.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{user.team?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${user.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(user)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                      <button onClick={() => toggleActive(user)} className={`text-xs font-medium ${user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</Button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-5">{editingUser ? 'Edit User' : 'Create User'}</h2>
            {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">First Name</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Last Name</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Password</label>
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Role</label>
                <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  <option value="">No role</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Team</label>
                <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  <option value="">No team</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
    </div>
  );
}
