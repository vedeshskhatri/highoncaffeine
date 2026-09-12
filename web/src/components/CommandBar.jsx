import React, { useState, useRef, useEffect, useCallback } from 'react';
import { parseCommand } from '../lib/commandParser.js';
import './CommandBar.css';

/**
 * CommandBar.jsx — Integrated header search and field command prompt.
 * Seamlessly parses natural deterministic commands or searches presets.
 * Fully offline, zero LLM, strictly token colors.
 *
 * Props:
 *  - context: { sitePresets, materialIds, materials }
 *  - onCommand: (action) => void
 */
export default function CommandBar({ context = {}, onCommand }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [feedback, setFeedback] = useState('');
  const [animating, setAnimating] = useState(null); // 'shake' | 'pulse' | null
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Global hotkey: press '/' or 'Ctrl+K' / 'Cmd+K' to focus command bar when not inside another input
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && document.activeElement !== inputRef.current;

      if (isCmdK || isSlash) {
        const tagName = document.activeElement?.tagName?.toLowerCase();
        if (tagName !== 'input' && tagName !== 'textarea' && !document.activeElement?.isContentEditable) {
          e.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault?.();
    const raw = query.trim();
    if (!raw) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const action = parseCommand(raw, context);

    if (action) {
      // 1. Successful match
      let msg = 'Command executed';
      if (action.type === 'NAVIGATE_STEP') {
        if (action.step === 'validation panel toggle') {
          msg = 'Switched to Simulation · Validation panel opened';
        } else {
          const stepName = action.step.charAt(0).toUpperCase() + action.step.slice(1);
          msg = `Switched to ${stepName}`;
        }
      } else if (action.type === 'SET_SITE_AND_NAVIGATE') {
        msg = `Switched to Simulation · ${action.site.label} site set`;
      } else if (action.type === 'SET_SITE_AND_MATERIAL_AND_NAVIGATE') {
        const matLabel = action.material.name || action.material.id;
        msg = `Switched to Simulation · ${action.site.label} set · ${matLabel} walls set`;
      } else if (action.type === 'COMPARE_MATERIALS') {
        const matA = action.materialA.name || action.materialA.id;
        const matB = action.materialB.name || action.materialB.id;
        msg = `Comparing ${matA} vs ${matB} · Design comparison active`;
      } else if (action.type === 'START_DEMO') {
        msg = 'Launched 8-Stage Operational Demo Mode';
      } else if (action.type === 'EXIT_DEMO') {
        msg = 'Exited Demo Mode · Switched to Studio';
      }

      setStatus('success');
      setFeedback(msg);
      setAnimating('pulse');
      setQuery('');

      if (typeof onCommand === 'function') {
        onCommand(action);
      }

      // Reset animation state after ~380ms
      setTimeout(() => setAnimating(null), 380);

      // Auto-hide feedback after 4.5 seconds
      timerRef.current = setTimeout(() => {
        setFeedback('');
        setStatus('idle');
      }, 4500);
    } else {
      // 2. Unrecognized / Ambiguous command
      setStatus('error');
      setFeedback(`Unrecognized: "${raw}" — try 'simulate Leh', 'compare mud brick vs eps', 'go to optimize'`);
      setAnimating('shake');

      setTimeout(() => setAnimating(null), 340);

      timerRef.current = setTimeout(() => {
        setFeedback('');
        setStatus('idle');
      }, 5000);
    }
  }, [query, context, onCommand]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setFeedback('');
      setStatus('idle');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="topbar-command-bar" role="search" aria-label="Terminal command bar">
      <form onSubmit={handleSubmit} className="command-bar-form">
        <div
          className={`command-bar-main ${
            animating === 'shake' ? 'shake' : animating === 'pulse' ? 'success-pulse' : ''
          }`}
        >
          <span className="command-bar-prompt" aria-hidden="true">⌘</span>
          <input
            ref={inputRef}
            type="text"
            id="terminal-command-input"
            className="command-bar-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or command (e.g. simulate Ladakh)..."
            autoComplete="off"
            spellCheck="false"
            aria-label="Type command"
          />
          {query.trim() ? (
            <button
              type="submit"
              className="command-bar-submit-btn"
              title="Press Enter to execute command"
              aria-label="Execute command"
            >
              ↵
            </button>
          ) : (
            <kbd className="command-bar-kbd">/</kbd>
          )}
        </div>
      </form>

      {feedback && (
        <div
          className={`command-bar-feedback-floating ${status}`}
          role="status"
          aria-live="polite"
          title={feedback}
        >
          <span className="command-bar-feedback-dot" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
