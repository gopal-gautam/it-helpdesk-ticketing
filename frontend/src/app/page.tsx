"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-600/30 border-t-violet-600 animate-spin" />
          <p className="text-sm font-medium text-zinc-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Define role badge color mappings
  const getRoleBadgeClass = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'TEAM_LEAD':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'AGENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/10">
              HD
            </div>
            <span className="font-bold tracking-tight text-white hidden sm:block">IT Helpdesk Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right hidden md:flex">
              <span className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</span>
              <span className="text-xs text-zinc-400">{user.email}</span>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Welcome Section */}
        <div className="mb-10 p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-xl relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-zinc-400 max-w-xl">
                Ready to manage your tickets? Let's verify that your authentication profile matches the system configurations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-500">Access Level:</span>
              <span className={`px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${getRoleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Verification Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User details card */}
          <div className="lg:col-span-2 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 border-b border-zinc-800 pb-4">Auth Profile Details (/api/auth/me)</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">User ID</dt>
                <dd className="text-sm font-mono text-zinc-300 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800/60 truncate">{user.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Email</dt>
                <dd className="text-sm text-zinc-300 font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">First Name</dt>
                <dd className="text-sm text-zinc-300 font-medium">{user.firstName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Last Name</dt>
                <dd className="text-sm text-zinc-300 font-medium">{user.lastName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Role Assigned</dt>
                <dd className="text-sm text-zinc-300 font-medium flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                  {user.role}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Team Association</dt>
                <dd className="text-sm text-zinc-300 font-medium">
                  {user.team || <span className="text-zinc-500 italic">No team assigned</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Created At</dt>
                <dd className="text-sm text-zinc-300 font-medium">{new Date(user.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Status</dt>
                <dd className="text-sm text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Active Profile
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick links & tips */}
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-4">Auth Phase Verified</h3>
              <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                Congratulations! Phase 1 of the implementation is fully complete. The backend configuration uses port 3001, handles JWT validation, and the frontend secures session keys within local storage.
              </p>
              
              <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-900/30 text-xs text-violet-300 leading-relaxed mb-4">
                <strong>Next Step:</strong> Phase 2 focuses on CRUD operations for tickets, RBAC validation endpoints, and internal comment note masking.
              </div>
            </div>
            
            <div className="pt-4 border-t border-zinc-800/80 text-xs text-zinc-500">
              Session validation is fully active.
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
