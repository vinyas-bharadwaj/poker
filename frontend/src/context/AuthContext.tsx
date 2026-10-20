'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, loginUser, createUser, fetchMe } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'the_cardroom_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehydrate user from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        setUser(parsed);
        // Refresh stats in background
        fetchMe(parsed.id)
          .then((fresh) => {
            setUser(fresh);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
          })
          .catch(() => {
            // Ignore background refresh errors
          });
      }
    } catch (e) {
      console.warn('Could not read user from storage', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    const loggedIn = await loginUser({ identifier, password });
    setUser(loggedIn);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedIn));
    return loggedIn;
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ): Promise<User> => {
    const created = await createUser({ username, email, password });
    setUser(created);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    return created;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const fresh = await fetchMe(user.id);
      setUser(fresh);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch (e) {
      console.warn('Failed to refresh user stats', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
