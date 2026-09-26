import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, MapPin, ShieldAlert, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SaiFloatingButton: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'sai'; text: string; time: string }>>([
    {
      sender: 'sai',
      text: 'SAI (Spatial AI Intercept) active. 3 hotspot corridors monitored in Deoghar, Jamshedpur & Ranchi.',
      time: 'Just now'
    }
  ]);

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    const userMsg = promptInput.trim();
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userMsg, time: 'Just now' }
    ]);
    setPromptInput('');

    // Simulate AI Intelligence response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'sai',
          text: `Analyzing spatial corridor query "${userMsg}". High velocity mule trajectory detected near Deoghar Market Branch. Recommended dispatch window: 3.5h remaining.`,
          time: 'Just now'
        }
      ]);
    }, 700);
  };

  return (
    <>
      {/* Floating SAI Assistant Drawer Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: '500px',
            backgroundColor: '#071929',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45), 0 4px 16px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            fontFamily: "'Inter', -apple-system, sans-serif"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                }}
              >
                <img src="/nexus_logo.png" alt="SAI" style={{ height: '18px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>SAI Intelligence</span>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 6px', borderRadius: '4px' }}>LIVE</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Spatial AI Intercept Copilot</div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div style={{ padding: '10px 16px', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
            <button
              onClick={() => navigate('/map')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#38BDF8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '6px',
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              <MapPin size={11} />
              <span>Map View</span>
            </button>
            <button
              onClick={() => navigate('/alerts')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#F87171',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                borderRadius: '6px',
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              <ShieldAlert size={11} />
              <span>High Risk Alerts</span>
            </button>
          </div>

          {/* Chat Messages Stream */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: msg.sender === 'user' ? '#2563EB' : 'rgba(255, 255, 255, 0.08)',
                  border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <div>{msg.text}</div>
                <div style={{ fontSize: '9.5px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', textAlign: 'right' }}>{msg.time}</div>
              </div>
            ))}
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={handleSendPrompt}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask SAI spatial intelligence..."
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12.5px',
                color: '#FFFFFF',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Bottom Right SAI Action Button - ONLY LOGO */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="SAI Intelligence"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '50px',
          height: '50px',
          borderRadius: '16px',
          backgroundColor: '#0F172A',
          backgroundImage: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.4), 0 2px 10px rgba(37, 99, 235, 0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(37, 99, 235, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.4), 0 2px 10px rgba(37, 99, 235, 0.35)';
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/nexus_logo.png"
            alt="SAI Logo"
            style={{ height: '22px', width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          <span
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 6px #10B981'
            }}
          />
        </div>
      </button>
    </>
  );
};
