import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  Activity,
  FileText,
  MapPin,
  Share2,
  AlertTriangle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { dataSource } from '../services/dataSource';
import { useNexusStore } from '../store/useNexusStore';
import type { Complaint } from '../types/nexus';

export const ComplaintDetailPage: React.FC = () => {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const setSelectedComplaintId = useNexusStore((state: any) => state.setSelectedComplaintId);

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<Array<{ id: string; author: string; timestamp: string; text: string }>>([]);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [assignedOfficer, setAssignedOfficer] = useState('Unassigned');
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);

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
          setSelectedComplaintId(res.id);
          setAssignedOfficer(res.assignedOfficer || 'Unassigned');
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

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      author: 'Demo Analyst',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      text: newNoteText.trim(),
    };
    setNotes([note, ...notes]);
    setNewNoteText('');
    setShowAddNoteModal(false);
  };

  const handleOfficerSelect = (officer: string) => {
    setAssignedOfficer(officer);
    setShowAssignOfficerModal(false);
  };

  const handleViewOnMap = () => {
    if (!complaint) return;
    setSelectedComplaintId(complaint.id);
    navigate('/map');
  };

  if (isLoading) {
    return (
      <div className="nexus-center-container">
        <Loader2 className="nexus-spinner animate-spin" size={40} />
        <div className="nexus-loading-text mt-3 text-slate-600 font-mono">
          FETCHING COMPLAINT DOSSIER {complaintId} FROM NEXUS BACKEND...
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="nexus-center-container">
        <div className="nexus-card nexus-error-card p-8 text-center max-w-md bg-white border border-red-200 rounded-xl shadow-sm">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">COMPLAINT NOT FOUND</h2>
          <p className="text-slate-600 text-sm mt-2 mb-6">
            {error || `Complaint ID "${complaintId}" does not exist in the active case ledger.`}
          </p>
          <button
            onClick={() => navigate('/complaints')}
            className="px-4 py-2 bg-[#087F5B] text-white rounded-md text-xs font-semibold hover:bg-[#076D4E] transition-colors"
          >
            ← Return to Complaint Registry
          </button>
        </div>
      </div>
    );
  }

  const formatAmount = (amt: number) => {
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  return (
    <div className="nexus-detail-container p-6 space-y-6">
      {/* 1. Breadcrumb Navigation */}
      <div className="nexus-breadcrumb-nav flex items-center justify-between">
        <Link
          to="/complaints"
          className="nexus-breadcrumb-back flex items-center gap-1.5 text-xs text-[#087F5B] hover:underline font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Complaints Registry</span>
        </Link>
        <span className="text-xs text-[#64748B] font-mono">NEXUS CASE DOSSIER</span>
      </div>

      {/* 2. Case Title Header */}
      <div className="nexus-case-header-row flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="nexus-case-title text-2xl font-bold font-mono text-[#102A2A]">
              Case {complaint.id}
            </h1>
            <span className="nexus-status-pill-small uppercase">{complaint.status || 'flagged'}</span>
          </div>
          <p className="nexus-case-subtitle text-xs text-[#64748B] mt-1 capitalize">
            {(complaint.fraud_type || 'UPI Fraud').replace(/_/g, ' ')} · Victim Location: {complaint.victim_district || 'District'}, {complaint.victim_state || 'State'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/prediction/${complaint.id}`)}
            className="px-3 py-1.5 bg-[#087F5B] hover:bg-[#076D4E] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm"
          >
            <Activity size={14} /> Run Prediction
          </button>
          <button
            onClick={() => navigate(`/complaints/${complaint.id}/network`)}
            className="px-3 py-1.5 bg-white border border-[#E2E8E6] text-[#102A2A] text-xs font-semibold rounded-md flex items-center gap-1.5 hover:bg-slate-50"
          >
            <Share2 size={14} /> View Network Graph
          </button>
          <button
            onClick={handleViewOnMap}
            className="px-3 py-1.5 bg-white border border-[#E2E8E6] text-[#102A2A] text-xs font-semibold rounded-md flex items-center gap-1.5 hover:bg-slate-50"
          >
            <MapPin size={14} /> View on Map
          </button>
        </div>
      </div>

      {/* 3. Metadata Strip */}
      <div className="nexus-metadata-strip grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white border border-[#E2E8E6] rounded-xl shadow-xs">
        <div className="nexus-metadata-box">
          <span className="text-[11px] font-bold text-[#64748B] uppercase font-mono">DISPUTED AMOUNT</span>
          <div className="text-xl font-bold font-mono text-[#102A2A] mt-0.5">
            {formatAmount(complaint.amount)}
          </div>
        </div>

        <div className="nexus-metadata-box">
          <span className="text-[11px] font-bold text-[#64748B] uppercase font-mono">SUSPECT BENEFICIARY</span>
          <div className="text-sm font-semibold text-[#102A2A] mt-1">
            {complaint.accused_bank || 'Commercial Bank Node'}
          </div>
        </div>

        <div className="nexus-metadata-box">
          <span className="text-[11px] font-bold text-[#64748B] uppercase font-mono">INTAKE CHANNEL</span>
          <div className="text-sm font-semibold text-[#102A2A] mt-1">
            {complaint.channel || 'National Portal'}
          </div>
        </div>

        <div className="nexus-metadata-box">
          <span className="text-[11px] font-bold text-[#64748B] uppercase font-mono">ASSIGNED OFFICER</span>
          <div className="text-sm font-semibold text-[#087F5B] mt-1 flex items-center gap-1">
            {assignedOfficer}
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-5 border border-[#E2E8E6] rounded-xl shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#102A2A] uppercase font-mono tracking-wider">
              Incident Intake Details
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#64748B] block mb-1">Complainant / Contact:</span>
                <span className="font-semibold text-[#102A2A]">{complaint.victimInfo?.name}</span>
                <span className="block font-mono text-slate-500 mt-0.5">{complaint.victimInfo?.contact}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-1">Suspect Phone Prefix:</span>
                <span className="font-mono font-semibold text-[#102A2A]">
                  {complaint.accused_phone_prefix ? `+91 ${complaint.accused_phone_prefix}XXXX` : 'Unmasked'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs">
              <span className="text-[#64748B] block mb-1">Case Description:</span>
              <p className="text-slate-700 leading-relaxed">
                {complaint.description || `Case logged under ${complaint.fraud_type}. Beneficiary account identified with ${complaint.accused_bank}. Immediate cashout prediction queued.`}
              </p>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white p-5 border border-[#E2E8E6] rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#102A2A] uppercase font-mono tracking-wider">
                Investigator Notes
              </h3>
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="text-xs text-[#087F5B] font-semibold hover:underline flex items-center gap-1"
              >
                <FileText size={13} /> Add Note
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="text-xs text-[#64748B] italic py-2">
                No manual notes entered yet for this case.
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                      <span className="font-bold text-[#102A2A]">{n.author}</span>
                      <span className="font-mono">{n.timestamp}</span>
                    </div>
                    <p className="text-slate-800">{n.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white p-5 border border-[#E2E8E6] rounded-xl shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-[#102A2A] uppercase font-mono tracking-wider mb-2">
              Operational Actions
            </h3>

            <button
              onClick={() => setShowAssignOfficerModal(true)}
              className="w-full py-2 px-3 bg-white border border-[#E2E8E6] hover:bg-slate-50 text-[#102A2A] text-xs font-semibold rounded-md flex items-center gap-2 justify-center"
            >
              <UserPlus size={15} className="text-[#087F5B]" />
              <span>Assign Investigation Officer</span>
            </button>

            <button
              onClick={() => navigate(`/prediction/${complaint.id}`)}
              className="w-full py-2 px-3 bg-[#087F5B] hover:bg-[#076D4E] text-white text-xs font-semibold rounded-md flex items-center gap-2 justify-center shadow-xs"
            >
              <Activity size={15} />
              <span>Predict Cashout Corridor</span>
            </button>

            <button
              onClick={() => navigate(`/complaints/${complaint.id}/network`)}
              className="w-full py-2 px-3 bg-white border border-[#E2E8E6] hover:bg-slate-50 text-[#102A2A] text-xs font-semibold rounded-md flex items-center gap-2 justify-center"
            >
              <Share2 size={15} className="text-[#64748B]" />
              <span>Explore Mule Network Graph</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-container max-w-md w-full">
            <div className="nexus-modal-header flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-[#102A2A]">Add Investigation Log Note</h3>
              <button onClick={() => setShowAddNoteModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                required
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Enter tactical observation, account lien note, or field status..."
                className="w-full p-2 border border-[#E2E8E6] rounded-md text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs text-white bg-[#087F5B] rounded-md font-semibold"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Officer Modal */}
      {showAssignOfficerModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-container max-w-sm w-full">
            <div className="nexus-modal-header flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-[#102A2A]">Assign Investigation Officer</h3>
              <button onClick={() => setShowAssignOfficerModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {['Insp. R. Sharma', 'Insp. V. Rathore', 'SI A. Verma', 'SI P. Deshmukh', 'Unassigned'].map((off) => (
                <button
                  key={off}
                  onClick={() => handleOfficerSelect(off)}
                  className={`w-full text-left p-2.5 rounded-md text-xs font-semibold flex items-center justify-between border ${assignedOfficer === off ? 'border-[#087F5B] bg-[#E8F5EE] text-[#087F5B]' : 'border-[#E2E8E6] text-slate-800'}`}
                >
                  <span>{off}</span>
                  {assignedOfficer === off && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
