import React, { useState } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';
import type { ComplaintDetail } from '../../data/complaints-data';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplaintCreated: (complaint: Partial<ComplaintDetail>) => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({
  isOpen,
  onClose,
  onComplaintCreated,
}) => {
  const [complaintType, setComplaintType] = useState('UPI Fraud');
  const [primaryAccount, setPrimaryAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [risk, setRisk] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [assignedOfficer, setAssignedOfficer] = useState('A. Sharma');
  const [description, setDescription] = useState('');
  const [reportedChannel, setReportedChannel] = useState('Online Portal');
  const [lastUpdated, setLastUpdated] = useState('Just now');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 50000;
    const formattedAmount =
      numAmount >= 100000
        ? `₹${(numAmount / 100000).toFixed(1)}L`
        : `₹${numAmount.toLocaleString('en-IN')}`;

    const newId = `C${Math.floor(1031 + Math.random() * 50)}`;

    const newComplaint: Partial<ComplaintDetail> = {
      id: newId,
      reportedOn: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      complaintType,
      primaryAccount: primaryAccount.startsWith('XXXX') ? primaryAccount : `XXXX ${primaryAccount.slice(-4)}`,
      amount: numAmount,
      amountFormatted: formattedAmount,
      risk,
      status: 'New',
      assignedOfficer: assignedOfficer || 'Unassigned',
      reportedBy: 'Customer / Citizen',
      incidentDate: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      reportedChannel,
      transactionReference: `TXN-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      description: description || 'New intake incident reported through direct channel.',
      timeline: [
        {
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          title: 'Complaint received',
          description: `Complaint ${newId} logged into registry via ${reportedChannel}.`,
        },
      ],
      linkedAccountsCount: 1,
      relatedTransactionsCount: 1,
      sla: '24h remaining',
      lastUpdated: lastUpdated || 'Just now',
      notes: [],
    };

    onComplaintCreated(newComplaint);
    onClose();
  };

  return (
    <div className="nexus-modal-overlay">
      <div className="nexus-modal-container max-w-lg w-full">
        <div className="nexus-modal-header">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#087F5B]" />
            <h3 className="font-bold text-lg text-[#102A2A]">File New Cybercrime Complaint</h3>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#102A2A]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
              Complaint Type
            </label>
            <select
              value={complaintType}
              onChange={(e) => setComplaintType(e.target.value)}
              className="nexus-form-input"
            >
              <option value="UPI Fraud">UPI Fraud</option>
              <option value="Account Takeover">Account Takeover</option>
              <option value="Investment Scam">Investment Scam</option>
              <option value="Phishing">Phishing</option>
              <option value="SIM Swap">SIM Swap</option>
              <option value="Loan App Extortion">Loan App Extortion</option>
              <option value="Card Skimming">Card Skimming</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Primary Account No. (Masked)
              </label>
              <input
                type="text"
                placeholder="XXXX 4821"
                required
                value={primaryAccount}
                onChange={(e) => setPrimaryAccount(e.target.value)}
                className="nexus-form-input font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Amount (INR ₹)
              </label>
              <input
                type="number"
                placeholder="480000"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="nexus-form-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Initial Risk Rating
              </label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value as any)}
                className="nexus-form-input font-semibold"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Assign Officer
              </label>
              <select
                value={assignedOfficer}
                onChange={(e) => setAssignedOfficer(e.target.value)}
                className="nexus-form-input"
              >
                <option value="Unassigned">Unassigned</option>
                <option value="A. Sharma">A. Sharma (Cyber Cell North)</option>
                <option value="A. Verma">A. Verma (Mule Interception Unit)</option>
                <option value="S. Nair">S. Nair (Financial Intelligence)</option>
                <option value="R. Iyer">R. Iyer (Threat Monitoring)</option>
                <option value="P. Deshmukh">P. Deshmukh (Field Ops)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Reporting Channel
              </label>
              <select
                value={reportedChannel}
                onChange={(e) => setReportedChannel(e.target.value)}
                className="nexus-form-input"
              >
                <option value="Online Portal">National Cybercrime Reporting Portal (NCRP)</option>
                <option value="Helpline 1930">Citizen Helpline 1930</option>
                <option value="Police Station Referral">State Cyber Police Station Desk</option>
                <option value="Bank Branch Escalation">Bank Fraud Nodal Desk</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Last Updated (Status)
              </label>
              <input
                type="text"
                placeholder="Just now"
                value={lastUpdated}
                onChange={(e) => setLastUpdated(e.target.value)}
                className="nexus-form-input font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
              Incident Narrative / Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe fraudulent transaction modus operandi, recipient handles, or suspect behavior..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="nexus-form-input"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8E6]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#102A2A] rounded border border-[#E2E8E6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="nexus-quick-btn-primary flex items-center gap-1.5 px-4 py-2"
            >
              <Check size={14} /> Submit Complaint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
