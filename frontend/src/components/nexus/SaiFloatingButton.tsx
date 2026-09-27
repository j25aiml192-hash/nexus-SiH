import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2 } from 'lucide-react';

const NEXUS_SYSTEM_PROMPT = `
You are NEXUS AI (Spatial Cybercrime Copilot), an advanced AI intelligence assistant strictly dedicated ONLY to the NEXUS Cybercrime Intelligence Platform.

STRICT OPERATIONAL DIRECTIVE:
1. You MUST answer ONLY questions directly related to NEXUS, cybercrime intelligence, NCRP fraud complaints, mule account networks, ATM cash-out corridor predictions, spatial AI telemetry, law enforcement dispatches, and Indian cyber fraud prevention.
2. If the user asks ANY question NOT related to NEXUS or cybercrime (for example: general coding, math, general science, recipes, general chat, movies, trivia, or non-NEXUS topics), YOU MUST DECLINE and state exactly:
"I am NEXUS AI (Spatial Cybercrime Copilot), dedicated exclusively to NEXUS Cybercrime Intelligence operations. I can only assist with NCRP fraud complaints, mule account network tracing, cash-out corridor predictions, and tactical law enforcement dispatches."
3. FORMATTING REQUIREMENT: Keep answers clean, well-spaced, and highly readable. Use short paragraphs, bullet points, and explicit line breaks between numbered steps. Do NOT dump dense clumped text.
`;

const renderFormattedMessage = (text: string) => {
  if (!text) return null;

  // Pre-process text to insert clean linebreaks before clumped numbered steps or bullet headers
  const processed = text
    .replace(/([^\n])(\s*\d+\.\s+\*\*)/g, '$1\n\n$2')
    .replace(/(\*\*)\s*(\d+\.\s+)/g, '$1\n\n$2')
    .replace(/([^\n])(\s*-\s+)/g, '$1\n$2');

  const lines = processed.split('\n');

  return lines.map((line, idx) => {
    let content = line.trim();
    if (!content) return <div key={idx} style={{ height: '6px' }} />;

    // Check for bullet items
    const isBullet = content.startsWith('- ') || content.startsWith('* ');
    if (isBullet) {
      content = content.replace(/^[-*]\s+/, '');
    }

    // Parse bold text **bold**
    const parts = content.split(/(\*\*.*?\*\*)/g);
    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ fontWeight: 700, color: 'inherit' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', margin: '3px 0 3px 6px' }}>
          <span style={{ color: '#2563EB', fontWeight: 'bold', lineHeight: 1.4 }}>•</span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{formattedParts}</span>
        </div>
      );
    }

    return (
      <div key={idx} style={{ margin: '3px 0', lineHeight: 1.5 }}>
        {formattedParts}
      </div>
    );
  });
};

export const SaiFloatingButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'sai'; text: string; time: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset chat session to fresh start whenever NEXUS AI window is opened
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setPromptInput('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Blur the entire background (#root) when NEXUS AI window is open
  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (isOpen) {
      if (rootEl) {
        rootEl.style.transition = 'filter 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        rootEl.style.filter = 'blur(4px) brightness(0.95)';
        rootEl.style.pointerEvents = 'none';
        rootEl.style.userSelect = 'none';
      }
      document.body.style.overflow = 'hidden';
    } else {
      if (rootEl) {
        rootEl.style.filter = '';
        rootEl.style.pointerEvents = '';
        rootEl.style.userSelect = '';
      }
      document.body.style.overflow = '';
    }
    return () => {
      if (rootEl) {
        rootEl.style.filter = '';
        rootEl.style.pointerEvents = '';
        rootEl.style.userSelect = '';
      }
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg = queryText.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userMsg, time: nowTime }
    ]);
    setPromptInput('');
    setIsLoading(true);

    const groqKey = import.meta.env.VITE_GROQ_API_KEY;

    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages: [
              {
                role: 'system',
                content: NEXUS_SYSTEM_PROMPT
              },
              { role: 'user', content: userMsg }
            ],
            temperature: 0.5,
            max_tokens: 450
          })
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            setMessages((prev) => [
              ...prev,
              {
                sender: 'sai',
                text: reply,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Groq NEXUS AI API call failed, using local copilot response:', err);
      }
    }

    // Contextual fallback response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'sai',
          text: `Analyzing spatial corridor query "${userMsg}". High velocity mule trajectory detected near Deoghar Market Branch. Recommended dispatch window: 3.5h remaining.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsLoading(false);
    }, 600);
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(promptInput);
  };

  const quickPrompts = [
    "How does NEXUS AI spatial tracking work?",
    "Show active cash-out hotspots",
    "Trace mule accounts in Deoghar",
    "Summarize priority NCRP alerts"
  ];

  return (
    <>
      {/* Full-Screen Backdrop Overlay & Bottom-Right Floating Window Portal */}
      {isOpen && createPortal(
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.2)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 999999,
            transition: 'all 0.3s ease'
          }}
        >
          {/* AI Window positioned at Bottom-Right matching reference screenshot */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: '88px',
              right: '24px',
              width: '400px',
              maxWidth: 'calc(100vw - 32px)',
              height: '560px',
              maxHeight: 'calc(100vh - 110px)',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: "'Inter', -apple-system, sans-serif"
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #F1F5F9',
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
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <img src="/nexus_logo.png" alt="NEXUS AI" style={{ height: '18px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    NEXUS AI
                  </div>
                  <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                    Online
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94A3B8';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Body */}
            <div
              style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: messages.length === 0 ? 'center' : 'flex-start',
                gap: '14px',
                backgroundColor: '#FFFFFF',
                backgroundImage: 'radial-gradient(#E2E8F0 0.75px, transparent 0.75px)',
                backgroundSize: '16px 16px'
              }}
            >
              {messages.length === 0 ? (
                /* Initial Center Branding & 2x2 Cards matching Image 3 */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '18px',
                      backgroundColor: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <img src="/nexus_logo.png" alt="NEXUS AI Logo" style={{ height: '30px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                    NEXUS AI
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 20px 0', maxWidth: '290px', lineHeight: 1.4 }}>
                    Ask about NCRP fraud complaints, mule account networks, cash-out corridors, or LEA dispatches.
                  </p>

                  {/* 2x2 Quick Suggestion Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                    {quickPrompts.map((promptText, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => sendQuery(promptText)}
                        style={{
                          backgroundColor: '#475569',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px 10px',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          textAlign: 'left',
                          lineHeight: 1.35,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#334155';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#475569';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '88%',
                        backgroundColor: msg.sender === 'user' ? '#2563EB' : '#F8FAFC',
                        border: msg.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                        color: msg.sender === 'user' ? '#FFFFFF' : '#0F172A',
                        borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        padding: '12px 16px',
                        fontSize: '12.5px',
                        lineHeight: 1.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.sender === 'user' ? msg.text : renderFormattedMessage(msg.text)}
                      <div style={{ fontSize: '9.5px', color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: '6px', textAlign: 'right' }}>
                        {msg.time}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12.5px', padding: '6px 10px' }}>
                      <Loader2 size={16} className="animate-spin" />
                      <span>NEXUS AI analyzing intelligence...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input Footer Capsule */}
            <form
              onSubmit={handleSendPrompt}
              style={{
                padding: '14px 18px',
                backgroundColor: '#FFFFFF',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '24px',
                  padding: '4px 6px 4px 16px'
                }}
              >
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ask NEXUS AI..."
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: promptInput.trim() ? '#2563EB' : '#E2E8F0',
                    border: 'none',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isLoading || !promptInput.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Bottom Right Round Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="NEXUS AI"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#4F46E5',
          backgroundImage: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/nexus_logo.png"
            alt="NEXUS AI Logo"
            style={{ height: '24px', width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          <span
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
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





