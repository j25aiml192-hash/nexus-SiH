import { useState } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNexusStore } from '@/store/nexusStore';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import RoleGuard from '@/components/layout/RoleGuard';
import AlertTicker from '@/components/alerts/AlertTicker';
import ComplaintModal from '@/components/shared/ComplaintModal';
import LoadingPulse from '@/components/shared/LoadingPulse';
import { useAlerts } from '@/hooks/useAlerts';
import { ROLES } from '@/lib/constants';
import Login from '@/pages/auth/Login';
import CommandCenter from '@/pages/i4c/CommandCenter';
import Complaints from '@/pages/i4c/Complaints';
import PredictionDetail from '@/pages/i4c/PredictionDetail';
import NationalHeatmap from '@/pages/i4c/NationalHeatmap';
import Reports from '@/pages/i4c/Reports';
import DailyBrief from '@/pages/i4c/DailyBrief';
import Sentinel from '@/pages/i4c/Sentinel';
import StateDashboard from '@/pages/lea/StateDashboard';
import AlertDetail from '@/pages/lea/AlertDetail';
import CaseHistory from '@/pages/lea/CaseHistory';
import BankAlerts from '@/pages/bank/BankAlerts';
import FlaggedAccounts from '@/pages/bank/FlaggedAccounts';
import Assignment from '@/pages/field/Assignment';
import IncidentReport from '@/pages/field/IncidentReport';

import Toast from '@/components/shared/Toast';

function ProtectedLayout() {
  const { user, loading, signOut } = useAuth();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  if (loading) return <LoadingPulse />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-9">
      <Sidebar onLogout={async () => { await signOut(); navigate('/login'); }} />
      <TopBar onNewComplaint={() => setModal(true)} />
      <main className="min-h-screen px-4 pb-8 pt-20 lg:ml-60 lg:px-7">
        <Outlet />
      </main>
      <AlertTicker alerts={alerts} />
      {modal && <ComplaintModal onClose={() => setModal(false)} />}
    </div>
  );
}

function Guarded({ roles, children }: { roles: string[]; children: React.ReactNode }) { return <RoleGuard roles={roles}>{children}</RoleGuard>; }

function Unauthorized() {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F6F9] p-6 text-center">
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
        <p className="font-mono text-5xl font-bold text-[#1E40AF]">403</p>
        <h1 className="mt-4 text-2xl font-semibold text-[#0F1B2D]">Access denied</h1>
        <p className="mt-2 text-sm text-[#64748B]">This operational view is not available for your role.</p>
        <button onClick={() => navigate(-1)} className="nexus-btn mt-6">Go back</button>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard" element={<Guarded roles={[ROLES.I4C_NATIONAL]}><CommandCenter /></Guarded>} />
          <Route path="/sentinel" element={<Guarded roles={[ROLES.I4C_NATIONAL]}><Sentinel /></Guarded>} />
          <Route path="/complaints" element={<Guarded roles={[ROLES.I4C_NATIONAL]}><Complaints /></Guarded>} />
          <Route path="/prediction/:id" element={<Guarded roles={[ROLES.I4C_NATIONAL, ROLES.STATE_LEA]}><PredictionDetail /></Guarded>} />
          <Route path="/heatmap" element={<Guarded roles={[ROLES.I4C_NATIONAL]}><NationalHeatmap /></Guarded>} />
          <Route path="/reports" element={<Guarded roles={[ROLES.I4C_NATIONAL]}><Reports /></Guarded>} />
          <Route path="/brief" element={<Guarded roles={[ROLES.I4C_NATIONAL]}><DailyBrief /></Guarded>} />
          <Route path="/lea/dashboard" element={<Guarded roles={[ROLES.STATE_LEA]}><StateDashboard /></Guarded>} />
          <Route path="/lea/alerts" element={<Guarded roles={[ROLES.STATE_LEA]}><AlertDetail /></Guarded>} />
          <Route path="/lea/alert/:id" element={<Guarded roles={[ROLES.STATE_LEA]}><AlertDetail /></Guarded>} />
          <Route path="/lea/history" element={<Guarded roles={[ROLES.STATE_LEA]}><CaseHistory /></Guarded>} />
          <Route path="/bank/alerts" element={<Guarded roles={[ROLES.BANK_OFFICER]}><BankAlerts /></Guarded>} />
          <Route path="/bank/accounts" element={<Guarded roles={[ROLES.BANK_OFFICER]}><FlaggedAccounts /></Guarded>} />
          <Route path="/field" element={<Guarded roles={[ROLES.FIELD_OFFICER]}><Assignment /></Guarded>} />
          <Route path="/field/report" element={<Guarded roles={[ROLES.FIELD_OFFICER]}><IncidentReport /></Guarded>} />
        </Route>
      </Routes>
      <Toast />
    </>
  );
}

function HomeRedirect() {
  const role = useNexusStore((s) => s.user?.role);
  if (role === ROLES.STATE_LEA) return <Navigate to="/lea/dashboard" replace />;
  if (role === ROLES.BANK_OFFICER) return <Navigate to="/bank/alerts" replace />;
  if (role === ROLES.FIELD_OFFICER) return <Navigate to="/field" replace />;
  return <Navigate to="/dashboard" replace />;
}
