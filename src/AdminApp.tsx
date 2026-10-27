import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLayout } from './components/admin/AdminLayout';

export default function AdminApp() {
  return (
    <AuthProvider app="admin">
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    </AuthProvider>
  );
}
