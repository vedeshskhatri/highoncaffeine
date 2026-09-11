import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Sparkles, 
  RefreshCw,
  Send, 
  Mic, 
  MicOff, 
  X, 
  Minus, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ShieldAlert,
  MapPin
} from 'lucide-react';
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb';
import './FloatingChatOrb.css';

const API_BASE = 'http://127.0.0.1:8000';

const HIMALAYAN_SCENARIO_LOCATIONS = [
  { id: 'all', name: 'All Himalayan Sites (Auto-Detect)' },
  { id: 'Siachen_Base_Camp', name: 'Siachen Base Camp (3,600m)' },
  { id: 'Siachen_Glacier_High_Camp', name: 'Siachen High Camp (4,800m)' },
  { id: 'Daulat_Beg_Oldie', name: 'Daulat Beg Oldie (5,065m)' },
  { id: 'Depsang_Plains', name: 'Depsang Plains (4,920m)' },
  { id: 'Galwan_Valley', name: 'Galwan Valley (4,350m)' },
  { id: 'Pangong_North', name: 'Pangong North (4,250m)' },
  { id: 'Chushul', name: 'Chushul (4,350m)' },
  { id: 'Rezang_La', name: 'Rezang La (4,850m)' },
  { id: 'Hanle', name: 'Hanle (4,500m)' },
  { id: 'Nyoma', name: 'Nyoma (4,180m)' },
  { id: 'Kargil_Ridge', name: 'Kargil Ridge (2,670m)' },
  { id: 'Dras', name: 'Dras (3,280m)' },
  { id: 'Sonamarg', name: 'Sonamarg (2,730m)' },
  { id: 'Keylong', name: 'Keylong (3,080m)' },
  { id: 'Kunzum_Pass', name: 'Kunzum Pass (4,550m)' },
  { id: 'Rohtang_Pass', name: 'Rohtang Pass (3,978m)' },
  { id: 'Spiti_Kaza', name: 'Spiti Kaza (3,800m)' },
  { id: 'Baralacha_La', name: 'Baralacha La (4,890m)' },
  { id: 'Mana_Pass', name: 'Mana Pass (5,630m)' },
  { id: 'Niti_Pass', name: 'Niti Pass (5,068m)' },
  { id: 'Nathu_La', name: 'Nathu La (4,310m)' },
  { id: 'Tawang', name: 'Tawang (3,048m)' },
  { id: 'Bum_La', name: 'Bum La (4,630m)' },
  { id: 'Se_La', name: 'Se La (4,170m)' },
];

const SUGGESTED_QUERIES = [
  {
    tag: 'Siachen Base Camp',
    query: 'What is the predicted indoor temperature for a shelter in Siachen Base Camp with stone masonry and 0.5 ACH?',
  },
  {
    tag: 'Dras Sector',
    query: 'What is the predicted performance in Dras at -25°C with PUF sandwich panels and 0.35 ACH?',
  },
  {
    tag: 'Leh Bottleneck',
    query: 'What will be the dominant heat loss bottleneck in Leh with mud brick walls?',
  },
  {
    tag: 'Life Safety',
    query: 'Is an unflued combustion heater safe with 0.2 ACH in Siachen?',
  },
];

const FLUX_META = {
  sky_longwave_loss_W: { label: 'Sky Radiative', color: '#3B82F6' },
  wall_conduction_W: { label: 'Wall Conduction', color: '#EA580C' },
  glazing_conduction_W: { label: 'Glazing Conduction', color: '#D97706' },
  roof_conduction_W: { label: 'Roof Conduction', color: '#9A3412' },
  infiltration_heat_loss_W: { label: 'Air Infiltration', color: '#64748B' },
  floor_conduction_W: { label: 'Ground Slab', color: '#78716C' },
};

function formatInlineMathAndBold(text) {
  if (!text) return text;
  const cleaned = text
    .replace(/\(\$T_\{?in\}?\$\)/g, '(Tin)')
    .replace(/\(\$T_\{?op\}?\$\)/g, '(Top)')
    .replace(/\(\$T_\{?mrt\}?\$\)/g, '(Tmrt)')
    .replace(/\(\$?\\Delta\s*T\$\)/g, '(ΔT)')
    .replace(/\$([^\$]+)\$/g, '$1');

  const parts = cleaned.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="mono-chip">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function RenderDiagnosticAnswer({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="chat-answer-list">
          {currentList.map((item, i) => (
            <li key={i}>{formatInlineMathAndBold(item)}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h5 key={`head-${idx}`} className="chat-answer-subhead">
          {trimmed.replace(/^#+\s*/, '')}
        </h5>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={`step-${idx}`} className="chat-numbered-step">
          {formatInlineMathAndBold(trimmed)}
        </div>
      );
    } else {
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="chat-answer-paragraph">
          {formatInlineMathAndBold(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return <div className="chat-answer-prose">{elements}</div>;
}

export default function FloatingChatOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [selectedSite, setSelectedSite] = useState('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [expandedFluxId, setExpandedFluxId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [placement, setPlacement] = useState({ v: 'bottom', h: 'right' });

  const boundaryRef = useRef(null);
  const orbRef = useRef(null);
  const isDraggingRef = useRef(false);
  const contentBodyRef = useRef(null);
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);

  // Background Scroll Isolation
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowWheel = (e) => {
      const windowEl = chatWindowRef.current;
      if (!windowEl) return;

      if (!windowEl.contains(e.target)) {
        return; // Mouse outside chatbox -> background page scrolls naturally
      }

      const scrollBody = contentBodyRef.current;
      if (!scrollBody) {
        e.preventDefault();
        return;
      }

      const { deltaY, deltaX } = e;

      // Block horizontal gestures over the chatbox
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
        return;
      }

      if (deltaY === 0) return;

      const maxScroll = scrollBody.scrollHeight - scrollBody.clientHeight;
      if (maxScroll <= 0) {
        e.preventDefault();
        return;
      }

      // If scrolling over topbar or bottom input, scroll message feed directly
      if (!scrollBody.contains(e.target)) {
        e.preventDefault();
        scrollBody.scrollTop = Math.max(0, Math.min(maxScroll, scrollBody.scrollTop + deltaY));
        return;
      }

      // Inside scroll area: clamp boundaries to lock background
      if (deltaY > 0) {
        if (scrollBody.scrollTop >= maxScroll) {
          e.preventDefault();
        } else if (scrollBody.scrollTop + deltaY >= maxScroll) {
          e.preventDefault();
          scrollBody.scrollTop = maxScroll;
        }
      } else if (deltaY < 0) {
        if (scrollBody.scrollTop <= 0) {
          e.preventDefault();
        } else if (scrollBody.scrollTop + deltaY <= 0) {
          e.preventDefault();
          scrollBody.scrollTop = 0;
        }
      }
    };

    const handleTouchMove = (e) => {
      const windowEl = chatWindowRef.current;
      if (!windowEl || !windowEl.contains(e.target)) return;

      const scrollBody = contentBodyRef.current;
      if (!scrollBody || !scrollBody.contains(e.target)) {
        e.preventDefault();
        return;
      }

      const maxScroll = scrollBody.scrollHeight - scrollBody.clientHeight;
      if (maxScroll <= 0) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWindowWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWindowWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen]);

  // Update placement relative to screen edges
  const updatePlacement = useCallback(() => {
    if (!orbRef.current) return;
    const rect = orbRef.current.getBoundingClientRect();
    const v = rect.top < 380 ? 'top' : 'bottom';
    const h = rect.left < 400 ? 'left' : 'right';
    setPlacement({ v, h });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updatePlacement);
    return () => window.removeEventListener('resize', updatePlacement);
  }, [updatePlacement]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      if (contentBodyRef.current) {
        contentBodyRef.current.scrollTo({
          top: contentBodyRef.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    }, 50);
  }, []);

  // Submit AI Query
  const handleAiSubmit = useCallback(async (qText, siteOverride) => {
    const q = (qText || queryInput).trim();
    if (!q) return;

    const siteToUse = siteOverride !== undefined ? siteOverride : selectedSite;
    setQueryInput('');

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: q,
      site: siteToUse !== 'all' ? siteToUse.replace(/_/g, ' ') : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setAiLoading(true);
    scrollToBottom();

    const payload = {
      question: q,
      use_ollama: true,
    };
    if (siteToUse && siteToUse !== 'all') {
      payload.shelter_override = { location: siteToUse };
    }

    try {
      const res = await fetch(`${API_BASE}/api/ml/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      const asstMsg = {
        id: assistantMsgId,
        role: 'assistant',
        text: data.answer,
        predictions: data.predictions,
        resolved: data.resolved_parameters,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, asstMsg]);
    } catch (err) {
      console.error('Prediction Error', err);
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          text: `Physics Engine Offline: Unable to query ${API_BASE}. Ensure the local FastAPI server is running.`,
          predictions: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setAiLoading(false);
      scrollToBottom();
    }
  }, [queryInput, selectedSite, scrollToBottom]);

  // Listen to open-therma-orb global events
  useEffect(() => {
    const handleExternalOpen = (e) => {
      setIsOpen(true);
      updatePlacement();
      const q = e.detail?.query || SUGGESTED_QUERIES[0].query;
      const s = e.detail?.site || 'all';
      setSelectedSite(s);
      handleAiSubmit(q, s);
    };

    window.addEventListener('open-therma-orb', handleExternalOpen);
    return () => window.removeEventListener('open-therma-orb', handleExternalOpen);
  }, [handleAiSubmit, updatePlacement]);

  // Handle Dragging
  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_, info) => {
    const dist = Math.hypot(info.offset.x, info.offset.y);
    if (dist > 6) {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 120);
    } else {
      isDraggingRef.current = false;
    }
    updatePlacement();
  };

  const handleOrbClick = () => {
    if (isDraggingRef.current) return;
    updatePlacement();
    setIsOpen(prev => !prev);
  };

  // Speech Recognition
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
        setQueryInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <>
      {/* Screen Boundary for Dragging */}
      <div 
        ref={boundaryRef} 
        className="fixed inset-4 pointer-events-none z-[99998]" 
      />

      {/* Movable Floating Orb Widget */}
      <motion.div
        drag
        dragConstraints={boundaryRef}
        dragElastic={0.08}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="floating-orb-wrapper"
        style={{
          right: '24px',
          bottom: '24px',
        }}
      >
        <div 
          className="relative flex flex-col"
          style={{
            alignItems: placement.h === 'left' ? 'flex-start' : 'flex-end',
          }}
        >
          {/* Grounded Thermal AI Chatbox Modal */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={chatWindowRef}
                initial={{ opacity: 0, scale: 0.94, y: placement.v === 'top' ? -12 : 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="floating-chat-window"
                style={{
                  position: 'absolute',
                  ...(placement.v === 'top' ? { top: '82px' } : { bottom: '82px' }),
                  ...(placement.h === 'left' ? { left: '0' } : { right: '0' }),
                }}
              >
                {/* Clean Executive Header */}
                <div className="chat-window-topbar">
                  <div className="chat-topbar-info">
                    <div className="chat-topbar-avatar">
                      <Bot size={16} />
                    </div>
                    <div>
                      <div className="chat-topbar-title">
                        THERMA Engineering AI
                        <span className="chat-topbar-badge">DRDO PS 26051</span>
                      </div>
                      <div className="chat-topbar-sub">
                        <span className="floating-orb-status-dot" />
                        5 Surrogate ML Models · 120,000 Timesteps · R² 0.968
                      </div>
                    </div>
                  </div>

                  <div className="chat-topbar-actions">
                    <button
                      type="button"
                      className="chat-icon-btn"
                      onClick={() => {
                        setMessages([]);
                        setQueryInput('');
                        setExpandedFluxId(null);
                      }}
                      title="Clear conversation"
                    >
                      <RotateCcw size={13} />
                    </button>

                    <button
                      type="button"
                      className="chat-icon-btn"
                      onClick={() => setIsOpen(false)}
                      title="Minimize"
                    >
                      <Minus size={13} />
                    </button>

                    <button
                      type="button"
                      className="chat-icon-btn"
                      onClick={() => setIsOpen(false)}
                      title="Close"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Conversation Feed */}
                <div ref={contentBodyRef} className="chat-window-body">
                  {messages.length === 0 ? (
                    <div className="chat-welcome-container">
                      <div className="chat-welcome-badge">
                        <ShieldAlert size={14} />
                        <span>HIGH-ALTITUDE THERMAL COMFORT & SAFETY</span>
                      </div>
                      <h3 className="chat-welcome-heading">How can I assist your shelter design?</h3>
                      <p className="chat-welcome-sub">
                        Direct physics predictions, insulation evaluations, and life-safety checks grounded across 39 Himalayan border scenario posts.
                      </p>

                      <div className="chat-starters-label">Suggested Queries</div>
                      <div className="chat-starters-grid">
                        {SUGGESTED_QUERIES.map((sq, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="chat-starter-btn"
                            onClick={() => handleAiSubmit(sq.query)}
                          >
                            <span className="starter-tag">{sq.tag}</span>
                            <span className="starter-query">{sq.query}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="chat-messages-stream">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                          {msg.role === 'user' ? (
                            <div className="user-message-bubble">
                              {msg.site && (
                                <div className="user-site-tag">
                                  <MapPin size={10} />
                                  <span>{msg.site}</span>
                                </div>
                              )}
                              <div className="user-text-content">{msg.content}</div>
                              <div className="user-timestamp">{msg.timestamp}</div>
                            </div>
                          ) : (
                            <div className="assistant-message-bubble">
                              {/* Assistant Message Header */}
                              <div className="asst-header">
                                <div className="asst-avatar">
                                  <Sparkles size={13} />
                                </div>
                                <span className="asst-author">THERMA Surrogate AI</span>
                                <span className="asst-time">{msg.timestamp}</span>
                              </div>

                              {/* Natural Answer Prose */}
                              <RenderDiagnosticAnswer text={msg.text} />

                              {/* Compact Telemetry Strip */}
                              {msg.predictions && msg.predictions.indoor_temperature_C !== undefined && (
                                <div className="chat-telemetry-strip">
                                  <div className="telemetry-item">
                                    <span className="telemetry-label">Indoor Air (Tin)</span>
                                    <div className="telemetry-val-group">
                                      <span className="telemetry-val mono">
                                        {msg.predictions.indoor_temperature_C.toFixed(1)}°C
                                      </span>
                                      {msg.predictions.temperature_lift_C !== undefined && (
                                        <span className="telemetry-lift-badge mono">
                                          +{msg.predictions.temperature_lift_C.toFixed(1)}°C lift
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="telemetry-item">
                                    <span className="telemetry-label">Operative (Top)</span>
                                    <span className="telemetry-val mono">
                                      {msg.predictions.operative_temperature_C?.toFixed(1) ?? '—'}°C
                                    </span>
                                  </div>

                                  <div className="telemetry-item">
                                    <span className="telemetry-label">Primary Bottleneck</span>
                                    <span className="telemetry-val bottleneck">
                                      {msg.predictions.dominant_heat_loss?.toUpperCase() ?? 'SKY'}
                                    </span>
                                  </div>

                                  <div className="telemetry-item">
                                    <span className="telemetry-label">Life Safety</span>
                                    <span className={`telemetry-status-pill ${msg.predictions.safety_status === 'PASS' ? 'pass' : 'fail'} mono`}>
                                      {msg.predictions.safety_status === 'PASS' ? (
                                        <>
                                          <CheckCircle2 size={11} />
                                          <span>PASS</span>
                                        </>
                                      ) : (
                                        <>
                                          <AlertTriangle size={11} />
                                          <span>FAIL</span>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Interactive Expandable Heat Loss Breakdown */}
                              {msg.predictions?.heat_loss_fluxes_W && (
                                <div className="flux-disclosure-box">
                                  <button
                                    type="button"
                                    className="flux-disclosure-btn"
                                    onClick={() => setExpandedFluxId(expandedFluxId === msg.id ? null : msg.id)}
                                  >
                                    <span>
                                      {expandedFluxId === msg.id 
                                        ? 'Hide Heat Loss Spectrum' 
                                        : 'View Building Heat Loss Distribution (Watts & %)'}
                                    </span>
                                    <ChevronDown size={13} className={expandedFluxId === msg.id ? 'rotate-180' : ''} />
                                  </button>

                                  {expandedFluxId === msg.id && (
                                    <div className="flux-breakdown-details">
                                      {/* Proportional Spectrum Bar */}
                                      <div className="stacked-flux-bar">
                                        {Object.entries(msg.predictions.heat_loss_fluxes_W)
                                          .filter(([k]) => k !== 'total_heat_loss_W')
                                          .map(([k, v]) => {
                                            const totalW = msg.predictions.heat_loss_fluxes_W.total_heat_loss_W || 1;
                                            const pct = (v / totalW) * 100;
                                            const meta = FLUX_META[k] || { label: k, color: '#64748B' };
                                            return (
                                              <div
                                                key={k}
                                                className="stacked-flux-segment"
                                                style={{ width: `${Math.max(1.5, pct)}%`, backgroundColor: meta.color }}
                                                title={`${meta.label}: ${v.toFixed(1)} W (${pct.toFixed(1)}%)`}
                                              />
                                            );
                                          })}
                                      </div>

                                      {/* Component Rows */}
                                      <div className="flux-component-rows">
                                        {Object.entries(msg.predictions.heat_loss_fluxes_W)
                                          .filter(([k]) => k !== 'total_heat_loss_W')
                                          .map(([k, v]) => {
                                            const totalW = msg.predictions.heat_loss_fluxes_W.total_heat_loss_W || 1;
                                            const pct = ((v / totalW) * 100).toFixed(1);
                                            const meta = FLUX_META[k] || { label: k, color: '#64748B' };
                                            return (
                                              <div key={k} className="flux-component-item">
                                                <div className="flux-item-left">
                                                  <span className="flux-dot" style={{ backgroundColor: meta.color }} />
                                                  <span className="flux-name">{meta.label}</span>
                                                </div>
                                                <div className="flux-item-right mono">
                                                  <span>{v.toFixed(0)} W</span>
                                                  <span className="flux-pct">({pct}%)</span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Loading State */}
                      {aiLoading && (
                        <div className="chat-message-row assistant">
                          <div className="assistant-message-bubble loading-state">
                            <div className="asst-header">
                              <div className="asst-avatar spin">
                                <RefreshCw size={13} />
                              </div>
                              <span className="asst-author">Evaluating High-Altitude Physics...</span>
                            </div>
                            <div className="chat-typing-dots">
                              <span />
                              <span />
                              <span />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modern Bottom Input Bar */}
                <div className="chat-window-input-dock">
                  <div className="input-location-row">
                    <span className="location-tag-label">Sector Context:</span>
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="location-select-chip"
                    >
                      {HIMALAYAN_SCENARIO_LOCATIONS.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAiSubmit();
                    }}
                    className="chat-compose-form"
                  >
                    <input
                      type="text"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder="Ask about shelter thermal comfort, insulation, heating safety..."
                      className="chat-compose-input"
                      disabled={aiLoading}
                    />

                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`chat-compose-btn mic-btn ${isListening ? 'active' : ''}`}
                      title={isListening ? 'Stop recording' : 'Voice input'}
                    >
                      {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>

                    <button
                      type="submit"
                      disabled={aiLoading || !queryInput.trim()}
                      className="chat-compose-btn send-btn"
                      title="Send question"
                    >
                      {aiLoading ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Movable Orb Trigger Button */}
          <div
            ref={orbRef}
            onClick={handleOrbClick}
            className={`floating-orb-button ${isListening ? 'voice-active' : ''}`}
            title="THERMA Grounded AI • Drag anywhere • Click to open"
          >
            {/* The WebGL VoicePoweredOrb Canvas */}
            <div className="floating-orb-canvas-container">
              <VoicePoweredOrb
                hue={0}
                enableVoiceControl={isListening}
                voiceSensitivity={1.8}
                maxRotationSpeed={1.5}
                maxHoverIntensity={0.85}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
