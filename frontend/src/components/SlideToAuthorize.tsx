import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';

export type SlideVisualState = 'idle' | 'dragging' | 'committed';

export interface SlideToAuthorizeProps {
  onAuthorize: () => void;
  disabled?: boolean;
  isAuthorized?: boolean;
  label?: string;
  committedLabel?: string;
  threshold?: number; // default 80%
  className?: string;
}

export const SlideToAuthorize: React.FC<SlideToAuthorizeProps> = ({
  onAuthorize,
  disabled = false,
  isAuthorized = false,
  label = 'SLIDE TO AUTHORIZE FREEZE & INTERCEPT',
  committedLabel = 'AUTHORIZATION DISPATCHED & SIGNED',
  threshold = 80,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const [dragProgress, setDragProgress] = useState(0); // 0 to 100%
  const [visualState, setVisualState] = useState<SlideVisualState>(
    isAuthorized ? 'committed' : 'idle'
  );
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startProgressRef = useRef(0);

  useEffect(() => {
    if (isAuthorized) {
      setVisualState('committed');
      setDragProgress(100);
    }
  }, [isAuthorized]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || visualState === 'committed') return;

    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startProgressRef.current = dragProgress;
    setVisualState('dragging');

    // Capture pointer
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !trackRef.current || !thumbRef.current) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const thumbWidth = thumbRef.current.offsetWidth;
      const maxDistance = trackRect.width - thumbWidth;

      if (maxDistance <= 0) return;

      const deltaX = e.clientX - startXRef.current;
      const currentPixel = (startProgressRef.current / 100) * maxDistance + deltaX;
      const clampedPixel = Math.max(0, Math.min(maxDistance, currentPixel));
      const percentage = (clampedPixel / maxDistance) * 100;

      setDragProgress(percentage);
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }

      if (dragProgress >= threshold) {
        setVisualState('committed');
        setDragProgress(100);
        onAuthorize();
      } else {
        // Snap back
        setVisualState('idle');
        setDragProgress(0);
      }
    },
    [dragProgress, onAuthorize, threshold]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
      setVisualState('idle');
      setDragProgress(0);
    },
    []
  );

  return (
    <div
      className={`nexus-slide-wrapper ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      data-state={visualState}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Outer Track */}
      <div
        ref={trackRef}
        className="nexus-slide-track"
        style={{
          position: 'relative',
          height: '56px',
          borderRadius: '28px',
          borderWidth: '1.5px',
          borderStyle: 'solid',
          borderColor:
            visualState === 'committed'
              ? 'rgba(8, 127, 91, 0.4)'
              : visualState === 'dragging'
              ? 'rgba(15, 157, 114, 0.4)'
              : '#E2E8E6',
          backgroundColor:
            visualState === 'committed'
              ? '#E8F5F0'
              : visualState === 'dragging'
              ? '#F0FAF6'
              : '#F7FAF9',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)',
          transition: visualState === 'dragging' ? 'none' : 'all 0.25s ease',
        }}
      >
        {/* Fill behind thumb */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${dragProgress}%`,
            background:
              visualState === 'committed'
                ? 'rgba(8, 127, 91, 0.2)'
                : 'rgba(15, 157, 114, 0.15)',
            transition: visualState === 'dragging' ? 'none' : 'width 0.25s ease',
            pointerEvents: 'none',
          }}
        />

        {/* Center Prompt Text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:
              visualState === 'committed'
                ? '#087F5B'
                : visualState === 'dragging'
                ? '#0F9D72'
                : '#64748B',
            transition: 'color 0.2s ease',
            zIndex: 2,
          }}
        >
          {visualState === 'committed' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {committedLabel}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} /> {label} ({Math.round(dragProgress)}%)
            </span>
          )}
        </div>

        {/* Draggable Thumb */}
        <div
          ref={thumbRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{
            position: 'absolute',
            left: `calc(${dragProgress}% - ${(dragProgress / 100) * 48}px)`,
            top: '3px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor:
              visualState === 'committed'
                ? '#087F5B'
                : visualState === 'dragging'
                ? '#0F9D72'
                : '#087F5B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || visualState === 'committed' ? 'default' : 'grab',
            boxShadow: '0 2px 6px rgba(8, 127, 91, 0.3)',
            transition: visualState === 'dragging' ? 'none' : 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
            zIndex: 10,
            touchAction: 'none',
          }}
        >
          {visualState === 'committed' ? (
            <ShieldCheck size={22} color="#ffffff" />
          ) : visualState === 'dragging' ? (
            <ChevronRight size={24} color="#ffffff" strokeWidth={2.5} />
          ) : (
            <ChevronRight size={22} color="#ffffff" strokeWidth={2.5} />
          )}
        </div>
      </div>

      {/* Helper caption */}
      <div
        style={{
          marginTop: '6px',
          fontSize: '0.7rem',
          color: '#64748B',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Security Protocol: Section 102 CrPC Lien Authorization</span>
        <span>Threshold: {threshold}% Drag</span>
      </div>
    </div>
  );
};
