import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('eduflow_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user || null);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      localStorage.removeItem('eduflow_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string, role?: string): Promise<User> => {
    const { data } = await api.post('/auth/login', { email, password, role });
    if (data.token) {
      localStorage.setItem('eduflow_token', data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const register = async (name: string, email: string, password: string, role = 'student'): Promise<User> => {
    const { data } = await api.post('/auth/register', { name, email, password, role });
    if (data.token) {
      localStorage.setItem('eduflow_token', data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('eduflow_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
