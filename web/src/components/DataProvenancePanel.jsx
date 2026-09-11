import React, { useState, useEffect, useMemo } from 'react';
import { PROVENANCE_CATEGORIES, ESTIMATE_BASIS, DERIVED_BASIS } from './safetyUtils';

// Fallback registry matching engine/provenance.py if backend is offline
const FALLBACK_REGISTRY = {
  physical_constants: [
    {
      item: 'Stefan-Boltzmann Constant (σ)',
      value: '5.6703744190e-08',
      unit: 'W/(m²·K⁴)',
      source: 'CODATA 2018 / NIST Special Publication 330',
      status: 'SOURCED',
      basis: 'CODATA 2018 recommended internationally adopted fundamental physical constant.',
    },
    {
      item: 'Specific Gas Constant for Dry Air (R_air)',
      value: '287.05',
      unit: 'J/(kg·K)',
      source: 'ASHRAE Handbook of Fundamentals 2021, Ch. 1 Psychrometrics',
      status: 'SOURCED',
      basis: 'ASHRAE Standard fundamental thermodynamic property for dry atmospheric air.',
    },
    {
      item: 'Specific Heat Capacity of Air (c_p,air)',
      value: '1005.0',
      unit: 'J/(kg·K)',
      source: 'ISO 52016-1:2017 Table B.14 / ASHRAE HoF 2021 Ch. 1',
      status: 'SOURCED',
      basis: 'Standard isobaric specific heat capacity at standard temperature and pressure.',
    },
    {
      item: 'Sea-Level Standard Atmospheric Pressure (P₀)',
      value: '101325',
      unit: 'Pa',
      source: 'ISO 2533:1975 Standard Atmosphere / US Standard Atmosphere 1976',
      status: 'SOURCED',
      basis: 'International civil aviation and meteorological sea-level pressure reference datum.',
    },
    {
      item: 'Health Protection Temperature Floor',
      value: '18.0',
      unit: '°C',
      source: 'WHO Housing and Health Guidelines (2018), Chapter 3',
      status: 'SOURCED',
      basis: 'World Health Organization cold-season minimum safe indoor thermal threshold.',
    },
    {
      item: 'Snow Ground Albedo (α_snow)',
      value: '0.75',
      unit: 'dimensionless',
      source: 'Duffie & Beckman, Solar Engineering of Thermal Processes (4th ed.), Sec. 2.15',
      status: 'SOURCED',
      basis: 'Empirical hemispherical reflectance for cold fresh high-altitude snow cover.',
    },
    {
      item: 'Altitude-Corrected Air Density ρ(z, T)',
      value: 'Calculated dynamically',
      unit: 'kg/m³',
      source: 'Barometric Formula + Ideal Gas Law',
      status: 'DERIVED',
      basis: DERIVED_BASIS,
    },
    {
      item: 'Downwelling Sky Emissivity (ε_sky)',
      value: 'Calculated dynamically',
      unit: 'dimensionless',
      source: 'Swinbank (1963) / ISO 52016-1:2017 clear-sky model',
      status: 'DERIVED',
      basis: DERIVED_BASIS,
    },
  ],
  material_properties: [
    {
      item: 'Mud brick / adobe (mud_brick)',
      value: 'k = 0.75 W/(m·K)',
      unit: 'W/(m·K)',
      source: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
      status: 'SOURCED',
      basis: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    },
    {
      item: 'Rammed earth (rammed_earth)',
      value: 'k = 1.25 W/(m·K)',
      unit: 'W/(m·K)',
      source: 'NBC 2016 Part 8 Sec 3 Tbl 1',
      status: 'SOURCED',
      basis: 'NBC 2016 Part 8 Sec 3 Tbl 1',
    },
    {
      item: 'Granite field stone (stone_masonry)',
      value: 'k = 2.20 W/(m·K)',
      unit: 'W/(m·K)',
      source: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
      status: 'SOURCED',
      basis: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    },
    {
      item: 'Expanded polystyrene (eps)',
      value: 'k = 0.038 W/(m·K)',
      unit: 'W/(m·K)',
      source: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
      status: 'SOURCED',
      basis: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    },
    {
      item: 'Double low-e glazing (double_pane)',
      value: 'k = 1.0 W/(m·K), U = 1.8 W/(m²·K)',
      unit: 'W/(m²·K)',
      source: 'ISO 52016-1:2017 Table B.14',
      status: 'SOURCED',
      basis: 'ISO 52016-1:2017 Table B.14',
    },
    {
      item: 'Straw bale insulation (straw_bale)',
      value: 'k = 0.070 W/(m·K)',
      unit: 'W/(m·K)',
      source: 'NBC 2016 Part 8 Sec 3 Tbl 1',
      status: 'SOURCED',
      basis: 'NBC 2016 Part 8 Sec 3 Tbl 1',
    },
  ],
  weather: [
    {
      item: 'Live Hourly Meteorological Forecast',
      value: 'Hourly GHI, DNI, DHI, T_amb, Wind, RH',
      unit: 'Various SI',
      source: 'Open-Meteo High-Resolution NWP (ECMWF IFS / GFS)',
      status: 'SOURCED',
      basis: 'Real-time atmospheric forecast model at 0.1° (~9 km) resolution.',
    },
    {
      item: 'Historical 10-Year Winter Record (P1 Worst-Night)',
      value: 'Dec–Feb 2014–2024 Daily Extremes',
      unit: 'Various SI',
      source: 'NASA Langley Research Center POWER Project (CERES / MERRA-2)',
      status: 'SOURCED',
      basis: 'Satellite-derived meteorological archive gridded at 0.5° × 0.625° (~50 km cell). Regional estimate, not a site mast.',
    },
    {
      item: 'Bundled Extreme Cold Night Fallback (Leh January)',
      value: '24-Hour Synthetic Winter Profile (T_min = -18.2 °C)',
      unit: '°C, W/m²',
      source: '/data/weather/leh_january_fallback.csv',
      status: 'ESTIMATE',
      basis: ESTIMATE_BASIS,
    },
    {
      item: 'Perez Diffuse Transposition on Tilted Apertures',
      value: 'Calculated hourly',
      unit: 'W/m²',
      source: 'Perez et al. (1990) Solar Transposition Model',
      status: 'DERIVED',
      basis: DERIVED_BASIS,
    },
  ],
  costs: [
    {
      item: 'Standard Construction Material Unit Rates',
      value: 'Rates per m³ / m²',
      unit: 'INR / m³',
      source: 'CPWD Delhi Schedule of Rates (DSR) 2023 / Ladakh PWD Schedule',
      status: 'SOURCED',
      basis: 'Official public works schedule of rates for government infrastructure works.',
    },
    {
      item: 'Total Envelope Capital Cost',
      value: 'Sum of (Area × Thickness × Material Rate)',
      unit: 'INR',
      source: 'THERMA Cost Valuation Engine',
      status: 'DERIVED',
      basis: DERIVED_BASIS,
    },
    {
      item: 'Siachen Kerosene Delivery Logistics Multiplier',
      value: '≈ ₹2,400 per Litre (Helicopter Sortie Basis)',
      unit: 'INR / L',
      source: 'Defense Logistics Historical Field Baseline',
      status: 'ESTIMATE',
      basis: ESTIMATE_BASIS,
    },
    {
      item: 'Local High-Altitude Labor Installation Premium',
      value: 'Sub-zero assembly adjustment factor',
      unit: 'dimensionless',
      source: 'Regional contractor survey',
      status: 'ESTIMATE',
      basis: ESTIMATE_BASIS,
    },
  ],
  validation_measurements: [
    {
      item: 'V1: Uninsulated Solar-Heated Shelter Field Data',
      value: 'T_in = 15–20 °C at T_amb = -19 °C',
      unit: '°C',
      source: 'DRDO DIHAR (Defence Institute of High Altitude Research) Leh Field Pilot Reporting',
      status: 'SOURCED',
      basis: 'Experimental field station thermocouple measurements.',
    },
    {
      item: 'V2: Leh Trombe-Wall Room Field Campaign (Feb 2020)',
      value: 'Monthly Mean = 17.44 °C',
      unit: '°C',
      source: 'Measured Leh Passive Solar Housing Study',
      status: 'SOURCED',
      basis: 'Continuous calibrated data-logger measurements over full winter month.',
    },
    {
      item: 'V3: Leh Direct-Gain Room Field Campaign (Feb 2020)',
      value: 'Monthly Mean = 14.81 °C',
      unit: '°C',
      source: 'Measured Leh Passive Solar Housing Study',
      status: 'SOURCED',
      basis: 'Side-by-side room monitoring under identical meteorological forcing to V2.',
    },
    {
      item: 'V4: DIHAR + Sun Stellar ADM Block Field Deployment (Dec 2024)',
      value: 'T_in >= +20 °C held 18:00–06:00 without active fuel',
      unit: '°C',
      source: 'DRDO DIHAR / Sun Stellar joint pilot deployment monitoring logs',
      status: 'SOURCED',
      basis: 'Automated building management system datalogger records.',
    },
  ],
};

export default function DataProvenancePanel() {
  const [activeCategory, setActiveCategory] = useState('physical_constants');
  const [registry, setRegistry] = useState(FALLBACK_REGISTRY);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch('/provenance')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (isMounted && data && typeof data === 'object') {
          setRegistry(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {
        // Graceful fallback to bundled authoritative registry
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const items = registry[activeCategory] || [];

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(it => 
      (it.item && it.item.toLowerCase().includes(q)) ||
      (it.source && it.source.toLowerCase().includes(q)) ||
      (it.basis && it.basis.toLowerCase().includes(q)) ||
      (it.status && it.status.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Status badge styling helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'SOURCED':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: 'var(--color-success, #10b981)',
          border: 'rgba(16, 185, 129, 0.4)',
          label: 'SOURCED',
        };
      case 'DERIVED':
        return {
          bg: 'rgba(6, 182, 212, 0.15)',
          color: 'var(--color-secondary, #06b6d4)',
          border: 'rgba(6, 182, 212, 0.4)',
          label: 'DERIVED',
        };
      case 'ESTIMATE':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: 'var(--color-warning, #f59e0b)',
          border: 'rgba(245, 158, 11, 0.4)',
          label: 'ESTIMATE',
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          color: 'var(--text-muted, #94a3b8)',
          border: 'rgba(148, 163, 184, 0.4)',
          label: status || 'UNAVAILABLE',
        };
    }
  };

  return (
    <div
      className="w-full rounded-md border p-4 bg-surface-1 my-3 transition-all"
      style={{
        borderColor: 'var(--border, #334155)',
        backgroundColor: 'var(--surface-1, #1e293b)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border, #334155)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-title font-semibold tracking-tight text-text-primary">
              Scientific & Economic Data Provenance
            </h3>
            <span
              className="px-2 py-0.5 rounded font-mono text-caption font-bold"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--color-success, #10b981)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              RULE R1 COMPLIANT
            </span>
          </div>
          <p className="font-body text-caption text-text-muted mt-0.5">
            Every coefficient, material property, weather observation, and cost metric cite authoritative sources or explicit estimation basis.
          </p>
        </div>

        {/* Search */}
        <div className="w-64">
          <input
            type="text"
            placeholder="Search provenance..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded border text-caption font-body bg-surface-2 text-text-primary focus:outline-none"
            style={{
              backgroundColor: 'var(--surface-2, #0f172a)',
              borderColor: 'var(--border, #334155)',
            }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PROVENANCE_CATEGORIES.map(cat => {
          const count = (registry[cat.id] || []).length;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className="px-3 py-1.5 rounded text-caption font-medium transition-all flex items-center gap-2 border"
              style={{
                backgroundColor: isActive ? 'var(--color-primary, #2563eb)' : 'var(--surface-2, #0f172a)',
                color: isActive ? '#ffffff' : 'var(--text-secondary, #cbd5e1)',
                borderColor: isActive ? 'var(--color-primary, #2563eb)' : 'var(--border, #334155)',
              }}
            >
              <span>{cat.label}</span>
              <span
                className="px-1.5 py-0.2 rounded font-mono text-caption text-xs"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(148, 163, 184, 0.2)',
                  color: isActive ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table of Provenance Items */}
      <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--border, #334155)' }}>
        <table className="w-full text-left font-body text-caption border-collapse">
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--surface-2, #0f172a)',
                borderBottom: '1px solid var(--border, #334155)',
              }}
            >
              <th className="py-2.5 px-3 font-semibold text-text-primary w-1/4">Entity / Measurement</th>
              <th className="py-2.5 px-3 font-semibold text-text-primary w-1/6">Nominal Value</th>
              <th className="py-2.5 px-3 font-semibold text-text-primary w-1/4">Source Citation</th>
              <th className="py-2.5 px-3 font-semibold text-text-primary w-1/8">Status</th>
              <th className="py-2.5 px-3 font-semibold text-text-primary w-1/4">Basis Disclosure</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => {
              const badge = getStatusBadge(item.status);
              return (
                <tr
                  key={idx}
                  className="border-b transition-colors hover:bg-surface-2"
                  style={{
                    borderColor: 'var(--border, #334155)',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <td className="py-2.5 px-3 font-medium text-text-primary">
                    {item.item}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-text-secondary">
                    {item.value || '—'} {item.unit && !item.value?.includes(item.unit) ? item.unit : ''}
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary">
                    {item.source}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className="px-2 py-0.5 rounded font-mono text-caption font-bold text-xs inline-block"
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-text-muted italic">
                    {item.basis}
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-text-muted">
                  No provenance records found matching "{searchQuery}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend & Policy Footer */}
      <div
        className="mt-3 p-2.5 rounded border flex flex-wrap items-center justify-between gap-3 text-caption font-body"
        style={{
          backgroundColor: 'var(--surface-2, #0f172a)',
          borderColor: 'var(--border, #334155)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-text-primary">Classification Rules:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success, #10b981)' }} />
            <strong className="text-text-primary">SOURCED:</strong> Published peer-reviewed / standard citation.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-secondary, #06b6d4)' }} />
            <strong className="text-text-primary">DERIVED:</strong> "Derived from sourced inputs."
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-warning, #f59e0b)' }} />
            <strong className="text-text-primary">ESTIMATE:</strong> "Estimate — source unavailable."
          </span>
        </div>
        <div className="text-text-muted font-mono text-xs">
          Endpoint: <code className="text-text-primary">GET /provenance</code>
        </div>
      </div>
    </div>
  );
}
