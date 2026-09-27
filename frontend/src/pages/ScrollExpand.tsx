import React, { useEffect, useRef, useState } from 'react';

interface ScrollExpandProps {
  src?: string;
  alt?: string;
  title?: string;
  scrollHint?: string;
  useWindowScroll?: boolean;
  mediaZoom?: number;
  containerBg?: string;
  children?: React.ReactNode;
}

export const ScrollExpand: React.FC<ScrollExpandProps> = ({
  src,
  alt = 'Media frame',
  title,
  scrollHint,
  useWindowScroll = true,
  mediaZoom = 1.15,
  containerBg = '#0F1117',
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const currentProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const updateTargetProgress = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const startPoint = windowHeight * 0.95;
      const endPoint = windowHeight * 0.25;
      const currentPos = startPoint - rect.top;
      const totalRange = startPoint - endPoint;

      const rawProgress = Math.min(Math.max(currentPos / totalRange, 0), 1);
      targetProgressRef.current = rawProgress;
    };

    const animate = () => {
      const diff = targetProgressRef.current - currentProgressRef.current;
      if (Math.abs(diff) > 0.0001) {
        currentProgressRef.current += diff * 0.12;
        setScrollProgress(currentProgressRef.current);
      }
      rafIdRef.current = requestAnimationFrame(animate);
    };

    const handleScroll = () => {
      updateTargetProgress();
    };

    if (useWindowScroll) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      updateTargetProgress();
      currentProgressRef.current = targetProgressRef.current;
      setScrollProgress(targetProgressRef.current);
      rafIdRef.current = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      };
    } else {
      updateTargetProgress();
      setScrollProgress(targetProgressRef.current);
    }
  }, [useWindowScroll]);

  // Interpolated animation values for smooth expanding container motion
  const frameWidthPct = 88 + scrollProgress * 12; // 88% -> 100%
  const borderRadius = Math.max(28 - scrollProgress * 8, 20); // 28px -> 20px
  const scale = 0.94 + scrollProgress * 0.06; // 0.94 -> 1.00
  const opacity = 0.4 + scrollProgress * 0.6; // 0.4 -> 1.0
  const translateY = (1 - scrollProgress) * 30; // 30px -> 0px

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '20px 0'
      }}
    >
      {/* Outer container that expands as user scrolls */}
      <div
        style={{
          width: `${frameWidthPct}%`,
          maxWidth: '1240px',
          borderRadius: `${borderRadius}px`,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: containerBg,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: `0 ${10 + scrollProgress * 30}px ${30 + scrollProgress * 50}px rgba(0, 0, 0, ${0.4 + scrollProgress * 0.4})`,
          transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
          opacity: opacity,
          transition: 'width 0.15s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.15s ease-out',
          willChange: 'transform, width, opacity'
        }}
      >
        {src && (
          <>
            <img
              src={src}
              alt={alt}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${1 + (mediaZoom - 1) * scrollProgress}) translateZ(0)`,
                transition: 'transform 0.15s ease-out',
                filter: 'brightness(0.55) contrast(1.1)',
                willChange: 'transform'
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(6,7,11,0.2) 0%, rgba(6,7,11,0.85) 100%)',
                pointerEvents: 'none'
              }}
            />
          </>
        )}

        <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          {title && (
            <div style={{ textAlign: 'center', paddingTop: '24px' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#A1A1AA',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '6px 14px',
                  borderRadius: '9999px'
                }}
              >
                {title}
              </span>
            </div>
          )}

          {children}

          {scrollHint && (
            <div
              style={{
                paddingBottom: '24px',
                textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                color: '#71717A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>{scrollHint}</span>
              <span style={{ animation: 'bounce 1.5s infinite' }}>↓</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;
