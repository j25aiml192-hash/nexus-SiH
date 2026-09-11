import React, { useState } from 'react';
import { Calendar, ChevronDown, TrendingUp } from 'lucide-react';
import { DASHBOARD_STATS } from '../data/nexus-data';
import { PriorityAlertsCard } from '../components/nexus/PriorityAlertsCard';
import { LiveActivityCard } from '../components/nexus/LiveActivityCard';
import { RiskBreakdownCard } from '../components/nexus/RiskBreakdownCard';
import { QuickActionsCard } from '../components/nexus/QuickActionsCard';
import { NewComplaintModal } from '../components/nexus/NewComplaintModal';
import { COMPLAINTS_DATA, type ComplaintDetail } from '../data/complaints-data';

export const DashboardPage: React.FC = () => {
  const [roleMode, setRoleMode] = useState<'Analyst' | 'Officer'>('Analyst');
  const [timeframe, setTimeframe] = useState('Last 24h');
  const [showNewComplaintModal, setShowNewComplaintModal] = useState(false);

  const handleNewComplaint = (newComp: Partial<ComplaintDetail>) => {
    COMPLAINTS_DATA.unshift(newComp as ComplaintDetail);
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
          <p className="nexus-page-subtitle">Overview of active complaints, alerts and investigations.</p>
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

      {/* 4 KPI Summary Cards */}
      <div className="nexus-kpi-grid">
        {/* KPI 1: Open Complaints */}
        <div className="nexus-kpi-card">
          <div className="nexus-kpi-top">
            <span className="nexus-kpi-label">OPEN COMPLAINTS</span>
            <span className="nexus-kpi-trend font-mono flex items-center gap-1">
              <TrendingUp size={12} className="text-[#087F5B]" /> +12% from last week
            </span>
          </div>
          <div className="nexus-kpi-value font-mono">
            {DASHBOARD_STATS.openComplaints}
          </div>
          <div className="nexus-kpi-subtext">Currently under investigation</div>
        </div>

        {/* KPI 2: Active Alerts */}
        <div className="nexus-kpi-card">
          <div className="nexus-kpi-top flex justify-between items-center">
            <span className="nexus-kpi-label">ACTIVE ALERTS</span>
            <span className="nexus-badge-risk nexus-badge-critical text-[10px] py-0.5 px-1.5">
              CRITICAL
            </span>
          </div>
          <div className="nexus-kpi-value font-mono">
            {DASHBOARD_STATS.activeAlerts}
          </div>
          <div className="nexus-kpi-subtext flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
            <span>Highest risk: {DASHBOARD_STATS.highestAlertRisk}</span>
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
                {DASHBOARD_STATS.incidentsInProgress}
              </div>
              <div className="nexus-kpi-subtext">In progress</div>
            </div>
            <div className="nexus-kpi-incident-item">
              <div className="nexus-kpi-value font-mono">
                {DASHBOARD_STATS.incidentsClosedToday}
              </div>
              <div className="nexus-kpi-subtext">Closed today</div>
            </div>
          </div>
        </div>

        {/* KPI 4: Funds At Risk */}
        <div className="nexus-kpi-card nexus-kpi-card-funds">
          <div className="nexus-kpi-top">
            <span className="nexus-kpi-label">FUNDS AT RISK</span>
          </div>
          <div className="nexus-kpi-value font-mono text-[#087F5B]">
            {DASHBOARD_STATS.totalFundsAtRisk}
          </div>
          <div className="nexus-kpi-subtext">
            {DASHBOARD_STATS.totalFundsFrozen} frozen
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (~65%) and Right Column (~35%) */}
      <div className="nexus-dashboard-main-grid">
        <div className="nexus-col-left space-y-6">
          <PriorityAlertsCard />
          <LiveActivityCard />
        </div>

        <div className="nexus-col-right space-y-6">
          <RiskBreakdownCard />
          <QuickActionsCard onNewComplaint={() => setShowNewComplaintModal(true)} />
        </div>
      </div>

      {/* New Complaint Modal */}
      <NewComplaintModal
        isOpen={showNewComplaintModal}
        onClose={() => setShowNewComplaintModal(false)}
        onComplaintCreated={handleNewComplaint}
      />

      {/* Demonstration Footer */}
      <footer className="nexus-demonstration-footer">
        NEXUS · RESTRICTED OPERATIONAL USE · ALL IDENTIFIERS MASKED · DEMONSTRATION DATA
      </footer>
    </div>
  );
};
