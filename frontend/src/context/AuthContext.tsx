"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  team: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async (token: string) => {
    try {
      const profile = await api.get<UserProfile>('/auth/me', { token });
      setUser(profile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchProfile(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', {
        email,
        password,
      });
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Fetch full profile details
      await fetchProfile(response.accessToken);
      
      router.push('/');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', data);
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      await fetchProfile(response.accessToken);
      
      router.push('/');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsLoading(false);
    router.push('/login');
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
