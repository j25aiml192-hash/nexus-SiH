import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  FileText,
  Clock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Cpu,
  Loader2,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { useDashboardStats } from '../hooks/useNexusData';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { stats, isLoading, error, refetch } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="nexus-center-container">
        <Loader2 className="nexus-spinner text-emerald-700 animate-spin" size={42} />
        <div className="nexus-loading-text mt-3">AGGREGATING CYBERCRIME INTELLIGENCE LEDGER...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nexus-center-container">
        <div className="nexus-card nexus-error-card max-w-lg">
          <AlertTriangle size={40} className="text-red-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Intelligence Sync Error</h2>
          <p className="text-slate-600 text-sm mt-1 mb-4">{error}</p>
          <button onClick={() => refetch()} className="nexus-btn-primary">
            Retry Aggregation
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <div className="dashboard-container p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8E6] gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-wide text-[#102A2A]">
              Command & Analytics Dashboard
            </h1>
            <span className="nexus-badge-tech">SYSTEM STATUS: OPERATIONAL</span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 font-medium">
            National Cybercrime Reporting Portal (NCRP) real-time mule account interdiction and cash-out forecasting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/map')}
            className="nexus-pill-button text-xs flex items-center gap-1.5"
          >
            <MapPin size={14} className="text-[#087F5B]" />
            Live GIS Tactical Map
          </button>
          <button
            onClick={() => navigate('/prediction/ACC-89214')}
            className="nexus-btn-primary text-xs flex items-center gap-1.5 py-2 px-3"
          >
            <Cpu size={14} />
            Run GNN Inference
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <div className="nexus-card bg-white p-4 border border-[#E2E8E6] rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Reported Complaints
            </span>
            <span className="p-2 rounded-md bg-[#E8F5F0] text-[#087F5B]">
              <FileText size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#102A2A] font-mono">
              {stats.totalComplaints}
            </span>
            <span className="text-xs text-[#0F9D72] font-semibold flex items-center">
              <TrendingUp size={12} className="mr-0.5" /> 100% indexed
            </span>
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 font-mono">
            Total Loss: {formatCurrency(stats.totalLossReported)}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="nexus-card bg-white p-4 border border-[#E2E8E6] rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Tactical Alerts
            </span>
            <span className="p-2 rounded-md bg-amber-50 text-amber-700">
              <Bell size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#102A2A] font-mono">
              {stats.activeAlertsCount}
            </span>
            <span className="text-xs text-amber-700 font-semibold">
              Pending Officer Triage
            </span>
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 font-mono">
            {stats.highRiskAlertsCount} total in detection window
          </div>
        </div>

        {/* Open Incidents */}
        <div className="nexus-card bg-white p-4 border border-[#E2E8E6] rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Active Case Dossiers
            </span>
            <span className="p-2 rounded-md bg-[#E8F5F0] text-[#087F5B]">
              <Shield size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#102A2A] font-mono">
              {stats.openIncidentsCount}
            </span>
            <span className="text-xs text-[#087F5B] font-semibold">
              Investigation Active
            </span>
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 font-mono">
            {stats.authorizedIncidentsCount} Sec 102 liens authorized
          </div>
        </div>

        {/* Funds Preservation Ratio */}
        <div className="nexus-card bg-white p-4 border border-[#E2E8E6] rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Asset Interdiction
            </span>
            <span className="p-2 rounded-md bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#087F5B] font-mono">
              87.4%
            </span>
            <span className="text-xs text-emerald-700 font-semibold">
              Preservation Ratio
            </span>
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 font-mono">
            Target SLA: &lt; 15 min cash-out window
          </div>
        </div>
      </div>

      {/* Grid: Recent Alerts & Recent Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts Column */}
        <div className="nexus-card bg-white p-5 border border-[#E2E8E6] rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#087F5B]" />
                <h2 className="text-base font-bold text-[#102A2A]">
                  Latest Tactical Escalations
                </h2>
              </div>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs font-bold text-[#087F5B] hover:underline flex items-center gap-1"
              >
                View all alerts <ArrowUpRight size={13} />
              </button>
            </div>

            <div className="space-y-2.5">
              {stats.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => navigate('/alerts')}
                  className="p-3 rounded-md bg-[#F7FAF9] border border-[#E2E8E6] hover:border-[#087F5B] cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#087F5B]">
                      {alert.id}
                    </span>
                    <span className="text-xs text-[#102A2A] font-medium">
                      Cell: <span className="font-mono text-[11px]">{alert.h3Cell}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        alert.status === 'new'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#E8F5F0] text-[#087F5B]'
                      }`}
                    >
                      {alert.status}
                    </span>
                    <Clock size={12} className="text-[#64748B]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Complaints Column */}
        <div className="nexus-card bg-white p-5 border border-[#E2E8E6] rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#087F5B]" />
                <h2 className="text-base font-bold text-[#102A2A]">
                  Recent Inbound Complaints
                </h2>
              </div>
              <button
                onClick={() => navigate('/complaints')}
                className="text-xs font-bold text-[#087F5B] hover:underline flex items-center gap-1"
              >
                Full complaints list <ArrowUpRight size={13} />
              </button>
            </div>

            <div className="space-y-2.5">
              {stats.recentComplaints.map((cmp) => (
                <div
                  key={cmp.id}
                  onClick={() => navigate('/complaints')}
                  className="p-3 rounded-md bg-[#F7FAF9] border border-[#E2E8E6] hover:border-[#087F5B] cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#102A2A]">
                        {cmp.id}
                      </span>
                      <span className="text-xs text-[#64748B]">
                        {cmp.victimInfo.name}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                      Account: {cmp.linkedAccountId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-[#102A2A]">
                      {formatCurrency(cmp.amount)}
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                        cmp.status === 'alerted'
                          ? 'bg-amber-100 text-amber-800'
                          : cmp.status === 'resolved'
                          ? 'bg-[#E8F5F0] text-[#087F5B]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cmp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
