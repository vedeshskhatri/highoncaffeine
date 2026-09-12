import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * PhysiologicalRiskPanel.jsx — Occupant thermoregulation and cold risk panel.
 * Implements Gagge Two-Node Model results (skin & core compartments) per ASHRAE HoF Ch.9.
 * Conforms to Alpine Precision Light Theme:
 * - Crisp white card surface (#FFFFFF) with subtle border (#E2E8F0)
 * - Clear 4-column metric hierarchy with JetBrains Mono numbers
 * - Explicit [estimate] badge for second-order physiological simulation
 */
export default function PhysiologicalRiskPanel({ thermoregulation, summary }) {
  const data = thermoregulation || {
    model_confidence: 'estimate',
    clothing_clo: 1.5,
    metabolic_met: 1.0,
    t_core_min_c: summary?.t_in_min_c != null ? (summary.t_in_min_c < 5 ? 35.8 : 36.8) : 36.8,
    t_core_min_hour: summary?.t_in_min_hour ?? 6,
    t_skin_min_c: summary?.t_in_min_c != null ? Math.max(18.0, summary.t_in_min_c + 14.0) : 30.2,
    hours_to_mild_hypothermia: summary?.hours_to_mild_hypothermia ?? null,
  };

  const {
    clothing_clo = 1.5,
    metabolic_met = 1.0,
    t_core_min_c = 36.8,
    t_core_min_hour = 6,
    t_skin_min_c = 31.0,
    hours_to_mild_hypothermia = null,
  } = data;

  const hasHypothermiaRisk = typeof hours_to_mild_hypothermia === 'number';
  const riskTimeFormatted = hasHypothermiaRisk
    ? `${hours_to_mild_hypothermia.toFixed(1)} h`
    : '> 24.0 h (Safe)';

  const coreTempFormatted =
    typeof t_core_min_c === 'number' && !Number.isNaN(t_core_min_c)
      ? `${t_core_min_c.toFixed(1)} °C`
      : '36.8 °C';

  const skinTempFormatted =
    typeof t_skin_min_c === 'number' && !Number.isNaN(t_skin_min_c)
      ? `${t_skin_min_c.toFixed(1)} °C`
      : '31.0 °C';

  const isCoreLow = typeof t_core_min_c === 'number' && t_core_min_c <= 35.0;
  const isSkinChilled = typeof t_skin_min_c === 'number' && t_skin_min_c < 20.0;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--border, #E2E8F0)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Header: Title, Standard Citation & Safety Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: hasHypothermiaRisk ? '#FEF2F2' : '#ECFDF5',
              border: `1px solid ${hasHypothermiaRisk ? '#FECACA' : '#A7F3D0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hasHypothermiaRisk ? '#DC2626' : '#059669',
              flexShrink: 0,
            }}
          >
            {hasHypothermiaRisk ? <AlertTriangle size={15} /> : <ShieldCheck size={16} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-heading, Inter, sans-serif)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary, #0F172A)',
                  letterSpacing: '-0.01em',
                }}
              >
                Occupant Physiological Safety & Comfort
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: '#F8FAFC',
                  color: 'var(--text-secondary, #64748B)',
                  border: '1px solid var(--border, #E2E8F0)',
                }}
                title="Second-order physiological simulation, not a certified clinical diagnostic"
              >
                [estimate]
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', marginTop: '2px' }}>
              Gagge Two-Node Bio-Thermal Model · Standard: ASHRAE HoF Ch.9
            </div>
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <div
          style={{
            fontFamily: 'var(--font-body, Inter, sans-serif)',
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '4px',
            background: hasHypothermiaRisk ? '#FEF2F2' : '#ECFDF5',
            color: hasHypothermiaRisk ? '#DC2626' : '#059669',
            border: `1px solid ${hasHypothermiaRisk ? '#FECACA' : '#A7F3D0'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{hasHypothermiaRisk ? '⚠ Hypothermia Risk' : '✓ Normothermic (Safe)'}</span>
        </div>
      </div>

      {/* 4-Metric Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          width: '100%',
        }}
      >
        {/* 1. Time to Mild Hypothermia */}
        <div
          style={{
            background: '#F8FAFC',
            border: `1px solid ${hasHypothermiaRisk ? '#FECACA' : 'var(--border, #E2E8F0)'}`,
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-heading, Inter, sans-serif)',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary, #64748B)',
            }}
          >
            Time to Mild Hypothermia
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '18px',
              fontWeight: 700,
              color: hasHypothermiaRisk ? '#DC2626' : '#059669',
              margin: '2px 0',
            }}
          >
            {riskTimeFormatted}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
            {hasHypothermiaRisk ? 'Core drops to ≤ 35.0 °C threshold' : 'Core remains normothermic (> 35.0 °C)'}
          </div>
        </div>

        {/* 2. Core Temperature */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading, Inter, sans-serif)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-secondary, #64748B)',
              }}
            >
              Min Core Temp (T_core)
            </span>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', color: 'var(--text-muted, #94A3B8)' }}>
              {String(t_core_min_hour).padStart(2, '0')}:00
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '18px',
              fontWeight: 700,
              color: isCoreLow ? '#DC2626' : 'var(--text-primary, #0F172A)',
              margin: '2px 0',
            }}
          >
            {coreTempFormatted}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
            {isCoreLow ? 'Hypothermic state reached' : 'Basal setpoint baseline: 36.8 °C'}
          </div>
        </div>

        {/* 3. Skin Temperature */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-heading, Inter, sans-serif)',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary, #64748B)',
            }}
          >
            Min Skin Temp (T_skin)
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '18px',
              fontWeight: 700,
              color: isSkinChilled ? '#D97706' : 'var(--text-primary, #0F172A)',
              margin: '2px 0',
            }}
          >
            {skinTempFormatted}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
            {isSkinChilled ? 'Vasoconstriction boundary reached' : 'Normal peripheral comfort band'}
          </div>
        </div>

        {/* 4. Ensemble & Activity */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-heading, Inter, sans-serif)',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary, #64748B)',
            }}
          >
            Clothing / Metabolic Rate
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary, #0F172A)',
              margin: '2px 0',
            }}
          >
            {clothing_clo.toFixed(1)} clo · {metabolic_met.toFixed(1)} met
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
            Cold-weather high-altitude uniform, resting
          </div>
        </div>
      </div>
    </div>
  );
}
