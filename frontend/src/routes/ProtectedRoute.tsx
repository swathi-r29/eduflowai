import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import Layout from '../components/layout/Layout';

export default function ProtectedRoute({ roles, children, noLayout }: { roles: Role[]; children: React.ReactNode; noLayout?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  if (noLayout) return <>{children}</>;
  return <Layout>{children}</Layout>;
}
