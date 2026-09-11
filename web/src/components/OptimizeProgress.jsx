/*
 * OptimizeProgress.jsx — Phase S4
 * Theatrical multi-stage progress display during optimizer execution.
 *
 * Requirements:
 *   - Progress text: "Evaluating 3,200 designs…"
 *   - NOT a generic spinner. This pause is the demo's most theatrical moment and
 *     the text is part of the performance.
 *   - Strictly token colors — zero hardcoded hex colors.
 */
import { useState, useEffect } from 'react';

const OPTIMIZE_STAGES = [
  { text: 'Generating 3,200 candidate envelope permutations...', pct: 15 },
  { text: 'Evaluating 3,200 designs…', pct: 45 },
  { text: 'Solving 5R1C thermal network matrices at 3,500 m altitude...', pct: 75 },
  { text: 'Extracting non-dominated Pareto frontier & ranking top 3...', pct: 92 },
  { text: 'Optimization complete. Rendering Pareto trade-offs.', pct: 100 },
];

export default function OptimizeProgress({ onComplete, totalDesigns = 3200 }) {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStageIdx(1), 700);
    const timer2 = setTimeout(() => setStageIdx(2), 1600);
    const timer3 = setTimeout(() => setStageIdx(3), 2600);
    const timer4 = setTimeout(() => {
      setStageIdx(4);
      if (onComplete) onComplete();
    }, 3400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  const currentStage = OPTIMIZE_STAGES[stageIdx];

  return (
    <div style={{
      width: '100%',
      maxWidth: 600,
      margin: '60px auto',
      background: 'var(--surface-1)',
      border: 'var(--border-width) solid var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      boxShadow: '0 8px 32px var(--bg-base)',
      textAlign: 'center',
    }}>
      {/* Prominent Stage Callout */}
      <div style={{
        display: 'inline-block',
        alignSelf: 'center',
        background: 'var(--surface-2)',
        border: 'var(--border-width) solid var(--solar)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px 12px',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-caption-size)',
        color: 'var(--solar)',
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}>
        VECTORIZED OPTIMIZER ACTIVE
      </div>

      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-title-size)',
        color: 'var(--text-primary)',
        margin: 0,
      }}>
        Evaluating {totalDesigns.toLocaleString()} designs…
      </h3>

      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-caption-size)',
        color: 'var(--text-secondary)',
        minHeight: 24,
        margin: 0,
      }}>
        {currentStage.text}
      </p>

      {/* Progressive Bar */}
      <div style={{
        width: '100%',
        height: 8,
        background: 'var(--surface-2)',
        borderRadius: 4,
        overflow: 'hidden',
        border: 'var(--border-width) solid var(--border)',
      }}>
        <div style={{
          width: `${currentStage.pct}%`,
          height: '100%',
          background: 'var(--solar)',
          transition: 'width 0.4s ease-out',
        }} />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-muted)',
      }}>
        <span>Parallel Matrix Batch Solver</span>
        <span>{currentStage.pct}%</span>
      </div>
    </div>
  );
}
