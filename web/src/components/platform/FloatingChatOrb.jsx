import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
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
  Thermometer,
  Activity,
  Zap,
  ShieldAlert,
  FileText,
  Boxes,
  MapPin
} from 'lucide-react';
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb';
import API_BASE from '@/lib/api';
import './FloatingChatOrb.css';

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
  'What is the predicted indoor temperature for a shelter in Siachen Base Camp with stone masonry and 0.5 ACH?',
  'What is the predicted performance in Dras at -25°C with PUF sandwich panels and 0.35 ACH?',
  'What will be the dominant heat loss bottleneck in Leh with mud brick walls?',
  'Is an unflued combustion heater safe with 0.2 ACH in Siachen?',
  'Compare thermal performance of 50mm PUF vs 100mm EPS in Daulat Beg Oldie',
  'What are the recommended wall materials for Galwan Valley at 4350m altitude?',
];

const FLUX_META = {
  sky_longwave_loss_W: {
    label: 'Sky Longwave Radiative Loss',
    sub: 'Radiative cooling exchange with clear celestial sky dome',
    color: '#3B82F6',
  },
  wall_conduction_W: {
    label: 'Wall Fabric Conduction',
    sub: 'Conductive heat transmission across exterior vertical envelope',
    color: '#C2410C',
  },
  glazing_conduction_W: {
    label: 'Glazing Assembly Conduction',
    sub: 'Direct conductive loss through window glazing panes',
    color: '#D97706',
  },
  roof_conduction_W: {
    label: 'Roof Assembly Conduction',
    sub: 'Heat transmission through ceiling insulation & CGI roof sheet',
    color: '#9A3412',
  },
  infiltration_heat_loss_W: {
    label: 'Infiltration Air Leakage',
    sub: 'Sensible convective enthalpy loss from sub-zero air exchange',
    color: '#64748B',
  },
  floor_conduction_W: {
    label: 'Permafrost / Ground Conduction',
    sub: 'Sub-structure heat flux transmission into frozen ground slab',
    color: '#78716C',
  },
};

function formatInlineMathAndBold(text) {
  if (!text) return text;
  let cleaned = text
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
      return <code key={idx} className="mono-code-chip mono">{part.slice(1, -1)}</code>;
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
        <ul key={`list-${elements.length}`} className="diagnostic-bullet-list">
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
      const title = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4 key={`head-${idx}`} className="diagnostic-section-title">
          {title}
        </h4>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={`step-${idx}`} className="diagnostic-numbered-item">
          {formatInlineMathAndBold(trimmed)}
        </div>
      );
    } else {
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="diagnostic-prose">
          {formatInlineMathAndBold(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return <div className="diagnostic-answer-container">{elements}</div>;
}

export default function FloatingChatOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [selectedSite, setSelectedSite] = useState('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [placement, setPlacement] = useState({ v: 'bottom', h: 'right' });

  const boundaryRef = useRef(null);
  const orbRef = useRef(null);
  const isDraggingRef = useRef(false);
  const contentBodyRef = useRef(null);
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);

  // Isolate scroll: when scrolling inside the chat window, lock background website movement
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowWheel = (e) => {
      const windowEl = chatWindowRef.current;
      if (!windowEl) return;

      // Only intervene if user's cursor is over the floating AI chatbox
      if (!windowEl.contains(e.target)) {
        return; // Cursor is outside the AI chatbox -> let background page scroll normally
      }

      const scrollBody = contentBodyRef.current;
      if (!scrollBody) {
        e.preventDefault();
        return;
      }

      const { deltaY, deltaX } = e;

      // Block horizontal gestures over the chatbox from triggering browser back/forward or horizontal shift
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
        return;
      }

      if (deltaY === 0) return;

      const maxScroll = scrollBody.scrollHeight - scrollBody.clientHeight;

      // If chatbox content is not scrollable, lock background scroll completely
      if (maxScroll <= 0) {
        e.preventDefault();
        return;
      }

      // If user is hovering over topbar, actions, or search form (outside scrollBody),
      // smoothly scroll the body directly and prevent background window scroll
      if (!scrollBody.contains(e.target)) {
        e.preventDefault();
        scrollBody.scrollTop = Math.max(0, Math.min(maxScroll, scrollBody.scrollTop + deltaY));
        return;
      }

      // User is scrolling directly inside scrollBody:
      // Lock background by preventing boundary overshoot / scroll chaining
      if (deltaY > 0) {
        // Scrolling down
        if (scrollBody.scrollTop >= maxScroll) {
          e.preventDefault();
        } else if (scrollBody.scrollTop + deltaY >= maxScroll) {
          e.preventDefault();
          scrollBody.scrollTop = maxScroll;
        }
      } else if (deltaY < 0) {
        // Scrolling up
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

  // Update placement relative to screen edges so chat window never clips
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

  // Submit AI Query
  const handleAiSubmit = useCallback(async (qText, siteOverride) => {
    const q = qText || queryInput;
    if (!q || !q.trim()) return;
    setAiLoading(true);

    const siteToUse = siteOverride !== undefined ? siteOverride : selectedSite;
    const payload = {
      question: q,
      use_ollama: true,
    };
    if (siteToUse && siteToUse !== 'all') {
      payload.shelter_override = { location: siteToUse };
    }

    try {
      const targetUrl = `${API_BASE}/api/ml/ask`;
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setAiResponse(data);
    } catch (err) {
      console.error('Prediction Error', err);
      setAiResponse({
        question: q,
        answer: `Connection Error: ${err.message || 'Failed to reach THERMA API'}. Make sure the backend server is running.`,
        predictions: {},
        resolved_parameters: {},
        recommendations: [],
      });
    } finally {
      setAiLoading(false);
    }
  }, [queryInput, selectedSite]);

  // Listen to open-therma-orb global events
  useEffect(() => {
    const handleExternalOpen = (e) => {
      setIsOpen(true);
      updatePlacement();
      const q = e.detail?.query || '';
      const s = e.detail?.site || 'all';
      if (q) {
        setQueryInput(q);
        setSelectedSite(s);
        handleAiSubmit(q, s);
      }
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setQueryInput(transcript);
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition init error:', err);
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
                initial={{ opacity: 0, scale: 0.9, y: placement.v === 'top' ? -15 : 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="floating-chat-window"
                style={{
                  position: 'absolute',
                  ...(placement.v === 'top' ? { top: '82px' } : { bottom: '82px' }),
                  ...(placement.h === 'left' ? { left: '0' } : { right: '0' }),
                }}
              >
                {/* Executive Window Header */}
                <div className="chat-window-topbar">
                  <div className="chat-topbar-info">
                    <div className="chat-topbar-icon">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="chat-topbar-title">
                        THERMA Grounded Thermal AI
                        <span className="chat-topbar-tag">DRDO PS 26051</span>
                      </div>
                      <div className="chat-topbar-sub">
                        <span className="floating-orb-status-dot" />
                        5 Surrogate ML Models · 120,000 Timesteps · R²: 0.968
                      </div>
                    </div>
                  </div>

                  <div className="chat-topbar-actions">
                    <button
                      type="button"
                      className="chat-icon-btn"
                      onClick={() => {
                        setQueryInput('');
                        setAiResponse(null);
                      }}
                      title="Reset / Clear Search"
                    >
                      <RotateCcw size={14} />
                    </button>

                    <button
                      type="button"
                      className="chat-icon-btn"
                      onClick={() => setIsOpen(false)}
                      title="Minimize"
                    >
                      <Minus size={14} />
                    </button>

                    <button
                      type="button"
                      className="chat-icon-btn"
                      onClick={() => setIsOpen(false)}
                      title="Close"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Scrollable Chatbox Body */}
                <div ref={contentBodyRef} className="chat-window-body">
                  {/* Sample Grounded Inquiries */}
                  <div className="prompt-chips-label">Sample Grounded Inquiries (Final Dataset)</div>
                  <div className="prompt-chips-group">
                    {SUGGESTED_QUERIES.map((sq, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="prompt-chip"
                        onClick={() => {
                          setQueryInput(sq);
                          handleAiSubmit(sq);
                        }}
                      >
                        {sq}
                      </button>
                    ))}
                  </div>

                  {/* Search Form Strip */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAiSubmit();
                    }}
                    className="cpwd-search-strip"
                    style={{ marginTop: '14px', marginBottom: '16px' }}
                  >
                    <div className="cpwd-input-box">
                      <Search size={16} className="cpwd-input-icon" />
                      <input
                        type="text"
                        placeholder="Ask any shelter thermal performance, temperature, heat loss, comfort, or safety question..."
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                      />
                    </div>

                    <select
                      className="cpwd-select"
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      aria-label="Location Scope"
                    >
                      {HIMALAYAN_SCENARIO_LOCATIONS.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className={`cpwd-btn-secondary ${isListening ? 'active' : ''}`}
                      onClick={toggleSpeechRecognition}
                      title={isListening ? 'Stop listening' : 'Speak inquiry'}
                      style={{ padding: '0 12px' }}
                    >
                      {isListening ? <MicOff size={15} className="text-emerald-500" /> : <Mic size={15} />}
                    </button>

                    <button type="submit" className="cpwd-btn-primary" disabled={aiLoading}>
                      {aiLoading ? <RefreshCw size={15} className="spin" /> : <Sparkles size={15} />}
                      <span>{aiLoading ? 'Predicting...' : 'Query Thermal AI'}</span>
                    </button>
                  </form>

                  {/* Loading State while evaluating models */}
                  {aiLoading && (
                    <div className="chatbox-loading-state">
                      <RefreshCw size={28} className="spin" style={{ color: '#0284c7' }} />
                      <h4 className="loading-state-title">Evaluating Thermodynamic Surrogate Models...</h4>
                      <p className="loading-state-desc mono">
                        Simulating building envelope conduction, radiation, air infiltration, and operative comfort.
                      </p>
                    </div>
                  )}

                  {/* Grounded Response Diagnostic Console */}
                  {aiResponse && !aiLoading && (
                    aiResponse.intent === 'clarification' ? (
                      <div className="diagnostic-clarification-card">
                        <div className="clarification-header">
                          <div className="clarification-icon">
                            <Sparkles size={18} />
                          </div>
                          <div>
                            <h4 className="clarification-title">THERMA High-Altitude Thermal Assistant</h4>
                            <span className="clarification-tag mono">Building Physics Inquiry Required</span>
                          </div>
                        </div>
                        <div className="clarification-body">
                          <RenderDiagnosticAnswer text={aiResponse.answer} />
                        </div>
                        {aiResponse.suggested_questions && aiResponse.suggested_questions.length > 0 && (
                          <div className="clarification-suggestions">
                            <span className="clarification-suggest-label">Recommended Inquiries:</span>
                            <div className="clarification-chips">
                              {aiResponse.suggested_questions.map((sq, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="clarification-chip"
                                  onClick={() => {
                                    setQueryInput(sq);
                                    handleAiSubmit(sq);
                                  }}
                                >
                                  {sq}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="ai-diagnostic-console" style={{ marginTop: '0' }}>
                      {/* Executive Header */}
                      <div className="diagnostic-header-bar">
                        <div className="diagnostic-header-left">
                          <div className="diagnostic-engine-pill">
                            <CheckCircle2 size={13} className="text-comfort" />
                            <span>DRDO PS 26051 · ML Surrogate Diagnostic</span>
                          </div>
                          <div className="diagnostic-benchmark-pill mono">
                            <span>SURROGATE R²: 0.968</span>
                            <span className="dot-divider">·</span>
                            <span>120,000 TIMESTEPS</span>
                          </div>
                        </div>

                        <div className="diagnostic-header-right mono">
                          {aiResponse.resolved_parameters?.location && (
                            <span className="diagnostic-site-tag">
                              {aiResponse.resolved_parameters.location.replace(/_/g, ' ')} · {aiResponse.resolved_parameters.altitude_m?.toFixed(0)}m AMSL · Ambient {aiResponse.resolved_parameters.outdoor_temperature_C?.toFixed(1)}°C
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Envelope Design Parameters Strip */}
                      {aiResponse.resolved_parameters?.wall_material && (
                        <div className="diagnostic-specs-strip">
                          <div className="spec-item">
                            <span className="spec-k">Wall Assembly:</span>
                            <span className="spec-v">{aiResponse.resolved_parameters.wall_material.replace(/_/g, ' ').toUpperCase()}</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-k">Wall Insulation:</span>
                            <span className="spec-v mono">{(aiResponse.resolved_parameters.wall_insulation_thickness_m * 1000).toFixed(0)} mm</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-k">Air Infiltration:</span>
                            <span className="spec-v mono">{aiResponse.resolved_parameters.ach} ACH</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-k">Design Occupancy:</span>
                            <span className="spec-v mono">{aiResponse.resolved_parameters.occupants} Troops</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-k">Region:</span>
                            <span className="spec-v">{aiResponse.resolved_parameters.region || 'Ladakh'}</span>
                          </div>
                        </div>
                      )}

                      {/* Comparative Analysis Card if user requested comparison */}
                      {aiResponse.comparison && (
                        <div className="comparison-results-card">
                          <div className="comparison-card-header">
                            <span className="comparison-tag mono">HEAD-TO-HEAD SURROGATE COMPARISON</span>
                            <span className="comparison-meta mono">DRDO PS 26051 Physics Evaluator</span>
                          </div>
                          <div className="comparison-grid">
                            <div className="comparison-col">
                              <span className="comparison-opt-title">{aiResponse.comparison.option_a.name}</span>
                              <div className="comparison-opt-metrics">
                                <div className="comp-m-row"><span>Indoor Air Temp:</span><strong className="mono">{aiResponse.comparison.option_a.indoor_temperature_C.toFixed(2)} °C</strong></div>
                                <div className="comp-m-row"><span>Total Building Loss:</span><strong className="mono">{aiResponse.comparison.option_a.total_heat_loss_W.toLocaleString()} W</strong></div>
                                <div className="comp-m-row"><span>Dominant Bottleneck:</span><strong className="uppercase mono">{aiResponse.comparison.option_a.dominant_loss}</strong></div>
                              </div>
                            </div>
                            <div className="comparison-col comparison-winner">
                              <span className="comparison-opt-title">{aiResponse.comparison.option_b.name}</span>
                              <div className="comparison-opt-metrics">
                                <div className="comp-m-row"><span>Indoor Air Temp:</span><strong className="mono">{aiResponse.comparison.option_b.indoor_temperature_C.toFixed(2)} °C</strong></div>
                                <div className="comp-m-row"><span>Total Building Loss:</span><strong className="mono">{aiResponse.comparison.option_b.total_heat_loss_W.toLocaleString()} W</strong></div>
                                <div className="comp-m-row"><span>Dominant Bottleneck:</span><strong className="uppercase mono">{aiResponse.comparison.option_b.dominant_loss}</strong></div>
                              </div>
                            </div>
                          </div>
                          <div className="comparison-delta-strip mono">
                            <span>ΔTin: {aiResponse.comparison.delta_temperature_C > 0 ? '+' : ''}{aiResponse.comparison.delta_temperature_C} °C</span>
                            <span>·</span>
                            <span>ΔHeat Loss: {aiResponse.comparison.delta_heat_loss_W > 0 ? '+' : ''}{aiResponse.comparison.delta_heat_loss_W} W</span>
                          </div>
                        </div>
                      )}

                      {/* 4 Primary Precision Metric Tiles */}
                      {aiResponse.predictions?.indoor_temperature_C !== undefined && (
                        <div className="thermal-metrics-grid">
                          <div className="thermal-metric-tile">
                            <div className="metric-header-row">
                              <span className="thermal-metric-label">INDOOR EQUILIBRIUM TEMP (Tin)</span>
                              <Thermometer size={14} className="text-secondary" />
                            </div>
                            <div className="thermal-metric-value mono">
                              {aiResponse.predictions.indoor_temperature_C.toFixed(2)} °C
                            </div>
                            <div className="thermal-lift-badge">
                              <span>Passive Lift:</span>
                              <strong className="mono">+{aiResponse.predictions.temperature_lift_C.toFixed(2)} °C</strong>
                              <span>above ambient</span>
                            </div>
                          </div>

                          <div className="thermal-metric-tile">
                            <div className="metric-header-row">
                              <span className="thermal-metric-label">OPERATIVE COMFORT (Top)</span>
                              <Activity size={14} className="text-secondary" />
                            </div>
                            <div className="thermal-metric-value mono">
                              {aiResponse.predictions.operative_temperature_C.toFixed(2)} °C
                            </div>
                            <div className="thermal-metric-sub mono">
                              Mean Radiant (Tmrt): {aiResponse.predictions.mean_radiant_temperature_C.toFixed(2)} °C
                            </div>
                          </div>

                          <div className="thermal-metric-tile">
                            <div className="metric-header-row">
                              <span className="thermal-metric-label">THERMAL BOTTLENECK</span>
                              <Zap size={14} className="text-orange" />
                            </div>
                            <div className="thermal-metric-value bottleneck-val">
                              {aiResponse.predictions.dominant_heat_loss.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div className="thermal-metric-sub">
                              Primary thermodynamic dissipation vector
                            </div>
                          </div>

                          <div className="thermal-metric-tile">
                            <div className="metric-header-row">
                              <span className="thermal-metric-label">COMFORT & LIFE SAFETY</span>
                              <ShieldAlert size={14} className={aiResponse.predictions.safety_status === 'PASS' ? 'text-comfort' : 'text-danger'} />
                            </div>
                            <div className="safety-badges-row">
                              <span
                                className={`thermal-badge ${
                                  aiResponse.predictions.comfort_status === 'COMFORT'
                                    ? 'comfort'
                                    : aiResponse.predictions.comfort_status === 'WARM'
                                    ? 'warm'
                                    : 'cold'
                                }`}
                              >
                                {aiResponse.predictions.comfort_status}
                              </span>
                              <span
                                className={`thermal-badge ${
                                  aiResponse.predictions.safety_status === 'PASS' ? 'pass' : 'refused'
                                }`}
                              >
                                {aiResponse.predictions.safety_status}
                              </span>
                            </div>
                            <div className="thermal-metric-sub">
                              Risk Class: <strong className="mono">{aiResponse.predictions.thermal_risk_class}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Architectural Heat Loss Flux Breakdown */}
                      {aiResponse.predictions?.heat_loss_fluxes_W && (() => {
                        const fluxes = aiResponse.predictions.heat_loss_fluxes_W;
                        const totalW = fluxes.total_heat_loss_W || 1;
                        const fluxEntries = Object.entries(fluxes).filter(([k]) => k !== 'total_heat_loss_W');

                        return (
                          <div className="flux-diagnostic-card">
                            <div className="flux-diagnostic-header">
                              <div>
                                <h3 className="flux-diagnostic-title">Predicted Envelope Heat Loss Flux Breakdown</h3>
                                <p className="flux-diagnostic-sub">
                                  Quantified thermal flux distribution across envelope components under steady-state simulation.
                                </p>
                              </div>
                              <div className="total-flux-badge mono">
                                <span className="total-flux-label">TOTAL BUILDING FLUX</span>
                                <span className="total-flux-val">{totalW.toLocaleString()} W</span>
                              </div>
                            </div>

                            {/* Proportional Stacked Spectrum Bar */}
                            <div className="stacked-flux-bar" title="Building Heat Loss Distribution (100%)">
                              {fluxEntries.map(([k, v]) => {
                                const pct = (v / totalW) * 100;
                                const meta = FLUX_META[k] || { label: k, color: '#64748B' };
                                return (
                                  <div
                                    key={k}
                                    className="stacked-flux-segment"
                                    style={{
                                      width: `${Math.max(1, pct)}%`,
                                      backgroundColor: meta.color,
                                    }}
                                    title={`${meta.label}: ${v.toFixed(1)} W (${pct.toFixed(1)}%)`}
                                  />
                                );
                              })}
                            </div>

                            {/* Detail Component Rows */}
                            <div className="flux-components-grid">
                              {fluxEntries.map(([k, v]) => {
                                const pct = ((v / totalW) * 100).toFixed(1);
                                const meta = FLUX_META[k] || {
                                  label: k.replace(/_/g, ' ').replace(' W', ''),
                                  sub: 'Thermodynamic loss component',
                                  color: '#64748B',
                                };
                                const isDominant = k.toLowerCase().includes(aiResponse.predictions.dominant_heat_loss.toLowerCase());

                                return (
                                  <div key={k} className={`flux-item-row ${isDominant ? 'is-dominant-loss' : ''}`}>
                                    <div className="flux-item-indicator" style={{ backgroundColor: meta.color }} />
                                    <div className="flux-item-info">
                                      <div className="flux-item-name-row">
                                        <span className="flux-item-label">{meta.label}</span>
                                        {isDominant && <span className="bottleneck-chip">PRIMARY BOTTLENECK</span>}
                                      </div>
                                      <span className="flux-item-sub">{meta.sub}</span>
                                    </div>

                                    <div className="flux-item-track-box">
                                      <div className="flux-item-track">
                                        <div
                                          className="flux-item-fill"
                                          style={{
                                            width: `${Math.min(100, Math.max(3, pct))}%`,
                                            backgroundColor: meta.color,
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div className="flux-item-numbers">
                                      <span className="flux-item-watts mono">{v.toFixed(1)} W</span>
                                      <span className="flux-item-pct mono">{pct}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Natural Synthesized Engineering Narrative */}
                      {aiResponse.answer && (
                        <div className="diagnostic-narrative-card">
                          <div className="narrative-card-header">
                            <span className="narrative-tag">EXECUTIVE BUILDING PHYSICS ASSESSMENT</span>
                            <span className="narrative-engine-meta mono">
                              {aiResponse.engine ? `Grounding: ${aiResponse.engine}` : 'Grounding: 5 ML Surrogates (Decision Tree, RF, GBDT, MLP, CatBoost)'}
                            </span>
                          </div>

                          <div className="narrative-body-content">
                            <RenderDiagnosticAnswer text={aiResponse.answer} />
                          </div>
                        </div>
                      )}

                      {/* Actionable Engineering Recommendations */}
                      {aiResponse.recommendations && aiResponse.recommendations.length > 0 && (
                        <div className="diagnostic-recommendations-card">
                          <div className="recommendations-header">
                            <h4 className="recommendations-title">Verified High-Altitude Engineering Directives</h4>
                            <span className="recommendations-sub">Priority interventions ordered by expected passive thermal gain</span>
                          </div>

                          <div className="recommendations-grid">
                            {aiResponse.recommendations.map((rec, rIdx) => (
                              <div key={rIdx} className="recommendation-card-item">
                                <div className="rec-number-box mono">#{rIdx + 1}</div>
                                <div className="rec-text-box">
                                  <p className="rec-text-paragraph">{rec}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Official Source Document Traceability */}
                      <div className="citations-container">
                        <div className="citations-title">Official Scientific Dataset Traceability</div>
                        <div className="citations-list">
                          <div className="citation-pill">
                            <strong>master_timeseries.csv</strong>
                            <span>· 120,000 Hourly Timesteps</span>
                            <span>· DRDO PS 26051 Benchmark</span>
                          </div>
                          <div className="citation-pill">
                            <strong>locations.csv</strong>
                            <span>· 39 Himalayan Scenario Sites</span>
                          </div>
                          <div className="citation-pill">
                            <strong>materials.csv</strong>
                            <span>· 102 Envelope Materials</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
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
