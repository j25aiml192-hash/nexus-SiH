import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Zap,
  ChevronRight
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>

      {/* 1. TOP NAVBAR */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 40px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(180deg, #0B2238 0%, #102F4A 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(11, 34, 56, 0.25)'
          }}>
            <Zap size={18} />
          </div>
          <span style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '0.04em', color: '#0F172A', textTransform: 'uppercase' }}>
            NEXUS
          </span>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <button
            onClick={() => scrollToSection('problem')}
            style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
          >
            Problem
          </button>
          <button
            onClick={() => scrollToSection('why-we-built-this')}
            style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
          >
            Why We Built This
          </button>
          <button
            onClick={() => scrollToSection('feasibility')}
            style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
          >
            Feasibility & Constraints
          </button>
        </nav>

        {/* Right CTA Button */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '9px 18px',
            borderRadius: '9999px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            fontSize: '12.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span>Launch Console</span>
          <ArrowRight size={14} />
        </button>
      </header>

      {/* 2. HERO SECTION WITH ARCH BACKGROUND */}
      <section style={{
        position: 'relative',
        padding: '60px 40px 80px 40px',
        backgroundColor: '#E8F5E9',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(209, 231, 221, 0.6) 0%, rgba(232, 245, 233, 0.95) 75%)',
        borderBottomLeftRadius: '140px',
        borderBottomRightRadius: '140px',
        overflow: 'hidden'
      }}>
        {/* Map Grid Vector Background Overlay */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.18, pointerEvents: 'none' }}
          viewBox="0 0 1200 600"
          preserveAspectRatio="none"
        >
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#166534" strokeWidth="0.8" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Corridor Vector Lines */}
          <path d="M 100,100 L 400,250 L 800,150 L 1100,400" stroke="#15803D" strokeWidth="2" strokeDasharray="6,6" fill="none" />
          <path d="M 200,450 L 500,300 L 900,420" stroke="#15803D" strokeWidth="1.5" strokeDasharray="4,4" fill="none" />
          <circle cx="400" cy="250" r="8" fill="#15803D" />
          <circle cx="800" cy="150" r="10" fill="#DC2626" />
        </svg>

        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'left', position: 'relative', zIndex: 10 }}>
          {/* Big Green Outline NEXUS Title */}
          <div style={{
            fontSize: '84px',
            fontWeight: 950,
            letterSpacing: '-0.04em',
            color: '#15803D',
            WebkitTextStroke: '2px #166534',
            lineHeight: '0.9',
            marginBottom: '16px'
          }}>
            NEXUS
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: '44px',
            fontWeight: 900,
            lineHeight: '1.1',
            letterSpacing: '-0.03em',
            color: '#0F172A',
            marginBottom: '20px',
            maxWidth: '820px'
          }}>
            Stolen Money Moves in Minutes.<br />
            <span style={{ color: '#15803D' }}>Now Investigators Can Too.</span>
          </h1>

          {/* Lead Description */}
          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#334155',
            maxWidth: '720px',
            marginBottom: '32px'
          }}>
            Fraud investigation today starts after the money has already moved through five accounts. NEXUS maps the entire mule network as it forms, predicts where funds will be cashed out, and gives officers a window to intercept — before the trail goes cold.
          </p>

          {/* Primary Action Button */}
          <button
            onClick={() => scrollToSection('why-we-built-this')}
            style={{
              padding: '14px 28px',
              borderRadius: '9999px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 28px rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.08)';
            }}
          >
            <span>See the Intelligence Pipeline</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* 3. SECTION: WHY WE BUILT THIS */}
      <section id="why-we-built-this" style={{
        padding: '90px 40px',
        maxWidth: '1000px',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: '#0F172A',
          marginBottom: '32px',
          textTransform: 'uppercase'
        }}>
          WHY WE BUILT THIS
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '15.5px', lineHeight: '1.7', color: '#334155' }}>
          <p style={{ margin: 0 }}>
            By the time a fraud victim files a complaint, <span style={{ textDecoration: 'underline', textDecorationColor: '#166534', textUnderlineOffset: '4px', fontWeight: 600 }}>the money is usually gone</span> — not missing, just moved. It passes through Account A, then B, then C, then D, each transfer designed to look ordinary on its own. Traditional fraud detection checks each transaction against a threshold, one at a time, which means it answers what happened long after it's stopped being useful.
          </p>

          <p style={{ margin: 0 }}>
            NEXUS asks a different question: what is this network doing, and where is it headed next? We treat every account as a node and every transaction as a connection, then look at how money moves through that graph — direction, speed, repeated patterns, and sudden shifts in behavior. A single account might look clean in isolation; the same account inside a cluster of rapid, layered transfers looks very different.
          </p>

          <p style={{ margin: 0 }}>
            The platform combines this graph view with a geospatial model that predicts likely cash-out points — ATMs, hotspots, giving investigators a realistic window to freeze funds before they're withdrawn, instead of a case file to close after the fact. NEXUS doesn't replace the investigator. It replaces hundreds of raw transactions with a small number of prioritized, explained leads — and the decision to act always stays with a human officer.
          </p>
        </div>
      </section>

      {/* 4. SECTION: FEASIBILITY & CONSTRAINTS (4 CARDS GRID) */}
      <section id="feasibility" style={{
        padding: '80px 40px 100px 40px',
        backgroundColor: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          {/* Label Tag */}
          <div style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 800,
            color: '#15803D',
            backgroundColor: '#DCFCE7',
            padding: '4px 10px',
            borderRadius: '6px',
            display: 'inline-block',
            letterSpacing: '0.05em',
            marginBottom: '12px'
          }}>
            FEASIBILITY
          </div>

          <h2 style={{
            fontSize: '32px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: '#0F172A',
            marginBottom: '8px'
          }}>
            Built for How Investigations Actually Work
          </h2>

          <p style={{ fontSize: '14.5px', color: '#64748B', marginBottom: '44px', maxWidth: '760px' }}>
            A prediction system is only useful to law enforcement if it's fast, explainable, and doesn't drown officers in false positives — so NEXUS is built around four constraints:
          </p>

          {/* 4 Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: '24px'
          }}>
            {/* Card #1 */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              padding: '28px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.03)';
            }}
            >
              <div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#15803D', marginBottom: '10px' }}>
                  #1
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
                  Graph-based detection, not fixed rules.
                </h3>
                <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#475569', margin: 0 }}>
                  Rule-based thresholds are static, and criminals adapt to them. NEXUS uses a graph neural network (GraphSAGE) over the account-transaction network, which catches network-level patterns — layering, rapid fan-out, repeated mule infrastructure — that no single-transaction rule would flag.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8' }}>
                <span>Node & Transaction Graph</span>
                <span style={{ color: '#15803D', fontWeight: 700 }}>#MuleNetworkMapping</span>
              </div>
            </div>

            {/* Card #2 */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              padding: '28px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.03)';
            }}
            >
              <div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#15803D', marginBottom: '10px' }}>
                  #2
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
                  Prioritization over volume.
                </h3>
                <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#475569', margin: 0 }}>
                  Flagging thousands of transactions isn't intelligence; it's noise. NEXUS surfaces a small set of high-risk nodes, ranked strictly with the specific signals behind the score — unusual velocity, connections to known suspicious clusters, prior complaint links — so an investigator can act on the first lead, not the 2,000th.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8' }}>
                <span>Ranked Signal Explanation</span>
                <span style={{ color: '#15803D', fontWeight: 700 }}>#ExplainableVectors</span>
              </div>
            </div>

            {/* Card #3 */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              padding: '28px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.03)';
            }}
            >
              <div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#15803D', marginBottom: '10px' }}>
                  #3
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
                  Prediction with a real action window.
                </h3>
                <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#475569', margin: 0 }}>
                  The geospatial cash-out model is only valuable if it gives officers time to respond — the system is designed around a 6–24 hour prediction window, matched to how fast mule networks typically move funds to withdrawal.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8' }}>
                <span>Realtime 6–24 hr Window</span>
                <span style={{ color: '#15803D', fontWeight: 700 }}>#PreCashoutAlert</span>
              </div>
            </div>

            {/* Card #4 */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              padding: '28px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.03)';
            }}
            >
              <div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#15803D', marginBottom: '10px' }}>
                  #4
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
                  Officer-in-command, always.
                </h3>
                <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#475569', margin: 0 }}>
                  NEXUS surfaces signals, connections, and risk — the investigating officer makes every call. No accounts frozen, no cases closed, and no conclusions reached without a human decision.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8' }}>
                <span>Human-in-the-Loop Control</span>
                <span style={{ color: '#15803D', fontWeight: 700 }}>#WithOfficerAuthorization</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FOOTER BANNER */}
      <footer style={{
        padding: '60px 40px',
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px' }}>
            Ready to Intercept Cybercrime Cash-Outs in Real Time?
          </h3>
          <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '28px' }}>
            Launch the NEXUS National Command Center console to inspect live complaints, mule network graphs, and predictive ATM alerts.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '14px 32px',
              borderRadius: '9999px',
              backgroundColor: '#15803D',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 6px 20px rgba(21, 128, 61, 0.4)',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span>Launch Command Console</span>
            <ArrowRight size={16} />
          </button>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '12px', color: '#64748B' }}>
            Built for Smart India Hackathon 2026 — Problem Statement SIH26184
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
