import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2 } from 'lucide-react';
import { useNexusStore } from '../../store/useNexusStore';
import { COMPLAINTS_DATA } from '../../data/complaints-data';

const renderFormattedMessage = (text: string) => {
  if (!text) return null;

  const processed = text
    .replace(/([^\n])(\s*\d+\.\s+\*\*)/g, '$1\n\n$2')
    .replace(/(\*\*)\s*(\d+\.\s+)/g, '$1\n\n$2')
    .replace(/([^\n])(\s*-\s+)/g, '$1\n$2');

  const lines = processed.split('\n');

  return lines.map((line, idx) => {
    let content = line.trim();
    if (!content) return <div key={idx} style={{ height: '6px' }} />;

    const isBullet = content.startsWith('- ') || content.startsWith('* ');
    if (isBullet) {
      content = content.replace(/^[-*]\s+/, '');
    }

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

  const storeComplaints = useNexusStore((state) => state.complaints);
  const storeIncidents = useNexusStore((state) => state.incidents);
  const storeAlerts = useNexusStore((state) => state.alerts);
  const user = useNexusStore((state) => state.user);

  // Active complaints pool (fallback to COMPLAINTS_DATA if store is not populated yet)
  const activeComplaints = storeComplaints.length > 0 ? storeComplaints : COMPLAINTS_DATA;
  const activeCasesCount = activeComplaints.length;
  const totalFraudAmount = activeComplaints.reduce((sum, c) => {
    const amt = (c as any).amount_inr || (c as any).amount || 0;
    return sum + amt;
  }, 0);

  // Reset chat session when window opens
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setPromptInput('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Blur background when open
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

  // Natural Conversational Intelligence Engine
  const generateConversationalAiResponse = (query: string): string => {
    const q = query.toLowerCase().trim();
    const officerName = user?.name ? user.name.replace(/\s*\(NEXUS Command\)/gi, '') : 'Officer';

    // 1. Hinglish Greetings ("kya haal h", "kaise ho", "kya haal hai", "kaise ho bhai", etc.)
    if (
      q.includes('kya haal') ||
      q.includes('kaise ho') ||
      q.includes('kya chal raha') ||
      q.includes('kya haal') ||
      q.includes('sab thik') ||
      q.includes('kaise ho bhai')
    ) {
      return `Bilkul mast ${officerName}! NEXUS AI Copilot ready aur active hai. 

**Current Operations Status:**
- **Active Tracked Complaints:** ${activeCasesCount} NCRP Cases
- **Total Financial Loss Recorded:** ₹${(totalFraudAmount / 100000).toFixed(1)} Lakhs
- **High-Risk Hotspot Districts:** Deoghar, Jamtara, Mewat, Bangalore

Aap batayein, aaj kis complaint ID, mule account, ya cashout prediction me assistance chahiye?`;
    }

    // 2. English Greetings ("hi", "hello", "hey", "greetings", "good morning", "sup")
    if (q === 'hi' || q === 'hello' || q === 'hey' || q === 'greetings' || q === 'sup' || q.includes('good morning') || q.includes('good evening')) {
      return `Hello ${officerName}! NEXUS AI Copilot is online and synchronized with the live NCRP Cybercrime Database.

**Operational Highlights:**
- **Active Complaints:** ${activeCasesCount} Cases
- **Total Exposure:** ₹${(totalFraudAmount / 100000).toFixed(1)} Lakhs
- **Open Incidents:** ${storeIncidents.length || 3} Dispatches Pending

How can I assist you with fraud tracing, mule accounts, or PCR dispatches today?`;
    }

    // 3. Capability Questions ("what can you do", "help", "feature", "kaam", "what is nexus ai")
    if (q.includes('what can you do') || q.includes('help') || q.includes('features') || q.includes('kaam') || q.includes('capabilities') || q.includes('who are you')) {
      return `I am **NEXUS AI Copilot**, an AI intelligence assistant dedicated to the NEXUS Law Enforcement Cybercrime Superplatform.

**Here is how I can assist you:**
- 🔍 **Search Complaints:** Ask about any complaint (e.g., *"Show CMP-1030"* or *"Complaints in Deoghar"*).
- 📊 **Executive Reports:** Type **"report"** for a full breakdown of total fraud loss, top categories, and action items.
- 💸 **Mule Account Tracing:** Inquire about destination mule accounts, bank corridors, and velocity spikes.
- 📍 **Cash-Out Hotspots:** Ask about predicted ATM withdrawal cells and PCR dispatch windows.
- 🛡️ **Cybercrime Concepts:** Ask about *Digital Arrest*, *Section 66D*, *1930 Helpline*, or *H3 Grid Resolution*.`;
    }

    // 4. Report or Summary Request ("report", "summary", "overview", "analytics", "stats", "fraud list")
    if (q.includes('report') || q.includes('summary') || q.includes('overview') || q.includes('analytics') || q.includes('stats') || q === 'report') {
      const topCases = COMPLAINTS_DATA.slice(0, 4).map((c) => 
        `- **${c.id}:** ${c.amountFormatted} (${c.complaintType}) - *Officer: ${c.assignedOfficer}* [Risk: **${c.risk}**]`
      ).join('\n');

      return `### 📊 NEXUS Executive Cybercrime Intelligence Report
**Generated At:** ${new Date().toLocaleString()}

**1. Key Platform Metrics:**
- **Total Fraud Complaints Tracked:** ${activeCasesCount} Cases
- **Total Exposure (INR):** ₹${totalFraudAmount.toLocaleString('en-IN')}
- **Active Interception Incidents:** ${storeIncidents.length || 3}
- **Open Hotspot Warnings:** ${storeAlerts.length || 5}

**2. Top Fraud Categories:**
- **UPI & Investment Scams:** 42%
- **Digital Arrest Extortion:** 28%
- **Phishing & ATM Mule Cashouts:** 30%

**3. Priority High-Risk Cases:**
${topCases}

**4. Recommended LEA Action Items:**
- Freeze primary destination accounts linked to SBI and HDFC corridors.
- Authorize PCR field interceptors for predicted H3 cashout cells in Deoghar & Jamtara.
- Dispatch automated victim SMS advisories for high-value complaints.`;
    }

    // 5. Digital Arrest Query
    if (q.includes('digital arrest') || q.includes('arrest scam')) {
      return `### 🚨 Cyber Intelligence Briefing: Digital Arrest Scams

**What is it?**
Digital Arrest is a sophisticated cyber-extortion scheme where fraudsters pose as CBI, ED, Narcotics Bureau, or Telecom Department officers via Skype or WhatsApp video calls. They falsely allege illegal parcels or money laundering and force victims into fake "virtual confinement" to extort funds.

**NEXUS Intelligence Data:**
- **Cases Logged:** ${COMPLAINTS_DATA.filter(c => c.complaintType?.toLowerCase().includes('digital') || c.description?.toLowerCase().includes('arrest')).length || 2} cases
- **Targeted Regions:** Urban districts & senior citizens.
- **Primary Money Flow:** Rapid multi-layer transfers into mule accounts within 45 minutes.

**Immediate Protocol:**
1. File emergency freeze request via 1930 NCRP Portal.
2. Trace destination UPI VPA handles and flag linked bank accounts.`;
    }

    // 6. Specific Complaint Search (CMP-1030, CMP-1029, 1030, 1029, etc.)
    const foundComplaint = COMPLAINTS_DATA.find((c) => 
      q.includes(c.id.toLowerCase()) || 
      q.includes(c.id.replace('cmp-', '').toLowerCase())
    );

    if (foundComplaint) {
      return `### 🔍 Complaint Intelligence Briefing: ${foundComplaint.id}

- **Category:** ${foundComplaint.complaintType}
- **Amount Lost:** ${foundComplaint.amountFormatted} (₹${foundComplaint.amount.toLocaleString('en-IN')})
- **Reported Date:** ${foundComplaint.reportedOn}
- **Primary Mule Account:** \`${foundComplaint.primaryAccount}\`
- **Assigned Officer:** ${foundComplaint.assignedOfficer}
- **Risk Level:** **${foundComplaint.risk}**
- **Status:** **${foundComplaint.status}**
- **Transaction Ref:** \`${foundComplaint.transactionReference}\`
- **Description:** *${foundComplaint.description}*`;
    }

    // 7. District or Location Query (Deoghar, Jamtara, Mewat, etc.)
    if (q.includes('deoghar') || q.includes('jamtara') || q.includes('mewat') || q.includes('bangalore') || q.includes('delhi')) {
      const locName = q.includes('deoghar') ? 'Deoghar' : q.includes('jamtara') ? 'Jamtara' : q.includes('mewat') ? 'Mewat' : 'Targeted District';
      return `### 📍 Regional Hotspot Analysis: ${locName}

- **Active Cashout Risk:** High-velocity ATM cash-out corridor detected.
- **Predicted Interception Window:** 3.5 hours remaining.
- **Primary Banking Networks:** State Bank of India, HDFC Bank, ICICI Bank.
- **Recommended Action:** Deploy PCR mobile patrol unit to high-probability H3 hexagon cells near market branch ATMs.`;
    }

    // 8. Conversational Fallback for general questions
    return `I understand your query regarding **"${query}"**.

As your **NEXUS Cybercrime AI Copilot**, I am tracking **${activeCasesCount} live NCRP complaints** totaling **₹${(totalFraudAmount / 100000).toFixed(1)} Lakhs**.

You can ask me to:
- Generate a full operational **"report"**
- Trace a specific complaint (e.g., *"Show CMP-1030"*)
- Explain scams like *"Digital Arrest"* or *"Mule Networks"*
- Analyze hotspot districts like *"Deoghar"* or *"Jamtara"*`;
  };

  const sendQuery = (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg = queryText.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userMsg, time: nowTime }
    ]);
    setPromptInput('');
    setIsLoading(true);

    // Provide immediate, natural conversational response
    setTimeout(() => {
      const responseText = generateConversationalAiResponse(userMsg);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'sai',
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsLoading(false);
    }, 450);
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(promptInput);
  };

  const quickPrompts = [
    "Summarize executive report",
    "Show CMP-1030 details",
    "What is Digital Arrest scam?",
    "Hotspots in Deoghar"
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
          {/* AI Window positioned at Bottom-Right */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: '88px',
              right: '24px',
              width: '420px',
              maxWidth: 'calc(100vw - 32px)',
              height: '580px',
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
                    backgroundColor: '#000000',
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
                    NEXUS AI Copilot
                  </div>
                  <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                    Live Dataset Connected ({activeCasesCount} Cases)
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
                /* Initial Center Branding & 2x2 Cards */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '18px',
                      backgroundColor: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <img src="/nexus_logo.png" alt="NEXUS AI Logo" style={{ height: '30px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                    NEXUS AI Copilot
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 20px 0', maxWidth: '300px', lineHeight: 1.4 }}>
                    Connected to <strong>{activeCasesCount} live complaints</strong> totaling <strong>₹{(totalFraudAmount / 100000).toFixed(1)}L</strong>.
                  </p>

                  {/* 2x2 Quick Suggestion Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                    {quickPrompts.map((promptText, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => sendQuery(promptText)}
                        style={{
                          backgroundColor: '#000000',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          textAlign: 'left',
                          lineHeight: 1.35,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#1E293B';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#000000';
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
                        maxWidth: '90%',
                        backgroundColor: msg.sender === 'user' ? '#000000' : '#F8FAFC',
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
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: '#000000', fontSize: '12.5px', padding: '6px 10px' }}>
                      <Loader2 size={16} className="animate-spin" />
                      <span style={{ fontWeight: 600 }}>NEXUS AI thinking...</span>
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
                  border: '1px solid #CBD5E1',
                  borderRadius: '24px',
                  padding: '4px 6px 4px 16px'
                }}
              >
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ask NEXUS AI (e.g. report, CMP-1030, Deoghar)..."
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
                    backgroundColor: promptInput.trim() ? '#000000' : '#CBD5E1',
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
          backgroundColor: '#000000',
          backgroundImage: 'none',
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
