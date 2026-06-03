"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Button } from '../ui/Button';
import { ticket, user, logOut } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-blue-600">
          IT Helpdesk
        </Link>
        {user && (
          <div className="flex items-center gap-2 ml-4">
            <Link href="/tickets" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600">
              Tickets
            </Link>
            {user.role !== 'REQUESTER' && (
              <Link href="/admin" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600">
                Admin
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</span>
              <span className="text-xs text-gray-500">{user.role}</span>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button variant="primary" size="sm">Login</Button>
          </Link>
        )}
      </div>
    </nav>
  );
};
