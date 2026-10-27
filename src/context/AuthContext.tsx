import React, { useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import { adminApi, api } from '../services/api';
import { User } from '../types';

export function AuthProvider({ children, app = 'customer' }: { children: React.ReactNode; app?: 'customer' | 'admin' }) {
  const authApi = app === 'admin' ? adminApi : api;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await authApi.getCurrentUser();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (phone: string, pass: string) => {
    await authApi.login({ phone, password: pass });
    const session = await authApi.getCurrentUser();
    if (!session.user) {
      throw new Error('Sign in succeeded, but the browser did not save the session. Keep cookies enabled and use the same localhost address.');
    }
    setUser(session.user);
  };

  const register = async (name: string, phone: string, pass: string, email?: string) => {
    await authApi.register({ name, phone, password: pass, email });
    const session = await authApi.getCurrentUser();
    if (!session.user) {
      throw new Error('Account created, but the browser did not save the session. Keep cookies enabled and use the same localhost address.');
    }
    setUser(session.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      // Keep the UI signed out even if the session-clear request cannot reach the server.
      setUser(null);
    }
  };

  const updateProfile = async (data: { name?: string; email?: string }) => {
    const res = await authApi.updateProfile(data);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
