import { useState, useEffect, useRef } from 'react';

const OPTIMIZE_STAGES = [
  { text: 'Generating 3,200 candidate envelope permutations...', pct: 15 },
  { text: 'Evaluating 3,200 designs…', pct: 45 },
  { text: 'Solving 5R1C thermal network matrices at 3,500 m altitude...', pct: 75 },
  { text: 'Extracting non-dominated Pareto frontier & ranking top 3...', pct: 92 },
  { text: 'Optimization complete. Rendering Pareto trade-offs.', pct: 100 },
];

export default function OptimizeProgress({ onComplete, totalDesigns = 3200 }) {
  const [stageIdx, setStageIdx] = useState(0);
  const [animatedCount, setAnimatedCount] = useState(0);
  const [elapsed, setElapsed] = useState('0.0');

  const mountTimeRef = useRef(Date.now());
  const rafRef = useRef(null);
  const tickerStartRef = useRef(null);

  // Live ticker: during stage 1, animate counter from 0 to totalDesigns over ~2400ms using requestAnimationFrame (ease-out cubic)
  useEffect(() => {
    const duration = 2400;
    const startVal = 0;
    const endVal = totalDesigns;

    function step(timestamp) {
      if (!tickerStartRef.current) tickerStartRef.current = timestamp;
      const elapsedMs = timestamp - tickerStartRef.current;
      const progress = Math.min(elapsedMs / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedCount(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [totalDesigns]);

  // Stage progression timers matching the specified theatrical timing
  useEffect(() => {
    const timer1 = setTimeout(() => setStageIdx(1), 700);
    const timer2 = setTimeout(() => setStageIdx(2), 1600);
    const timer3 = setTimeout(() => setStageIdx(3), 2600);
    const timer4 = setTimeout(() => {
      setStageIdx(4);
      setElapsed(((Date.now() - mountTimeRef.current) / 1000).toFixed(1));
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

  // Stage label heading logic:
  // Stage 4 (complete): "Complete — {totalDesigns.toLocaleString()} designs evaluated in {elapsed}s"
  // Otherwise: "Evaluating {animatedCount.toLocaleString()} / {totalDesigns.toLocaleString()} designs"
  const headingText = stageIdx === 4
    ? `Complete — ${totalDesigns.toLocaleString()} designs evaluated in ${elapsed}s`
    : `Evaluating ${animatedCount.toLocaleString()} / ${totalDesigns.toLocaleString()} designs`;

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
      <style>{`
        @keyframes therma-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

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
        {headingText}
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
          background: stageIdx === 4
            ? 'var(--comfort)'
            : 'linear-gradient(90deg, var(--solar) 25%, var(--accent) 50%, var(--solar) 75%)',
          backgroundSize: stageIdx === 4 ? '100% 100%' : '200% 100%',
          animation: stageIdx === 4 ? 'none' : 'therma-shimmer 1.8s linear infinite',
          transition: 'width 600ms ease-out',
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
