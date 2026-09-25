import React, { useState } from 'react';
import { X, ShieldAlert, Check, Loader2 } from 'lucide-react';
import { dataSource } from '../../services/dataSource';
import type { Complaint } from '../../types/nexus';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplaintCreated: (complaint: Complaint) => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({
  isOpen,
  onClose,
  onComplaintCreated,
}) => {
  const [fraudType, setFraudType] = useState('upi_fraud');
  const [victimState, setVictimState] = useState('Jharkhand');
  const [victimDistrict, setVictimDistrict] = useState('Deoghar');
  const [amount, setAmount] = useState('150000');
  const [accusedBank, setAccusedBank] = useState('State Bank of India');
  const [accusedPhone, setAccusedPhone] = useState('7091234567');
  const [channel, setChannel] = useState('Online Portal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const numAmount = parseFloat(amount) || 50000;
    const cid = `CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await dataSource.createComplaint({
        complaint_id: cid,
        fraud_type: fraudType,
        amount: numAmount,
        amount_inr: numAmount,
        victim_state: victimState,
        victim_district: victimDistrict,
        accused_phone_prefix: accusedPhone.slice(0, 4),
        accused_bank: accusedBank,
        channel,
        status: 'flagged',
      });

      setSuccessMessage(`Complaint ${cid} successfully ingested into NEXUS database.`);
      setTimeout(() => {
        onComplaintCreated(res.complaint || {
          id: cid,
          complaint_id: cid,
          victimInfo: { name: `Citizen (${victimDistrict}, ${victimState})`, contact: accusedPhone },
          amount: numAmount,
          status: 'flagged',
          linkedAccountId: accusedBank,
        });
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit complaint to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="nexus-modal-overlay">
      <div className="nexus-modal-container max-w-lg w-full">
        <div className="nexus-modal-header">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#087F5B]" />
            <h3 className="font-bold text-lg text-[#102A2A]">Ingest Live Cybercrime Complaint</h3>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#102A2A]">
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 mx-5 mt-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3 mx-5 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center gap-2">
            <Check size={16} className="text-emerald-600" />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
              Fraud Incident Type
            </label>
            <select
              value={fraudType}
              onChange={(e) => setFraudType(e.target.value)}
              className="nexus-form-input w-full"
            >
              <option value="upi_fraud">UPI Intercept / Fraud</option>
              <option value="digital_arrest">Digital Arrest Extortion</option>
              <option value="investment_scam">High-Yield Investment Scam</option>
              <option value="vishing">Vishing / Voice Phishing</option>
              <option value="loan">Illegal Lending App Fraud</option>
              <option value="crypto_scam">Crypto OTC Cashout</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Disputed Amount (INR)
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
                className="nexus-form-input w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Suspect Mobile / Prefix
              </label>
              <input
                type="text"
                required
                value={accusedPhone}
                onChange={(e) => setAccusedPhone(e.target.value)}
                placeholder="7091234567"
                className="nexus-form-input w-full font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Victim State
              </label>
              <select
                value={victimState}
                onChange={(e) => setVictimState(e.target.value)}
                className="nexus-form-input w-full"
              >
                <option value="Jharkhand">Jharkhand</option>
                <option value="Haryana">Haryana</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Delhi">Delhi</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Karnataka">Karnataka</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Victim District
              </label>
              <input
                type="text"
                required
                value={victimDistrict}
                onChange={(e) => setVictimDistrict(e.target.value)}
                placeholder="Deoghar"
                className="nexus-form-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Suspect Beneficiary Bank
              </label>
              <select
                value={accusedBank}
                onChange={(e) => setAccusedBank(e.target.value)}
                className="nexus-form-input w-full"
              >
                <option value="Paytm Payments Bank">Paytm Payments Bank</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Airtel Payments Bank">Airtel Payments Bank</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102A2A] uppercase mb-1">
                Reported Intake Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="nexus-form-input w-full"
              >
                <option value="Online Portal">National Cybercrime Portal (NCRP)</option>
                <option value="1930 Helpline">Helpline 1930 Direct Transit</option>
                <option value="Police Station">LEA Police Station Intake</option>
              </select>
            </div>
          </div>

          <div className="nexus-modal-footer flex items-center justify-end gap-2 pt-4 border-t border-[#EDF2F0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#102A2A] bg-white border border-[#E2E8E6] rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#087F5B] hover:bg-[#076D4E] rounded-md flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Ingesting to DB...
                </>
              ) : (
                'Submit Complaint to NEXUS'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
