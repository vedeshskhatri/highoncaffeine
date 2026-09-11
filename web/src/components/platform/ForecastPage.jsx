import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plane, Calendar, Fuel, AlertCircle, HelpCircle, ArrowRight, ShieldCheck, Radio, Navigation } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import './ForecastPage.css';

export default function ForecastPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/forecast?estate=${encodeURIComponent(estate)}`)
      .then(r => r.json())
      .then(data => {
        setForecast(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [estate]);

  if (loading) {
    return (
      <div className="forecast-loading-state">
        <div className="telemetry-spinner" />
        <span>Projecting seasonal military helicopter sorties & forward fuel logistics...</span>
      </div>
    );
  }

  if (!forecast) {
    return <div className="error-state">Failed to load seasonal logistics forecast.</div>;
  }

  const sCfg = forecast.sortie_config;

  return (
    <div className="forecast-page">
      {/* 1. Header */}
      <div className="forecast-header">
        <div>
          <div className="forecast-tag-row">
            <span className="drdo-section-badge">DRDO PS 26051 · AVIATION LOGISTICS</span>
            <span className="forecast-estate-tag mono">{estate.toUpperCase()} THEATRE</span>
          </div>
          <h2 className="forecast-title">Seasonal Kerosene Demand & Sortie Logistics</h2>
          <p className="forecast-subtitle">
            Algorithmic translation of building-physics thermal deficits into military helicopter replenishment sorties.
          </p>
        </div>
      </div>

      {/* 2. Sourced / Estimate Aviation Logistics Specification Card */}
      <div className="sortie-spec-card">
        <div className="sortie-spec-header">
          <div className="sortie-spec-title-box">
            <div className="spec-icon-box">
              <Plane size={18} />
            </div>
            <div>
              <div className="sortie-spec-title-row">
                <h3 className="sortie-spec-title">Aviation Logistics Payload Specification</h3>
                <span className="basis-chip mono">[{sCfg.basis.toUpperCase()}]</span>
              </div>
              <p className="sortie-spec-note">{sCfg.note}</p>
            </div>
          </div>
        </div>

        <div className="sortie-parameters-grid">
          <div className="sortie-param-item">
            <span className="param-k">AIRCRAFT FLEET</span>
            <span className="param-v">{sCfg.aircraft_candidates?.join(', ')}</span>
          </div>
          <div className="sortie-param-item">
            <span className="param-k">USEFUL PAYLOAD PER SORTIE</span>
            <span className="param-v mono">{sCfg.litres_per_sortie} Litres (~360 kg)</span>
          </div>
          <div className="sortie-param-item">
            <span className="param-k">OPERATING DENSITY ALTITUDE</span>
            <span className="param-v mono">3,500–4,800 m AMSL</span>
          </div>
          <div className="sortie-param-item">
            <span className="param-k">FORWARD SORTIE BASING</span>
            <span className="param-v">AFS Leh / Thoise (Nubra)</span>
          </div>
        </div>
      </div>

      {/* 3. Headline Logistics KPI Metrics Grid */}
      <div className="logistics-metrics-grid">
        <div className="logistics-card">
          <div className="logistics-card-header">
            <span className="logistics-label">TOTAL ANNUAL SORTIES</span>
            <Navigation size={14} className="text-secondary" />
          </div>
          <div className="logistics-val mono">
            {forecast.total_annual_sorties} <span className="val-unit">sorties</span>
          </div>
          <span className="logistics-meta">Coverage: {forecast.coverage_str}</span>
        </div>

        <div className="logistics-card">
          <div className="logistics-card-header">
            <span className="logistics-label">ANNUAL KEROSENE REPLENISHMENT</span>
            <Fuel size={14} className="text-secondary" />
          </div>
          <div className="logistics-val mono">
            {forecast.total_annual_litres.toLocaleString()} <span className="val-unit">Litres</span>
          </div>
          <span className="logistics-meta">To maintain indoor health thresholds (+10°C)</span>
        </div>

        <div className="logistics-card">
          <div className="logistics-card-header">
            <span className="logistics-label">PEAK WINTER MONTH (JANUARY)</span>
            <Calendar size={14} className="text-secondary" />
          </div>
          <div className="logistics-val mono text-solar">
            {forecast.monthly?.find(m => m.month === 'Jan')?.sorties || '—'} <span className="val-unit">sorties</span>
          </div>
          <span className="logistics-meta">Severe mountain pass snow closure constraint</span>
        </div>
      </div>

      {/* 4. Monthly Sortie & Fuel Distribution Chart */}
      <div className="forecast-chart-card">
        <div className="card-header-block">
          <div>
            <h3 className="card-title-text">Projected Monthly Helicopter Sortie Schedule</h3>
            <p className="card-sub-text">
              Displays severe winter concentration (Nov–Apr) when high-altitude mountain passes are closed by heavy snowfall.
            </p>
          </div>
          <div className="chart-legend-chips mono">
            <div className="legend-chip">
              <span className="legend-bar-sample high" />
              <span>Peak Winter (&gt;2 Sorties)</span>
            </div>
            <div className="legend-chip">
              <span className="legend-bar-sample normal" />
              <span>Baseline Surveillance</span>
            </div>
          </div>
        </div>

        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={forecast.monthly} margin={{ top: 20, right: 20, left: 10, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                tickFormatter={v => `${v} sorties`}
              />
              <Tooltip
                formatter={(val) => [`${val} Sorties`, 'Military Flight Missions']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-body)',
                }}
              />
              <Bar dataKey="sorties" radius={[4, 4, 0, 0]}>
                {forecast.monthly?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.sorties >= 1.5 ? '#1E40AF' : '#94A3B8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Outpost Breakdown Table */}
      <div className="forecast-table-card">
        <div className="card-header-block">
          <div>
            <h3 className="card-title-text">Sortie Requirements by Frontier Outpost</h3>
            <p className="card-sub-text">
              Breakdown of annual kerosene volume and corresponding helicopter flight missions per monitored post.
            </p>
          </div>
          <span className="table-count-badge mono">{forecast.site_monthly_breakdown?.length || 0} Outposts Evaluated</span>
        </div>

        <div className="table-wrapper-spacious">
          <table className="spacious-data-table">
            <thead>
              <tr>
                <th>POST NAME</th>
                <th>DEFENSE SECTOR</th>
                <th>ANNUAL KEROSENE DEMAND</th>
                <th>PROJECTED ANNUAL SORTIES</th>
                <th>SORTIE LOAD BAR</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {forecast.site_monthly_breakdown?.map(s => {
                const maxSorties = 2.5;
                const sortiePct = Math.min(100, Math.max(10, (s.annual_sorties / maxSorties) * 100));

                return (
                  <tr key={s.site_id} className="clickable-row" onClick={() => navigate(`/sites/${s.site_id}`)}>
                    <td>
                      <span className="post-name font-bold">{s.site_name}</span>
                    </td>
                    <td>
                      <span className="post-sector">{s.district} Sector</span>
                    </td>
                    <td className="mono fuel-cell">
                      {s.annual_litres.toLocaleString()} L
                    </td>
                    <td>
                      <span className="mono sortie-badge-num font-bold">
                        {s.annual_sorties} sorties
                      </span>
                    </td>
                    <td>
                      <div className="sortie-mini-track">
                        <div className="sortie-mini-fill" style={{ width: `${sortiePct}%` }} />
                      </div>
                    </td>
                    <td className="arrow-cell">
                      <span className="post-link-btn">
                        <span>Details</span>
                        <ArrowRight size={13} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
