import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Download,
  Grid,
  List,
  Copy,
  Building2,
  MapPin,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { NewComplaintModal } from '../components/nexus/NewComplaintModal';
import { useComplaints } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';

export const ComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setSelectedComplaintId = useNexusStore((state) => state.setSelectedComplaintId);

  const { complaints, isLoading, error, refetch } = useComplaints();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fraudTypeFilter, setFraudTypeFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'new');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
    }
  }, [searchParams]);

  // Extract unique fraud types for filtering
  const fraudTypes = useMemo(() => {
    const types = new Set<string>();
    complaints.forEach((c) => {
      if (c.fraud_type) types.add(c.fraud_type);
    });
    return Array.from(types);
  }, [complaints]);

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((comp) => {
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = comp.id.toLowerCase().includes(q) || (comp.complaint_id || '').toLowerCase().includes(q) || (comp.ncrp_id || '').toLowerCase().includes(q);
        const matchesBank = (comp.accused_bank || '').toLowerCase().includes(q);
        const matchesType = (comp.fraud_type || '').toLowerCase().includes(q);
        const matchesVictim = (comp.victimInfo?.name || '').toLowerCase().includes(q);
        const matchesDistrict = (comp.victim_district || '').toLowerCase().includes(q);
        const matchesState = (comp.victim_state || '').toLowerCase().includes(q);
        if (!matchesId && !matchesBank && !matchesType && !matchesVictim && !matchesDistrict && !matchesState) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'All') {
        const s = (comp.status || '').toLowerCase();
        if (statusFilter.toLowerCase() !== s) {
          return false;
        }
      }

      // Fraud type filter
      if (fraudTypeFilter !== 'All') {
        if ((comp.fraud_type || '').toLowerCase() !== fraudTypeFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [complaints, searchQuery, statusFilter, fraudTypeFilter]);

  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, currentPage, pageSize]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setFraudTypeFilter('All');
    setCurrentPage(1);
    setSearchParams({});
  };

  const handleSelectComplaint = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    navigate(`/complaints/${complaintId}`);
  };

  const handleCopyId = (e: React.MouseEvent, idStr: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(idStr);
    setCopiedId(idStr);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatAmount = (amt: number) => {
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Recent';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  // Aggregated Metrics
  const metrics = useMemo(() => {
    const totalCount = complaints.length;
    const totalExposure = complaints.reduce((sum, c) => sum + (c.amount_inr || c.amount || 0), 0);
    const flaggedCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'flagged' || (c.status || '').toLowerCase() === 'alerted').length;
    const analyzingCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'analyzing').length;
    const resolvedCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'resolved').length;

    return { totalCount, totalExposure, flaggedCount, analyzingCount, resolvedCount };
  }, [complaints]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Complaint ID', 'NCRP Ref', 'Victim Name', 'Victim Contact', 'Fraud Type', 'Amount (INR)', 'Suspect Bank', 'Victim District', 'Victim State', 'Status', 'Reported On'];
    const rows = filteredComplaints.map((c) => [
      c.complaint_id || c.id,
      c.ncrp_id || '',
      c.victimInfo?.name || '',
      c.victimInfo?.contact || '',
      c.fraud_type || '',
      c.amount_inr || c.amount || 0,
      c.accused_bank || '',
      c.victim_district || '',
      c.victim_state || '',
      c.status || '',
      c.created_at || c.filed_at || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NEXUS_Complaints_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px 32px 60px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: 0
              }}
            >
              Complaints Repository
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#000000',
                color: '#38BDF8',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              LIVE NCRP INGESTION
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Ingest, investigate, and track real reported financial cybercrime dockets, suspect banks, and mule account nodes.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => refetch()}
            title="Refresh Complaints Data"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1E293B';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000000';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={16} />
            <span>New Complaint Docket</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Metric 1: Total Ingested Cases */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#F1F5F9',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Live Complaints
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {isLoading ? '...' : metrics.totalCount}
            </div>
            <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600, marginTop: '2px' }}>
              Exposure: {formatAmount(metrics.totalExposure)}
            </div>
          </div>
        </div>

        {/* Metric 2: High Risk Flagged */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FE8989',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(239, 68, 68, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Flagged & Intercept Alerts
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {isLoading ? '...' : metrics.flaggedCount}
            </div>
            <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '2px' }}>
              Requires immediate PCR action
            </div>
          </div>
        </div>

        {/* Metric 3: Under AI Analysis */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              AI Pipeline Analyzing
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1D4ED8', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {isLoading ? '...' : metrics.analyzingCount}
            </div>
            <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 600, marginTop: '2px' }}>
              XGBoost & H3 Grid Inferencing
            </div>
          </div>
        </div>

        {/* Metric 4: Resolved */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#F0FDF4',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Mitigated & Resolved
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#16A34A', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {isLoading ? '...' : metrics.resolvedCount}
            </div>
            <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600, marginTop: '2px' }}>
              Accounts frozen & saved
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            marginBottom: '20px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px'
          }}
        >
          <AlertTriangle size={18} color="#DC2626" />
          <span style={{ fontWeight: 600 }}>{error}</span>
          <button
            onClick={() => refetch()}
            style={{
              marginLeft: 'auto',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Retry Data Ingestion
          </button>
        </div>
      )}

      {/* Control Filter Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Field */}
          <div
            style={{
              flex: 1,
              minWidth: '280px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '8px 14px'
            }}
          >
            <Search size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search complaint ID, NCRP ref, victim name, bank, district..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              STATUS:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="flagged">Flagged (Critical)</option>
              <option value="alerted">Alerted</option>
              <option value="analyzing">Analyzing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Fraud Type Filter Dropdown */}
          {fraudTypes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                CATEGORY:
              </span>
              <select
                value={fraudTypeFilter}
                onChange={(e) => {
                  setFraudTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Fraud Types</option>
                {fraudTypes.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View Mode Toggle Button Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '10px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'table' ? '#0F172A' : '#64748B',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <List size={15} />
              <span>Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'cards' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'cards' ? '#0F172A' : '#64748B',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'cards' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Grid size={15} />
              <span>Cards</span>
            </button>
          </div>

          {(searchQuery || statusFilter !== 'All' || fraudTypeFilter !== 'All') && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#EF4444',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE A: TABLE VIEW */}
      {viewMode === 'table' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    COMPLAINT ID & NCRP REF
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    VICTIM & LOCATION
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    FRAUD TYPE
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    SUSPECT BANK & MULE
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    EXPOSURE (INR)
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    REPORTED ON
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>
                        <Loader2 size={18} className="animate-spin text-blue-600" />
                        <span>Fetching live NCRP complaint records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      No complaints found matching current filter parameters.
                    </td>
                  </tr>
                ) : (
                  paginatedComplaints.map((complaint) => {
                    const cid = complaint.complaint_id || complaint.id;
                    const ncrpId = complaint.ncrp_id || cid;
                    const statusStr = (complaint.status || 'flagged').toLowerCase();

                    return (
                      <tr
                        key={cid}
                        onClick={() => handleSelectComplaint(cid)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* ID Column */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                              {ncrpId}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(e, ncrpId)}
                              title="Copy ID"
                              style={{ border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                            >
                              {copiedId === ncrpId ? <CheckCircle2 size={13} color="#16A34A" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </td>

                        {/* Victim & Location */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                            {complaint.victimInfo?.name || 'Authorized Complainant'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            <MapPin size={11} style={{ color: '#0284C7' }} />
                            <span>
                              {complaint.victim_district ? `${complaint.victim_district}, ${complaint.victim_state || ''}` : 'National Cell'}
                            </span>
                          </div>
                        </td>

                        {/* Fraud Category */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                          >
                            {(complaint.fraud_type || 'UPI Fraud').replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Bank & Mule Account */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                            <Building2 size={13} style={{ color: '#64748B' }} />
                            <span>{complaint.accused_bank || 'Beneficiary Node'}</span>
                          </div>
                          {complaint.linkedAccountId && (
                            <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#0284C7', fontWeight: 600, marginTop: '2px' }}>
                              Mule: {complaint.linkedAccountId}
                            </div>
                          )}
                        </td>

                        {/* Amount Exposure */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatAmount(complaint.amount_inr || complaint.amount || 0)}
                          </div>
                        </td>

                        {/* Status Pill */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              backgroundColor:
                                statusStr === 'flagged' ? '#FEF2F2' :
                                statusStr === 'alerted' ? '#FFF7ED' :
                                statusStr === 'analyzing' ? '#EFF6FF' : '#F0FDF4',
                              color:
                                statusStr === 'flagged' ? '#DC2626' :
                                statusStr === 'alerted' ? '#EA580C' :
                                statusStr === 'analyzing' ? '#2563EB' : '#16A34A',
                              border:
                                statusStr === 'flagged' ? '1px solid #FECACA' :
                                statusStr === 'alerted' ? '1px solid #FFEDD5' :
                                statusStr === 'analyzing' ? '1px solid #BFDBFE' : '1px solid #BBF7D0'
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor:
                                  statusStr === 'flagged' ? '#DC2626' :
                                  statusStr === 'alerted' ? '#EA580C' :
                                  statusStr === 'analyzing' ? '#2563EB' : '#16A34A'
                              }}
                            />
                            {statusStr}
                          </span>
                        </td>

                        {/* Reported Date */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                            <Clock size={12} />
                            <span>{formatDate(complaint.created_at || complaint.filed_at)}</span>
                          </div>
                        </td>

                        {/* Action Column */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectComplaint(cid);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #000000',
                              backgroundColor: '#000000',
                              color: '#FFFFFF',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#1E293B';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#000000';
                            }}
                          >
                            <span>Investigate</span>
                            <ArrowUpRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE B: CARDS GRID VIEW */}
      {viewMode === 'cards' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}
        >
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
              <Loader2 size={22} className="animate-spin text-blue-600 inline-block mb-2" />
              <div>Loading NCRP complaint dockets...</div>
            </div>
          ) : paginatedComplaints.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748B' }}>
              No complaints match current filters.
            </div>
          ) : (
            paginatedComplaints.map((complaint) => {
              const cid = complaint.complaint_id || complaint.id;
              const ncrpId = complaint.ncrp_id || cid;
              const statusStr = (complaint.status || 'flagged').toLowerCase();

              return (
                <div
                  key={cid}
                  onClick={() => handleSelectComplaint(cid)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#000000';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.02)';
                  }}
                >
                  <div>
                    {/* Card Top Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                        {ncrpId}
                      </span>
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          backgroundColor:
                            statusStr === 'flagged' ? '#FEF2F2' :
                            statusStr === 'alerted' ? '#FFF7ED' :
                            statusStr === 'analyzing' ? '#EFF6FF' : '#F0FDF4',
                          color:
                            statusStr === 'flagged' ? '#DC2626' :
                            statusStr === 'alerted' ? '#EA580C' :
                            statusStr === 'analyzing' ? '#2563EB' : '#16A34A'
                        }}
                      >
                        {statusStr}
                      </span>
                    </div>

                    {/* Amount Highlight */}
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", marginBottom: '10px' }}>
                      {formatAmount(complaint.amount_inr || complaint.amount || 0)}
                    </div>

                    {/* Fraud Category Badge */}
                    <div style={{ marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: '8px' }}>
                        {(complaint.fraud_type || 'UPI Fraud').replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={13} style={{ color: '#0284C7' }} />
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{complaint.accused_bank || 'Beneficiary Node'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} style={{ color: '#0284C7' }} />
                        <span>{complaint.victim_district ? `${complaint.victim_district}, ${complaint.victim_state || ''}` : 'National Jurisdiction'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(complaint.created_at || complaint.filed_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                      Mule: {complaint.linkedAccountId || 'ACC-8821'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectComplaint(cid);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#000000',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <span>Investigate</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #E2E8F0'
        }}
      >
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
          Showing <strong>{paginatedComplaints.length}</strong> of <strong>{filteredComplaints.length}</strong> matching complaints
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Per Page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                color: '#0F172A',
                outline: 'none'
              }}
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.4 : 1
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", padding: '0 4px' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.4 : 1
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* New Complaint Modal */}
      <NewComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplaintCreated={() => refetch()}
      />
    </div>
  );
};

export default ComplaintsPage;
