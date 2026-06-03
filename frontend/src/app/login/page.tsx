"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 px-4">
      {/* Background decorative glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />

      {/* Card container */}
      <div className="w-full max-w-md z-10">
        <div className="backdrop-blur-md bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 shadow-2xl shadow-zinc-950/50">
          
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xl shadow-lg shadow-violet-500/25 mb-4">
              HD
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-zinc-400">Sign in to manage your support tickets</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20 text-white placeholder-zinc-500 outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20 text-white placeholder-zinc-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
            <p className="text-sm text-zinc-400">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                Create an account
              </Link>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
