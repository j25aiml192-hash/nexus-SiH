import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
  ChevronLeft,
  CheckCircle2,
  Lock,
  ArrowRight,
  Layers,
  Loader2,
} from 'lucide-react';
import { useIncidentDetail } from '../hooks/useNexusData';
import { SlideToAuthorize } from '../components/SlideToAuthorize';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, addNote, authorize } = useIncidentDetail(id);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  if (isLoading) {
    return (
      <div className="nexus-center-container">
        <Loader2 className="nexus-spinner" size={40} />
        <div className="nexus-loading-text">RECONSTRUCTING CASE DOSSIER {id}...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="nexus-center-container">
        <div className="nexus-card nexus-error-card">
          <AlertTriangle size={44} className="text-red-500 mb-3" />
          <h2 className="text-xl font-bold text-white">INCIDENT RECORD NOT FOUND</h2>
          <p className="text-slate-400 text-sm mt-2 mb-4">
            {error || `Incident ID "${id}" does not exist in the active case ledger.`}
          </p>
          <button onClick={() => navigate('/incidents')} className="nexus-pill-button">
            <ChevronLeft size={16} />
            Return to Incidents Registry
          </button>
        </div>
      </div>
    );
  }

  const { incident, alert, prediction, account, complaint } = data;

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      await addNote(newNote.trim());
      setNewNote('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const isAlreadyAuthorized =
    incident.status === 'authorized' || incident.status === 'closed';

  // Construct combined chronological audit trail
  const auditEvents = [
    {
      type: 'creation',
      title: 'Incident Record Initialized',
      desc: `Created from Alert ${incident.alertId} dispatch protocol.`,
      timestamp: incident.createdAt || '2026-09-05 13:12:00 UTC',
      status: 'complete',
    },
    ...incident.officerActions.map((action, idx) => ({
      type: 'officer_note',
      title: `Tactical Officer Log #${idx + 1}`,
      desc: action.note,
      timestamp: action.timestamp,
      status: 'complete',
    })),
    ...(isAlreadyAuthorized
      ? [
          {
            type: 'authorized',
            title: 'Section 102 CrPC Lien Enforcement Authorized',
            desc: 'Digital warrant executed. Physical ATM cash dispensers locked and merchant node frozen.',
            timestamp: incident.updatedAt || '2026-09-05 13:45:00 UTC',
            status: 'complete',
          },
        ]
      : []),
    ...(incident.status === 'closed'
      ? [
          {
            type: 'resolved',
            title: 'Case Dossier Closed & Complaint Resolved',
            desc: `Complaint ${complaint?.id || 'CMP-9081'} marked as resolved. Asset recovery preserved.`,
            timestamp: incident.updatedAt || '2026-09-05 13:47:00 UTC',
            status: 'complete',
          },
        ]
      : []),
  ];

  return (
    <div className="incident-detail-container">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="incident-nav-bar">
        <button
          onClick={() => navigate('/incidents')}
          className="nexus-pill-button text-xs"
        >
          <ChevronLeft size={14} /> Back to Incidents
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">STATUS:</span>
          <span
            className={`status-chip ${
              incident.status === 'open'
                ? 'chip-new'
                : incident.status === 'authorized'
                ? 'chip-assigned'
                : 'chip-actioned'
            }`}
          >
            {incident.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="incident-layout-grid">
        {/* Left Column: Relationship Dossier & Authorization */}
        <div className="space-y-4">
          {/* Incident Dossier Header Card */}
          <div className="nexus-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-slate-400">INCIDENT ID</span>
                <h1 className="text-2xl font-mono font-bold text-slate-900 tracking-wide">
                  {incident.id}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">ASSIGNED UNIT</span>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {alert?.assignedOfficerId || 'DIR / FIELD-TAC-01'}
                </div>
              </div>
            </div>

            {/* Relationship Hierarchy Traversal */}
            <div className="mt-4">
              <div className="text-xs font-mono text-slate-400 mb-2 uppercase flex items-center gap-1.5">
                <Layers size={13} className="text-cyan-400" />
                Traversed Store Graph Lineage:
              </div>

              <div className="relationship-chain">
                {/* 1. Complaint */}
                <div className="relation-node">
                  <div className="relation-tag">1. COMPLAINT</div>
                  <div className="font-mono text-slate-900 text-xs font-bold">
                    {complaint?.id || 'CMP-2024-9081'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Victim: {complaint?.victimInfo.name} ({complaint?.victimInfo.contact})
                  </div>
                  <div className="text-[11px] text-amber-500 font-mono font-bold">
                    Loss: ₹{complaint?.amount.toLocaleString()}
                  </div>
                  <div className="mt-1">
                    <span className="nexus-badge-tech text-[10px]">
                      STATUS: {complaint?.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="relation-arrow">
                  <ArrowRight size={14} className="text-slate-600" />
                </div>

                {/* 2. Target Account */}
                <div className="relation-node">
                  <div className="relation-tag">2. TARGET ACCOUNT</div>
                  <div className="font-mono text-cyan-400 text-xs font-bold">
                    {account?.id || prediction?.accountId || 'ACC-89214'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Mule Node Risk: {account?.riskScore || 94}/100
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Txn Links: {account?.txnHistory.length || 4} transfers
                  </div>
                  <Link
                    to={`/prediction/${incident.complaint_id || complaint?.id || ''}`}
                    className="text-[10px] text-cyan-700 hover:underline flex items-center gap-0.5 mt-1 font-semibold"
                  >
                    View Predictive Cashout Dossier <ExternalLink size={10} />
                  </Link>
                </div>

                <div className="relation-arrow">
                  <ArrowRight size={14} className="text-slate-400" />
                </div>

                {/* 3. Prediction & Alert */}
                <div className="relation-node">
                  <div className="relation-tag">3. CASHOUT ALERT</div>
                  <div className="font-mono text-red-600 text-xs font-bold">
                    {alert?.id || alert?.alert_id || incident.alert_id || 'DISPATCHED'}
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Target ATM: {data.atms?.[0]?.name || 'Local Extraction Node'}
                  </div>
                  <div className="mt-1">
                    <span className="risk-badge-pill risk-crit text-[10px]">
                      {prediction?.risk_level || 'CRITICAL'} RISK
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide-to-Authorize Component Card */}
          <div className="nexus-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-amber-400" />
                <span className="nexus-card-title">
                  SECTION 102 CrPC LIEN AUTHORIZATION
                </span>
              </div>
              {isAlreadyAuthorized && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={14} /> AUTHORIZED & FILED
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Sliding executes an immediate cryptographic order instructing nodal banks to
              lock ATM dispenser buffer and initiate an electronic lien on connected mule accounts.
            </p>

            {/* The standalone, reusable slide-to-authorize component */}
            <SlideToAuthorize
              onAuthorize={authorize}
              isAuthorized={isAlreadyAuthorized}
              disabled={isAlreadyAuthorized}
              label="SLIDE TO AUTHORIZE INTERCEPTION"
              committedLabel="ASSET LIEN EXECUTED & SEALED"
              threshold={80}
            />

            {incident.status === 'closed' && (
              <div className="mt-3 p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>
                  Case protocol complete. Incident status closed; Complaint #{complaint?.id} marked as RESOLVED.
                </span>
              </div>
            )}
          </div>

          {/* Officer Notes Section */}
          <div className="nexus-card">
            <div className="nexus-card-header">
              <span className="nexus-card-title">OFFICER LOG & TACTICAL NOTES</span>
              <span className="text-xs font-mono text-slate-400">
                {incident.officerActions.length} ENTRIES
              </span>
            </div>

            <form onSubmit={handleNoteSubmit} className="mt-3 space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter tactical observation, dispatch status, or field update..."
                className="nexus-input w-full text-xs font-mono p-3 h-20 resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500 font-mono">
                  Timestamp will be recorded in UTC audit trail.
                </span>
                <button
                  type="submit"
                  disabled={isSubmittingNote || !newNote.trim()}
                  className="nexus-btn-primary text-xs flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>{isSubmittingNote ? 'Saving...' : 'Add Officer Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Chronological Audit Trail */}
        <div>
          <div className="nexus-card h-full">
            <div className="nexus-card-header">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" />
                <span className="nexus-card-title">CHRONOLOGICAL AUDIT TRAIL</span>
              </div>
              <span className="nexus-badge-tech font-mono">
                {auditEvents.length} VERIFIED EVENTS
              </span>
            </div>

            <div className="audit-timeline">
              {auditEvents.map((evt, idx) => {
                const isLast = idx === auditEvents.length - 1;
                const isAuthorizedEvent = evt.type === 'authorized';
                const isResolvedEvent = evt.type === 'resolved';

                return (
                  <div key={idx} className="audit-timeline-item">
                    <div className="audit-marker-col">
                      <div
                        className={`audit-marker-circle ${
                          isResolvedEvent
                            ? 'marker-resolved'
                            : isAuthorizedEvent
                            ? 'marker-authorized'
                            : 'marker-default'
                        }`}
                      >
                        {isResolvedEvent ? (
                          <CheckCircle2 size={12} />
                        ) : isAuthorizedEvent ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        )}
                      </div>
                      {!isLast && <div className="audit-line" />}
                    </div>

                    <div className="audit-content">
                      <div className="flex items-center justify-between">
                        <span className="audit-item-title">{evt.title}</span>
                        <span className="audit-item-time">{evt.timestamp}</span>
                      </div>
                      <div className="audit-item-desc">{evt.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
