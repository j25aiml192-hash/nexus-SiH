import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  MoreHorizontal,
  Activity,
  FileText,
  MapPin,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Shield,
  Zap,
  Download,
  Lock,
  MessageSquare,
  Clock,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { dataSource } from '../services/dataSource';
import { useNexusStore } from '../store/useNexusStore';
import type { Complaint } from '../types/nexus';

export const ComplaintDetailPage: React.FC = () => {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const setSelectedComplaintId = useNexusStore((state: any) => state.setSelectedComplaintId);
  const user = useNexusStore((state: any) => state.user);

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive state
  const [notes, setNotes] = useState<Array<{ id: string; author: string; timestamp: string; text: string }>>([
    {
      id: 'note-init',
      author: user?.name || 'Lead Analyst (I4C Cell)',
      timestamp: '10:30 AM',
      text: 'Case received via portal. Automated mule chain extraction initiated.',
    },
  ]);

  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [currentStatus, setCurrentStatus] = useState('Under Investigation');
  const [assignedOfficer, setAssignedOfficer] = useState('Unassigned');
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!complaintId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    dataSource.getComplaintById(complaintId)
      .then((res) => {
        if (!isMounted) return;
        if (!res) {
          setError(`Complaint record "${complaintId}" does not exist in the NEXUS database.`);
        } else {
          setComplaint(res);
          setSelectedComplaintId(res.complaint_id);
          setAssignedOfficer(res.assignedOfficer || 'Unassigned');
          setCurrentStatus(
            res.status === 'resolved' ? 'Resolved' :
            res.status === 'flagged' ? 'Under Investigation' :
            res.status === 'alerted' ? 'Under Investigation' : 'Under Investigation'
          );
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to retrieve complaint from backend.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [complaintId, setSelectedComplaintId]);

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      author: user?.name || 'Authorized Officer',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      text: newNoteText.trim(),
    };
    setNotes((prev) => [note, ...prev]);
    setNewNoteText('');
    setShowAddNoteModal(false);
    setNoticeBanner('Tactical investigation note saved.');
    setTimeout(() => setNoticeBanner(null), 4000);
  };

  const handleAssignOfficerSelect = (officer: string) => {
    setAssignedOfficer(officer);
    setShowAssignOfficerModal(false);
    setNoticeBanner(`Officer ${officer} assigned to case.`);
    setTimeout(() => setNoticeBanner(null), 4000);
  };

  const handleStatusSelect = (status: string) => {
    setCurrentStatus(status);
    setShowStatusModal(false);
    setNoticeBanner(`Complaint status updated to "${status}".`);
    setTimeout(() => setNoticeBanner(null), 4000);
  };

  const handleViewOnMap = () => {
    if (!complaint) return;
    setSelectedComplaintId(complaint.complaint_id);
    navigate('/map');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 76px)', padding: '40px', color: '#64748B' }}>
        <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
        <div style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>
          STREAMING COMPLAINT DOSSIER {complaintId}...
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 76px)', padding: '40px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #FECACA', padding: '36px', maxWidth: '480px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
          <AlertTriangle size={44} color="#DC2626" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>COMPLAINT DOSSIER NOT FOUND</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px', lineHeight: 1.5 }}>
            {error || `Complaint ID "${complaintId}" does not exist in active ledger.`}
          </p>
          <button
            onClick={() => navigate('/complaints')}
            style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: '#000000', color: '#FFFFFF', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            ← Return to Complaints Ledger
          </button>
        </div>
      </div>
    );
  }

  const amountVal = Number(complaint.amount || complaint.amount_inr || 0);
  const formattedAmount =
    amountVal >= 10000000 ? `₹${(amountVal / 10000000).toFixed(2)} Cr` :
    amountVal >= 100000 ? `₹${(amountVal / 100000).toFixed(1)} L` :
    `₹${amountVal.toLocaleString('en-IN')}`;

  const reportedDate = complaint.created_at ? new Date(complaint.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent';
  const displayId = complaint.ncrp_id || complaint.complaint_id || complaint.id || 'NCRP-A82D74';
  const primaryAcc = complaint.linkedAccountId || (complaint.accused_bank ? `${complaint.accused_bank} Acc` : 'ACC-PRIMARY-8821');

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      minHeight: 'calc(100vh - 76px)',
      color: '#0F172A',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '24px 32px 60px 32px'
    }}>
      {/* SUCCESS NOTICE BANNER */}
      {noticeBanner && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 18px',
          borderRadius: '12px',
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#16A34A',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 14px rgba(22, 163, 74, 0.08)'
        }}>
          <CheckCircle2 size={18} />
          <span>{noticeBanner}</span>
        </div>
      )}

      {/* 1. BREADCRUMBS & NAVIGATION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => navigate('/complaints')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '13px',
              fontWeight: 700,
              color: '#0284C7',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <ArrowLeft size={14} /> Back to complaints
          </button>
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Complaints</span>
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{displayId}</span>
        </div>
      </div>

      {/* 2. HEADER BANNER */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              Complaint {displayId}
            </h1>
            <button
              type="button"
              onClick={() => handleCopyId(displayId)}
              title="Copy ID"
              style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
            >
              {copiedId ? <CheckCircle2 size={16} color="#16A34A" /> : <Copy size={16} />}
            </button>
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
            {complaint.fraud_type || 'INVESTMENT_SCAM'} · Reported {reportedDate}
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1D4ED8',
            fontSize: '12px',
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
            {currentStatus}
          </span>

          <button
            type="button"
            onClick={() => setShowAssignOfficerModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <UserPlus size={14} />
            <span>Assign Officer</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMoreActionsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <MoreHorizontal size={15} />
            <span>More actions</span>
          </button>
        </div>
      </div>

      {/* 3. 4-BOX METADATA SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
            COMPLAINT REF
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
            {displayId}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
            COMPLAINT TYPE
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
            {complaint.fraud_type || 'INVESTMENT_SCAM'}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
            REPORTED AMOUNT
          </div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#DC2626', fontFamily: "'JetBrains Mono', monospace" }}>
            {formattedAmount}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
            PRIMARY BENEFICIARY
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
            {primaryAcc}
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT TWO-COLUMN GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px'
      }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* COMPLAINT DETAILS PANEL */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#0284C7' }} />
              <span>Complaint Telemetry & Details</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Complainant / Victim</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{complaint.victimInfo?.name || 'Citizen Victim'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Incident Jurisdiction</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{complaint.victim_district || 'District Cyber Cell'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Accused Beneficiary Bank</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{complaint.accused_bank || 'HDFC Bank'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Complaint Category</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{complaint.fraud_type || 'INVESTMENT_SCAM'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Reported Channel</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{complaint.channel || 'National Cybercrime Portal'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Assigned Officer</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{assignedOfficer}</span>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                CASE DESCRIPTION
              </div>
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                {complaint.description || `Intake reported: ${complaint.fraud_type || 'INVESTMENT_SCAM'} case originating in ${complaint.victim_district || 'District Cyber Cell'}. Target institution: ${complaint.accused_bank || 'Commercial Bank'}.`}
              </p>
            </div>
          </div>

          {/* CASE ACTIVITY TIMELINE */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#059669' }} />
              <span>Case Audit Activity Log</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { time: '10:00 AM', title: 'Complaint Ingested', desc: `Ingested into NEXUS database with ref ${displayId}.` },
                { time: '10:05 AM', title: 'ML Fraud Inference', desc: 'Predictive dual LightGBM model computed target cashout cell.' },
                { time: '10:12 AM', title: 'Mule Graph Traced', desc: 'Multi-hop inter-bank account chain extracted into truth graph.' }
              ].map((ev, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284C7', marginTop: '5px', flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0284C7' }}>{ev.time}</span>
                      <span>·</span>
                      <span>{ev.title}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {ev.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TACTICAL INVESTIGATION NOTES */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} style={{ color: '#7C3AED' }} />
                <span>Tactical Investigation Notes</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddNoteModal(true)}
                style={{
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
                + Add Note
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notes.map((n) => (
                <div key={n.id} style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>{n.author}</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{n.timestamp}</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                    {n.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CASE ACTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 6px 20px rgba(15,23,42,0.04)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              Case Actions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAssignOfficerModal(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                }}
              >
                <UserPlus size={15} />
                <span>Assign Officer</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/prediction/${displayId}`)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'left'
                }}
              >
                <Zap size={15} style={{ color: '#D97706' }} />
                <span>Run Prediction</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedComplaintId(displayId);
                  navigate(`/complaints/${displayId}/network`);
                }}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'left'
                }}
              >
                <Activity size={15} style={{ color: '#2563EB' }} />
                <span>View Network Graph</span>
              </button>

              <button
                type="button"
                onClick={handleViewOnMap}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'left'
                }}
              >
                <MapPin size={15} style={{ color: '#0284C7' }} />
                <span>View on Map</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddNoteModal(true)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'left'
                }}
              >
                <MessageSquare size={15} style={{ color: '#7C3AED' }} />
                <span>Add Note</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStatusModal(true)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'left'
                }}
              >
                <Shield size={15} style={{ color: '#059669' }} />
                <span>Update Status</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* PORTAL MODAL 1: MORE ACTIONS MODAL */}
      {/* ==================================================================== */}
      {showMoreActionsModal && createPortal(
        <div
          onClick={() => setShowMoreActionsModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MoreHorizontal size={18} color="#0F172A" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>More Actions</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreActionsModal(false)}
                style={{ border: 'none', backgroundColor: '#F1F5F9', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Action Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowMoreActionsModal(false);
                  setNoticeBanner('Lien freeze request dispatched to nodal bank officer.');
                  setTimeout(() => setNoticeBanner(null), 5000);
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#93C5FD';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Lock size={18} color="#DC2626" />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>Mark Lien Freeze on Primary Account</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Dispatch immediate freezing notice to beneficiary bank</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMoreActionsModal(false);
                  setNoticeBanner('Case dossier export generated successfully.');
                  setTimeout(() => setNoticeBanner(null), 5000);
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#93C5FD';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Download size={18} color="#0284C7" />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>Export Case Dossier PDF</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Download complete evidentiary dossier report</div>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ==================================================================== */}
      {/* PORTAL MODAL 2: ASSIGN OFFICER MODAL */}
      {/* ==================================================================== */}
      {showAssignOfficerModal && createPortal(
        <div
          onClick={() => setShowAssignOfficerModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Assign Investigating Officer</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0', fontWeight: 500 }}>
                  Select an investigating officer from the Cybercrime Division roster:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignOfficerModal(false)}
                style={{ border: 'none', backgroundColor: '#F1F5F9', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'Inspector Vikram Rao', unit: 'Cybercrime Intelligence Unit' },
                { name: 'Inspector Rajesh Sharma', unit: 'Predictive Interception Cell' },
                { name: 'Sub-Inspector Anjali Verma', unit: 'Financial Fraud Division' },
                { name: 'Inspector Priya Deshmukh', unit: 'National Command Centre' }
              ].map((off) => {
                const isSelected = assignedOfficer === off.name;
                return (
                  <button
                    key={off.name}
                    type="button"
                    onClick={() => handleAssignOfficerSelect(off.name)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                      border: isSelected ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#DCFCE7' : '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? '#16A34A' : '#0284C7',
                        fontWeight: 800,
                        fontSize: '12px',
                        flexShrink: 0
                      }}>
                        <Shield size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{off.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '1px' }}>{off.unit}</div>
                      </div>
                    </div>

                    {isSelected ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16A34A', fontWeight: 800, backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '999px' }}>
                        <Check size={13} /> Assigned
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 700 }}>Select →</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ==================================================================== */}
      {/* PORTAL MODAL 3: STATUS UPDATE MODAL */}
      {/* ==================================================================== */}
      {showStatusModal && createPortal(
        <div
          onClick={() => setShowStatusModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Update Complaint Status</h3>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                style={{ border: 'none', backgroundColor: '#F1F5F9', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Under Investigation', 'New Intake', 'Resolved'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusSelect(st)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: currentStatus === st ? '#EFF6FF' : '#FFFFFF',
                    border: currentStatus === st ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                    color: currentStatus === st ? '#1D4ED8' : '#0F172A',
                    fontSize: '13px',
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{st}</span>
                  {currentStatus === st && <Check size={16} color="#2563EB" />}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ==================================================================== */}
      {/* PORTAL MODAL 4: ADD NOTE MODAL */}
      {/* ==================================================================== */}
      {showAddNoteModal && createPortal(
        <div
          onClick={() => setShowAddNoteModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Add Tactical Note</h3>
              <button
                type="button"
                onClick={() => setShowAddNoteModal(false)}
                style={{ border: 'none', backgroundColor: '#F1F5F9', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Enter tactical observation, nodal bank update, or intelligence memo..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: newNoteText.trim() ? 'pointer' : 'not-allowed',
                    opacity: newNoteText.trim() ? 1 : 0.5
                  }}
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ComplaintDetailPage;
