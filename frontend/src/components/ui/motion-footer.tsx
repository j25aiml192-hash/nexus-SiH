"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

// Register ScrollTrigger safely for React
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// -------------------------------------------------------------------------
// GOLDEN RATIO CONSTANTS & THEME TOKENS (Phi = 1.61803398875)
// All text styled in pure white
// -------------------------------------------------------------------------
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;700&display=swap');

.golden-footer-wrapper {
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  
  --phi: 1.61803398875;
  
  --pill-bg-1: rgba(255, 255, 255, 0.06);
  --pill-bg-2: rgba(255, 255, 255, 0.02);
  --pill-shadow: rgba(0, 0, 0, 0.6);
  --pill-highlight: rgba(255, 255, 255, 0.15);
  --pill-border: rgba(255, 255, 255, 0.15);
  
  --pill-bg-1-hover: rgba(255, 255, 255, 0.14);
  --pill-bg-2-hover: rgba(255, 255, 255, 0.05);
  --pill-border-hover: rgba(255, 255, 255, 0.35);
  --pill-shadow-hover: rgba(0, 0, 0, 0.8);
}

@keyframes footer-phi-breathe {
  0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.1618) rotate(3deg); opacity: 0.85; }
  100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.5; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.8)); }
  21%, 55% { transform: scale(1.618); filter: drop-shadow(0 0 14px rgba(255, 255, 255, 1)); }
  34% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-phi-breathe 13s ease-in-out infinite;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 42s linear infinite;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2.618s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

/* Golden Ratio Grid (68px x 42px proportional cells) */
.footer-bg-grid {
  background-size: 68px 42px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 21%, black 79%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 21%, black 79%, transparent);
}

/* Golden Aurora Dual Ambient Glow */
.footer-aurora-golden {
  background: radial-gradient(
    ellipse at 50% 50%, 
    rgba(255, 255, 255, 0.12) 0%, 
    rgba(255, 255, 255, 0.05) 38%, 
    rgba(255, 255, 255, 0.02) 61.8%, 
    transparent 89%
  );
}

/* Glass Pill Proportioned with Phi */
.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow: 
      0 13px 34px -13px var(--pill-shadow), 
      inset 0 1px 1px var(--pill-highlight);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(21px);
  -webkit-backdrop-filter: blur(21px);
  transition: all 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow: 
      0 21px 55px -13px var(--pill-shadow-hover), 
      inset 0 1px 1px var(--pill-highlight-hover);
  color: #FFFFFF;
}

/* Primary Neon Gradient Border CTA Button */
.neon-start-button {
  position: relative;
  background: rgba(9, 9, 11, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 2px solid transparent;
  background-clip: padding-box;
  box-shadow: 
    0 0 35px rgba(249, 115, 22, 0.35), 
    0 0 15px rgba(94, 106, 210, 0.25),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  transition: all 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}
.neon-start-button::before {
  content: '';
  position: absolute;
  top: -2px; right: -2px; bottom: -2px; left: -2px;
  background: linear-gradient(135deg, #F97316 0%, #EAB308 50%, #5E6AD2 100%);
  border-radius: 9999px;
  z-index: -1;
  transition: all 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}
.neon-start-button:hover {
  box-shadow: 
    0 0 60px rgba(246, 241, 238, 0.65), 
    0 0 30px rgba(94, 106, 210, 0.45),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
}
.neon-start-button:hover::before {
  filter: brightness(1.3) contrast(1.2);
}

/* Giant Watermark Text Masking */
.footer-giant-bg-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 25vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, transparent 68%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Pure White Metallic Text Glow */
.footer-text-glow {
  color: #FFFFFF;
  background: linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.85) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 30px rgba(255, 255, 255, 0.3));
}
`;

// -------------------------------------------------------------------------
// 2. MAGNETIC BUTTON PRIMITIVE
// -------------------------------------------------------------------------
export type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & 
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
  };

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const h = rect.width / 2;
          const w = rect.height / 2;
          const x = e.clientX - rect.left - h;
          const y = e.clientY - rect.top - w;

          gsap.to(element, {
            x: x * 0.38,
            y: y * 0.38,
            rotationX: -y * 0.12,
            rotationY: x * 0.12,
            scale: 1.05,
            ease: "power2.out",
            duration: 0.34,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.38)",
            duration: 1.1618,
          });
        };

        element.addEventListener("mousemove", handleMouseMove as any);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove as any);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement) => {
          (localRef as any).current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as any).current = node;
        }}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

// -------------------------------------------------------------------------
// 3. MAIN COMPONENT (GOLDEN RATIO - ALL TEXT IN PURE WHITE)
// -------------------------------------------------------------------------
const MarqueeItem = () => (
  <div className="flex items-center space-x-12 px-6 text-white font-bold">
    <span>GOLDEN RATIO RESPONSE CHAIN</span> <span className="text-white/70">✦</span>
    <span>PREDICTIVE CASH-OUT INTERCEPTION</span> <span className="text-white/70">✦</span>
    <span>CYBERCRIME GRAPH ANALYSIS</span> <span className="text-white/70">✦</span>
    <span>AUTOMATED ACCOUNT FREEZE</span> <span className="text-white/70">✦</span>
    <span>NEXUS SIH26184 · TEAM PYTORCHERERS</span> <span className="text-white/70">✦</span>
  </div>
);

export function CinematicFooter() {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;

    // React strict mode compatible GSAP context cleanup
    const ctx = gsap.context(() => {
      // Background Parallax
      gsap.fromTo(
        giantTextRef.current,
        { y: "13vh", scale: 0.85, opacity: 0 },
        {
          y: "0vh",
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 80%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );

      // Staggered Content Reveal
      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 55, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.21,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 40%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      
      {/* 
        The "Curtain Reveal" Wrapper:
        Golden Ratio vertical viewport container (clip-path reveal)
      */}
      <div
        ref={wrapperRef}
        className="relative h-screen w-full"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        {/* The actual footer stays fixed to the viewport underneath everything */}
        <footer className="fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-background text-white golden-footer-wrapper">
          
          {/* Ambient Light & Grid Background */}
          <div className="footer-aurora-golden absolute left-1/2 top-1/2 h-[70vh] w-[89vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[100px] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

          {/* Giant background watermark: NEXUS */}
          <div
            ref={giantTextRef}
            className="footer-giant-bg-text absolute -bottom-[4vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
          >
            NEXUS
          </div>

          {/* 1. Golden Ratio Marquee Bar (Placed safely below floating navbar) */}
          <div className="absolute top-20 md:top-24 left-0 w-full overflow-hidden border-y border-white/20 bg-background/80 backdrop-blur-md py-3.5 z-10 -rotate-1 scale-105 shadow-2xl">
            <div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-bold tracking-[0.25em] text-white uppercase">
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          {/* 2. Main Center Hero Content (Headline + Proportioned Borderless Start Button) */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-28 md:pt-36 pb-12 my-auto w-full max-w-7xl mx-auto text-center">
            
            <div ref={headingRef} className="flex flex-wrap items-center justify-center gap-6 md:gap-10 w-full">
              {/* Main Headline - Pure White */}
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black footer-text-glow tracking-tighter text-center uppercase whitespace-nowrap text-white">
                Ready to begin?
              </h2>

              {/* Primary "Start" Button - Simple Crisp White */}
              <div ref={linksRef} className="inline-flex items-center">
                <MagneticButton
                  as="button"
                  onClick={() => navigate('/dashboard')}
                  className="simple-white-start-button px-10 py-4.5 md:px-14 md:py-5.5 rounded-full font-black text-2xl md:text-4xl flex items-center gap-4 group cursor-pointer hover:scale-105 transition-all whitespace-nowrap border-0 border-none outline-none z-10"
                >
                  <span className="text-black font-extrabold tracking-tight">Start</span>
                  <ArrowRight className="w-7 h-7 md:w-9 md:h-9 text-black group-hover:translate-x-2 transition-transform stroke-[3]" />
                </MagneticButton>
              </div>
            </div>

          </div>

          {/* 3. Bottom Bar / Credits */}
          <div className="relative z-20 w-full pb-8 px-6 md:px-13 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
            
            {/* Copyright */}
            <div className="text-white/80 text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1 flex items-center gap-2">
              <span className="text-white font-mono font-bold">φ</span>
              <span>© 2026 NEXUS · GOLDEN RATIO DEFENSE CHAIN</span>
            </div>

            {/* "Crafted with Love" Text */}
            <div className="flex items-center gap-2 order-1 md:order-2 cursor-default">
              <span className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest">Crafted with</span>
              <span className="animate-footer-heartbeat text-sm md:text-base text-white">❤</span>
              <span className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest">by</span>
              <span className="text-white font-black text-xs md:text-sm tracking-normal ml-1">Team PYTORCHERERS</span>
            </div>

            {/* Back to top Button */}
            <MagneticButton
              as="button"
              onClick={scrollToTop}
              className="w-13 h-13 rounded-full footer-glass-pill flex items-center justify-center text-white hover:text-white group order-3 border-white/30 hover:border-white/70"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-y-1.5 transition-transform duration-300 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
              </svg>
            </MagneticButton>

          </div>
        </footer>
      </div>
    </>
  );
}
