/*
 * ParetoPlot.jsx — Phase S4
 * Multi-objective trade-off scatter plot: Capital Cost (₹) vs Comfort Hours Ratio (%).
 *
 * Requirements:
 *   - Scatter plot in Recharts
 *   - Non-dominated Pareto frontier highlighted in --comfort
 *   - Top-3 designs marked with distinct badge markers
 *   - Strictly token colors — zero hardcoded hex colors
 */
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

function formatCost(val) {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return `₹${Math.round(val).toLocaleString()}`;
}

function formatComfort(val) {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return `${Math.round(val * 100)}%`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0].payload;

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
      maxWidth: 220,
    }}>
      <div style={{ fontWeight: 600, color: pt.rank ? 'var(--solar)' : 'var(--text-primary)', marginBottom: 4 }}>
        {pt.rank ? `Rank #${pt.rank} — ${pt.name}` : pt.name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: 'var(--text-muted)' }}>Cost:</span>
        <span>{formatCost(pt.cost_inr)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: 'var(--text-muted)' }}>Comfort:</span>
        <span style={{ color: 'var(--comfort)', fontWeight: 600 }}>{formatComfort(pt.comfort_hours_ratio)}</span>
      </div>
      {pt.is_pareto && (
        <div style={{ color: 'var(--comfort)', fontSize: 10, marginTop: 4 }}>
          ✓ On Pareto Frontier
        </div>
      )}
    </div>
  );
}

// Generate realistic 120-point search space if no data provided
const SAMPLE_PARETO_POINTS = (() => {
  const pts = [];
  // Baseline
  pts.push({ id: 'base', name: 'Baseline Shelter', cost_inr: 280000, comfort_hours_ratio: 0.21, is_pareto: false, rank: null });
  // Top 3
  pts.push({ id: 'top1', name: 'Leh Passive Solar 1', cost_inr: 345000, comfort_hours_ratio: 0.88, is_pareto: true, rank: 1 });
  pts.push({ id: 'top2', name: 'Direct-Gain Superinsulated', cost_inr: 385000, comfort_hours_ratio: 0.94, is_pareto: true, rank: 2 });
  pts.push({ id: 'top3', name: 'Low-Cost Rammed Earth', cost_inr: 215000, comfort_hours_ratio: 0.64, is_pareto: true, rank: 3 });

  // Additional Pareto front points
  pts.push({ id: 'p1', name: 'Candidate 104', cost_inr: 180000, comfort_hours_ratio: 0.45, is_pareto: true, rank: null });
  pts.push({ id: 'p2', name: 'Candidate 329', cost_inr: 260000, comfort_hours_ratio: 0.76, is_pareto: true, rank: null });
  pts.push({ id: 'p3', name: 'Candidate 891', cost_inr: 310000, comfort_hours_ratio: 0.82, is_pareto: true, rank: null });
  pts.push({ id: 'p4', name: 'Candidate 1402', cost_inr: 420000, comfort_hours_ratio: 0.96, is_pareto: true, rank: null });

  // Dominated candidates
  for (let i = 1; i <= 35; i++) {
    const cost = 190000 + i * 6500 + ((i * 37) % 25000);
    const comfort = Math.max(0.15, Math.min(0.85, 0.20 + (cost - 190000) / 400000 - ((i % 5) * 0.05)));
    pts.push({
      id: `c_${i}`,
      name: `Design Variant #${i * 47}`,
      cost_inr: cost,
      comfort_hours_ratio: comfort,
      is_pareto: false,
      rank: null,
    });
  }
  return pts;
})();

export default function ParetoPlot({ points = SAMPLE_PARETO_POINTS, onSelectDesign }) {
  const data = points && points.length > 0 ? points : SAMPLE_PARETO_POINTS;

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
            Pareto Optimization Frontier
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            Cost (₹) vs Comfort Hours Ratio (%) · Non-dominated designs highlighted · Top-3 marked
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
          Multi-Objective
        </div>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            {/* 80% Comfort target reference line */}
            <ReferenceLine
              y={0.80}
              stroke="var(--comfort)"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: '80% Comfort Target',
                position: 'insideBottomRight',
                fill: 'var(--comfort)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
            />

            <XAxis
              type="number"
              dataKey="cost_inr"
              name="Cost"
              domain={['dataMin - 15000', 'dataMax + 15000']}
              tickFormatter={c => `₹${Math.round(c / 1000)}k`}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              type="number"
              dataKey="comfort_hours_ratio"
              name="Comfort"
              domain={[0, 1]}
              tickFormatter={c => `${Math.round(c * 100)}%`}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Scatter
              name="Shelter Designs"
              data={data}
              isAnimationActive={false}
              onClick={(pt) => onSelectDesign && onSelectDesign(pt)}
              style={{ cursor: 'pointer' }}
            >
              {data.map((entry, index) => {
                let fill = 'var(--text-muted)';
                let opacity = 0.35;
                let stroke = 'none';

                if (entry.rank === 1) {
                  fill = 'var(--solar)';
                  opacity = 1.0;
                  stroke = 'var(--text-primary)';
                } else if (entry.rank === 2 || entry.rank === 3) {
                  fill = 'var(--accent)';
                  opacity = 0.95;
                  stroke = 'var(--text-primary)';
                } else if (entry.is_pareto) {
                  fill = 'var(--comfort)';
                  opacity = 0.85;
                }

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fill}
                    fillOpacity={opacity}
                    stroke={stroke}
                    strokeWidth={entry.rank ? 1.5 : 0}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Pareto Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        paddingTop: 6,
        borderTop: 'var(--border-width) solid var(--border)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--solar)' }} />
          <span>Rank #1 (Best Trade-off)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
          <span>Top-3 Recommended</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--comfort)' }} />
          <span>Pareto Frontier</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5 }} />
          <span>Evaluated Designs</span>
        </div>
      </div>
    </div>
  );
}
