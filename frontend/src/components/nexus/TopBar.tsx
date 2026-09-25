import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, Calendar, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onSearch?: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearch }) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [roleMode, setRoleMode] = useState<'Analyst' | 'Officer'>('Analyst');
  const [timeframe, setTimeframe] = useState('Last 24h');
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const timeframes = ['Last 24h', 'Last 7d', 'Last 30d', 'All Time'];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      if (onSearch) {
        onSearch(searchValue);
      } else {
        navigate(`/complaints?search=${encodeURIComponent(searchValue.trim())}`);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeframeRef.current && !timeframeRef.current.contains(event.target as Node)) {
        setIsTimeframeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="nexus-topbar-v2">
      <div className="nexus-topbar-left">
        <form onSubmit={handleSearchSubmit} className="nexus-topbar-search-form">
          <div className="nexus-topbar-search-wrapper">
            <Search size={16} className="nexus-search-icon" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search complaint ID, account ID, officer, bank, location..."
              className="nexus-topbar-search-input"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => setSearchValue('')}
                className="nexus-search-clear-btn"
                title="Clear search"
              >
                <X size={12} />
              </button>
            ) : (
              <div className="nexus-search-shortcut" onClick={() => inputRef.current?.focus()}>
                <span>⌘</span> K
              </div>
            )}
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        
        {/* Timeframe Selector Dropdown */}
        <div ref={timeframeRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 12px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: isTimeframeOpen ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#F8FAFC',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              if (!isTimeframeOpen) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
              }
            }}
          >
            <Calendar size={14} style={{ color: '#818CF8', flexShrink: 0 }} />
            <span style={{ color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.01em' }}>{timeframe}</span>
            <ChevronDown
              size={13}
              style={{
                color: '#94A3B8',
                flexShrink: 0,
                transform: isTimeframeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>

          {/* Glass Dropdown Menu */}
          {isTimeframeOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '150px',
              backgroundColor: '#0F2740',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '12px',
              padding: '4px',
              boxShadow: '0 12px 32px rgba(7, 25, 41, 0.6), 0 2px 8px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              {timeframes.map((frame) => (
                <button
                  key={frame}
                  type="button"
                  onClick={() => {
                    setTimeframe(frame);
                    setIsTimeframeOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    backgroundColor: timeframe === frame ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                    color: timeframe === frame ? '#FFFFFF' : '#CBD5E1',
                    fontSize: '11.5px',
                    fontWeight: timeframe === frame ? 700 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (timeframe !== frame) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#FFFFFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (timeframe !== frame) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#CBD5E1';
                    }
                  }}
                >
                  <span>{frame}</span>
                  {timeframe === frame && <Check size={12} style={{ color: '#818CF8' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role Mode Segmented Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '3px',
          height: '36px',
          borderRadius: '10px',
          backgroundColor: '#071929',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
          boxSizing: 'border-box'
        }}>
          <button
            type="button"
            onClick={() => setRoleMode('Analyst')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 12px',
              height: '28px',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              backgroundColor: roleMode === 'Analyst' ? '#2563EB' : 'transparent',
              color: roleMode === 'Analyst' ? '#FFFFFF' : '#94A3B8',
              boxShadow: roleMode === 'Analyst' ? '0 2px 8px rgba(37, 99, 235, 0.45)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (roleMode !== 'Analyst') {
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
            onMouseLeave={(e) => {
              if (roleMode !== 'Analyst') {
                e.currentTarget.style.color = '#94A3B8';
              }
            }}
          >
            <span>Analyst</span>
          </button>
          
          <button
            type="button"
            onClick={() => setRoleMode('Officer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 12px',
              height: '28px',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              backgroundColor: roleMode === 'Officer' ? '#2563EB' : 'transparent',
              color: roleMode === 'Officer' ? '#FFFFFF' : '#94A3B8',
              boxShadow: roleMode === 'Officer' ? '0 2px 8px rgba(37, 99, 235, 0.45)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (roleMode !== 'Officer') {
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
            onMouseLeave={(e) => {
              if (roleMode !== 'Officer') {
                e.currentTarget.style.color = '#94A3B8';
              }
            }}
          >
            <span>Officer</span>
          </button>
        </div>

        {/* Notifications Button */}
        <button
          type="button"
          title="5 unread notifications"
          onClick={() => navigate('/alerts')}
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#CBD5E1';
          }}
        >
          <Bell size={16} />
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              borderRadius: '9999px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: '9.5px',
              fontWeight: 800,
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #0B2238'
            }}
          >
            5
          </span>
        </button>

        {/* User Profile Avatar Pill (DA) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          paddingLeft: '6px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.14)',
          cursor: 'pointer'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#4F46E5',
            color: '#FFFFFF',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)'
          }}>
            DA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
              Demo Analyst
            </span>
            <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500, lineHeight: 1.2 }}>
              Analyst Mode
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
