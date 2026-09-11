/*
 * DeltaDesignChart.jsx — Phase S4
 * Differential thermal performance between Design B (Optimized) and Design A (Baseline).
 * t_in(B) − t_in(A) with zero baseline, shaded above (positive gain) and below.
 *
 * Strictly token colors — zero hardcoded hex colors.
 */
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

function formatDelta(val) {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)} °C`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  const isGain = val >= 0;

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: 'var(--border-width) solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--space-2)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-caption-size)',
      color: 'var(--text-primary)',
      boxShadow: '0 4px 12px var(--bg-base)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>
        Hour {String(label).padStart(2, '0')}:00
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: isGain ? 'var(--comfort)' : 'var(--danger)' }}>
          {isGain ? 'Thermal Gain:' : 'Thermal Deficit:'}
        </span>
        <span style={{ fontWeight: 600 }}>{formatDelta(val)}</span>
      </div>
    </div>
  );
}

export default function DeltaDesignChart({
  series = [],
  baselineSeries = [],
  designAName = 'Baseline Design',
  designBName = 'Optimized Design',
}) {
  // Compute difference series
  const data = (series && series.length > 0 ? series : []).map((pt, i) => {
    const basePt = baselineSeries[i];
    const tB = typeof pt?.t_in === 'number' ? pt.t_in : null;
    const tA = typeof basePt?.t_in === 'number' ? basePt.t_in : null;
    const diff = (tB != null && tA != null) ? tB - tA : 0;

    return {
      hour: pt.hour,
      diff: diff,
      positive_diff: diff > 0 ? diff : 0,
      negative_diff: diff < 0 ? diff : 0,
    };
  });

  if (data.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: 220,
        background: 'var(--surface-1)',
        border: 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-caption-size)',
        color: 'var(--text-muted)',
      }}>
        No differential design data available
      </div>
    );
  }

  const values = data.map(d => d.diff);
  const maxDiff = Math.max(...values, 2);
  const minDiff = Math.min(...values, -1);
  const yMax = Math.ceil((maxDiff + 1));
  const yMin = Math.floor((minDiff - 1));

  return (
    <div style={{
      width: '100%',
      background: 'var(--surface-1)',
      border: 'var(--border-width) solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-subhead-size)',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Differential Lift: {designBName} vs {designAName}
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            t_in(B) − t_in(A) · Shaded green above zero baseline (passive improvement)
          </p>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--comfort)',
          background: 'var(--surface-2)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
        }}>
          ΔDesign
        </div>
      </div>

      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--comfort)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--comfort)" stopOpacity={0.08} />
              </linearGradient>
            </defs>

            {/* Zero baseline */}
            <ReferenceLine
              y={0}
              stroke="var(--border-strong)"
              strokeWidth={1.5}
              label={{
                value: 'Baseline',
                position: 'left',
                fill: 'var(--text-muted)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
            />

            <XAxis
              dataKey="hour"
              tickFormatter={h => `${String(h).padStart(2, '0')}:00`}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}°`}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              name="ΔT vs Baseline"
              type="monotone"
              dataKey="diff"
              stroke="var(--comfort)"
              strokeWidth={2}
              fill="url(#gainGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
