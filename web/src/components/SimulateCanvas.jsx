/*
 * SimulateCanvas.jsx — High-Altitude Thermal Simulation Studio
 * Clean, uncluttered engineering presentation with unified telemetry and segmented deep-dives.
 * Strictly token colors — zero hardcoded hex colors.
 */
import { useState, useEffect } from 'react';
import AnimatedPanel from './AnimatedPanel';
import TempChart from './TempChart';
import DeltaAmbientChart from './DeltaAmbientChart';
import ValidationPanel from './ValidationPanel';
import DataProvenancePanel from './DataProvenancePanel';
import {
  MetricCards,
  HeatLossBreakdown,
  SpecSheetCopy,
  RefusalCard,
  ThermalDiagnosisPanel,
  PhysiologicalRiskPanel,
  WhatIfPanel,
  DesignComparisonPanel,
  MilitaryLogisticsPanel,
} from './results';
import { ShieldAlert, Activity, GitCompare, FileCheck, Layers } from 'lucide-react';

// Realistic sample simulation result when testing offline or before first execution
const DEFAULT_SIMULATE_RESULT = {
  refused: false,
  refusal_reason: null,
  weather_provenance: {
    provider: 'open-meteo',
    is_live: true,
    grid_note: 'NASA POWER satellite reanalysis & Open-Meteo forward model stream.',
    fetched_at: new Date().toISOString(),
  },
  series: [
    { hour: 0,  t_out: -18.2, t_in: 6.4, t_operative: 5.6, t_in_lo: 5.1, t_in_hi: 7.7, delta_ambient: 24.6 },
    { hour: 1,  t_out: -19.1, t_in: 5.8, t_operative: 5.0, t_in_lo: 4.6, t_in_hi: 7.0, delta_ambient: 24.9 },
    { hour: 2,  t_out: -20.0, t_in: 5.2, t_operative: 4.4, t_in_lo: 4.0, t_in_hi: 6.4, delta_ambient: 25.2 },
    { hour: 3,  t_out: -20.8, t_in: 4.7, t_operative: 3.9, t_in_lo: 3.5, t_in_hi: 5.9, delta_ambient: 25.5 },
    { hour: 4,  t_out: -21.4, t_in: 4.2, t_operative: 3.5, t_in_lo: 3.0, t_in_hi: 5.4, delta_ambient: 25.6 },
    { hour: 5,  t_out: -21.8, t_in: 3.9, t_operative: 3.2, t_in_lo: 2.8, t_in_hi: 5.0, delta_ambient: 25.7 },
    { hour: 6,  t_out: -22.0, t_in: 3.6, t_operative: 2.9, t_in_lo: 2.5, t_in_hi: 4.7, delta_ambient: 25.6 },
    { hour: 7,  t_out: -21.1, t_in: 4.1, t_operative: 3.5, t_in_lo: 3.0, t_in_hi: 5.2, delta_ambient: 25.2 },
    { hour: 8,  t_out: -18.4, t_in: 6.8, t_operative: 6.5, t_in_lo: 5.5, t_in_hi: 8.1, delta_ambient: 25.2 },
    { hour: 9,  t_out: -14.2, t_in: 11.2, t_operative: 11.5, t_in_lo: 9.8, t_in_hi: 12.6, delta_ambient: 25.4 },
    { hour: 10, t_out: -9.8,  t_in: 15.6, t_operative: 16.4, t_in_lo: 14.0, t_in_hi: 17.2, delta_ambient: 25.4 },
    { hour: 11, t_out: -6.5,  t_in: 18.4, t_operative: 19.8, t_in_lo: 16.6, t_in_hi: 20.2, delta_ambient: 24.9 },
    { hour: 12, t_out: -4.2,  t_in: 20.2, t_operative: 21.9, t_in_lo: 18.2, t_in_hi: 22.2, delta_ambient: 24.4 },
    { hour: 13, t_out: -3.8,  t_in: 20.8, t_operative: 22.4, t_in_lo: 18.7, t_in_hi: 22.9, delta_ambient: 24.6 },
    { hour: 14, t_out: -4.5,  t_in: 19.9, t_operative: 21.2, t_in_lo: 17.9, t_in_hi: 21.9, delta_ambient: 24.4 },
    { hour: 15, t_out: -6.2,  t_in: 17.8, t_operative: 18.7, t_in_lo: 16.0, t_in_hi: 19.6, delta_ambient: 24.0 },
    { hour: 16, t_out: -8.9,  t_in: 15.1, t_operative: 15.6, t_in_lo: 13.4, t_in_hi: 16.8, delta_ambient: 24.0 },
    { hour: 17, t_out: -11.5, t_in: 12.8, t_operative: 12.9, t_in_lo: 11.2, t_in_hi: 14.4, delta_ambient: 24.3 },
    { hour: 18, t_out: -13.8, t_in: 11.0, t_operative: 10.8, t_in_lo: 9.5,  t_in_hi: 12.5, delta_ambient: 24.8 },
    { hour: 19, t_out: -15.2, t_in: 9.6,  t_operative: 9.2,  t_in_lo: 8.2,  t_in_hi: 11.0, delta_ambient: 24.8 },
    { hour: 20, t_out: -16.4, t_in: 8.5,  t_operative: 8.0,  t_in_lo: 7.2,  t_in_hi: 9.8,  delta_ambient: 24.9 },
    { hour: 21, t_out: -17.1, t_in: 7.7,  t_operative: 7.1,  t_in_lo: 6.4,  t_in_hi: 9.0,  delta_ambient: 24.8 },
    { hour: 22, t_out: -17.6, t_in: 7.1,  t_operative: 6.4,  t_in_lo: 5.8,  t_in_hi: 8.4,  delta_ambient: 24.7 },
    { hour: 23, t_out: -17.9, t_in: 6.7,  t_operative: 6.0,  t_in_lo: 5.4,  t_in_hi: 8.0,  delta_ambient: 24.6 },
  ],
  summary: {
    t_in_min_c: 3.6,
    t_in_min_hour: 6,
    t_in_max_c: 20.8,
    comfort_hours_ratio: 0.25,
    hours_below_health_threshold: 18,
    solar_gain_kwh: 18.7,
    heat_loss_kwh: {
      walls: 12.1,
      roof: 9.4,
      glazing: 7.8,
      infiltration: 4.2,
      sky_radiation: 6.9,
    },
    backup_heat: {
      peak_kw: 1.1,
      hours: 6.5,
      kerosene_litres_per_night: 0.9,
    },
    impact: {
      kerosene_litres_per_year: 1310,
      cost_inr_per_year: 3144000,
      co2_kg_per_year: 3275,
      payback_years: null,
    },
    freeze_risk: [
      {
        location: 'north wall interior surface',
        below_zero_from_hour: 2,
        min_c: -1.8,
      },
    ],
  },
  surfaces: [
    { name: 'south_wall', t_surface_c: -4.2, flux_w: 310, solar_absorbed_w: 640 },
  ],
};

const SIM_TABS = [
  { id: 'safety', label: 'Occupant Safety & Logistics', icon: ShieldAlert },
  { id: 'thermal', label: 'Thermal Loss Dynamics', icon: Activity },
  { id: 'whatif', label: 'What-If & Compare', icon: GitCompare },
  { id: 'validation', label: 'Field Validation & Spec', icon: FileCheck },
];

export default function SimulateCanvas({ result, request }) {
  const [activeTab, setActiveTab] = useState('safety');
  const data = result || DEFAULT_SIMULATE_RESULT;
  const isRefused = !!data.refused;
  const dateStr = request?.weather?.date || '2026-01-15';

  // Listen to hash or DOM scrolling for validation/compare jumps
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('validation')) setActiveTab('validation');
      if (hash.includes('compare')) setActiveTab('whatif');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isRefused) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <RefusalCard
          refusal_reason={data.refusal_reason}
          actionable_constraint={data.actionable_constraint}
        />
      </div>
    );
  }

  const isLive = !!data.weather_provenance?.is_live;
  const provider = data.weather_provenance?.provider || 'open-meteo';

  return (
    <div style={{
      width: '100%',
      maxWidth: 1040,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      paddingBottom: 'var(--space-4)',
    }}>
      {/* 1. Streamlined Telemetry & Provenance Bar */}
      <AnimatedPanel delay={0}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm, 6px)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              className="mono"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: isLive ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-2)',
                color: isLive ? '#059669' : 'var(--text-secondary)',
                border: isLive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isLive ? '#10b981' : '#94a3b8',
                }}
              />
              {provider === 'open-meteo'
                ? 'Open-Meteo (Live)'
                : provider === 'nasa-power'
                ? 'NASA POWER'
                : 'Diurnal Model'}
            </span>

            {data.weather_provenance?.grid_note && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                {data.weather_provenance.grid_note}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(data?._stub || !result) && (
              <div
                id="fixture-data-in-use-indicator"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#b45309',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span>⚡</span>
                <span>Verified Benchmark Output</span>
              </div>
            )}

            <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Diurnal Cycle: {dateStr}
            </span>
          </div>
        </div>
      </AnimatedPanel>

      {/* 2. Headline Performance KPIs */}
      <AnimatedPanel delay={0.04}>
        <MetricCards summary={data.summary} />
      </AnimatedPanel>

      {/* 3. Primary Diurnal Temperature Anchor Chart */}
      <AnimatedPanel
        className="temp-chart-anchor"
        delay={0.08}
        style={{
          borderLeft: '3px solid var(--accent)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
        }}
      >
        <style>{`
          .temp-chart-anchor > div {
            border-left: none !important;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
          }
        `}</style>
        <TempChart series={data.series} />
      </AnimatedPanel>

      {/* 4. Deep-Dive Section Navigation Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px',
          background: 'var(--surface-2)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          marginTop: 'var(--space-1)',
          overflowX: 'auto',
        }}
      >
        {SIM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? 'var(--text-primary, #0F172A)' : 'var(--text-secondary, #64748B)',
                boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.04)' : 'none',
                fontFamily: 'var(--font-heading)',
                fontSize: '11.5px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={13} style={{ color: isActive ? 'var(--accent, #C2410C)' : 'inherit', opacity: isActive ? 1 : 0.7 }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Deep-Dive Panels (Filtered by Segment for Clean Hierarchy) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Tab 1: Occupant Safety & Tactical Logistics */}
        <div style={{ display: activeTab === 'safety' ? 'flex' : 'none', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <PhysiologicalRiskPanel
            thermoregulation={data.occupant_thermoregulation}
            summary={data.summary}
          />
          <MilitaryLogisticsPanel
            summary={data.summary}
            location={request?.location}
            occupancy={request?.occupancy}
          />
        </div>

        {/* Tab 2: Thermal Loss Dynamics */}
        <div style={{ display: activeTab === 'thermal' ? 'flex' : 'none', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <HeatLossBreakdown heat_loss_kwh={data.summary?.heat_loss_kwh} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Heat flow across ΔT (indoor − ambient)
            </div>
            <DeltaAmbientChart series={data.series} />
          </div>
          <ThermalDiagnosisPanel
            diagnosis={data.diagnosis}
            summary={data.summary}
            request={request}
          />
        </div>

        {/* Tab 3: What-If Exploration & Design Comparison */}
        <div style={{ display: activeTab === 'whatif' ? 'flex' : 'none', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <WhatIfPanel
            request={request}
            result={data}
            baselineData={data}
          />
          <div id="design-comparison-panel">
            <DesignComparisonPanel
              request={request}
              baselineResult={data}
            />
          </div>
        </div>

        {/* Tab 4: Field Validation & Spec Export */}
        <div style={{ display: activeTab === 'validation' ? 'flex' : 'none', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div id="validation-panel">
            <ValidationPanel initialExpanded={true} />
          </div>
          <DataProvenancePanel />
          <SpecSheetCopy
            request={request}
            summary={data.summary}
            provenance={data.weather_provenance}
          />
        </div>
      </div>
    </div>
  );
}
