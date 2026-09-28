import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  User,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  LogIn,
  BadgeCheck,
  Mail
} from 'lucide-react';
import { useNexusStore, type UserProfile } from '../store/useNexusStore';
import LetterGlitch from './LetterGlitch';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useNexusStore((state) => state.login);
  const isAuthenticated = useNexusStore((state) => state.isAuthenticated);

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [agency, setAgency] = useState('I4C National Command Center');
  const [role, setRole] = useState<'Analyst' | 'Officer'>('Analyst');

  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStep, setAuthStep] = useState('');

  // Destination path from navigation state or default to /dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // If already authenticated, redirect to destination
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const [pendingSuccessMsg, setPendingSuccessMsg] = useState<{ badgeId: string; adminEmail: string } | null>(null);

  const ADMIN_EMAIL = "h90519495@gmail.com";

  // Pre-seeded approved official credentials fallback
  const OFFICIAL_ACCOUNTS: Record<string, { pass: string; profile: UserProfile }> = {
    'analyst@nexus.gov.in': {
      pass: 'Analyst@123',
      profile: {
        id: 'usr_analyst_01',
        name: 'Senior Analyst',
        email: 'analyst@nexus.gov.in',
        role: 'Analyst',
        badgeId: 'NEX-8821-AN',
        agency: 'I4C Cybercrime Predictive Cell',
      },
    },
    'analyst': {
      pass: 'Analyst@123',
      profile: {
        id: 'usr_analyst_01',
        name: 'Senior Analyst',
        email: 'analyst@nexus.gov.in',
        role: 'Analyst',
        badgeId: 'NEX-8821-AN',
        agency: 'I4C Cybercrime Predictive Cell',
      },
    },
    'officer@nexus.gov.in': {
      pass: 'Officer@123',
      profile: {
        id: 'usr_officer_02',
        name: 'Field Dispatch Officer',
        email: 'officer@nexus.gov.in',
        role: 'Officer',
        badgeId: 'NEX-4409-OF',
        agency: 'State Police Interception Wing',
      },
    },
    'officer': {
      pass: 'Officer@123',
      profile: {
        id: 'usr_officer_02',
        name: 'Field Dispatch Officer',
        email: 'officer@nexus.gov.in',
        role: 'Officer',
        badgeId: 'NEX-4409-OF',
        agency: 'State Police Interception Wing',
      },
    },
    [ADMIN_EMAIL]: {
      pass: 'Admin@123',
      profile: {
        id: 'usr_admin_01',
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        role: 'Admin',
        badgeId: 'NEX-0001-AD',
        agency: 'I4C National Command Center',
      },
    },
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setError('Please enter your official email/username and security password.');
      return;
    }

    setError('');
    setIsAuthenticating(true);
    setAuthStep('Validating Law Enforcement Credentials...');

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsAuthenticating(false);
        setError(data.detail || 'Authentication failed. Please check your credentials.');
        return;
      }

      // Successful login
      login({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        badgeId: data.badgeId,
        agency: data.agency,
      });
      setIsAuthenticating(false);
      navigate(from, { replace: true });
    } catch {
      // Offline / Local DB Fallback Verification
      const matchedOfficial = OFFICIAL_ACCOUNTS[cleanEmail];
      if (matchedOfficial) {
        if (matchedOfficial.pass !== cleanPass) {
          setIsAuthenticating(false);
          setError('Incorrect security password for this Official Account.');
          return;
        }
        login(matchedOfficial.profile);
        setIsAuthenticating(false);
        navigate(from, { replace: true });
        return;
      }

      // Check registered users list
      let registeredUsers: Array<{ email: string; pass: string; profile: UserProfile; status?: string }> = [];
      try {
        const raw = localStorage.getItem('nexus_registered_users');
        if (raw) registeredUsers = JSON.parse(raw);
      } catch {}

      const matchedRegistered = registeredUsers.find(
        (u) => u.email.trim().toLowerCase() === cleanEmail
      );

      if (matchedRegistered) {
        if (matchedRegistered.pass !== cleanPass) {
          setIsAuthenticating(false);
          setError('Incorrect password for this registered Officer ID.');
          return;
        }

        if (matchedRegistered.status === 'pending_approval') {
          setIsAuthenticating(false);
          setError(`Registration Request (Officer ID: ${matchedRegistered.profile.badgeId}) is PENDING ADMIN APPROVAL by Admin (${ADMIN_EMAIL}). You can log in once Admin approves your request.`);
          return;
        }

        login(matchedRegistered.profile);
        setIsAuthenticating(false);
        navigate(from, { replace: true });
        return;
      }

      setIsAuthenticating(false);
      setError('Official Account not recognized. Please check your credentials or register a new Officer ID.');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required official registration fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setError('');
    setPendingSuccessMsg(null);
    setIsAuthenticating(true);
    setAuthStep(`Dispatching Officer Registration Request to Admin (${ADMIN_EMAIL})...`);

    const generatedBadge = badgeId.trim() || `NEX-${Math.floor(2000 + Math.random() * 7000)}-${role === 'Analyst' ? 'AN' : 'OF'}`;

    const newProfile: UserProfile = {
      id: `usr_${Date.now().toString().slice(-6)}`,
      name: fullName.trim(),
      email: email.trim(),
      role,
      badgeId: generatedBadge,
      agency,
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password: password.trim(),
          badgeId: generatedBadge,
          agency,
          role,
        }),
      });

      const data = await response.json();
      setIsAuthenticating(false);

      if (!response.ok) {
        setError(data.detail || 'Failed to submit registration request.');
        return;
      }

      // Display pending success confirmation card
      setPendingSuccessMsg({
        badgeId: data.badgeId || generatedBadge,
        adminEmail: ADMIN_EMAIL,
      });

      // Clear form inputs
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setBadgeId('');
    } catch {
      // Local fallback for registration
      try {
        const raw = localStorage.getItem('nexus_registered_users');
        const registered = raw ? JSON.parse(raw) : [];
        registered.push({ email: email.trim(), pass: password.trim(), profile: newProfile, status: 'pending_approval' });
        localStorage.setItem('nexus_registered_users', JSON.stringify(registered));

        const rawPending = localStorage.getItem('nexus_pending_users');
        const pending = rawPending ? JSON.parse(rawPending) : [];
        pending.push({
          id: newProfile.id,
          name: newProfile.name,
          email: newProfile.email,
          badgeId: newProfile.badgeId,
          agency: newProfile.agency,
          role: newProfile.role,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('nexus_pending_users', JSON.stringify(pending));
      } catch {}

      setIsAuthenticating(false);
      setPendingSuccessMsg({
        badgeId: generatedBadge,
        adminEmail: ADMIN_EMAIL,
      });

      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setBadgeId('');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#08080A',
        color: '#FFFFFF',
        fontFamily: "'Inter', -apple-system, sans-serif",
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Background Matrix LetterGlitch Effect */}
      <LetterGlitch
        glitchSpeed={50}
        centerVignette={true}
        outerVignette={false}
        smooth={true}
        glitchColors={['#1E293B', '#3B82F6', '#10B981', '#38BDF8', '#64748B']}
      />

      {/* 2. Top Spotlight Light Beam Effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '450px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 35%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 4. Center Form Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
          zIndex: 10,
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Main Headline */}
        <h1
          style={{
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: 700,
            textAlign: 'center',
            color: '#FFFFFF',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            margin: '0 0 10px 0',
            maxWidth: '420px',
          }}
        >
          {activeTab === 'signin'
            ? 'Sign in below to unlock the full potential of NEXUS Intelligence.'
            : 'Register Officer ID below to unlock the full potential of NEXUS Intelligence.'}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '13px',
            color: '#A1A1AA',
            margin: '0 0 28px 0',
            textAlign: 'center',
          }}
        >
          By continuing, you agree to our{' '}
          <span style={{ textDecoration: 'underline', color: '#E4E4E7', cursor: 'pointer' }}>privacy policy</span>.
        </p>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            backgroundColor: '#141417',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            width: '100%',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setError('');
            }}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'signin' ? '#27272A' : 'transparent',
              color: activeTab === 'signin' ? '#FFFFFF' : '#71717A',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setError('');
            }}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'signup' ? '#27272A' : 'transparent',
              color: activeTab === 'signup' ? '#FFFFFF' : '#71717A',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <UserPlus size={14} />
            <span>Register Officer ID</span>
          </button>
        </div>

        {/* Status Confirmation Alert */}
        {pendingSuccessMsg && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34D399', fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>
              <CheckCircle2 size={18} />
              <span>Registration Request Dispatched!</span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#E2E8F0', margin: '0 0 10px 0', lineHeight: 1.5 }}>
              Your Officer ID registration request (Badge ID: <strong style={{ color: '#34D399' }}>{pendingSuccessMsg.badgeId}</strong>) has been submitted to Admin (<strong style={{ color: '#60A5FA' }}>{pendingSuccessMsg.adminEmail}</strong>).
            </p>
            <div style={{ fontSize: '11.5px', color: '#94A3B8', backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              🔒 <strong>Status:</strong> Pending Approval. Once Admin ({pendingSuccessMsg.adminEmail}) approves your request, you can log in to access the NEXUS dashboard.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignInSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email Field */}
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enter your mail"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px 0 46px',
                  borderRadius: '12px',
                  backgroundColor: '#141417',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="enter your password"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px 0 46px',
                  borderRadius: '12px',
                  backgroundColor: '#141417',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAuthenticating}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: '#27272A',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 700,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                marginTop: '4px',
              }}
              onMouseEnter={(e) => {
                if (!isAuthenticating) e.currentTarget.style.backgroundColor = '#3F3F46';
              }}
              onMouseLeave={(e) => {
                if (!isAuthenticating) e.currentTarget.style.backgroundColor = '#27272A';
              }}
            >
              {isAuthenticating ? (
                <>
                  <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span>{authStep}</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}

        {/* SIGN UP FORM (REGISTER OFFICER ID) */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUpSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Official Full Name (e.g. Inspector R. Sharma)"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px 0 46px',
                  borderRadius: '12px',
                  backgroundColor: '#141417',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Official Email */}
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Official Email Address"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px 0 46px',
                  borderRadius: '12px',
                  backgroundColor: '#141417',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Agency / Department */}
            <div style={{ position: 'relative' }}>
              <Building2 size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <select
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px 0 46px',
                  borderRadius: '12px',
                  backgroundColor: '#141417',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="I4C National Command Center">I4C National Command Center</option>
                <option value="NCRP Cyber Crime Cell">NCRP Cyber Crime Cell</option>
                <option value="State Police Cyber Unit">State Police Cyber Unit</option>
                <option value="CFCFRMS Financial Fraud Wing">CFCFRMS Financial Fraud Wing</option>
                <option value="Bank Nodal Anti-Mule Desk">Bank Nodal Anti-Mule Desk</option>
              </select>
            </div>

            {/* Custom Officer / Badge ID */}
            <div style={{ position: 'relative' }}>
              <BadgeCheck size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="Officer Badge ID (Optional)"
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px 0 46px',
                  borderRadius: '12px',
                  backgroundColor: '#141417',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Clearance Role Mode */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                backgroundColor: '#141417',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                type="button"
                onClick={() => setRole('Analyst')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: role === 'Analyst' ? '#27272A' : 'transparent',
                  color: role === 'Analyst' ? '#FFFFFF' : '#71717A',
                  transition: 'all 0.15s ease',
                }}
              >
                Intelligence Analyst
              </button>
              <button
                type="button"
                onClick={() => setRole('Officer')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: role === 'Officer' ? '#27272A' : 'transparent',
                  color: role === 'Officer' ? '#FFFFFF' : '#71717A',
                  transition: 'all 0.15s ease',
                }}
              >
                Field Dispatch Officer
              </button>
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create Security Password"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px 0 46px',
                  borderRadius: '12px',
                  backgroundColor: '#141417',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Confirm Password */}
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Security Password"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px 0 46px',
                  borderRadius: '12px',
                  backgroundColor: '#141417',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit Sign Up Button */}
            <button
              type="submit"
              disabled={isAuthenticating}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: '#27272A',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 700,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                marginTop: '4px',
              }}
            >
              {isAuthenticating ? (
                <>
                  <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span>{authStep}</span>
                </>
              ) : (
                <span>Register Officer ID & Submit</span>
              )}
            </button>
          </form>
        )}

        {/* Bottom Close / Return Home Action */}
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#A1A1AA',
            fontSize: '13.5px',
            fontWeight: 500,
            cursor: 'pointer',
            marginTop: '28px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#A1A1AA';
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
