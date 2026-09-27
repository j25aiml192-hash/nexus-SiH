import React, { useRef } from 'react';
import { Search, Clock, Landmark, Cpu, MapPin, ShieldCheck, Activity } from 'lucide-react';
import './Carousel.css';

export interface CarouselItem {
  id?: string | number;
  tag?: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  statLabel?: string;
  statValue?: string;
}

export interface CarouselProps {
  items?: CarouselItem[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  speed?: number; // Duration in seconds for a full loop pass
  pauseOnHover?: boolean;
  loop?: boolean;
  round?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_ITEMS: CarouselItem[] = [
  {
    id: 1,
    tag: 'MULE TRIAGE',
    title: 'Mule Account Risk Scoring',
    description: 'Graph neural network analysis calculating risk scores across high-velocity mule chains and layering patterns.',
    icon: <Search size={20} />,
    statLabel: 'GRAPH SPEED',
    statValue: '< 120ms'
  },
  {
    id: 2,
    tag: 'TEMPORAL FILTER',
    title: 'KYC-Chain Time Windows',
    description: 'Filtering transaction timestamps to isolate real-time cash-out windows and active mule account activity.',
    icon: <Clock size={20} />,
    statLabel: 'WINDOW DURATION',
    statValue: '15-min Window'
  },
  {
    id: 3,
    tag: 'BANK BROADCAST',
    title: 'Inter-Bank Hold Network',
    description: 'Federated broadcast protocol alerting participating financial institutions to issue immediate debit freezes.',
    icon: <Landmark size={20} />,
    statLabel: 'INSTITUTIONS',
    statValue: '24+ Partner Banks'
  },
  {
    id: 4,
    tag: 'REGRESSOR ENGINE',
    title: 'Dual-Regressor Coordinates',
    description: 'LightGBM ML spatial models predicting precise cash-out latitude and longitude without target leakage.',
    icon: <Cpu size={20} />,
    statLabel: 'MODEL REDUCTION',
    statValue: '61% Radius Drop'
  },
  {
    id: 5,
    tag: 'GEO-DISPATCH',
    title: 'Haversine Candidate Ranking',
    description: 'Spatial distance evaluation sorting nearby ATM physical candidates for immediate field unit dispatch.',
    icon: <MapPin size={20} />,
    statLabel: 'ATM RECALL',
    statValue: 'Top-3 Candidates'
  },
  {
    id: 6,
    tag: 'PATROL ALERT',
    title: 'Field Response Intercept',
    description: 'Pushing high-probability geographic candidate coordinates directly to active tactical response units.',
    icon: <ShieldCheck size={20} />,
    statLabel: 'DISPATCH TIME',
    statValue: 'Real-Time Sync'
  },
  {
    id: 7,
    tag: 'COMMAND CENTER',
    title: 'Incident Velocity Dashboard',
    description: 'Real-time incident velocity monitoring tracking intercept success rates and regional fraud cluster hotspots.',
    icon: <Activity size={20} />,
    statLabel: 'TEST EVENTS',
    statValue: '436 Validated'
  }
];

export const Carousel: React.FC<CarouselProps> = ({
  items = DEFAULT_ITEMS,
  baseWidth = 320,
  autoplay = true,
  speed = 30,
  pauseOnHover: _pauseOnHover = false,
  className = '',
  style
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Triple the items array to create a 100% seamless infinite marquee loop line
  const tripleItems = [...items, ...items, ...items];

  return (
    <div
      ref={wrapperRef}
      className={`carousel-marquee-wrapper ${className}`.trim()}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '440px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Infinite Scrolling Horizontal Line Track */}
      <div
        ref={trackRef}
        className={`carousel-marquee-track ${autoplay ? 'is-animating' : ''}`}
        style={{
          display: 'flex',
          gap: '24px',
          padding: '20px 0',
          animationDuration: `${speed}s`
        }}
      >
        {tripleItems.map((item, idx) => (
          <div
            key={`${item.id || idx}-${idx}`}
            className="carousel-marquee-card"
            style={{
              width: `${baseWidth}px`,
              minWidth: `${baseWidth}px`,
              flexShrink: 0
            }}
          >
            <div className="carousel-card-body">
              <div className="carousel-card-header">
                {item.tag && (
                  <span className="carousel-card-tag">
                    {item.tag}
                  </span>
                )}
                {item.icon && (
                  <div className="carousel-card-icon">
                    {item.icon}
                  </div>
                )}
              </div>

              <div className="carousel-card-content">
                <h3 className="carousel-card-title">{item.title}</h3>
                <p className="carousel-card-desc">{item.description}</p>
              </div>

              {item.statValue && (
                <div className="carousel-card-stat">
                  <span className="carousel-card-stat-label">{item.statLabel || 'METRIC'}</span>
                  <span className="carousel-card-stat-value">
                    {item.statValue}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Carousel;
