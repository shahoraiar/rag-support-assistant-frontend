import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { CustomerDashboard } from '../pages/customer/CustomerDashboard';
import { CustomerTicketsPage } from '../pages/customer/CustomerTicketsPage';
import { CustomerChatPage } from '../pages/customer/CustomerChatPage';
import { CreateTicketPage } from '../pages/customer/CreateTicketPage';
import { AgentDashboard } from '../pages/agent/AgentDashboard';
import { AgentTicketsPage } from '../pages/agent/AgentTicketsPage';
import { AgentChatPage } from '../pages/agent/AgentChatPage';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { KnowledgeBasePage } from '../pages/admin/KnowledgeBasePage';
import { SLAPoliciesPage } from '../pages/admin/SLAPoliciesPage';
import { UserManagementPage } from '../pages/admin/UserManagementPage';
import { AnalyticsPage } from '../pages/admin/AnalyticsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Customer routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/tickets" element={<CustomerTicketsPage />} />
            <Route path="/customer/chat" element={<CustomerChatPage />} />
            <Route path="/customer/new-ticket" element={<CreateTicketPage />} />
          </Route>

          {/* Agent routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/agent/tickets" element={<AgentTicketsPage />} />
            <Route path="/agent/chat" element={<AgentChatPage />} />
          </Route>

          {/* Admin routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/admin/sla" element={<SLAPoliciesPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
