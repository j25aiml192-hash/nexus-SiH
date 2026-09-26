import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import Dither from './Dither';
import GlitchText from './GlitchText';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90; // Offset so fixed navbar never overlaps section titles
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="nexus-landing-page" style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: 'transparent',
      color: '#0B1226',
      fontFamily: "'Inter', -apple-system, sans-serif",
      boxSizing: 'border-box',
      position: 'relative'
    }}>


      {/* 1. FLOATING GLASSMORPHISM NAV BAR */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: '1240px',
        zIndex: 100,
        pointerEvents: 'auto'
      }}>
        <nav style={{
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          borderRadius: '9999px',
          padding: '10px 24px',
          boxShadow: '0 8px 32px -4px rgba(15, 23, 42, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Logo */}
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                color: '#0B1226'
              }}
            >
              <img src="/nexus_logo.png" alt="NEXUS Logo" style={{ height: '22px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }} />
              <span>NEXUS</span>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', fontSize: '13.5px', color: '#4A5568', fontWeight: 600 }}>
              <button onClick={() => scrollToSection('problem')} style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>Platform</button>
              <button onClick={() => scrollToSection('architecture')} style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>Architecture</button>
              <button onClick={() => scrollToSection('metrics')} style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>Validation</button>
              <button onClick={() => scrollToSection('workflow')} style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>Impact</button>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: '13.5px',
                border: 'none',
                cursor: 'pointer',
                padding: '9px 18px',
                borderRadius: '9999px',
                backgroundColor: '#2E3FE8',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(46, 63, 232, 0.35)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>Launch Console</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </nav>
      </div>

      {/* 2. HERO HEADER - WITH UNSPLASH OLD MAP BACKGROUND */}
      <header style={{
        width: '100%',
        minHeight: '100vh',
        padding: '120px 28px 80px 28px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}>
        {/* EXACT INDIAN CURRENCY MAP USER BACKGROUND LAYER */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'url("/indian_currency_map_exact.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.35,
          pointerEvents: 'none',
          filter: 'contrast(1.08) saturate(1.1)'
        }} />

        <div style={{ width: '100%', maxWidth: '1240px', margin: '0 auto', textAlign: 'left', position: 'relative', zIndex: 10, paddingLeft: '0' }}>
          <div style={{ maxWidth: '540px' }}>
            {/* GIANT LEFT-ALIGNED NEXUS BRAND TITLE WITH GLITCH TEXT */}
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(64px, 10vw, 110px)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
              marginBottom: '20px',
              textTransform: 'uppercase',
              textAlign: 'left',
              color: '#000000'
            }}>
              <GlitchText
                speed={1}
                enableShadows={true}
                enableOnHover={true}
                className="nexus-glitch-hero"
              >
                NEXUS
              </GlitchText>
            </h1>

            {/* HEADLINE SUBTITLE - EXACTLY 2 LINES IN SMALLER FONT */}
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(20px, 2.4vw, 26px)',
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
              color: '#000000',
              marginBottom: '20px',
              maxWidth: '560px',
              textAlign: 'left'
            }}>
              Stolen Money Moves in Minutes.<br />
              Now Investigators Can Too.
            </h2>

            {/* DESCRIPTION - BOLD BLACK FONT */}
            <p style={{
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#000000',
              fontWeight: 700,
              marginBottom: '32px',
              maxWidth: '520px'
            }}>
              Fraud investigation today starts after the money has already moved through five accounts. NEXUS maps the entire mule network as it forms, predicts where funds will be cashed out, and gives officers a window to intercept — before the trail goes cold.
            </p>

            {/* LEFT-ALIGNED ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '13px 26px',
                  borderRadius: '8px',
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span>See the Intelligence Pipeline</span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => scrollToSection('architecture')}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '13px 26px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  border: '2px solid #000000'
                }}
              >
                Read the methodology
              </button>
            </div>
          </div>
        </div>

        {/* EXACT USER INDIAN SKYLINE LINEART BACKGROUND (COMPACT AT BOTTOM) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '90px',
          zIndex: 5,
          pointerEvents: 'none',
          backgroundImage: 'url("/indian_skyline_lineart.png")',
          backgroundSize: '100% 100%',
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat',
          mixBlendMode: 'multiply',
          opacity: 0.95
        }} />
      </header>

      {/* 3. PROBLEM & METRICS SECTION - EDITORIAL BENTO LAYOUT */}
      <section id="problem" style={{ padding: '80px 28px' }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          backgroundColor: '#F8FAFC',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 32px rgba(11, 18, 38, 0.04)',
          overflow: 'hidden'
        }}>
          {/* Top Hero Editorial Area */}
          <div style={{
            padding: '48px 48px 36px 48px',
            display: 'grid',
            gridTemplateColumns: '1.25fr 0.75fr',
            gap: '40px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#00B6C4', marginBottom: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>
                WHY WE BUILT THIS
              </div>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(30px, 3.8vw, 42px)',
                letterSpacing: '-0.02em',
                margin: '0 0 16px 0',
                lineHeight: 1.1,
                color: '#0B1226'
              }}>
                The complaint is filed.<br />The money is already gone.
              </h2>
              <p style={{ lineHeight: 1.6, color: '#4A5568', margin: '0 0 18px 0', fontSize: '15px', maxWidth: '58ch' }}>
                By the time a fraud victim complains, funds have typically passed through five accounts. NEXUS reads the whole network at once, treating every account as a node to answer where funds stay within reach of a human — and when.
              </p>

              {/* Compact Hopping Pipeline Badge */}
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                color: '#0B1226',
                backgroundColor: '#FFFFFF',
                border: '1px solid #DDE4EE',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(11, 18, 38, 0.03)'
              }}>
                <span>victim</span>
                <span style={{ color: '#CBD5E1' }}>→</span>
                <b style={{ color: '#D63E3E' }}>mule 1</b>
                <span style={{ color: '#CBD5E1' }}>→</span>
                <b style={{ color: '#D63E3E' }}>mule 2</b>
                <span style={{ color: '#CBD5E1' }}>→</span>
                <b style={{ color: '#D63E3E' }}>mule 3</b>
                <span style={{ color: '#CBD5E1' }}>→</span>
                <b style={{ color: '#D63E3E' }}>cash-out</b>
              </div>
            </div>

            {/* Right Giant Stat Callout */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '36px 32px',
              textAlign: 'left',
              boxShadow: '0 6px 20px rgba(11, 18, 38, 0.03)'
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#4A5568', fontWeight: 600, letterSpacing: '0.04em' }}>
                CRITICAL CASH-OUT WINDOW
              </div>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(48px, 6vw, 76px)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#0B1226',
                lineHeight: 1,
                margin: '8px 0 6px 0'
              }}>
                4–12h
              </div>
              <div style={{ fontSize: '13.5px', color: '#4A5568', lineHeight: 1.5 }}>
                Typical time interval before mule funds are physically withdrawn at targeted ATMs.
              </div>
            </div>
          </div>

          {/* Bottom Portion - 4 Editorial Bar Columns (Matching Dstudio.agency design!) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF'
          }}>
            {/* Column 1 */}
            <div style={{
              position: 'relative',
              height: '240px',
              borderRight: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 20px', position: 'relative', zIndex: 2 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#64748B', fontWeight: 600 }}>01 / RESPONSE</div>
                <div style={{ fontSize: '13.5px', color: '#0B1226', fontWeight: 700, marginTop: '2px' }}>Mule Hop Velocity</div>
              </div>
              {/* Bottom Filled Area (~35% height fill) */}
              <div style={{
                height: '35%',
                backgroundColor: '#FEE2E2',
                borderTop: '2px solid #FF5D5D',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'flex-end',
                position: 'relative',
                zIndex: 2
              }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 800, color: '#991B1B' }}>
                  4–12 Hours
                </span>
              </div>
            </div>

            {/* Column 2 */}
            <div style={{
              position: 'relative',
              height: '240px',
              borderRight: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 20px', position: 'relative', zIndex: 2 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#64748B', fontWeight: 600 }}>02 / SCALE</div>
                <div style={{ fontSize: '13.5px', color: '#0B1226', fontWeight: 700, marginTop: '2px' }}>Complaints Modelled</div>
              </div>
              {/* Bottom Filled Area (~55% height fill) */}
              <div style={{
                height: '55%',
                backgroundColor: '#E0E7FF',
                borderTop: '2px solid #2E3FE8',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'flex-end',
                position: 'relative',
                zIndex: 2
              }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 800, color: '#1E1B4B' }}>
                  1,000+
                </span>
              </div>
            </div>

            {/* Column 3 */}
            <div style={{
              position: 'relative',
              height: '240px',
              borderRight: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 20px', position: 'relative', zIndex: 2 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#64748B', fontWeight: 600 }}>03 / FEATURES</div>
                <div style={{ fontSize: '13.5px', color: '#0B1226', fontWeight: 700, marginTop: '2px' }}>Pre-Cashout Signals</div>
              </div>
              {/* Bottom Filled Area (~75% height fill) */}
              <div style={{
                height: '75%',
                backgroundColor: '#E0F2FE',
                borderTop: '2px solid #00B6C4',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'flex-end',
                position: 'relative',
                zIndex: 2
              }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 800, color: '#075985' }}>
                  40 Signals
                </span>
              </div>
            </div>

            {/* Column 4 */}
            <div style={{
              position: 'relative',
              height: '240px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 20px', position: 'relative', zIndex: 2 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#64748B', fontWeight: 600 }}>04 / PRECISION</div>
                <div style={{ fontSize: '13.5px', color: '#0B1226', fontWeight: 700, marginTop: '2px' }}>Median Error Radius</div>
              </div>
              {/* Bottom Filled Area (~90% height fill) */}
              <div style={{
                height: '90%',
                backgroundColor: '#FEF3C7',
                borderTop: '2px solid #F6A609',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'flex-end',
                position: 'relative',
                zIndex: 2
              }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 800, color: '#78350F' }}>
                  165.6 km
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ARCHITECTURE SECTION - FULL-BLEED BACKGROUND WITH CONCISE CARDS */}
      <section id="architecture" style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 0',
        backgroundImage: `linear-gradient(180deg, rgba(11, 18, 38, 0.85) 0%, rgba(15, 23, 42, 0.94) 100%), url(/rainy_city_bokeh.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#FFFFFF'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#00B6C4', marginBottom: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>
            BUILT FOR HOW INVESTIGATIONS ACTUALLY WORK
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(30px, 3.8vw, 42px)',
            letterSpacing: '-0.02em',
            margin: '0 0 14px 0',
            lineHeight: 1.15,
            color: '#FFFFFF'
          }}>
            Four layers turn a complaint into a ranked list of ATMs
          </h2>
          <p style={{ fontSize: '15.5px', lineHeight: 1.6, color: '#CBD5E1', maxWidth: '64ch', margin: '0 0 40px 0' }}>
            Network context, temporal filtering, and dual-regressor geospatial ML convert complaint signals into a predicted coordinate and ranked ATM candidates.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Card 1 */}
            <div style={{
              padding: '24px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#00B6C4', marginBottom: '8px', fontWeight: 700 }}>01 / DATA &amp; GRAPH</div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#FFFFFF' }}>Map the network</h3>
              <p style={{ fontSize: '13.5px', color: '#CBD5E1', margin: 0, lineHeight: 1.55 }}>
                Directed graph tracking victim → mule → cash-out across velocity, depth, and shared device signals.
              </p>
            </div>

            {/* Card 2 */}
            <div style={{
              padding: '24px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#00B6C4', marginBottom: '8px', fontWeight: 700 }}>02 / FRAUD RISK</div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#FFFFFF' }}>Score the account</h3>
              <p style={{ fontSize: '13.5px', color: '#CBD5E1', margin: 0, lineHeight: 1.55 }}>
                XGBoost classifier outputting risk score, alert level, and SHAP feature explanations.
              </p>
            </div>

            {/* Card 3 */}
            <div style={{
              padding: '24px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#00B6C4', marginBottom: '8px', fontWeight: 700 }}>03 / GEOGRAPHY</div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#FFFFFF' }}>Predict location</h3>
              <p style={{ fontSize: '13.5px', color: '#CBD5E1', margin: 0, lineHeight: 1.55 }}>
                Dual LightGBM regressors predicting cash-out latitude and longitude without target leakage.
              </p>
            </div>

            {/* Card 4 */}
            <div style={{
              padding: '24px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#00B6C4', marginBottom: '8px', fontWeight: 700 }}>04 / OPERATIONS</div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#FFFFFF' }}>Rank the ATMs</h3>
              <p style={{ fontSize: '13.5px', color: '#CBD5E1', margin: 0, lineHeight: 1.55 }}>
                Haversine distance ranking nearby ATM candidates pushed live to field response teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. METRICS SECTION - FULL-BLEED SLEEK LIGHT MINT BAND WITH ELEVATED DASHBOARD */}
      <section id="metrics" style={{
        width: '100%',
        backgroundColor: '#F0F6F5',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
        padding: '80px 0',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 28px',
          display: 'grid',
          gridTemplateColumns: '0.95fr 1.05fr',
          gap: '44px',
          alignItems: 'center'
        }}>
          {/* Left Column - Text & Key Highlights */}
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#0D9488', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.06em' }}>
              FEASIBILITY, REPORTED HONESTLY
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 'clamp(30px, 3.8vw, 42px)', letterSpacing: '-0.03em', margin: '0 0 16px 0', lineHeight: 1.1, color: '#0B1226' }}>
              Validated accuracy<br />against baselines
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#4A5568', margin: '0 0 28px 0', maxWidth: '44ch' }}>
              NEXUS V3 narrows the cash-out search radius significantly across 436 held-out test events, delivering an actionable regional localization signal.
            </p>

            {/* Stat Callout Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#0D9488', fontWeight: 700 }}>MEDIAN ERROR</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', fontWeight: 800, color: '#0B1226', marginTop: '4px' }}>165.6 km</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Haversine Distance</div>
              </div>

              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>MEAN ERROR</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', fontWeight: 800, color: '#0B1226', marginTop: '4px' }}>422.3 km</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Haversine Distance</div>
              </div>
            </div>
          </div>

          {/* Right Column - Elevated Pure White Card Dashboard Visualization (Matching Image 2!) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '28px 32px',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.05), 0 2px 8px rgba(15, 23, 42, 0.02)',
            border: '1px solid #E2E8F0'
          }}>
            {/* Header inside elevated white card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>Summary / Median Precision</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: '#0B1226', marginTop: '2px' }}>
                  165.6 km <span style={{ fontSize: '13px', fontWeight: 700, color: '#0D9488' }}>↓ 61% Error Reduction</span>
                </div>
              </div>
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#4A5568',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>436 Held-Out Events</span>
                <span style={{ fontSize: '10px' }}>▾</span>
              </div>
            </div>

            {/* Smooth Teal Area Line Graph (Exact layout as Image 2!) */}
            <svg viewBox="0 0 460 160" width="100%" height="160" role="img" aria-label="Line graph showing error reduction down to NEXUS V3">
              <defs>
                <linearGradient id="mintAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00B6C4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00B6C4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <polygon points="30,30 120,55 210,35 300,70 390,120 390,140 30,140" fill="url(#mintAreaGrad)" />

              {/* Smooth Trend Line */}
              <path d="M 30,30 Q 80,45 120,55 T 210,35 T 300,70 T 390,120" fill="none" stroke="#00B6C4" strokeWidth="2.5" strokeLinecap="round" />

              {/* Baseline Points */}
              <circle cx="30" cy="30" r="4" fill="#94A3B8" />
              <circle cx="120" cy="55" r="4" fill="#94A3B8" />
              <circle cx="210" cy="35" r="4" fill="#94A3B8" />
              <circle cx="300" cy="70" r="4" fill="#94A3B8" />

              {/* NEXUS V3 Highlight Point */}
              <circle cx="390" cy="120" r="6" fill="#00B6C4" />
              <circle cx="390" cy="120" r="10" fill="none" stroke="#00B6C4" strokeWidth="1.5" opacity="0.5" />

              {/* Baseline Labels */}
              <text x="30" y="154" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">Global</text>
              <text x="120" y="154" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">Last KYC</text>
              <text x="210" y="154" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">First KYC</text>
              <text x="300" y="154" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">KYC-chain</text>
              <text x="390" y="154" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" fill="#0B1226">NEXUS V3</text>
            </svg>

            {/* Threshold Progress Pills below chart */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>≤ 50 km</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 800, color: '#0D9488' }}>25.0%</div>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>≤ 100 km</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 800, color: '#2563EB' }}>42.2%</div>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>≤ 250 km</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 800, color: '#475569' }}>54.6%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 & 7. GOLDEN RATIO ANIMATED FULL-BLEED WAVE SECTION */}
      <section id="workflow" style={{
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
        padding: '80px 0 90px 0',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header (Golden Ratio Typography) */}
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto 56px auto',
          padding: '0 28px'
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#F97316',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ width: '20px', height: '2px', backgroundColor: '#F97316' }}></span>
            GOLDEN RATIO RESPONSE CHAIN
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(28px, 3.4vw, 40px)',
            letterSpacing: '-0.02em',
            margin: '0 0 10px 0',
            color: '#0B1226'
          }}>
            Four seats in the response chain
          </h2>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '15px',
            color: '#64748B',
            margin: 0,
            maxWidth: '52ch'
          }}>
            Predictive ML &amp; graph analysis mapped directly into operational field response.
          </p>
        </div>

        {/* FULL-BLEED GOLDEN RATIO WAVE CONTAINER (Leftmost x=0 to Rightmost x=100%) */}
        <div style={{
          position: 'relative',
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          marginBottom: '64px',
          padding: '10px 0'
        }}>
          {/* SVG Animated Kinetic Beam Path (Edge to Edge M 0 ... 1000) */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '220px', pointerEvents: 'none', zIndex: 1 }}>
            <svg viewBox="0 0 1000 200" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="goldenBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
                  <stop offset="38%" stopColor="#0EA5E9" stopOpacity="0.8" />
                  <stop offset="62%" stopColor="#10B981" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Subtle Base Dashed Guide */}
              <path
                d="M 0 100 C 70 50, 90 50, 146 50 C 230 50, 290 150, 382 150 C 470 150, 530 45, 618 45 C 710 45, 770 145, 854 145 C 930 145, 960 100, 1000 100"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
                strokeDasharray="6 6"
              />

              {/* Glowing Animated Motion Energy Beam */}
              <path
                d="M 0 100 C 70 50, 90 50, 146 50 C 230 50, 290 150, 382 150 C 470 150, 530 45, 618 45 C 710 45, 770 145, 854 145 C 930 145, 960 100, 1000 100"
                fill="none"
                stroke="url(#goldenBeamGrad)"
                strokeWidth="3.5"
                strokeDasharray="40 160"
                className="flow-dash-beam"
              />
            </svg>
          </div>

          {/* 4 Golden Ratio Nodes Overlay (Golden ratio proportions: 14.6%, 38.2%, 61.8%, 85.4%) */}
          <div style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0 28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            position: 'relative',
            zIndex: 2,
            minHeight: '230px'
          }}>
            {/* Node 1: Investigators (Golden Ratio Peak y=50px) */}
            <div className="node-float-1" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              paddingTop: '10px'
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 12px 30px rgba(99, 102, 241, 0.22)',
                border: '2px solid #6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366F1',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'transform 0.25s ease'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                1. Investigators
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '22ch', lineHeight: 1.4 }}>
                Prioritize mule-chain risk &amp; geo-forecasts.
              </p>
            </div>

            {/* Node 2: Partner Banks (Golden Ratio Trough y=150px) */}
            <div className="node-float-2" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              paddingTop: '80px'
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 12px 30px rgba(14, 165, 233, 0.22)',
                border: '2px solid #0EA5E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0EA5E9',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'transform 0.25s ease'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="21" width="18" height="2"></rect>
                  <rect x="3" y="10" width="18" height="2"></rect>
                  <path d="M12 2L3 7v3h18V7l-9-5z"></path>
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                2. Partner Banks
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '22ch', lineHeight: 1.4 }}>
                Coordinate branch &amp; ATM location checks.
              </p>
            </div>

            {/* Node 3: Field Dispatch (Golden Ratio Peak y=45px) */}
            <div className="node-float-1" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              paddingTop: '6px'
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 12px 30px rgba(16, 185, 129, 0.22)',
                border: '2px solid #10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'transform 0.25s ease'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                3. Field Dispatch
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '22ch', lineHeight: 1.4 }}>
                Target high-confidence ATM candidates.
              </p>
            </div>

            {/* Node 4: Command Centers (Golden Ratio Trough y=145px) */}
            <div className="node-float-2" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              paddingTop: '75px'
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 12px 30px rgba(245, 158, 11, 0.22)',
                border: '2px solid #F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'transform 0.25s ease'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                4. Command Centers
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '22ch', lineHeight: 1.4 }}>
                Real-time countdown &amp; hotspot monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Lower 3 Bento Cards Grid (Golden Ratio Minimalist Styling) */}
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {/* Card 1 */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ height: '6px', background: 'linear-gradient(90deg, #FF5D5D 0%, #F6A609 100%)' }}></div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  WORKFLOW COMPARISON
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px', fontWeight: 700, color: '#DC2626', marginBottom: '6px' }}>● Reactive</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>• Fraud occurs</div>
                      <div>• Complaint filed</div>
                      <div style={{ textDecoration: 'line-through', opacity: 0.6 }}>• Cash saved</div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #ECFDF5', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px', fontWeight: 700, color: '#059669', marginBottom: '6px' }}>✓ Proactive</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#065F46', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>✓ Complaint filed</div>
                      <div>✓ Geo map prediction</div>
                      <div style={{ fontWeight: 700, color: '#047857' }}>✓ Field alert sent</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ height: '6px', background: 'linear-gradient(90deg, #00B6C4 0%, #2563EB 100%)' }}></div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  INTERVENTION TRIAGE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ backgroundColor: '#EF4444', color: '#FFFFFF', padding: '10px 6px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", opacity: 0.9 }}>HIGH</div>
                    <div style={{ fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>4h RED</div>
                  </div>
                  <div style={{ backgroundColor: '#F59E0B', color: '#FFFFFF', padding: '10px 6px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", opacity: 0.9 }}>MODERATE</div>
                    <div style={{ fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>8h AMBER</div>
                  </div>
                  <div style={{ backgroundColor: '#10B981', color: '#FFFFFF', padding: '10px 6px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", opacity: 0.9 }}>STANDARD</div>
                    <div style={{ fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>12h GREEN</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ height: '6px', background: 'linear-gradient(90deg, #8B5CF6 0%, #6366F1 100%)' }}></div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  SPATIAL ML STACK
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['NetworkX', 'XGBoost', 'LightGBM ×2', 'SHAP', 'Uber H3', 'FastAPI', 'Supabase', 'React + Leaflet'].map((tag) => (
                    <span key={tag} style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      padding: '4px 9px',
                      borderRadius: '14px',
                      backgroundColor: '#FFFFFF',
                      color: '#334155',
                      border: '1px solid #E2E8F0',
                      fontWeight: 500
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA BAND */}
      <section style={{ padding: '0 28px 60px 28px' }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          backgroundColor: '#0B1226',
          borderRadius: '24px',
          padding: '64px 48px',
          textAlign: 'center',
          color: '#FFFFFF'
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(26px, 3.5vw, 36px)',
            fontWeight: 700,
            maxWidth: '22ch',
            margin: '0 auto 16px auto',
            color: '#FFFFFF'
          }}>
            See where the next withdrawal is likely to happen — before it does.
          </h2>
          <p style={{
            fontSize: '15.5px',
            color: '#A6B0C8',
            maxWidth: '44ch',
            margin: '0 auto 30px auto'
          }}>
            Repository, evaluation notebooks and full V3 pipeline artifacts are available for auditor review.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              padding: '13px 26px',
              borderRadius: '8px',
              backgroundColor: '#FF5D5D',
              color: '#FFFFFF',
              boxShadow: '0 6px 20px rgba(255, 93, 93, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Launch Command Console</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* 9. ANIMATED MOVING NEXUS MARQUEE BANNER AT THE BOTTOM */}
      <section style={{
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#0B1226',
        borderTop: '1px solid #1E293B',
        borderBottom: '1px solid #1E293B',
        padding: '20px 0',
        position: 'relative',
        userSelect: 'none'
      }}>
        <div className="nexus-marquee-track">
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '36px', paddingRight: '36px', whiteSpace: 'nowrap' }}>
              <GlitchText speed={0.8} enableShadows={true} enableOnHover={true} className="nexus-glitch-hero">
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '34px', fontWeight: 900, letterSpacing: '0.08em', color: '#FFFFFF' }}>
                  NEXUS
                </span>
              </GlitchText>
              <span style={{ color: '#FF5D5D', fontSize: '20px' }}>✦</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: '#00B6C4', fontWeight: 700, letterSpacing: '0.06em' }}>
                PREDICTIVE CASH-OUT INTERCEPTION
              </span>
              <span style={{ color: '#2E3FE8', fontSize: '20px' }}>✦</span>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '32px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                WebkitTextStroke: '1px #94A3B8',
                color: 'transparent'
              }}>
                NEXUS
              </span>
              <span style={{ color: '#F6A609', fontSize: '20px' }}>✦</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: '#94A3B8', fontWeight: 600 }}>
                SIH26184 · TEAM PYTORCHERERS
              </span>
              <span style={{ color: '#FF5D5D', fontSize: '20px' }}>✦</span>
            </div>
          ))}
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer style={{
        padding: '40px 28px 60px 28px',
        textAlign: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
        color: '#4A5568',
        borderTop: '1px solid #DDE4EE'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <GlitchText speed={0.5} enableShadows={false} enableOnHover={true}>
            <span style={{ fontWeight: 800, color: '#0B1226' }}>NEXUS</span>
          </GlitchText>
          <span>— SIH26184 · Team PYTORCHERERS · Predictive Cash-Out Interception for Cybercrime Complaints</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
