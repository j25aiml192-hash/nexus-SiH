import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import GlitchText from './GlitchText';
import ScrollExpand from './ScrollExpand';
import FolderFloat from './FolderFloat';
import AccordionGallery from './AccordionGallery';
import Stack from './Stack';
import Carousel from './Carousel';

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
      backgroundColor: '#FFFFFF',
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
                backgroundColor: '#02041cff',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 4, 28, 0.45)',
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

      {/* 3. PROBLEM & METRICS SECTION - WRAPPED IN SCROLLEXPAND MOTION */}
      <section id="problem" style={{ padding: '60px 28px 40px 28px', backgroundColor: '#06070B' }}>
        <ScrollExpand containerBg="#0F1117" useWindowScroll>
          <div style={{
            padding: '48px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '48px',
            alignItems: 'start'
          }}>
            {/* Left Content Area */}
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#71717A', marginBottom: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                WHY WE BUILT THIS
              </div>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(32px, 3.8vw, 44px)',
                letterSpacing: '-0.03em',
                margin: '0 0 20px 0',
                lineHeight: 1.1,
                color: '#FFFFFF'
              }}>
                The complaint is filed. The money is already gone.
              </h2>
              <p style={{ lineHeight: 1.6, color: '#A1A1AA', margin: '0 0 24px 0', fontSize: '15px' }}>
                By the time a fraud victim complains, funds have typically passed through five accounts. Traditional fraud detection checks each transaction against a threshold, one at a time — when investigators finally spot the pattern, the trail has gone cold.
              </p>

              {/* Mule Hop Terminal Box */}
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13.5px',
                backgroundColor: '#06070B',
                border: '1px solid #27272A',
                borderRadius: '12px',
                padding: '18px 20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', fontWeight: 600, flexWrap: 'wrap' }}>
                  <span>victim</span>
                  <span style={{ color: '#52525B' }}>→</span>
                  <u style={{ textDecorationColor: '#71717A' }}>mule 1</u>
                  <span style={{ color: '#52525B' }}>→</span>
                  <u style={{ textDecorationColor: '#71717A' }}>mule 2</u>
                  <span style={{ color: '#52525B' }}>→</span>
                  <b style={{ color: '#FFFFFF', textDecoration: 'underline' }}>cash-out</b>
                </div>
                <div style={{ marginTop: '10px', color: '#71717A', fontSize: '12px' }}>
                  // each hop designed to look ordinary on its own
                </div>
              </div>

              <p style={{ lineHeight: 1.6, color: '#A1A1AA', margin: 0, fontSize: '15px' }}>
                NEXUS reads the whole network at once. It treats every account as a node, looks for the connection pattern rather than a single transaction, and answers the question fraud tools have never asked: where does this account stay within reach of a human — and when.
              </p>
            </div>

            {/* Right Column - Interactive FolderFloat Emitting Metric Cards */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignSelf: 'stretch',
              minHeight: '480px',
              position: 'relative'
            }}>
              <FolderFloat
                label="CRITICAL METRICS & SCALE"
                sublabel="3 core intelligence signals"
                trigger="hover"
                openOnScroll={true}
                folderColor="#0B0D14"
                frontColor="#141722"
                paperColor="#06070B"
                labelColor="#FFFFFF"
                width="100%"
                height={200}
                radius={20}
                lift={100}
                tilt={3}
                spread={180}
                flapAngle={45}
                restAngle={12}
                openDuration={550}
                stagger={70}
                bounce={0.35}
                items={[
                  {
                    title: '40 Signals',
                    description: 'Pre-cash-out features spanning transaction, graph topology, mule behaviour, banking and KYC/spatial signals',
                    backgroundColor: '#0A0C14'
                  },
                  {
                    title: '1,000+ Complaints',
                    description: 'Complaints modelled across 2,975 cash-out events to build the geographic intelligence layer',
                    backgroundColor: '#090B12'
                  },
                  {
                    title: '4–12 Hours',
                    description: "Typical gap between mule transfer and physical cash withdrawal — the window current freezes can't reliably exploit",
                    backgroundColor: '#06070B'
                  }
                ]}
              />
            </div>
          </div>
        </ScrollExpand>
      </section>

      {/* 4. ARCHITECTURE SECTION - WHITE BACKGROUND WITH BRIGHT ACCORDION CARDS */}
      <section id="architecture" style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 0',
        backgroundColor: '#FFFFFF',
        color: '#0B1226'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#00808C', marginBottom: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>
            BUILT FOR HOW INVESTIGATIONS ACTUALLY WORK
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(30px, 3.8vw, 42px)',
            letterSpacing: '-0.02em',
            margin: '0 0 14px 0',
            lineHeight: 1.15,
            color: '#0B1226'
          }}>
            Four layers turn a complaint into a ranked list of ATMs
          </h2>
          <p style={{ fontSize: '15.5px', lineHeight: 1.6, color: '#4A5568', maxWidth: '64ch', margin: '0 0 40px 0' }}>
            Network context, temporal filtering, and dual-regressor geospatial ML convert complaint signals into a predicted coordinate and ranked ATM candidates.
          </p>

          <AccordionGallery
            defaultIndex={null}
            expandRatio={0.52}
            trigger="hover"
            items={[
              {
                tag: '01 / DATA & GRAPH',
                title: 'Map the network',
                description: 'Directed graph tracking victim → mule → cash-out across velocity, depth, and shared device signals.',
                image: '/hacker_laptop_gloves.jpg',
                backgroundColor: '#5c5d5fff',
                textColor: '#ffffffff',
                accentColor: '#2a292eff'
              },
              {
                tag: '02 / FRAUD RISK',
                title: 'Score the account',
                description: 'XGBoost classifier outputting risk score, alert level, and SHAP feature explanations.',
                image: '/fraud_risk_score_graph.jpg',
                backgroundColor: '#5c5d5fff',
                textColor: '#ffffffff',
                accentColor: 'rgba(88, 87, 88, 1)'
              },
              {
                tag: '03 / GEOGRAPHY',
                title: 'Predict location',
                description: 'Dual LightGBM regressors predicting cash-out latitude and longitude without target leakage.',
                image: '/map_pin_location.jpg',
                backgroundColor: '#5c5d5fff',
                textColor: '#ffffffff',
                accentColor: '#575f5dff'
              },
              {
                tag: '04 / OPERATIONS',
                title: 'Rank the ATMs',
                description: 'Haversine distance ranking nearby ATM candidates pushed live to field response teams.',
                image: '/tactical_map_notes.jpg',
                backgroundColor: '#5c5d5fff',
                textColor: '#ffffffff',
                accentColor: '#7c7671ff'
              }
            ]}
          />
        </div>
      </section>

      {/* 5. METRICS SECTION - SLEEK BLACK & WHITE THEME WITH PIXELSWAP DASHBOARD */}
      <section id="metrics" style={{
        width: '100%',
        backgroundColor: '#000000',
        borderTop: '1px solid #27272A',
        borderBottom: '1px solid #27272A',
        padding: '90px 0',
        boxSizing: 'border-box',
        color: '#FFFFFF'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 28px',
          display: 'grid',
          gridTemplateColumns: '0.9fr 1.1fr',
          gap: '48px',
          alignItems: 'center'
        }}>
          {/* Left Column - Text & Key Highlights */}
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#A1A1AA',
              marginBottom: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ width: '16px', height: '2px', backgroundColor: '#FFFFFF' }}></span>
              FEASIBILITY, REPORTED HONESTLY
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(32px, 3.8vw, 44px)',
              letterSpacing: '-0.03em',
              margin: '0 0 16px 0',
              lineHeight: 1.1,
              color: '#FFFFFF'
            }}>
              Validated accuracy<br />against baselines
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#A1A1AA', margin: '0 0 32px 0', maxWidth: '44ch' }}>
              NEXUS V3 narrows the cash-out search radius significantly across 436 held-out test events, delivering an actionable regional localization signal.
            </p>

            {/* Stat Callout Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
              <div style={{ backgroundColor: '#09090B', border: '1px solid #27272A', borderRadius: '16px', padding: '20px 22px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#A1A1AA', fontWeight: 700, letterSpacing: '0.05em' }}>MEDIAN ERROR</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '34px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px' }}>165.6 km</div>
                <div style={{ fontSize: '12px', color: '#71717A', marginTop: '4px' }}>Haversine Distance</div>
              </div>

              <div style={{ backgroundColor: '#09090B', border: '1px solid #27272A', borderRadius: '16px', padding: '20px 22px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#A1A1AA', fontWeight: 700, letterSpacing: '0.05em' }}>MEAN ERROR</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '34px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px' }}>422.3 km</div>
                <div style={{ fontSize: '12px', color: '#71717A', marginTop: '4px' }}>Haversine Distance</div>
              </div>
            </div>
          </div>

          {/* Right Column - Interactive Stack Component (Dark Baseline Graph <-> Bright NEXUS V3 Graph) */}
          <div style={{
            width: '100%',
            height: '420px',
            position: 'relative'
          }}>
            <Stack
              randomRotation={true}
              sensitivity={180}
              sendToBackOnClick={true}
              resetOnMouseLeave={true}
              cards={[
                // Card 1: Dark Theme Graph Card (Unselected State)
                <div style={{
                  backgroundColor: '#09090B',
                  borderRadius: '24px',
                  padding: '32px 36px',
                  height: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: '#FFFFFF',
                  border: '1px solid #27272A',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#71717A', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Baseline Evaluation / Search Radius
                      </div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                        422.3 km <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717A' }}>(KYC-Chain Baseline)</span>
                      </div>
                    </div>
                  </div>

                  {/* Monochrome Baseline Line Chart */}
                  <svg viewBox="0 0 460 150" width="100%" height="150" role="img" aria-label="Baseline search radius chart">
                    <path d="M 30,30 L 120,55 L 210,35 L 300,70 L 390,120" fill="none" stroke="#3F3F46" strokeWidth="2.5" strokeDasharray="6 6" />
                    <circle cx="30" cy="30" r="5" fill="#A1A1AA" />
                    <circle cx="120" cy="55" r="5" fill="#A1A1AA" />
                    <circle cx="210" cy="35" r="5" fill="#A1A1AA" />
                    <circle cx="300" cy="70" r="5" fill="#A1A1AA" />
                    <circle cx="390" cy="120" r="5" fill="#71717A" />

                    <text x="30" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#71717A">Global</text>
                    <text x="120" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#71717A">Last KYC</text>
                    <text x="210" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#71717A">First KYC</text>
                    <text x="300" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#A1A1AA">KYC-chain</text>
                    <text x="390" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" fill="#FFFFFF">NEXUS V3</text>
                  </svg>

                </div>,

                // Card 2: Bright Theme Graph Card (Selected / Hovered State)
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '32px 36px',
                  height: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: '#0B1226',
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
                  border: '1px solid #E2E8F0'
                }}>
                  {/* Card Header inside elevated white card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>Summary / Median Precision</div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: '#0B1226', marginTop: '2px' }}>
                        165.6 km <span style={{ fontSize: '13px', fontWeight: 700, color: '#0D9488' }}>↓ 61% Error Reduction</span>
                      </div>
                    </div>
                  </div>

                  {/* Smooth Teal Area Line Graph */}
                  <svg viewBox="0 0 460 150" width="100%" height="150" role="img" aria-label="Line graph showing error reduction down to NEXUS V3">
                    <defs>
                      <linearGradient id="mintAreaGradBrightStack" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00B6C4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00B6C4" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <polygon points="30,30 120,55 210,35 300,70 390,120 390,135 30,135" fill="url(#mintAreaGradBrightStack)" />
                    <path d="M 30,30 Q 80,45 120,55 T 210,35 T 300,70 T 390,120" fill="none" stroke="#00B6C4" strokeWidth="2.5" strokeLinecap="round" />

                    <circle cx="30" cy="30" r="4" fill="#94A3B8" />
                    <circle cx="120" cy="55" r="4" fill="#94A3B8" />
                    <circle cx="210" cy="35" r="4" fill="#94A3B8" />
                    <circle cx="300" cy="70" r="4" fill="#94A3B8" />

                    <circle cx="390" cy="120" r="6" fill="#00B6C4" />
                    <circle cx="390" cy="120" r="10" fill="none" stroke="#00B6C4" strokeWidth="1.5" opacity="0.5" />

                    <text x="30" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">Global</text>
                    <text x="120" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">Last KYC</text>
                    <text x="210" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">First KYC</text>
                    <text x="300" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">KYC-chain</text>
                    <text x="390" y="145" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" fill="#0B1226">NEXUS V3</text>
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
              ]}
            />
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
           Seats in the response chain-
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

        {/* Full-Bleed Edge-to-Edge Carousel Container (Leftmost x=0 to Rightmost x=100vw) */}
        <div style={{
          position: 'relative',
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          marginBottom: '48px',
          overflow: 'hidden'
        }}>
          <div style={{ height: '480px', position: 'relative' }}>
            <Carousel
              baseWidth={320}
              autoplay={true}
              pauseOnHover={false}
              loop={true}
            />
          </div>
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
