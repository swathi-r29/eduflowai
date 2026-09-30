import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string, role?: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('eduflow_user');
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (token: string, u: User) => {
    localStorage.setItem('eduflow_token', token);
    localStorage.setItem('eduflow_user', JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (email: string, password: string, role: string = 'student') => {
    let endpoint = '/auth/login';
    let body: any = { email, password };

    if (role === 'student') {
      endpoint = '/auth/student-login';
      body = { email, identifier: email, password };
    } else if (role === 'admin') {
      endpoint = '/auth/admin-login';
      body = { email, identifier: email, password };
    }

    try {
      const { data } = await api.post(endpoint, body);
      const userObj: User = {
        id: data._id || data.user?.id || data.id,
        name: data.name || data.user?.name || email.split('@')[0],
        email: data.email || data.user?.email || email,
        role: (data.role || data.user?.role || role) as User['role'],
      };
      persist(data.token, userObj);
      return userObj;
    } catch (err: any) {
      // Fallback to /auth/login if role-specific endpoint is 404
      if (err.response?.status === 404 && endpoint !== '/auth/login') {
        const { data } = await api.post('/auth/login', { email, password });
        const userObj: User = {
          id: data.user?.id || data._id || data.id,
          name: data.user?.name || data.name || email.split('@')[0],
          email: data.user?.email || data.email || email,
          role: (data.user?.role || data.role || role) as User['role'],
        };
        persist(data.token, userObj);
        return userObj;
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: string) => {
    // Support register or signup endpoints
    let data;
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      data = res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const res = await api.post('/auth/signup', { name, email, password, role });
        data = res.data;
      } else {
        throw err;
      }
    }

    const userObj: User = {
      id: data._id || data.user?.id || data.id,
      name: data.name || data.user?.name || name,
      email: data.email || data.user?.email || email,
      role: (data.role || data.user?.role || role) as User['role'],
    };
    persist(data.token, userObj);
    return userObj;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('eduflow_token');
    localStorage.removeItem('eduflow_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

