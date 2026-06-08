"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';

type Profile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  role: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
};

const inputClass =
  'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500';
const disabledInputClass =
  'w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed';

export default function ProfilePage() {
  const { refreshProfile } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Account details form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSuccess, setDetailsSuccess] = useState(false);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<Profile>('/profile');
      setProfile(data);
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setAvatarUrl(data.avatarUrl ?? '');
    } catch (err: any) {
      setLoadError(err.message ?? 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsError(null);
    setDetailsSuccess(false);
    try {
      const updated = await api.patch<Profile>('/profile', {
        firstName,
        lastName,
        avatarUrl: avatarUrl.trim() === '' ? null : avatarUrl.trim(),
      });
      setProfile(updated);
      setFirstName(updated.firstName ?? '');
      setLastName(updated.lastName ?? '');
      setAvatarUrl(updated.avatarUrl ?? '');
      setDetailsSuccess(true);
      // Keep the Navbar / auth context in sync with the new name/avatar.
      refreshProfile().catch(() => {});
    } catch (err: any) {
      setDetailsError(err.message ?? 'Failed to save changes');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/profile/change-password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
    } catch (err: any) {
      setPasswordError(err.message ?? 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your account details and password.</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
            </div>
          ) : loadError ? (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {loadError}
            </div>
          ) : (
            <div className="grid gap-6">
              {/* Card 1 — Account details */}
              <Card>
                <CardContent>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">Account details</h2>
                  <p className="text-sm text-slate-500 mb-5">Your personal information.</p>

                  <form onSubmit={handleSaveDetails} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Email</label>
                      <input type="email" value={profile?.email ?? ''} disabled className={disabledInputClass} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500">Role</span>
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-blue-50 text-blue-700 border-blue-200 w-fit">
                          {profile?.role?.name ?? '—'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500">Team</span>
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-100 text-slate-600 border-slate-200 w-fit">
                          {profile?.team?.name ?? '—'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">First Name</label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Last Name</label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Avatar URL</label>
                      <input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.png"
                        className={inputClass}
                      />
                    </div>

                    {detailsError && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                        {detailsError}
                      </div>
                    )}
                    {detailsSuccess && (
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                        Profile updated successfully.
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button type="submit" disabled={savingDetails}>
                        {savingDetails ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Card 2 — Change password */}
              <Card>
                <CardContent>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">Change password</h2>
                  <p className="text-sm text-slate-500 mb-5">Use at least 8 characters.</p>

                  <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {passwordError && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                        Password updated successfully.
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button type="submit" disabled={savingPassword}>
                        {savingPassword ? 'Updating…' : 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
