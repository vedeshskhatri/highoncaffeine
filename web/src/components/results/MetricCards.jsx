import React from 'react';
import { motion } from 'framer-motion';
import { Moon, ShieldCheck, AlertTriangle, Droplet } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

/**
 * MetricCards.jsx — Four headline thermal and logistics metrics.
 * Redesigned with glassmorphic cards, subtle status badges, and Framer Motion hover effects.
 */
export default function MetricCards({ summary }) {
  const {
    t_in_min_c = null,
    t_in_min_hour = 6,
    comfort_hours_ratio = null,
    hours_below_health_threshold = null,
    impact = null,
  } = summary || {};

  const kerosene_litres_per_year = impact?.kerosene_litres_per_year ?? null;
  const comfortPctTarget = typeof comfort_hours_ratio === 'number' && !isNaN(comfort_hours_ratio)
    ? comfort_hours_ratio * 100
    : null;

  const animMinTemp = useCountUp(summary ? t_in_min_c : null, 900, 1);
  const animComfortPct = useCountUp(summary ? comfortPctTarget : null, 900, 0);
  const animHealthHours = useCountUp(summary ? hours_below_health_threshold : null, 700, 0);
  const animKerosene = useCountUp(summary ? kerosene_litres_per_year : null, 1100, 0);

  if (!summary) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              minHeight: 96,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>—</div>
          </div>
        ))}
      </div>
    );
  }

  const minTempFormatted =
    typeof animMinTemp === 'number' && !Number.isNaN(animMinTemp)
      ? `${animMinTemp.toFixed(1)} °C`
      : '—';

  const hourFormatted =
    typeof t_in_min_hour === 'number'
      ? `${String(t_in_min_hour).padStart(2, '0')}:00`
      : '—';

  const comfortPctFormatted =
    typeof animComfortPct === 'number' && !Number.isNaN(animComfortPct)
      ? `${Math.round(animComfortPct)}%`
      : '—';

  const healthHoursFormatted =
    typeof animHealthHours === 'number' && !Number.isNaN(animHealthHours)
      ? `${Math.round(animHealthHours)} / 24 h`
      : '—';

  const keroseneAvoidedFormatted =
    typeof animKerosene === 'number' && !Number.isNaN(animKerosene)
      ? `${Math.round(animKerosene).toLocaleString()} L`
      : '—';

  const isHeatBinding = summary?.binding_constraint === 'heat_risk';
  const hoursAboveUpper = summary?.hours_above_upper_limit ?? 0;
  const coolingKw = summary?.cooling_demand_peak_kw ?? 0;
  const coolingHours = summary?.cooling_demand_hours ?? 0;
  const isBelowSafe = typeof t_in_min_c === 'number' && t_in_min_c < 18.0;

  const cards = isHeatBinding
    ? [
        {
          id: 'peak-max',
          label: 'Peak Indoor Temp',
          meta: 'Diurnal Peak',
          value: typeof summary.t_in_max_c === 'number' ? `${summary.t_in_max_c.toFixed(1)} °C` : '—',
          sub: summary.t_in_max_c > 35 ? 'Severe heat stress threshold' : 'High insolation heat gain',
          icon: AlertTriangle,
          color: summary.t_in_max_c > 35 ? 'var(--danger)' : 'var(--solar)',
          accentBorder: summary.t_in_max_c > 35 ? '1.5px solid var(--danger)' : '1px solid var(--border)',
        },
        {
          id: 'comfort-band',
          label: 'Comfort Hours',
          meta: 'IMAC Band',
          value: comfortPctFormatted,
          sub: 'Diurnal hours in thermal comfort',
          icon: ShieldCheck,
          color: 'var(--comfort)',
          accentBorder: '1px solid var(--border)',
        },
        {
          id: 'heat-risk',
          label: 'Overheating Risk',
          meta: 'IMAC Upper Limit',
          value: `${hoursAboveUpper} / 24 h`,
          sub: 'Hours exceeding comfort upper limit',
          icon: AlertTriangle,
          color: hoursAboveUpper > 0 ? 'var(--danger)' : 'var(--comfort)',
          accentBorder: hoursAboveUpper > 0 ? '1.5px solid var(--danger)' : '1px solid var(--border)',
        },
        {
          id: 'cooling-demand',
          label: 'Cooling Demand',
          meta: 'Peak Sensible',
          value: `${coolingKw.toFixed(1)} kW`,
          sub: coolingHours > 0 ? `${coolingHours} hrs active cooling required` : 'Passive dissipation adequate',
          icon: Droplet,
          color: coolingKw > 0 ? 'var(--ice, #5bc0be)' : 'var(--comfort)',
          accentBorder: '1px solid var(--border)',
        },
      ]
    : [
        {
          id: 'dawn-min',
          label: 'Overnight Min (Dawn)',
          meta: hourFormatted,
          value: minTempFormatted,
          sub: isBelowSafe ? 'Below 18 °C threshold' : 'Maintains safe temperature',
          icon: Moon,
          color: isBelowSafe ? 'var(--danger)' : 'var(--text-primary)',
          accentBorder: isBelowSafe ? '1.5px solid var(--danger)' : '1px solid var(--border)',
        },
        {
          id: 'comfort-band',
          label: 'Comfort Hours',
          meta: 'IMAC Band',
          value: comfortPctFormatted,
          sub: 'Diurnal hours in thermal comfort',
          icon: ShieldCheck,
          color: 'var(--comfort)',
          accentBorder: '1px solid var(--border)',
        },
        {
          id: 'health-risk',
          label: 'Cold Exposure Risk',
          meta: 'WHO < 18°C',
          value: healthHoursFormatted,
          sub: 'Hours below health guidance',
          icon: AlertTriangle,
          color: hours_below_health_threshold > 0 ? 'var(--danger)' : 'var(--comfort)',
          accentBorder: '1px solid var(--border)',
        },
        {
          id: 'kerosene-saved',
          label: 'Kerosene Avoided',
          meta: 'Annual',
          value: keroseneAvoidedFormatted,
          sub: 'Displaced combustion fuel/year',
          icon: Droplet,
          color: 'var(--accent)',
          accentBorder: '1px solid var(--border)',
        },
      ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-3)',
        width: '100%',
      }}
    >
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.id}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            style={{
              background: 'var(--surface-1)',
              border: c.accentBorder,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 104,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={14} color="var(--text-muted)" />
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {c.label}
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  background: 'var(--surface-2)',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                {c.meta}
              </span>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 24,
                fontWeight: 600,
                color: c.color,
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              {c.value}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              {c.sub}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
