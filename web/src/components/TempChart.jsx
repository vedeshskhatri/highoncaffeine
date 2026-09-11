/*
 * TempChart.jsx — Phase 8: Scientific Visualization (Part A: 24-Hour Thermal Story)
 *
 * Requirements:
 *   - Visualize actual simulation time-series data from API
 *   - Lines: outdoor temperature [°C], indoor temperature [°C], comfort band [°C],
 *     solar gain [W], heating demand [W]
 *   - Only render a series if it exists in the API payload
 *   - Strict non-fabrication rule: DO NOT reconstruct missing series from final scalar values
 *   - Clearly label all units on axes, legends, and tooltips
 *   - Interactive series toggles with disabled indicators for missing series
 *   - Strictly token colors — zero hardcoded hex colors
 */
import { useState, useMemo } from 'react';
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

function formatPower(val, unit = 'W') {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return `${val.toFixed(0)} ${unit}`;
}

function CustomThermalTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: 'var(--border-width) solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--space-2) var(--space-3)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-caption-size)',
      color: 'var(--text-primary)',
      boxShadow: '0 4px 12px var(--bg-base)',
      minWidth: 180,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
        Hour {String(label).padStart(2, '0')}:00
      </div>
      {payload.map((entry) => {
        if (entry.dataKey === 'comfort_base') return null;
        let color = entry.color;
        let labelName = entry.name;
        let formatted = formatTemp(entry.value);

        if (entry.dataKey === 'comfort_span') {
          color = 'var(--comfort)';
          labelName = 'Comfort Band';
          const lo = entry.payload.t_in_lo;
          const hi = entry.payload.t_in_hi;
          formatted = `${lo?.toFixed(1)} – ${hi?.toFixed(1)} °C`;
        } else if (entry.dataKey === 'solar_gain_w') {
          formatted = formatPower(entry.value, 'W');
        } else if (entry.dataKey === 'ghi') {
          formatted = formatPower(entry.value, 'W/m²');
        } else if (entry.dataKey === 'heating_demand_w') {
          formatted = formatPower(entry.value, 'W');
        }

        return (
          <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '2px 0' }}>
            <span style={{ color }}>{labelName}:</span>
            <span style={{ fontWeight: 600 }}>{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function TempChart({ series = [] }) {
  // Detect available series in API data (strictly no reconstruction)
  const availability = useMemo(() => {
    if (!series || series.length === 0) {
      return {
        hasIndoor: false,
        hasOutdoor: false,
        hasOperative: false,
        hasComfortBand: false,
        hasSolarGain: false,
        hasGhi: false,
        hasHeatingDemand: false,
      };
    }

    return {
      hasIndoor: series.some(pt => typeof pt.t_in === 'number' && !isNaN(pt.t_in)),
      hasOutdoor: series.some(pt => typeof pt.t_out === 'number' && !isNaN(pt.t_out)),
      hasOperative: series.some(pt => typeof pt.t_operative === 'number' && !isNaN(pt.t_operative)),
      hasComfortBand: series.some(pt => typeof pt.t_in_lo === 'number' && typeof pt.t_in_hi === 'number' && !isNaN(pt.t_in_lo) && !isNaN(pt.t_in_hi)),
      hasSolarGain: series.some(pt => typeof pt.solar_gain_w === 'number' && !isNaN(pt.solar_gain_w)),
      hasGhi: series.some(pt => typeof pt.ghi === 'number' && !isNaN(pt.ghi)),
      hasHeatingDemand: series.some(pt => typeof pt.heating_demand_w === 'number' && !isNaN(pt.heating_demand_w)),
    };
  }, [series]);

  // Series visibility toggles (defaults to visible if available)
  const [visibleLines, setVisibleLines] = useState({
    indoor: true,
    outdoor: true,
    operative: true,
    comfortBand: true,
    solarGain: true,
    heatingDemand: true,
  });

  const toggleLine = (key) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Safe data mapping adhering to non-fabrication rule
  const data = useMemo(() => {
    if (!series || series.length === 0) return [];

    return series.map(pt => {
      const row = {
        hour: pt.hour,
      };

      if (typeof pt.t_in === 'number' && !isNaN(pt.t_in)) row.t_in = pt.t_in;
      if (typeof pt.t_out === 'number' && !isNaN(pt.t_out)) row.t_out = pt.t_out;
      if (typeof pt.t_operative === 'number' && !isNaN(pt.t_operative)) row.t_operative = pt.t_operative;

      // Only compute comfort span if BOTH bounds genuinely exist
      if (typeof pt.t_in_lo === 'number' && typeof pt.t_in_hi === 'number' && !isNaN(pt.t_in_lo) && !isNaN(pt.t_in_hi)) {
        row.t_in_lo = pt.t_in_lo;
        row.t_in_hi = pt.t_in_hi;
        row.comfort_base = pt.t_in_lo;
        row.comfort_span = Math.max(0, pt.t_in_hi - pt.t_in_lo);
      }

      if (typeof pt.solar_gain_w === 'number' && !isNaN(pt.solar_gain_w)) {
        row.solar_gain_w = pt.solar_gain_w;
      } else if (typeof pt.ghi === 'number' && !isNaN(pt.ghi)) {
        row.ghi = pt.ghi;
      }

      if (typeof pt.heating_demand_w === 'number' && !isNaN(pt.heating_demand_w)) {
        row.heating_demand_w = pt.heating_demand_w;
      }

      return row;
    });
  }, [series]);

  if (data.length === 0) {
    return (
      <div
        id="temp-chart-empty"
        style={{
          width: '100%',
          height: 280,
          background: 'var(--surface-1)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-1)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-caption-size)',
          color: 'var(--text-muted)',
          padding: 'var(--space-3)',
        }}
      >
        <span style={{ fontSize: '18px' }}>📊</span>
        <span>No temperature series data available — run simulation first</span>
      </div>
    );
  }

  // Calculate dynamic temperature domain from available temperature series
  const allTemps = data.flatMap(d => [d.t_in, d.t_out, d.t_operative, d.t_in_lo, d.t_in_hi].filter(v => typeof v === 'number'));
  const minTemp = allTemps.length ? Math.min(...allTemps, 15) : -25;
  const maxTemp = allTemps.length ? Math.max(...allTemps, 25) : 30;
  const yTempMin = Math.floor((minTemp - 3) / 5) * 5;
  const yTempMax = Math.ceil((maxTemp + 3) / 5) * 5;

  // Calculate dynamic power domain (W) if solar or heating demand present
  const allPower = data.flatMap(d => [d.solar_gain_w, d.heating_demand_w, d.ghi].filter(v => typeof v === 'number'));
  const maxPower = allPower.length ? Math.max(...allPower, 500) : 1000;
  const yPowerMax = Math.ceil((maxPower * 1.15) / 200) * 200;

  const hasSecondaryAxis = (availability.hasSolarGain || availability.hasGhi || availability.hasHeatingDemand) &&
    (visibleLines.solarGain || visibleLines.heatingDemand);

  return (
    <div
      id="temp-chart-container"
      style={{
        width: '100%',
        background: 'var(--surface-1)',
        border: 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-subhead-size)',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            24-Hour Diurnal Thermal Story
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            Authoritative simulation time-series: Indoor [°C], Outdoor [°C], IMAC Band [°C], Solar [W], Deficit [W]
          </p>
        </div>

        {/* Legend / Series Toggle Badges */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-1)',
          alignItems: 'center',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
        }}>
          {availability.hasIndoor && (
            <button
              onClick={() => toggleLine('indoor')}
              style={{
                background: visibleLines.indoor ? 'var(--accent)' : 'transparent',
                color: visibleLines.indoor ? 'var(--bg-base)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              T_in [°C]
            </button>
          )}

          {availability.hasOutdoor && (
            <button
              onClick={() => toggleLine('outdoor')}
              style={{
                background: visibleLines.outdoor ? 'var(--surface-3)' : 'transparent',
                color: visibleLines.outdoor ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              T_out [°C]
            </button>
          )}

          {availability.hasComfortBand && (
            <button
              onClick={() => toggleLine('comfortBand')}
              style={{
                background: visibleLines.comfortBand ? 'var(--comfort-soft)' : 'transparent',
                color: visibleLines.comfortBand ? 'var(--comfort)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Comfort Band [°C]
            </button>
          )}

          {(availability.hasSolarGain || availability.hasGhi) && (
            <button
              onClick={() => toggleLine('solarGain')}
              style={{
                background: visibleLines.solarGain ? 'var(--solar-soft)' : 'transparent',
                color: visibleLines.solarGain ? 'var(--solar)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {availability.hasSolarGain ? 'Solar [W]' : 'GHI [W/m²]'}
            </button>
          )}

          {availability.hasHeatingDemand && (
            <button
              onClick={() => toggleLine('heatingDemand')}
              style={{
                background: visibleLines.heatingDemand ? 'var(--danger-soft)' : 'transparent',
                color: visibleLines.heatingDemand ? 'var(--danger)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Heating Req [W]
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: hasSecondaryAxis ? 35 : 15, left: -5, bottom: 0 }}>
            {/* Health threshold reference line (15.0 °C / 18.0 °C) */}
            <ReferenceLine
              y={15.0}
              yAxisId="left"
              stroke="var(--danger)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Health 15 °C',
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

            {/* Primary Left Y-Axis: Temperature [°C] */}
            <YAxis
              yAxisId="left"
              domain={[yTempMin, yTempMax]}
              tickFormatter={t => `${t} °C`}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />

            {/* Optional Right Y-Axis: Power / Solar Flux [W] */}
            {hasSecondaryAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, yPowerMax]}
                tickFormatter={w => `${w} W`}
                tick={{ fill: 'var(--solar)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
              />
            )}

            <Tooltip content={<CustomThermalTooltip />} />

            <Legend
              wrapperStyle={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                paddingTop: '8px',
              }}
            />

            {/* Comfort band stacked area (rendered strictly if present) */}
            {availability.hasComfortBand && visibleLines.comfortBand && (
              <>
                <Area
                  yAxisId="left"
                  dataKey="comfort_base"
                  stackId="comfort"
                  fill="transparent"
                  stroke="none"
                  legendType="none"
                  isAnimationActive={false}
                />
                <Area
                  yAxisId="left"
                  name="Comfort Band (t_lo .. t_hi) [°C]"
                  dataKey="comfort_span"
                  stackId="comfort"
                  fill="var(--comfort)"
                  fillOpacity={0.15}
                  stroke="none"
                  legendType="square"
                  isAnimationActive={false}
                />
              </>
            )}

            {/* Ambient outdoor line */}
            {availability.hasOutdoor && visibleLines.outdoor && (
              <Line
                yAxisId="left"
                name="Ambient (t_out) [°C]"
                type="monotone"
                dataKey="t_out"
                stroke="var(--text-muted)"
                strokeWidth={1.8}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Operative temperature line */}
            {availability.hasOperative && visibleLines.operative && (
              <Line
                yAxisId="left"
                name="Operative (t_op) [°C]"
                type="monotone"
                dataKey="t_operative"
                stroke="var(--solar)"
                strokeWidth={1.2}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Indoor temperature line */}
            {availability.hasIndoor && visibleLines.indoor && (
              <Line
                yAxisId="left"
                name="Indoor Air (t_in) [°C]"
                type="monotone"
                dataKey="t_in"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ r: 2, fill: 'var(--accent)' }}
                activeDot={{ r: 5, fill: 'var(--accent)' }}
                isAnimationActive={false}
              />
            )}

            {/* Solar aperture flux line on secondary axis */}
            {(availability.hasSolarGain || availability.hasGhi) && visibleLines.solarGain && (
              <Line
                yAxisId="right"
                name={availability.hasSolarGain ? "Solar Harvest (q_solar) [W]" : "GHI Irradiance [W/m²]"}
                type="monotone"
                dataKey={availability.hasSolarGain ? "solar_gain_w" : "ghi"}
                stroke="var(--solar)"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Heating demand line on secondary axis */}
            {availability.hasHeatingDemand && visibleLines.heatingDemand && (
              <Line
                yAxisId="right"
                name="Heating Demand (q_heat) [W]"
                type="monotone"
                dataKey="heating_demand_w"
                stroke="var(--danger)"
                strokeWidth={1.8}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
