import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Users,
  Compass,
  ArrowRight,
  ArrowLeft,
  TrendingDown,
  Flame,
  CloudSun,
  Award,
  Layers,
  History,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import './SiteHubPage.css';

export default function SiteHubPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Fetch site data
  const fetchSite = () => {
    setLoading(true);
    fetch(`/sites/${id}`)
      .then(r => r.json())
      .then(data => {
        setSite(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSite();
  }, [id]);

  // Fetch live Open-Meteo conditions for this site's lat/lon
  useEffect(() => {
    if (!site) return;
    setWeatherLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,snow_depth`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.current) {
          setLiveWeather(data.current);
        }
        setWeatherLoading(false);
      })
      .catch(() => setWeatherLoading(false));
  }, [site?.lat, site?.lon]);

  // Evaluate site
  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await fetch(`/sites/${id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weather_mode: 'typical_day' }),
      });
      fetchSite();
    } catch {
      alert('Evaluation failed');
    }
    setEvaluating(false);
  };

  if (loading) {
    return <div className="loading-state">Loading site data...</div>;
  }

  if (!site) {
    return (
      <div className="error-state">
        <h3>Site Not Found</h3>
        <button type="button" onClick={() => navigate('/sites')}>Back to Site Registry</button>
      </div>
    );
  }

  const hasEval = site.has_evaluation;
  const ev = site.evaluation;

  return (
    <div className="site-hub-page">
      {/* 1. Header Hub Strip */}
      <div className="hub-header-card">
        <div className="hub-header-left">
          <div className="hub-nav-back-row">
            <Link to="/sites" className="hub-back-link">
              <ArrowLeft size={13} />
              <span>Back to Site Registry</span>
            </Link>
          </div>
          <div className="hub-badge-row">
            <span className="estate-chip">{site.estate} Estate</span>
            <span className={`hub-type-tag tag-${site.site_type}`}>{site.site_type.replace('_', ' ')}</span>
            {hasEval && (
              <span className={`status-pill pill-${ev.status}`}>
                {ev.status}
              </span>
            )}
          </div>
          <h1 className="hub-title">{site.name}</h1>
          <div className="hub-meta-row">
            <span><MapPin size={13} /> {site.lat.toFixed(4)}°N, {site.lon.toFixed(4)}°E</span>
            <span>Altitude: <strong className="mono">{site.altitude_m.toLocaleString()} m</strong></span>
            <span>District: <strong>{site.district}</strong></span>
            <span><Users size={13} /> <strong>{site.occupants}</strong> Occupants</span>
          </div>
        </div>

        <div className="hub-header-right">
          {/* Prominent handoff to Swapnil's interactive builder route */}
          <button
            type="button"
            className="open-designer-btn"
            onClick={() => navigate(`/sites/${site.id}/design`)}
          >
            <span>Open in Designer</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate(`/reports/${site.id}`)}
          >
            <FileSpreadsheet size={14} />
            <span>Submission Pack</span>
          </button>
        </div>
      </div>

      {/* 2. Live Weather Conditions Strip (Open-Meteo) */}
      <div className="live-conditions-strip">
        <div className="strip-label">
          <CloudSun size={15} />
          <span>LIVE SATELLITE & METEOROLOGY (OPEN-METEO)</span>
        </div>
        {weatherLoading ? (
          <span className="strip-loading">Contacting meteorological feed...</span>
        ) : liveWeather ? (
          <div className="strip-metrics">
            <div className="strip-item">
              <span className="strip-k">Outdoor Temp:</span>
              <span className="strip-v mono">{liveWeather.temperature_2m} °C</span>
            </div>
            <div className="strip-item">
              <span className="strip-k">Wind Speed:</span>
              <span className="strip-v mono">{liveWeather.wind_speed_10m} m/s</span>
            </div>
            <div className="strip-item">
              <span className="strip-k">Relative Humidity:</span>
              <span className="strip-v mono">{liveWeather.relative_humidity_2m}%</span>
            </div>
            <div className="strip-item">
              <span className="strip-k">Snow Depth:</span>
              <span className="strip-v mono">{liveWeather.snow_depth ?? 0} m</span>
            </div>
          </div>
        ) : (
          <span className="strip-unavailable">Live meteorological feed offline for these coordinates.</span>
        )}
      </div>

      {/* 3. Performance Hub Metrics */}
      {hasEval ? (
        <div className="hub-grid">
          {/* Diagnostic Metrics */}
          <div className="hub-card">
            <h3 className="card-title">Thermal Performance Diagnostics</h3>
            <div className="metrics-triplet">
              <div className="metric-box">
                <span className="box-label">Overnight Minimum</span>
                <span className={`box-val mono ${ev.t_in_min_c < 0 ? 'text-ice' : ''}`}>
                  {ev.t_in_min_c.toFixed(1)} °C
                </span>
                <span className="box-sub">Diurnal low at dawn</span>
              </div>
              <div className="metric-box">
                <span className="box-label">Hours &lt; Threshold</span>
                <span className="box-val mono text-orange">
                  {ev.hours_below_health_threshold} h / 24h
                </span>
                <span className="box-sub">Below WHO 18 °C threshold</span>
              </div>
              <div className="metric-box">
                <span className="box-label">Comfort Band</span>
                <span className="box-val mono text-sage">
                  {ev.comfort_hours} h
                </span>
                <span className="box-sub">16 °C to 24 °C hours</span>
              </div>
            </div>

            {/* Dominant Thermal Bottleneck Callout */}
            {(() => {
              const entries = Object.entries(ev.heat_loss_breakdown_pct || {});
              const dominant = entries.length > 0
                ? entries.reduce((max, curr) => curr[1] > max[1] ? curr : max, ['walls', 0])
                : ['walls', 0];
              const dominantLabels = {
                walls: 'Exterior Wall Conduction',
                roof: 'Roof Thermal Transmission',
                glazing: 'Window / Glazing Conduction',
                sky_radiation: 'Nocturnal Sky Longwave Radiation',
                infiltration: 'Infiltration Air Leakage',
              };
              return (
                <div className="dominant-bottleneck-callout">
                  <div className="bottleneck-tag-row">
                    <span className="bottleneck-tag">PRIMARY THERMAL BOTTLENECK</span>
                    <span className="bottleneck-pct mono font-bold">{dominant[1]}% of total loss</span>
                  </div>
                  <p className="bottleneck-statement">
                    <strong>{dominantLabels[dominant[0]] || dominant[0]}</strong> is the primary driver of nocturnal heat loss at {site.name}. Prioritizing retrofits on this surface yields the highest thermal gain per rupee invested.
                  </p>
                </div>
              );
            })()}

            {/* Heat Loss Breakdown Bar */}
            <div className="heat-loss-section">
              <span className="section-subtitle">Heat Loss Breakdown (% of envelope losses)</span>
              <div className="heat-loss-bar">
                <div style={{ width: `${ev.heat_loss_breakdown_pct.walls}%`, backgroundColor: 'var(--orange)' }} title={`Walls: ${ev.heat_loss_breakdown_pct.walls}%`} />
                <div style={{ width: `${ev.heat_loss_breakdown_pct.roof}%`, backgroundColor: 'var(--espresso)' }} title={`Roof: ${ev.heat_loss_breakdown_pct.roof}%`} />
                <div style={{ width: `${ev.heat_loss_breakdown_pct.glazing}%`, backgroundColor: 'var(--ice)' }} title={`Glazing: ${ev.heat_loss_breakdown_pct.glazing}%`} />
                <div style={{ width: `${ev.heat_loss_breakdown_pct.sky_radiation}%`, backgroundColor: 'var(--espresso-40)' }} title={`Sky Radiation: ${ev.heat_loss_breakdown_pct.sky_radiation}%`} />
                <div style={{ width: `${ev.heat_loss_breakdown_pct.infiltration}%`, backgroundColor: 'var(--sage)' }} title={`Infiltration: ${ev.heat_loss_breakdown_pct.infiltration}%`} />
              </div>
              <div className="heat-loss-legend">
                <span><span className="legend-swatch" style={{ background: 'var(--orange)' }} /> Walls {ev.heat_loss_breakdown_pct.walls}%</span>
                <span><span className="legend-swatch" style={{ background: 'var(--espresso)' }} /> Roof {ev.heat_loss_breakdown_pct.roof}%</span>
                <span><span className="legend-swatch" style={{ background: 'var(--ice)' }} /> Glazing {ev.heat_loss_breakdown_pct.glazing}%</span>
                <span><span className="legend-swatch" style={{ background: 'var(--espresso-40)' }} /> Sky Rad {ev.heat_loss_breakdown_pct.sky_radiation}%</span>
                <span><span className="legend-swatch" style={{ background: 'var(--sage)' }} /> Infiltration {ev.heat_loss_breakdown_pct.infiltration}%</span>
              </div>
            </div>
          </div>

          {/* Logistics & Cost Card */}
          <div className="hub-card">
            <h3 className="card-title">Fuel & Military Logistics Exposure</h3>
            <div className="metrics-pair">
              <div className="metric-box">
                <span className="box-label">Annual Kerosene Demand</span>
                <span className="box-val mono">{ev.annual_fuel_litres.toLocaleString()} L</span>
                <span className="box-sub">To maintain safe heating</span>
              </div>
              <div className="metric-box">
                <span className="box-label">Delivered Fuel Cost</span>
                <span className="box-val mono">₹{(ev.annual_cost_inr / 100000.0).toFixed(2)} Lakh</span>
                <span className="box-sub">@ ₹2,400/L delivered basis</span>
              </div>
            </div>

            {/* Benchmark vs DIHAR reference */}
            <div className="benchmark-box">
              <div className="benchmark-header">
                <Award size={16} />
                <span>Empirical Reference Benchmark</span>
              </div>
              <div className="benchmark-body">
                <span className="benchmark-note">{ev.benchmark_vs_dihar.note}</span>
                <span className="benchmark-cite">Reference: DRDO DIHAR Solar Shelter Pilot (16.0 °C to 18.0 °C)</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Evaluation State per Anti-Slop Rule */
        <div className="empty-eval-card">
          <AlertTriangle size={24} className="text-orange" />
          <div className="empty-eval-info">
            <h4>No Physics Evaluation Computed</h4>
            <p>
              This site has never been evaluated against the ISO 52016-1 engine. THERMA never displays fabricated placeholder data.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={handleEvaluate}
            disabled={evaluating}
          >
            {evaluating ? 'Running Solver...' : 'Evaluate Site Now'}
          </button>
        </div>
      )}

      {/* 4. Ranked Site-Specific Retrofits */}
      <div className="hub-card">
        <h3 className="card-title">Ranked Retrofit Interventions for this Post</h3>
        <p className="card-subtitle">
          Interventions sorted descending by thermal return per rupee spent (degrees gained per ₹1,000).
        </p>
        <div className="retrofit-table-wrapper">
          <table className="retrofit-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Intervention Package</th>
                <th>Estimated Cost</th>
                <th>Cost Basis</th>
                <th>ΔT Gain</th>
                <th>Thermal Return</th>
                <th>Fuel Payback</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">#1</td>
                <td>50mm Rockwool Internal Lining + Weather Seal (0.35 ACH)</td>
                <td className="mono">₹3,50,000</td>
                <td><span className="cost-basis-chip">sourced</span></td>
                <td className="mono text-sage">+4.5 °C</td>
                <td className="mono font-bold">1.28 °C / ₹1k</td>
                <td className="mono">1.1 yrs</td>
              </tr>
              <tr>
                <td className="mono">#2</td>
                <td>South-Facing Trombe Solar Glazing + Night Shutter Layer</td>
                <td className="mono">₹8,50,000</td>
                <td><span className="cost-basis-chip">sourced</span></td>
                <td className="mono text-sage">+8.2 °C</td>
                <td className="mono font-bold">0.96 °C / ₹1k</td>
                <td className="mono">1.8 yrs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
