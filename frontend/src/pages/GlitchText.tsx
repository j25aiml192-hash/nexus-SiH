import React from 'react';

export interface GlitchTextProps {
  children: React.ReactNode;
  speed?: number;
  enableShadows?: boolean;
  enableOnHover?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  speed = 1,
  enableShadows = true,
  enableOnHover = true,
  className = '',
  style = {}
}) => {
  const textString = typeof children === 'string' ? children : 'NEXUS';

  return (
    <div
      className={`glitch-text-wrapper ${enableOnHover ? 'glitch-on-hover' : 'glitch-continuous'} ${className}`}
      data-text={textString}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style
      }}
    >
      <style>{`
        .glitch-text-wrapper {
          position: relative;
          color: #0F172A;
          -webkit-text-stroke: 2px #1E293B;
        }

        .glitch-text-wrapper::before,
        .glitch-text-wrapper::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          clip: rect(0, 0, 0, 0);
          pointer-events: none;
        }

        .glitch-text-wrapper::before {
          left: 2px;
          text-shadow: ${enableShadows ? '-2px 0 #FF5D5D' : 'none'};
          animation: glitch-anim-1 ${2 / speed}s infinite linear alternate-reverse;
        }

        .glitch-text-wrapper::after {
          left: -2px;
          text-shadow: ${enableShadows ? '-2px 0 #2E3FE8' : 'none'};
          animation: glitch-anim-2 ${2.5 / speed}s infinite linear alternate-reverse;
        }

        ${enableOnHover ? `
          .glitch-on-hover::before,
          .glitch-on-hover::after {
            opacity: 0;
            transition: opacity 0.15s ease;
          }
          .glitch-on-hover:hover::before,
          .glitch-on-hover:hover::after {
            opacity: 1;
          }
        ` : ''}

        @keyframes glitch-anim-1 {
          0% { clip: rect(10px, 9999px, 30px, 0); transform: skew(0.3deg); }
          20% { clip: rect(40px, 9999px, 60px, 0); transform: skew(-0.5deg); }
          40% { clip: rect(25px, 9999px, 50px, 0); transform: skew(0.2deg); }
          60% { clip: rect(70px, 9999px, 90px, 0); transform: skew(-0.3deg); }
          80% { clip: rect(15px, 9999px, 35px, 0); transform: skew(0.4deg); }
          100% { clip: rect(55px, 9999px, 80px, 0); transform: skew(0deg); }
        }

        @keyframes glitch-anim-2 {
          0% { clip: rect(60px, 9999px, 80px, 0); transform: skew(-0.4deg); }
          20% { clip: rect(15px, 9999px, 35px, 0); transform: skew(0.3deg); }
          40% { clip: rect(75px, 9999px, 95px, 0); transform: skew(-0.2deg); }
          60% { clip: rect(30px, 9999px, 50px, 0); transform: skew(0.5deg); }
          80% { clip: rect(5px, 9999px, 25px, 0); transform: skew(-0.3deg); }
          100% { clip: rect(45px, 9999px, 65px, 0); transform: skew(0.1deg); }
        }
      `}</style>
      {children}
    </div>
  );
};

export default GlitchText;
