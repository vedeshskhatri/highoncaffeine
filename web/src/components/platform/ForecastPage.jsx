import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plane, Calendar, Fuel, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
    return <div className="loading-state">Projecting seasonal helicopter sorties & fuel logistics...</div>;
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
          <h2 className="forecast-title">Seasonal Kerosene Demand & Sortie Logistics</h2>
          <p className="forecast-subtitle">
            Converting predicted thermal deficit into military helicopter sorties ({estate} Estate).
          </p>
        </div>
      </div>

      {/* 2. Sourced / Estimate Assumption Banner per Correction 1 */}
      <div className="sortie-assumption-card">
        <div className="assumption-header">
          <Plane size={18} className="text-orange" />
          <span className="assumption-title">Aviation Logistics Payload Assumption</span>
          <span className="estimate-chip mono">[{sCfg.basis}]</span>
        </div>
        <p className="assumption-note">{sCfg.note}</p>
        <span className="assumption-footer">
          Aircraft Profile: {sCfg.aircraft_candidates?.join(', ')} · 1 Sortie ≈ {sCfg.litres_per_sortie} L delivered
        </span>
      </div>

      {/* 3. Headline Logistics Metrics */}
      <div className="logistics-metrics-grid">
        <div className="logistics-card">
          <span className="logistics-label">TOTAL ANNUAL SORTIES</span>
          <div className="logistics-val mono text-orange">
            {forecast.total_annual_sorties} sorties
          </div>
          <span className="logistics-meta">Coverage: {forecast.coverage_str}</span>
        </div>

        <div className="logistics-card">
          <span className="logistics-label">ANNUAL KEROSENE DEMAND</span>
          <div className="logistics-val mono">
            {forecast.total_annual_litres.toLocaleString()} Litres
          </div>
          <span className="logistics-meta">To maintain indoor health thresholds</span>
        </div>

        <div className="logistics-card">
          <span className="logistics-label">PEAK WINTER MONTH (JAN)</span>
          <div className="logistics-val mono text-ice">
            {forecast.monthly?.find(m => m.month === 'Jan')?.sorties || '—'} sorties
          </div>
          <span className="logistics-meta">Heaviest snow corridor constraint</span>
        </div>
      </div>

      {/* 4. Monthly Sortie & Fuel Distribution Chart */}
      <div className="forecast-chart-card">
        <h3 className="card-heading">Projected Monthly Helicopter Sorties</h3>
        <span className="card-sub">
          Shows severe winter concentration (Oct–Apr); summer sorties drop to baseline surveillance.
        </span>

        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={forecast.monthly} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <XAxis dataKey="month" stroke="var(--espresso-70)" fontSize={12} />
              <YAxis stroke="var(--espresso-70)" fontSize={11} tickFormatter={v => `${v} sorties`} />
              <Tooltip
                formatter={(val) => [`${val} Sorties`, 'Helicopter Missions']}
                contentStyle={{ backgroundColor: 'var(--cream)', borderColor: 'var(--rule)' }}
              />
              <Bar dataKey="sorties" radius={[4, 4, 0, 0]}>
                {forecast.monthly?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.sorties > 4.0 ? 'var(--orange)' : 'var(--ice)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Outpost Breakdown Table */}
      <div className="forecast-table-card">
        <h3 className="card-heading">Sortie Requirements by Outpost</h3>
        <table className="forecast-table">
          <thead>
            <tr>
              <th>Post Name</th>
              <th>District</th>
              <th>Annual Kerosene</th>
              <th>Projected Sorties</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {forecast.site_monthly_breakdown?.map(s => (
              <tr key={s.site_id} onClick={() => navigate(`/sites/${s.site_id}`)}>
                <td className="site-name-cell font-bold">{s.site_name}</td>
                <td>{s.district}</td>
                <td className="mono">{s.annual_litres.toLocaleString()} L</td>
                <td className="mono text-orange font-bold">{s.annual_sorties} sorties</td>
                <td className="arrow-cell"><ArrowRight size={14} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
