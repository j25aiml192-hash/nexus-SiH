import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Cpu, Terminal, Network } from 'lucide-react';
import backImage from '../../assets/backImage.png';

function TypingTag() {
  const messages = [
    'UFDR GRAPH INTELLIGENCE // CROSS-CASE RESOLUTION',
    'INITIALIZING FORENSIC ENGINE...',
    'MULTI-HOP TRAVERSAL ACTIVE',
    'ENTITY RESOLUTION ONLINE'
  ];
  const [displayText, setDisplayText] = useState('');
  const [msgIndex, setMsgIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = messages[msgIndex];

    if (!deleting && charIndex < current.length) {
      const t = setTimeout(() => {
        setDisplayText(current.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 35);
      return () => clearTimeout(t);
    }

    if (!deleting && charIndex === current.length) {
      const t = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(t);
    }

    if (deleting && charIndex > 0) {
      const t = setTimeout(() => {
        setDisplayText(current.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }, 15);
      return () => clearTimeout(t);
    }

    if (deleting && charIndex === 0) {
      setDeleting(false);
      setMsgIndex((msgIndex + 1) % messages.length);
    }
  }, [charIndex, deleting, msgIndex]);

  return (
    <span className="font-mono">
      {displayText}
      <span className="inline-block w-[6px] h-3 bg-black ml-0.5 align-middle animate-[blink_0.9s_step-end_infinite]" />
    </span>
  );
}

function GraphBackground() {
  const nodes = [
    { x: 8, y: 15 }, { x: 22, y: 42 }, { x: 40, y: 12 },
    { x: 55, y: 38 }, { x: 70, y: 10 }, { x: 85, y: 30 },
    { x: 15, y: 70 }, { x: 45, y: 75 }, { x: 68, y: 65 },
    { x: 92, y: 68 }, { x: 30, y: 90 }, { x: 78, y: 88 }
  ];
  const edges = [
    [0, 1], [1, 3], [3, 2], [3, 4], [4, 5], [1, 6],
    [6, 7], [7, 8], [8, 9], [7, 10], [8, 11], [5, 9]
  ];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="#000000"
          strokeWidth="0.08"
          strokeDasharray="1.2 1.6"
          opacity="0.06"
          className="animate-[dash-drift_18s_linear_infinite]"
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x} cy={n.y} r="0.5"
          fill="#000000"
          opacity="0.08"
        />
      ))}
    </svg>
  );
}

export default function HeroSection() {
  const navigate = useNavigate();

  const tickerItems = [
    { Icon: Network, label: 'Topology', value: 'Multi-Hop Traversal' },
    { Icon: Cpu, label: 'Parser', value: 'Universal UFDR/XRY' },
    { Icon: ShieldCheck, label: 'Evidence', value: 'Section 65B Compliant' },
    { Icon: Terminal, label: 'Resolution', value: 'Fuzzy Entity Clustering' }
  ];

  return (
    <section className="relative w-full bg-white text-black py-24 sm:py-32 lg:py-40 border-b border-neutral-200 overflow-hidden">
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes dash-drift { to { stroke-dashoffset: -20; } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sweep {
          from { transform: translateX(-120%); }
          to { transform: translateX(220%); }
        }
        @keyframes number-drift {
          from { background-position: 0 0; }
          to { background-position: 0 -120px; }
        }
        .ticker-card { animation: fadeInUp 0.5s ease-out both; }
        .console-btn { position: relative; overflow: hidden; }
        .console-btn .sweep {
          position: absolute; top: 0; left: 0; width: 40%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-120%);
        }
        .console-btn:hover .sweep { animation: sweep 0.9s ease; }
      `}</style>

      {/* Numbers-grid background image, faded */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backImage})`,
          backgroundSize: '900px auto',
          backgroundRepeat: 'repeat',
          opacity: 0.035,
          filter: 'grayscale(1) contrast(1.1)',
          animation: 'number-drift 60s linear infinite'
        }}
        aria-hidden="true"
      />

      {/* Subtle Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Animated graph/node layer */}
      <GraphBackground />

      <div className="relative mx-auto max-w-5xl px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Monospaced System Tag with typing animation */}


        {/* Large Bold Headline */}
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl text-black max-w-4xl leading-[1.08]">
          <span className="block">Money moves fast.</span>
          <span className="block">
            NEXUS moves faster.
            <span className="inline-block w-2 sm:w-3 h-10 sm:h-14 bg-black ml-2 align-middle animate-[blink_1s_step-end_infinite]" />
          </span>
        </h1>

        {/* Subtext */}
        <p className="mt-8 text-lg sm:text-xl text-neutral-600 max-w-3xl leading-relaxed font-normal">
          A high-throughput forensic graph engine that correlates fragmented UFDR dumps, reconstructs burner identities, resolves cross-case criminal nodes, and delivers court-admissible chain-of-custody intelligence.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            onClick={() => navigate('/login')}
            className="console-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-black px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.98]"
          >
            <span className="sweep" />
            <span>Operator Console</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* System Capabilities Ticker */}
        <div className="mt-16 sm:mt-24 pt-8 border-t border-neutral-200 w-full grid grid-cols-2 md:grid-cols-4 gap-4 text-left font-mono">
          {tickerItems.map(({ Icon, label, value }, i) => (
            <div
              key={label}
              className="ticker-card p-3 bg-neutral-50 border border-neutral-200 rounded-lg"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] uppercase tracking-wider mb-1">
                <Icon size={12} className="text-black" />
                <span>{label}</span>
              </div>
              <p className="text-xs font-bold text-black">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}