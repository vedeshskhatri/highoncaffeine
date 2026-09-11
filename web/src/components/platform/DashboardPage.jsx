import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Building2,
  Flame,
  AlertTriangle,
  TrendingDown,
  Clock,
  ArrowRight,
  BarChart3,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './DashboardPage.css';

export default function DashboardPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/estate/summary?estate=${encodeURIComponent(estate)}`)
      .then(r => r.json())
      .then(data => {
        setSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [estate]);

  if (loading) {
    return <div className="loading-state">Computing estate telemetry...</div>;
  }

  if (!summary) {
    return <div className="error-state">Unable to load estate telemetry.</div>;
  }

  const aggs = summary.aggregates;
  const isStale = summary.is_stale;

  // Formatting currency in Crores or Lakhs
  const costCr = (aggs.annual_cost_inr / 10000000.0).toFixed(2);

  return (
    <div className="dashboard-page">
      {/* 1. Header & Stale Evaluated Warning */}
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">Thermal Estate Dashboard</h2>
          <p className="dashboard-subtitle">
            Macroscopic thermal performance and fuel expenditure monitoring across {estate} Estate.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            type="button"
            className="refresh-btn"
            onClick={() => {
              setRefreshing(true);
              fetchSummary();
              setTimeout(() => setRefreshing(false), 800);
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Stale Warning Banner per Prompt Addition */}
      {isStale && (
        <div className="stale-warning-banner">
          <Clock size={16} />
          <span>
            Notice: {summary.unevaluated_sites} site(s) currently unevaluated. Aggregates accurately reflect the {summary.coverage_str}.
          </span>
          <button
            type="button"
            className="banner-action-btn"
            onClick={() => navigate('/sites')}
          >
            Evaluate remaining posts in Site Registry →
          </button>
        </div>
      )}

      {/* 2. Headline Aggregate Strip per Phase P3 & Addition Rule */}
      <div className="aggregate-strip-grid">
        <div className="agg-card">
          <div className="agg-card-header">
            <span className="agg-label">TOTAL OPERATIONAL SITES</span>
            <Building2 size={16} className="text-muted" />
          </div>
          <div className="agg-value mono">{summary.total_sites}</div>
          <div className="agg-meta">
            Coverage: <strong>{summary.coverage_str}</strong> evaluated
          </div>
        </div>

        <div className="agg-card">
          <div className="agg-card-header">
            <span className="agg-label">ANNUAL KEROSENE DEMAND</span>
            <Flame size={16} className="text-orange" />
          </div>
          <div className="agg-value mono">{aggs.annual_fuel_litres.toLocaleString()} L/yr</div>
          <div className="agg-meta">
            (across {summary.coverage_str})
          </div>
        </div>

        <div className="agg-card">
          <div className="agg-card-header">
            <span className="agg-label">SUPPLY CHAIN EXPOSURE</span>
            <TrendingDown size={16} className="text-ice" />
          </div>
          <div className="agg-value mono">₹{costCr} Cr</div>
          <div className="agg-meta">
            @ ₹2,400/L delivered to forward posts
          </div>
        </div>

        <div className="agg-card">
          <div className="agg-card-header">
            <span className="agg-label">CARBON FOOTPRINT</span>
            <BarChart3 size={16} className="text-sage" />
          </div>
          <div className="agg-value mono">{aggs.annual_co2_tonnes} t CO₂</div>
          <div className="agg-meta">
            Combustion emissions avoidance target
          </div>
        </div>
      </div>

      {/* 3. Operational Sections Grid */}
      <div className="dashboard-grid">
        {/* Worst-Performing Posts (Hours below WHO 18 °C threshold) */}
        <div className="dash-card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-heading">Worst-Performing Posts</h3>
              <span className="card-sub">Ranked by hours below the WHO 18.0 °C health threshold</span>
            </div>
            <button
              type="button"
              className="text-link-btn"
              onClick={() => navigate('/programme')}
            >
              Prioritize in Planner →
            </button>
          </div>

          <div className="worst-sites-list">
            {summary.worst_performing_sites.map((s, idx) => (
              <div
                key={s.id}
                className="worst-site-row"
                onClick={() => navigate(`/sites/${s.id}`)}
              >
                <div className="site-rank-badge mono">#{idx + 1}</div>
                <div className="site-row-main">
                  <span className="site-row-name">{s.name}</span>
                  <span className="site-row-sub">{s.district} District</span>
                </div>
                <div className="site-row-stats">
                  <div className="stat-unit">
                    <span className="stat-label">Min Temp</span>
                    <span className={`stat-val mono ${s.t_in_min_c < 0 ? 'text-ice' : ''}`}>
                      {s.t_in_min_c} °C
                    </span>
                  </div>
                  <div className="stat-unit">
                    <span className="stat-label">Hours &lt; 18 °C</span>
                    <span className="stat-val mono text-orange">
                      {s.hours_below_health_threshold} h
                    </span>
                  </div>
                  <div className="stat-unit">
                    <span className="stat-label">Annual Fuel</span>
                    <span className="stat-val mono">
                      {s.annual_fuel_litres.toLocaleString()} L
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} className="site-row-arrow" />
              </div>
            ))}
          </div>
        </div>

        {/* District Fuel Exposure Breakdown (Recharts) */}
        <div className="dash-card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-heading">Fuel Exposure by District</h3>
              <span className="card-sub">Aggregated annual litres demand by geographical sector</span>
            </div>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.district_exposure} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <XAxis dataKey="district" stroke="var(--espresso-70)" fontSize={12} />
                <YAxis stroke="var(--espresso-70)" fontSize={11} tickFormatter={v => `${v / 1000}k L`} />
                <Tooltip
                  formatter={(val) => [`${val.toLocaleString()} Litres`, 'Annual Fuel']}
                  contentStyle={{ backgroundColor: 'var(--cream)', borderColor: 'var(--rule)' }}
                />
                <Bar dataKey="annual_fuel_litres" radius={[4, 4, 0, 0]}>
                  {summary.district_exposure.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--orange)' : 'var(--ice)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Temperature Band Distribution Strip */}
          <div className="temp-bands-wrapper">
            <span className="bands-title">Estate Temperature Band Distribution</span>
            <div className="bands-strip">
              {summary.temperature_bands.map((b, i) => (
                <div key={b.band} className="band-card">
                  <span className="band-name">{b.band}</span>
                  <span className="band-count mono">{b.count} posts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
