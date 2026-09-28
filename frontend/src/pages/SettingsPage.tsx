import React, { useState, useEffect } from 'react';
import {
  User,
  Cpu,
  Bell,
  ShieldCheck,
  Network,
  Sliders,
  Save,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';

export interface NexusSettingsState {
  // Officer Profile
  name: string;
  badgeId: string;
  email: string;
  agency: string;
  role: string;
  phone: string;

  // AI & Predictive Engine
  h3Resolution: number; // 7, 8, 9
  confidenceThreshold: number; // 0 to 100
  dispatchSensitivity: 'High' | 'Balanced' | 'Strict';
  retrainingCadence: 'Hourly' | 'Daily' | 'Weekly';
  autoClusterDistanceKm: number;

  // Alerts & Advisories
  enableCashoutAlerts: boolean;
  enableVictimSmsAdvisories: boolean;
  enableAudioAlerts: boolean;
  alertEscalationChannel: 'WhatsApp & SMS' | 'Portal Only' | 'Direct Dispatch';
  minAlertAmountInr: number;

  // Governance & Data Privacy
  piiMaskingLevel: 'SHA-256' | 'Partial Asterisk' | 'Full Strict';
  auditLogRetentionDays: number;
  zeroTrustEnforced: boolean;
  telemetrySharing: boolean;

  // Integrations & API
  exotelWebhookUrl: string;
  supabaseSyncEnabled: boolean;
  i4cGatewayStatus: 'Connected' | 'Disconnected' | 'Standby';
  sandboxMode: boolean;

  // Appearance & Theme
  compactSidebarDefault: boolean;
  themeMode: 'dark' | 'light' | 'system';
  motionEffects: boolean;
}

const DEFAULT_SETTINGS: NexusSettingsState = {
  name: 'Senior Analyst Kartik Thakur',
  badgeId: 'NEX-8821-AN',
  email: 'analyst@nexus.gov.in',
  agency: 'I4C Cybercrime Predictive Cell',
  role: 'Analyst',
  phone: '+91 98765 43210',

  h3Resolution: 8,
  confidenceThreshold: 75,
  dispatchSensitivity: 'Balanced',
  retrainingCadence: 'Daily',
  autoClusterDistanceKm: 2.5,

  enableCashoutAlerts: true,
  enableVictimSmsAdvisories: true,
  enableAudioAlerts: true,
  alertEscalationChannel: 'WhatsApp & SMS',
  minAlertAmountInr: 50000,

  piiMaskingLevel: 'SHA-256',
  auditLogRetentionDays: 90,
  zeroTrustEnforced: true,
  telemetrySharing: false,

  exotelWebhookUrl: 'https://nexus.gov.in/api/voice/exotel-webhook',
  supabaseSyncEnabled: true,
  i4cGatewayStatus: 'Connected',
  sandboxMode: false,

  compactSidebarDefault: true,
  themeMode: 'light',
  motionEffects: true
};

export const SettingsPage: React.FC = () => {
  const user = useNexusStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<
    'account' | 'ai_engine' | 'alerts' | 'privacy' | 'integrations' | 'appearance'
  >('account');

  const [settings, setSettings] = useState<NexusSettingsState>(() => {
    const saved = localStorage.getItem('nexus_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Sync logged in user if available
  useEffect(() => {
    if (user) {
      setSettings((prev) => ({
        ...prev,
        name: user.name || prev.name,
        badgeId: user.badgeId || prev.badgeId,
        email: user.email || prev.email,
        agency: user.agency || prev.agency,
        role: user.role || prev.role
      }));
    }
  }, [user]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = () => {
    localStorage.setItem('nexus_settings', JSON.stringify(settings));
    showToast('Settings saved successfully!');
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('nexus_settings', JSON.stringify(DEFAULT_SETTINGS));
    showToast('Settings reset to system defaults.');
  };

  const updateSetting = <K extends keyof NexusSettingsState>(key: K, value: NexusSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'account', label: 'Officer Profile', icon: User, desc: 'Identity, Badge & Credentials' },
    { id: 'ai_engine', label: 'AI Predictive Engine', icon: Cpu, desc: 'H3 Grid, Risk Thresholds & Model Cadence' },
    { id: 'alerts', label: 'Alerts & Advisories', icon: Bell, desc: 'Real-time Interception & Victim SMS Rules' },
    { id: 'privacy', label: 'Privacy & Governance', icon: ShieldCheck, desc: 'PII Hashing & Zero-Trust Audit Logs' },
    { id: 'integrations', label: 'API & Integrations', icon: Network, desc: 'VoiceBot Webhooks & I4C Gateway' },
    { id: 'appearance', label: 'Appearance & UX', icon: Sliders, desc: 'Theme, Motion & Interface Preferences' }
  ];

  return (
    <div style={{ padding: '24px 32px 60px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#0F172A',
            color: '#34D399',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            borderRadius: '12px',
            padding: '12px 20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            fontWeight: 600,
            fontSize: '14px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={18} color="#34D399" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
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
              System & Governance Settings
            </h1>
            <span
              style={{
                backgroundColor: '#000000',
                color: '#38BDF8',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '999px',
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              NEXUS v2.4-PROD
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Configure your official officer credentials, AI predictive engine sensitivity, automated victim advisories, and data governance controls.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
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
            <RotateCcw size={15} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
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
            <Save size={16} />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid: Sidebar Navigation + Settings Content Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '28px',
          alignItems: 'start'
        }}
      >
        {/* Left Navigation Sidebar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid #000000' : '1px solid transparent',
                  backgroundColor: isActive ? '#000000' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#334155',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : '#F1F5F9',
                    color: isActive ? '#38BDF8' : '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <IconComponent size={17} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: isActive ? '#FFFFFF' : '#0F172A',
                      lineHeight: 1.2
                    }}
                  >
                    {tab.label}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: isActive ? '#94A3B8' : '#64748B',
                      marginTop: '3px',
                      lineHeight: 1.3
                    }}
                  >
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Content Panel */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
          }}
        >
          {/* TAB 1: OFFICER PROFILE */}
          {activeTab === 'account' && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Officer Credentials & Profile
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Authorized law enforcement identity information linked to national I4C interception logs.
                </p>
              </div>

              {/* Profile Card Summary */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  marginBottom: '24px'
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    backgroundColor: '#000000',
                    color: '#38BDF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  <User size={26} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{settings.name}</div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: '#0284C7', fontWeight: 700 }}>
                      Badge ID: {settings.badgeId}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>•</span>
                    <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700 }}>{settings.agency}</span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Full Officer Name
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => updateSetting('name', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Officer Badge ID
                  </label>
                  <input
                    type="text"
                    value={settings.badgeId}
                    onChange={(e) => updateSetting('badgeId', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      fontFamily: "'JetBrains Mono', monospace",
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Assigned Agency / Command Cell
                  </label>
                  <input
                    type="text"
                    value={settings.agency}
                    onChange={(e) => updateSetting('agency', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Officer Security Role
                  </label>
                  <select
                    value={settings.role}
                    onChange={(e) => updateSetting('role', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Analyst">Analyst (Predictive Cell)</option>
                    <option value="Officer">Officer (Field Interception)</option>
                    <option value="Admin">Admin Director (National Command)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Secure Hotline Contact
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      fontFamily: "'JetBrains Mono', monospace",
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI & PREDICTIVE ENGINE */}
          {activeTab === 'ai_engine' && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  AI Engine & Spatial Resolution Parameters
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Adjust machine learning prediction sensitivity, Uber H3 spatial hexagon granularity, and automated cluster detection.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* H3 Resolution Level */}
                <div style={{ padding: '18px', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                        Spatial H3 Hexagon Resolution Level
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Controls spatial precision for ATM cashout hotspot prediction. Level 8 (~0.73 km² per hexagon) is optimal.
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#000000',
                        color: '#38BDF8',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace"
                      }}
                    >
                      Resolution {settings.h3Resolution}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    {[7, 8, 9].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => updateSetting('h3Resolution', lvl)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          border: settings.h3Resolution === lvl ? '2px solid #000000' : '1px solid #CBD5E1',
                          backgroundColor: settings.h3Resolution === lvl ? '#000000' : '#FFFFFF',
                          color: settings.h3Resolution === lvl ? '#FFFFFF' : '#334155',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Level {lvl} ({lvl === 7 ? '~5 km²' : lvl === 8 ? '~0.7 km²' : '~0.1 km²'})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Confidence Threshold Slider */}
                <div style={{ padding: '18px', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                        Interception Confidence Threshold
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Minimum predicted probability required to automatically trigger field interception alerts.
                      </div>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#0284C7', fontFamily: "'JetBrains Mono', monospace" }}>
                      {settings.confidenceThreshold}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={settings.confidenceThreshold}
                    onChange={(e) => updateSetting('confidenceThreshold', Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#000000' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    <span>50% (High Recall)</span>
                    <span>75% (Recommended Balanced)</span>
                    <span>95% (Zero False Positive)</span>
                  </div>
                </div>

                {/* Dispatch Sensitivity & Re-training Cadence */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Auto-Dispatch Sensitivity Mode
                    </label>
                    <select
                      value={settings.dispatchSensitivity}
                      onChange={(e) => updateSetting('dispatchSensitivity', e.target.value as NexusSettingsState['dispatchSensitivity'])}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13.5px',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="High">High (Immediate Dispatch on 60%+ confidence)</option>
                      <option value="Balanced">Balanced (Standard Field Verification)</option>
                      <option value="Strict">Strict (Manual Supervisor Approval Required)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      XGBoost Model Re-training Cadence
                    </label>
                    <select
                      value={settings.retrainingCadence}
                      onChange={(e) => updateSetting('retrainingCadence', e.target.value as NexusSettingsState['retrainingCadence'])}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13.5px',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Hourly">Hourly Incremental Learning</option>
                      <option value="Daily">Daily Batch Re-fit (Recommended)</option>
                      <option value="Weekly">Weekly Full Baseline Evaluation</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALERTS & ADVISORIES */}
          {activeTab === 'alerts' && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Real-time Interception Alerts & Victim Advisories
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Configure notification thresholds and automated SMS/WhatsApp advisories dispatched to fraud victims.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Toggle: Cashout Alerts */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Real-time Cashout Interception Pop-up Alerts
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Trigger instant visual overlays when suspicious high-velocity ATM withdrawals are predicted.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableCashoutAlerts}
                    onChange={(e) => updateSetting('enableCashoutAlerts', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#000000' }}
                  />
                </div>

                {/* Toggle: Victim SMS Advisories */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Automated Victim Cyber-Advisory SMS / WhatsApp
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Dispatch immediate SMS advisories to victims instructing them on account freeze steps.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableVictimSmsAdvisories}
                    onChange={(e) => updateSetting('enableVictimSmsAdvisories', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#000000' }}
                  />
                </div>

                {/* Toggle: Audio Alerts */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      High-Priority Audio Warning Chime
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Play emergency alert chime when a critical incident requires immediate police dispatch.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableAudioAlerts}
                    onChange={(e) => updateSetting('enableAudioAlerts', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#000000' }}
                  />
                </div>

                {/* Minimum Alert Amount Input */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Minimum Fraud Amount for Critical Escalation (₹)
                    </label>
                    <input
                      type="number"
                      value={settings.minAlertAmountInr}
                      onChange={(e) => updateSetting('minAlertAmountInr', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13.5px',
                        fontFamily: "'JetBrains Mono', monospace",
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Default Escalation Channel
                    </label>
                    <select
                      value={settings.alertEscalationChannel}
                      onChange={(e) => updateSetting('alertEscalationChannel', e.target.value as NexusSettingsState['alertEscalationChannel'])}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13.5px',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="WhatsApp & SMS">WhatsApp & SMS Multi-Channel</option>
                      <option value="Portal Only">Portal Dashboard Only</option>
                      <option value="Direct Dispatch">Direct Interception PCR Dispatch</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY & GOVERNANCE */}
          {activeTab === 'privacy' && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Data Privacy, PII Hashing & Compliance
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Manage PII deterministic fingerprinting, audit trail retention, and zero-trust security parameters.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    PII Anonymization & Hashing Standard
                  </label>
                  <select
                    value={settings.piiMaskingLevel}
                    onChange={(e) => updateSetting('piiMaskingLevel', e.target.value as NexusSettingsState['piiMaskingLevel'])}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="SHA-256">SHA-256 Deterministic Canonical Hashing (Recommended)</option>
                    <option value="Partial Asterisk">Partial Asterisk Masking (e.g. ******4409)</option>
                    <option value="Full Strict">Full Strict Anonymization (Zero Raw Exposure)</option>
                  </select>
                </div>

                <div style={{ padding: '18px', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                        Autonomy Audit Log Retention Period
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Duration that automated decision factors and officer dispatch actions are retained for judicial compliance.
                      </div>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                      {settings.auditLogRetentionDays} Days
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    {[30, 90, 180, 365].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => updateSetting('auditLogRetentionDays', days)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          border: settings.auditLogRetentionDays === days ? '2px solid #000000' : '1px solid #CBD5E1',
                          backgroundColor: settings.auditLogRetentionDays === days ? '#000000' : '#FFFFFF',
                          color: settings.auditLogRetentionDays === days ? '#FFFFFF' : '#334155',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle: Zero Trust */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Enforce Zero-Trust Encryption at Rest & In Transit
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      All API calls and database connections require TLS 1.3 + cryptographic signature checks.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.zeroTrustEnforced}
                    onChange={(e) => updateSetting('zeroTrustEnforced', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#000000' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INTEGRATIONS & API */}
          {activeTab === 'integrations' && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  API Endpoints & Third-Party Gateways
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Manage Exotel VoiceBot webhooks, Supabase realtime sync, and National I4C Portal connections.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Exotel VoiceBot Webhook Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={settings.exotelWebhookUrl}
                    onChange={(e) => updateSetting('exotelWebhookUrl', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      fontFamily: "'JetBrains Mono', monospace",
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Gateway Status Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      I4C National Command Database Gateway
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Direct secure channel to synchronized national cybercrime complaint database.
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '999px',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                    {settings.i4cGatewayStatus}
                  </span>
                </div>

                {/* Sandbox Mode */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Operational Sandbox / Simulation Mode
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Runs predictions using synthetic test data without triggering actual police dispatch calls.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sandboxMode}
                    onChange={(e) => updateSetting('sandboxMode', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#000000' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: APPEARANCE & UX */}
          {activeTab === 'appearance' && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Appearance & User Experience Preferences
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Customize sidebar behavior, color theme preferences, and motion/animation effects.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Compact Sidebar Default */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Compact Floating Sidebar Mode
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Keep sidebar collapsed by default and expand automatically on cursor hover.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.compactSidebarDefault}
                    onChange={(e) => updateSetting('compactSidebarDefault', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#000000' }}
                  />
                </div>

                {/* Motion Effects */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Enable Micro-Animations & Page Transitions
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Provides smooth transition effects between analytical views and map overlays.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.motionEffects}
                    onChange={(e) => updateSetting('motionEffects', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#000000' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
