import React, { useEffect, useRef, useState } from 'react';

export type FolderItem = string | {
  title: string;
  description?: string;
  badge?: string;
  backgroundColor?: string;
  textColor?: string;
};

export interface FolderFloatProps {
  items: FolderItem[];
  label?: string;
  sublabel?: string;
  trigger?: 'hover' | 'click' | 'scroll';
  openOnScroll?: boolean;
  closeOnSelect?: boolean;
  physics?: boolean;
  drift?: number;
  onSelect?: (value: FolderItem, index: number) => void;
  folderColor?: string;
  frontColor?: string;
  paperColor?: string;
  itemColor?: string;
  itemTextColor?: string;
  labelColor?: string;
  width?: number | string;
  height?: number;
  radius?: number;
  spread?: number;
  lift?: number;
  tilt?: number;
  flapAngle?: number;
  restAngle?: number;
  openDuration?: number;
  stagger?: number;
  bounce?: number;
}

export const FolderFloat: React.FC<FolderFloatProps> = ({
  items,
  label = 'Key Metrics & Scale',
  sublabel = '3 core intelligence signals',
  trigger = 'hover',
  openOnScroll = true,
  closeOnSelect = false,
  physics = true,
  drift = 0.5,
  onSelect,
  folderColor = '#0B0D14',
  frontColor = '#141722',
  paperColor = '#06070B',
  itemColor = '#06070B',
  itemTextColor = '#FFFFFF',
  labelColor = '#FFFFFF',
  width = '100%',
  height = 180,
  radius = 16,
  spread = 180,
  lift = 75,
  tilt = 4,
  flapAngle = 40,
  restAngle = 14,
  openDuration = 520,
  stagger = 60,
  bounce: _bounce = 0.35
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const folderRef = useRef<HTMLDivElement>(null);

  // Automatically open folder when scrolled into view
  useEffect(() => {
    if (!openOnScroll && trigger !== 'scroll') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
            setActiveCardIndex(null);
            setHoveredCardIndex(null);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (folderRef.current) {
      observer.observe(folderRef.current);
    }

    return () => observer.disconnect();
  }, [openOnScroll, trigger]);

  const handleMouseEnter = () => {
    if (trigger === 'hover') setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover' && !openOnScroll) {
      setIsOpen(false);
      setActiveCardIndex(null);
      setHoveredCardIndex(null);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') setIsOpen(!isOpen);
  };

  const handleItemClick = (e: React.MouseEvent, item: FolderItem, index: number) => {
    e.stopPropagation();
    // Exclusively select ONE card at a time (toggle if clicking the active one)
    const nextIndex = activeCardIndex === index ? null : index;
    setActiveCardIndex(nextIndex);
    if (onSelect) onSelect(item, index);
    if (closeOnSelect) setIsOpen(false);
  };

  const easing = physics
    ? `cubic-bezier(0.16, 1, 0.3, 1)`
    : 'cubic-bezier(0.25, 1, 0.5, 1)';

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  // Single source of truth for the active focused card
  const focusedIndex = activeCardIndex !== null ? activeCardIndex : hoveredCardIndex;

  return (
    <div
      ref={folderRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: widthStyle,
        height: `${height}px`,
        perspective: '1000px',
        cursor: 'pointer',
        userSelect: 'none',
        marginTop: '0px'
      }}
    >
      {/* Folder Back Base Container */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: folderColor,
          borderRadius: `${radius}px`,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isOpen
            ? '0 25px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.05)'
            : '0 8px 24px rgba(0,0,0,0.4)',
          transition: `transform ${openDuration}ms ${easing}, box-shadow ${openDuration}ms ${easing}`,
          transform: 'translateZ(0)',
          willChange: 'transform, box-shadow'
        }}
      >
        {/* Top Folder Tab */}
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '20px',
            width: '80px',
            height: '16px',
            backgroundColor: folderColor,
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
            borderRight: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        />
      </div>

      {/* Floating Metric Paper Cards Container */}
      <div
        style={{
          position: 'absolute',
          inset: '12px 12px 20px 12px',
          zIndex: 2,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        {items.map((item, index) => {
          const isObj = typeof item === 'object' && item !== null;
          const itemTitle = isObj ? item.title : item;
          const itemDesc = isObj ? item.description : undefined;
          const customBg = isObj && item.backgroundColor ? item.backgroundColor : itemColor || paperColor;
          const customColor = isObj && item.textColor ? item.textColor : itemTextColor;

          const total = items.length;
          const offset = index - (total - 1) / 2;
          const angle = isOpen ? offset * tilt : 0;

          // Only ONE card can be front at any given time
          const isFront = focusedIndex === index;

          // Calculate z-index: Only the active/focused card jumps to front (zIndex 100)
          const cardZIndex = isFront ? 100 : (total - index);

          // Lift distance when open: focused card lifts further and scales up
          const baseLift = -((total - index) * lift) - 30;
          const yLift = isOpen
            ? (isFront ? baseLift - 14 : baseLift)
            : -index * 4;

          const xDrift = isOpen ? offset * (drift * 24) * (spread / 180) : 0;
          const delay = (total - 1 - index) * stagger;

          return (
            <div
              key={index}
              onClick={(e) => handleItemClick(e, item, index)}
              onMouseEnter={() => setHoveredCardIndex(index)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: cardZIndex,
                backgroundColor: customBg,
                color: customColor,
                padding: '20px 24px',
                borderRadius: '16px',
                boxShadow: isFront
                  ? '0 20px 45px rgba(0,0,0,0.95), 0 0 24px rgba(240, 250, 254, 0.3)'
                  : (isOpen
                    ? '0 12px 32px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.4)'
                    : '0 4px 12px rgba(0,0,0,0.3)'),
                transformOrigin: 'bottom center',
                transform: `translate3d(${xDrift}px, ${yLift}px, 0) rotate(${isFront ? 0 : angle}deg) scale(${isFront ? 1.05 : (isOpen ? 1 : 0.96 - index * 0.02)})`,
                opacity: isOpen ? 1 : 0.9 - index * 0.25,
                transition: `transform ${openDuration}ms ${easing} ${delay * 0.5}ms, opacity ${openDuration}ms ${easing} ${delay * 0.5}ms, box-shadow ${openDuration}ms ${easing}`,
                cursor: 'pointer',
                border: isFront ? '1px solid #d8d9daff' : '1px solid rgba(255,255,255,0.15)',
                willChange: 'transform, opacity'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: itemDesc ? '8px' : '0'
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: isFront ? '34px' : '30px',
                    fontWeight: 800,
                    color: isFront ? '#e0ebefff' : customColor,
                    lineHeight: 1,
                    transition: 'color 0.2s ease, font-size 0.2s ease'
                  }}
                >
                  {itemTitle}
                </div>
              </div>
              {itemDesc && (
                <div
                  style={{
                    fontSize: '13.5px',
                    color: isFront ? '#F1F5F9' : 'rgba(255, 255, 255, 0.75)',
                    lineHeight: 1.5,
                    fontFamily: "'Inter', sans-serif",
                    transition: 'color 0.2s ease'
                  }}
                >
                  {itemDesc}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Folder Front Cover Flap */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: frontColor,
          borderRadius: `${radius}px`,
          zIndex: 3,
          transformOrigin: 'bottom center',
          transform: `rotateX(${isOpen ? -flapAngle : -restAngle}deg)`,
          transition: `transform ${openDuration}ms ${easing}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '24px 28px',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 30px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ color: labelColor, fontFamily: "'Inter', sans-serif" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em' }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '4px', fontWeight: 500 }}>
              {sublabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderFloat;
