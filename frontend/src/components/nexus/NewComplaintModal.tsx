import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldAlert,
  Check,
  Loader2,
  CreditCard,
  Smartphone,
  MapPin,
  Building2,
  Radio,
  PlusCircle
} from 'lucide-react';
import { dataSource } from '../../services/dataSource';
import type { Complaint } from '../../types/nexus';
import { INDIA_STATES, getFastStateFromPincode, lookupPincodeDetails } from '../../constants/indiaStates';

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
  const [fraudType, setFraudType] = useState('UPI_PHISHING');
  const [pincode, setPincode] = useState('');
  const [victimState, setVictimState] = useState('');
  const [victimDistrict, setVictimDistrict] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [amount, setAmount] = useState('');
  const [accusedBank, setAccusedBank] = useState('State Bank of India');
  const [accusedPhone, setAccusedPhone] = useState('');
  const [channel, setChannel] = useState('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setFraudType('UPI_PHISHING');
    setPincode('');
    setVictimState('');
    setVictimDistrict('');
    setAmount('');
    setAccusedBank('State Bank of India');
    setAccusedPhone('');
    setChannel('UPI');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Blur the entire background (#root) when New Complaint Modal is open
  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (isOpen) {
      if (rootEl) {
        rootEl.style.transition = 'filter 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        rootEl.style.filter = 'blur(4px) brightness(0.95)';
        rootEl.style.pointerEvents = 'none';
        rootEl.style.userSelect = 'none';
      }
      document.body.style.overflow = 'hidden';
    } else {
      if (rootEl) {
        rootEl.style.filter = '';
        rootEl.style.pointerEvents = '';
        rootEl.style.userSelect = '';
      }
      document.body.style.overflow = '';
    }
    return () => {
      if (rootEl) {
        rootEl.style.filter = '';
        rootEl.style.pointerEvents = '';
        rootEl.style.userSelect = '';
      }
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handlePincodeChange = async (val: string) => {
    setPincode(val);
    const clean = val.trim().replace(/\D/g, '');

    // Instant prefix match
    if (clean.length >= 2) {
      const fastState = getFastStateFromPincode(clean);
      if (fastState) {
        setVictimState(fastState);
      }
    }

    // Exact 6-digit live API lookup
    if (clean.length === 6) {
      setIsDetecting(true);
      const details = await lookupPincodeDetails(clean);
      setIsDetecting(false);
      if (details?.state) {
        setVictimState(details.state);
      }
      if (details?.district) {
        setVictimDistrict(details.district);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Disputed amount must be a positive number greater than 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = accusedPhone.trim();
      const phonePrefix = cleanPhone.startsWith('+') ? cleanPhone.slice(0, 5) : '+91' + cleanPhone.slice(0, 2);

      const res = await dataSource.createComplaint({
        fraud_type: fraudType,
        amount: numAmount,
        amount_inr: numAmount,
        victim_state: victimState,
        victim_district: victimDistrict,
        accused_phone_prefix: phonePrefix,
        accused_bank: accusedBank,
        channel,
        status: 'active',
      });

      const cid = res.complaint_id || res.complaint?.complaint_id || '';
      const displayId = res.ncrp_id || res.complaint?.ncrp_id || cid;

      setSuccessMessage(`Complaint ${displayId} successfully registered in NEXUS (UUID: ${cid.slice(0, 8)}...).`);
      setTimeout(() => {
        if (res.complaint) {
          onComplaintCreated(res.complaint);
        }
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('[NEXUS INTAKE ERROR]', err);
      const msg = err?.message || 'Failed to submit complaint to backend.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '640px',
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 30px 60px -12px rgba(15, 23, 42, 0.45), 0 12px 32px rgba(15, 23, 42, 0.15)',
        color: '#0F172A',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}>
        {/* Floating Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.2)'
            }}>
              <PlusCircle size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '19px', fontWeight: 900, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Ingest Cybercrime Complaint
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0 0' }}>
                Register new fraud intake to trigger real-time mule graph tracing & cash-out prediction.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close window"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444';
              e.currentTarget.style.borderColor = '#DC2626';
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#475569';
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.08)';
            }}
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Alerts / Success Banners */}
        {errorMessage && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            fontSize: '12.5px',
            borderRadius: '12px',
            fontFamily: 'monospace'
          }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#059669',
            fontSize: '12.5px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'monospace',
            fontWeight: 700
          }}>
            <Check size={18} style={{ color: '#059669' }} />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Fraud Type Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Fraud Incident Type
            </label>
            <select
              value={fraudType}
              onChange={(e) => setFraudType(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="UPI_PHISHING">UPI Intercept / Fraud</option>
              <option value="DIGITAL_ARREST">Digital Arrest Extortion</option>
              <option value="INVESTMENT_SCAM">High-Yield Investment Scam</option>
              <option value="FAKE_LOAN">Illegal Lending App Fraud</option>
              <option value="SEXTORTION">Sextortion / Blackmail</option>
              <option value="AEPS_FRAUD">AePS Biometric Cash-out</option>
              <option value="TASK_FRAUD">Task / Part-time Job Scam</option>
              <option value="OTHER">Other Cyber Fraud</option>
            </select>
          </div>

          {/* Amount & Phone Prefix */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                <CreditCard size={12} style={{ color: '#2563EB' }} />
                <span>Disputed Amount (INR)</span>
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 150000"
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                <Smartphone size={12} style={{ color: '#2563EB' }} />
                <span>Suspect Mobile / Prefix</span>
              </label>
              <input
                type="text"
                required
                value={accusedPhone}
                onChange={(e) => setAccusedPhone(e.target.value)}
                placeholder="e.g. 7091234567"
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Victim Location: PIN Code, State & District */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                <MapPin size={12} style={{ color: '#2563EB' }} />
                <span>Pincode</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="e.g. 814112"
                  style={{
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {isDetecting && (
                  <Loader2 size={13} className="animate-spin" style={{ position: 'absolute', right: '10px', top: '12px', color: '#2563EB' }} />
                )}
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                <MapPin size={12} style={{ color: '#2563EB' }} />
                <span>Victim State</span>
              </label>
              <select
                value={victimState}
                onChange={(e) => setVictimState(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select State...</option>
                {INDIA_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                <MapPin size={12} style={{ color: '#2563EB' }} />
                <span>Victim District</span>
              </label>
              <input
                type="text"
                required
                value={victimDistrict}
                onChange={(e) => setVictimDistrict(e.target.value)}
                placeholder="e.g. Deoghar"
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Suspect Bank & Channel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                <Building2 size={12} style={{ color: '#2563EB' }} />
                <span>Suspect Beneficiary Bank</span>
              </label>
              <select
                value={accusedBank}
                onChange={(e) => setAccusedBank(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                <Radio size={12} style={{ color: '#2563EB' }} />
                <span>Reported Intake Channel</span>
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="UPI">National Cybercrime Portal (NCRP) [UPI]</option>
                <option value="IMPS">Helpline 1930 Direct Transit [IMPS]</option>
                <option value="NEFT">LEA Police Station Intake [NEFT]</option>
                <option value="AEPS">AePS Micro-ATM Clearing [AEPS]</option>
                <option value="ATM">ATM Direct Cashout [ATM]</option>
                <option value="RTGS">RTGS High-Value Transfer [RTGS]</option>
                <option value="OTHER">Other Financial Channel</option>
              </select>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '10px',
            paddingTop: '18px',
            borderTop: '1px solid #E2E8F0'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 22px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: '1px solid #3B82F6',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Ingesting to DB...
                </>
              ) : (
                <>
                  <ShieldAlert size={16} />
                  <span>Submit Complaint to NEXUS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
