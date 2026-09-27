import React, { useState } from 'react';

export interface AccordionItem {
  image?: string;
  label?: string;
  link?: string;
  tag?: string;
  title?: string;
  description?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

export interface AccordionGalleryProps {
  items: AccordionItem[];
  defaultIndex?: number | null;
  expandRatio?: number;
  trigger?: 'hover' | 'click';
}

export const AccordionGallery: React.FC<AccordionGalleryProps> = ({
  items,
  defaultIndex = null,
  expandRatio = 0.52,
  trigger = 'hover'
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(defaultIndex);

  const handleInteraction = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div
      onMouseLeave={() => trigger === 'hover' && setActiveIndex(null)}
      style={{
        display: 'flex',
        width: '100%',
        height: '420px',
        gap: '16px',
        borderRadius: '24px',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {items.map((item, index) => {
        const isActive = activeIndex === index;
        const flexValue = isActive ? Math.max(expandRatio * 10, 3) : 1;

        // Bright theme fallback colors if custom backgroundColor isn't provided
        const brightPalettes = [
          { bg: '#47484bff', text: '#000000ff', tag: '#000000ff', border: '#000000ff' }, // 01 Blue/Indigo
          { bg: '#47484bff', text: '#000000ff', tag: '#000000ff', border: '#000000ff' }, // 02 Purple
          { bg: '#47484bff', text: '#000000ff', tag: '#000000ff', border: '#000000ff' }, // 03 Emerald/Mint
          { bg: '#47484bff', text: '#000000ff', tag: '#000000ff', border: '#000000ff' }  // 04 Amber/Gold
        ];

        const palette = brightPalettes[index % brightPalettes.length];
        const cardBg = item.backgroundColor || palette.bg;
        const cardText = item.textColor || palette.text;
        const tagColor = item.accentColor || palette.tag;
        const borderColor = palette.border;

        return (
          <div
            key={index}
            onMouseEnter={() => trigger === 'hover' && handleInteraction(index)}
            onClick={() => trigger === 'click' && handleInteraction(index)}
            style={{
              flex: flexValue,
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              boxShadow: isActive
                ? '0 20px 40px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(0,0,0,0.06)'
                : '0 4px 12px rgba(15, 23, 42, 0.04)',
              transition: 'flex 0.48s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
              transform: isActive ? 'scale(1.01) translateZ(0)' : 'scale(1) translateZ(0)',
              willChange: 'flex, transform, opacity',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '32px 28px',
              color: cardText,
              boxSizing: 'border-box'
            }}
          >
            {/* Background Image if provided */}
            {item.image && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${item.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: isActive ? 'brightness(0.9) contrast(1.05)' : 'brightness(0.65)',
                  transition: 'filter 0.4s ease'
                }}
              />
            )}

            {/* Subtle Gradient overlay if image is present */}
            {item.image && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)',
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* Top Tag / Category Label (Visible ONLY when active / selected) */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(-6px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
                pointerEvents: isActive ? 'auto' : 'none'
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: item.image ? '#FFFFFF' : tagColor,
                  backgroundColor: item.image ? 'rgba(0,0,0,0.4)' : 'rgba(255, 255, 255, 0.65)',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  border: `1px solid ${item.image ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)'}`,
                  backdropFilter: 'blur(8px)',
                  display: 'inline-block'
                }}
              >
                {item.tag || item.label || `0${index + 1}`}
              </span>
            </div>

            {/* Bottom Content Area */}
            <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
              {(item.title || item.label) && (
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: isActive ? '26px' : '18px',
                    fontWeight: 800,
                    margin: 0,
                    lineHeight: 1.2,
                    color: item.image ? '#FFFFFF' : cardText,
                    transition: 'font-size 0.3s ease'
                  }}
                >
                  {item.title || item.label}
                </h3>
              )}

              {item.description && (
                <div
                  style={{
                    maxHeight: isActive ? '200px' : '0px',
                    opacity: isActive ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease, margin 0.3s ease',
                    marginTop: isActive ? '8px' : '0px'
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: item.image ? 'rgba(255, 255, 255, 0.9)' : cardText,
                      margin: 0,
                      maxWidth: '48ch'
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AccordionGallery;
