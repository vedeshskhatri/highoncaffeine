/*
 * TempChart.jsx — Phase S4
 * Indoor and outdoor temperature profiles across the 24-hour simulation cycle.
 *
 * Features:
 *   - Indoor (t_in) and Outdoor (t_out) series
 *   - Shaded comfort band in --comfort at low opacity (18 °C to 24 °C)
 *   - Shaded region below health threshold (18.0 °C) in --danger at low opacity
 *   - Uncertainty band between t_in_lo and t_in_hi (shaded area)
 *   - Hour axis 0–23 (formatted as 00:00 .. 23:00)
 *   - Strictly token colors — zero hardcoded hex colors
 *   - Safe formatting: NaN or undefined displays em-dash (—)
 */
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

function formatTemp(val) {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return `${val.toFixed(1)} °C`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

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
      {payload.map((entry) => {
        if (entry.dataKey === 'uncertainty_base') return null;
        let color = entry.color;
        let labelName = entry.name;
        if (entry.dataKey === 'uncertainty_span') {
          color = 'var(--text-muted)';
          labelName = 'Uncertainty (±)';
        }
        return (
          <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color }}>{labelName}:</span>
            <span>{formatTemp(entry.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function TempChart({ series = [] }) {
  // Safe fallback if series is empty
  const data = (series && series.length > 0 ? series : []).map(pt => ({
    hour: pt.hour,
    t_in: typeof pt.t_in === 'number' && !isNaN(pt.t_in) ? pt.t_in : null,
    t_out: typeof pt.t_out === 'number' && !isNaN(pt.t_out) ? pt.t_out : null,
    t_operative: typeof pt.t_operative === 'number' && !isNaN(pt.t_operative) ? pt.t_operative : null,
    t_in_lo: typeof pt.t_in_lo === 'number' && !isNaN(pt.t_in_lo) ? pt.t_in_lo : null,
    t_in_hi: typeof pt.t_in_hi === 'number' && !isNaN(pt.t_in_hi) ? pt.t_in_hi : null,
    uncertainty_base: typeof pt.t_in_lo === 'number' ? pt.t_in_lo : (pt.t_in != null ? pt.t_in - 1 : null),
    uncertainty_span: (typeof pt.t_in_hi === 'number' && typeof pt.t_in_lo === 'number')
      ? Math.max(0, pt.t_in_hi - pt.t_in_lo)
      : (pt.t_in != null ? 2.0 : null),
  }));

  if (data.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: 280,
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
        No temperature series data available — run simulation first
      </div>
    );
  }

  // Calculate dynamic domain
  const allTemps = data.flatMap(d => [d.t_in, d.t_out, d.t_in_lo, d.t_in_hi].filter(v => typeof v === 'number'));
  const minTemp = allTemps.length ? Math.min(...allTemps, 15) : -25;
  const maxTemp = allTemps.length ? Math.max(...allTemps, 25) : 30;
  const yMin = Math.floor((minTemp - 3) / 5) * 5;
  const yMax = Math.ceil((maxTemp + 3) / 5) * 5;

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
            Diurnal Temperature Profile (24 Hours)
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            Indoor vs Outdoor ambient · Comfort band (18–24 °C) · Health threshold 18.0 °C
          </p>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--solar)',
          background: 'var(--surface-2)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
        }}>
          ISO 52016-1 5R1C
        </div>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            {/* Shaded Health Danger Zone (< 18 °C) */}
            <ReferenceArea
              y1={yMin}
              y2={18.0}
              fill="var(--danger)"
              fillOpacity={0.08}
              stroke="none"
            />

            {/* Shaded Comfort Band (18 °C to 24 °C) */}
            <ReferenceArea
              y1={18.0}
              y2={24.0}
              fill="var(--comfort)"
              fillOpacity={0.12}
              stroke="none"
            />

            {/* Health threshold reference line (18.0 °C) */}
            <ReferenceLine
              y={18.0}
              stroke="var(--danger)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Health 18 °C',
                position: 'right',
                fill: 'var(--danger)',
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
              tickFormatter={t => `${t}°`}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                paddingTop: '8px',
              }}
            />

            {/* Uncertainty band stacked area */}
            <Area
              dataKey="uncertainty_base"
              stackId="uncertainty"
              fill="transparent"
              stroke="none"
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              name="Uncertainty (t_in_lo .. t_in_hi)"
              dataKey="uncertainty_span"
              stackId="uncertainty"
              fill="var(--accent)"
              fillOpacity={0.15}
              stroke="none"
              legendType="none"
              isAnimationActive={false}
            />

            {/* Ambient outdoor line */}
            <Line
              name="Ambient (t_out)"
              type="monotone"
              dataKey="t_out"
              stroke="var(--text-muted)"
              strokeWidth={1.8}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />

            {/* Operative temperature (if present) */}
            <Line
              name="Operative (t_op)"
              type="monotone"
              dataKey="t_operative"
              stroke="var(--solar)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Indoor temperature line */}
            <Line
              name="Indoor (t_in)"
              type="monotone"
              dataKey="t_in"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ r: 2, fill: 'var(--accent)' }}
              activeDot={{ r: 5, fill: 'var(--accent)' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
