import React, { useState } from 'react';
import { Calendar, ChevronDown, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { PriorityAlertsCard } from '../components/nexus/PriorityAlertsCard';
import { LiveActivityCard } from '../components/nexus/LiveActivityCard';
import { RiskBreakdownCard } from '../components/nexus/RiskBreakdownCard';
import { QuickActionsCard } from '../components/nexus/QuickActionsCard';
import { NewComplaintModal } from '../components/nexus/NewComplaintModal';
import { useDashboardStats } from '../hooks/useNexusData';
import type { Complaint } from '../types/nexus';

export const DashboardPage: React.FC = () => {
  const [roleMode, setRoleMode] = useState<'Analyst' | 'Officer'>('Analyst');
  const [timeframe, setTimeframe] = useState('Last 24h');
  const [showNewComplaintModal, setShowNewComplaintModal] = useState(false);

  // Map display timeframe to API parameter
  const apiTimeframe = timeframe === 'Last 30d' ? '30d' : timeframe === 'Last 7d' ? '7d' : '24h';
  const { stats, isLoading, error, refetch } = useDashboardStats(apiTimeframe);

  const handleNewComplaint = (_createdComp: Complaint) => {
    refetch();
  };

  const cycleTimeframe = () => {
    const frames = ['Last 24h', 'Last 7d', 'Last 30d'];
    const nextIdx = (frames.indexOf(timeframe) + 1) % frames.length;
    setTimeframe(frames[nextIdx]);
  };

  return (
    <div className="nexus-page-container">
      {/* Page Header Section */}
      <div className="nexus-dashboard-header">
        <div className="nexus-dashboard-title-area">
          <div className="flex items-center gap-3">
            <h1 className="nexus-page-title">DASHBOARD</h1>
            <span className="nexus-badge-system-online">
              <span className="nexus-live-dot"></span> System online
            </span>
          </div>
          <p className="nexus-page-subtitle">Live cybercrime defense intelligence & predictive cashout monitoring.</p>
        </div>

        <div className="nexus-header-controls flex items-center gap-3">
          {/* Role Segmented Switcher */}
          <div className="nexus-role-toggle">
            <button
              onClick={() => setRoleMode('Analyst')}
              className={`nexus-role-btn ${roleMode === 'Analyst' ? 'active' : ''}`}
            >
              Analyst
            </button>
            <button
              onClick={() => setRoleMode('Officer')}
              className={`nexus-role-btn ${roleMode === 'Officer' ? 'active' : ''}`}
            >
              Officer
            </button>
          </div>

          {/* Timeframe Selector */}
          <button
            onClick={cycleTimeframe}
            className="nexus-timeframe-btn flex items-center gap-2"
          >
            <Calendar size={14} className="text-[#64748B]" />
            <span>{timeframe}</span>
            <ChevronDown size={14} className="text-[#94A3B8]" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => refetch()} className="ml-auto underline font-semibold text-xs">
            Retry Connection
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="nexus-kpi-grid">
        {/* KPI 1: Open Complaints */}
        <div className="nexus-kpi-card">
          <div className="nexus-kpi-top">
            <span className="nexus-kpi-label">OPEN COMPLAINTS</span>
            <span className="nexus-kpi-trend font-mono flex items-center gap-1">
              <TrendingUp size={12} className="text-[#087F5B]" /> live DB
            </span>
          </div>
          <div className="nexus-kpi-value font-mono">
            {isLoading ? <Loader2 size={24} className="animate-spin text-slate-400" /> : (stats?.openComplaints ?? 0)}
          </div>
          <div className="nexus-kpi-subtext">Currently under active investigation</div>
        </div>

        {/* KPI 2: Active Alerts */}
        <div className="nexus-kpi-card">
          <div className="nexus-kpi-top flex justify-between items-center">
            <span className="nexus-kpi-label">ACTIVE ALERTS</span>
            <span className="nexus-badge-risk nexus-badge-critical text-[10px] py-0.5 px-1.5">
              {stats?.highestAlertRisk || 'CRITICAL'}
            </span>
          </div>
          <div className="nexus-kpi-value font-mono">
            {isLoading ? <Loader2 size={24} className="animate-spin text-slate-400" /> : (stats?.activeAlerts ?? 0)}
          </div>
          <div className="nexus-kpi-subtext flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
            <span>Highest risk: {stats?.highestAlertRisk || 'Critical'}</span>
          </div>
        </div>

        {/* KPI 3: Incidents */}
        <div className="nexus-kpi-card">
          <div className="nexus-kpi-top">
            <span className="nexus-kpi-label">INCIDENTS</span>
          </div>
          <div className="nexus-kpi-incidents-metrics">
            <div className="nexus-kpi-incident-item">
              <div className="nexus-kpi-value font-mono">
                {isLoading ? '...' : (stats?.incidentsInProgress ?? 0)}
              </div>
              <div className="nexus-kpi-subtext">In progress</div>
            </div>
            <div className="nexus-kpi-incident-item">
              <div className="nexus-kpi-value font-mono">
                {isLoading ? '...' : (stats?.incidentsClosedToday ?? 0)}
              </div>
              <div className="nexus-kpi-subtext">Closed/Authorized</div>
            </div>
          </div>
        </div>

        {/* KPI 4: Funds At Risk */}
        <div className="nexus-kpi-card nexus-kpi-card-funds">
          <div className="nexus-kpi-top">
            <span className="nexus-kpi-label">FUNDS AT RISK</span>
          </div>
          <div className="nexus-kpi-value font-mono text-[#087F5B]">
            {isLoading ? '...' : (stats?.totalFundsAtRisk ?? '₹0')}
          </div>
          <div className="nexus-kpi-subtext">
            {isLoading ? '...' : (stats?.totalFundsFrozen ?? '₹0')} secured / frozen
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (~65%) and Right Column (~35%) */}
      <div className="nexus-dashboard-main-grid">
        <div className="nexus-col-left space-y-6">
          <PriorityAlertsCard alerts={stats?.priorityAlerts} />
          <LiveActivityCard items={stats?.liveActivity} />
        </div>

        <div className="nexus-col-right space-y-6">
          <RiskBreakdownCard data={stats?.riskBreakdown} />
          <QuickActionsCard onNewComplaint={() => setShowNewComplaintModal(true)} />
        </div>
      </div>

      {/* New Complaint Modal */}
      <NewComplaintModal
        isOpen={showNewComplaintModal}
        onClose={() => setShowNewComplaintModal(false)}
        onComplaintCreated={handleNewComplaint}
      />

      {/* Operational Footer */}
      <footer className="nexus-demonstration-footer">
        NEXUS · RESTRICTED OPERATIONAL INTEL · CONNECTED TO LIVE BACKEND &amp; SQLITE REPOSITORY
      </footer>
    </div>
  );
};
