import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Bot,
  MapPin,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  FileText,
  Boxes,
  ShieldCheck,
  Send,
  Loader2,
  ExternalLink,
  Thermometer,
  Activity,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import './CpwdPage.css';

const API_BASE = 'http://127.0.0.1:8000';

const HIMALAYAN_SCENARIO_LOCATIONS = [
  { id: 'all', name: 'All Himalayan Sites (Auto-Detect)' },
  { id: 'Siachen_Base_Camp', name: 'Siachen Base Camp (3,600m)' },
  { id: 'Siachen_Glacier_High_Camp', name: 'Siachen High Camp (4,800m)' },
  { id: 'Daulat_Beg_Oldie', name: 'Daulat Beg Oldie (5,065m)' },
  { id: 'Depsang_Plains', name: 'Depsang Plains (4,920m)' },
  { id: 'Galwan_Valley', name: 'Galwan Valley (4,350m)' },
  { id: 'Pangong_North', name: 'Pangong North (4,250m)' },
  { id: 'Chushul', name: 'Chushul (4,350m)' },
  { id: 'Rezang_La', name: 'Rezang La (4,850m)' },
  { id: 'Hanle', name: 'Hanle (4,500m)' },
  { id: 'Nyoma', name: 'Nyoma (4,180m)' },
  { id: 'Kargil_Ridge', name: 'Kargil Ridge (2,670m)' },
  { id: 'Dras', name: 'Dras (3,280m)' },
  { id: 'Sonamarg', name: 'Sonamarg (2,730m)' },
  { id: 'Keylong', name: 'Keylong (3,080m)' },
  { id: 'Kunzum_Pass', name: 'Kunzum Pass (4,550m)' },
  { id: 'Rohtang_Pass', name: 'Rohtang Pass (3,978m)' },
  { id: 'Spiti_Kaza', name: 'Spiti Kaza (3,800m)' },
  { id: 'Baralacha_La', name: 'Baralacha La (4,890m)' },
  { id: 'Mana_Pass', name: 'Mana Pass (5,630m)' },
  { id: 'Niti_Pass', name: 'Niti Pass (5,068m)' },
  { id: 'Nathu_La', name: 'Nathu La (4,310m)' },
  { id: 'Tawang', name: 'Tawang (3,048m)' },
  { id: 'Bum_La', name: 'Bum La (4,630m)' },
  { id: 'Se_La', name: 'Se La (4,170m)' },
];

const SUGGESTED_QUERIES = [
  'What is the predicted indoor temperature for a shelter in Siachen Base Camp with stone masonry and 0.5 ACH?',
  'What is the predicted performance in Dras at -25°C with PUF sandwich panels and 0.35 ACH?',
  'What will be the dominant heat loss bottleneck in Leh with mud brick walls?',
  'Is an unflued combustion heater safe with 0.2 ACH in Siachen?',
  'Compare thermal performance of 50mm PUF vs 100mm EPS in Daulat Beg Oldie',
  'What are the recommended wall materials for Galwan Valley at 4350m altitude?',
];

const FLUX_META = {
  sky_longwave_loss_W: {
    label: 'Sky Longwave Radiative Loss',
    sub: 'Radiative cooling exchange with clear celestial sky dome',
    color: '#3B82F6',
  },
  wall_conduction_W: {
    label: 'Wall Fabric Conduction',
    sub: 'Conductive heat transmission across exterior vertical envelope',
    color: '#C2410C',
  },
  glazing_conduction_W: {
    label: 'Glazing Assembly Conduction',
    sub: 'Direct conductive loss through window glazing panes',
    color: '#D97706',
  },
  roof_conduction_W: {
    label: 'Roof Assembly Conduction',
    sub: 'Heat transmission through ceiling insulation & CGI roof sheet',
    color: '#9A3412',
  },
  infiltration_heat_loss_W: {
    label: 'Infiltration Air Leakage',
    sub: 'Sensible convective enthalpy loss from sub-zero air exchange',
    color: '#64748B',
  },
  floor_conduction_W: {
    label: 'Permafrost / Ground Conduction',
    sub: 'Sub-structure heat flux transmission into frozen ground slab',
    color: '#78716C',
  },
};

function formatInlineMathAndBold(text) {
  if (!text) return text;
  // Clean raw LaTeX math notation: ($T_{in}$) -> (Tin), etc.
  let cleaned = text
    .replace(/\(\$T_\{?in\}?\$\)/g, '(Tin)')
    .replace(/\(\$T_\{?op\}?\$\)/g, '(Top)')
    .replace(/\(\$T_\{?mrt\}?\$\)/g, '(Tmrt)')
    .replace(/\(\$?\\Delta\s*T\$\)/g, '(ΔT)')
    .replace(/\$([^\$]+)\$/g, '$1');

  // Split on bold ** and code `
  const parts = cleaned.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="mono-code-chip mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function RenderDiagnosticAnswer({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="diagnostic-bullet-list">
          {currentList.map((item, i) => (
            <li key={i}>{formatInlineMathAndBold(item)}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      flushList();
      const title = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4 key={`head-${idx}`} className="diagnostic-section-title">
          {title}
        </h4>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={`step-${idx}`} className="diagnostic-numbered-item">
          {formatInlineMathAndBold(trimmed)}
        </div>
      );
    } else {
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="diagnostic-prose">
          {formatInlineMathAndBold(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return <div className="diagnostic-answer-container">{elements}</div>;
}

export default function CpwdPage() {
  const [activeTab, setActiveTab] = useState('sites'); // 'sites' | 'materials' | 'studio' | 'registry'
  const [modelMeta, setModelMeta] = useState(null);

  // Sites Tab State
  const [sitesList, setSitesList] = useState([]);
  const [sitesSearch, setSitesSearch] = useState('');

  // Materials Tab State
  const [materialsList, setMaterialsList] = useState([]);
  const [materialsSearch, setMaterialsSearch] = useState('');

  // Interactive Studio Tab State
  const [studioLoc, setStudioLoc] = useState('Siachen_Base_Camp');
  const [studioTemp, setStudioTemp] = useState(-20);
  const [studioMat, setStudioMat] = useState('stone_masonry');
  const [studioInsMm, setStudioInsMm] = useState(50);
  const [studioRoofInsMm, setStudioRoofInsMm] = useState(80);
  const [studioAch, setStudioAch] = useState(0.5);
  const [studioGlazing, setStudioGlazing] = useState(4.0);
  const [studioOccupants, setStudioOccupants] = useState(8);
  const [studioHeater, setStudioHeater] = useState('none');
  const [studioResult, setStudioResult] = useState(null);
  const [studioLoading, setStudioLoading] = useState(false);

  // Fetch Model Meta & Initial Lists
  useEffect(() => {
    fetch(`${API_BASE}/api/ml/models`)
      .then((r) => r.json())
      .then((data) => setModelMeta(data))
      .catch((err) => console.warn('Could not fetch ML models metadata', err));

    fetch(`${API_BASE}/api/ml/locations`)
      .then((r) => r.json())
      .then((data) => setSitesList(data || []))
      .catch(() => {});

    fetch(`${API_BASE}/api/ml/materials`)
      .then((r) => r.json())
      .then((data) => setMaterialsList(data || []))
      .catch(() => {});
  }, []);

  // Run Studio Prediction
  const handleRunStudio = async () => {
    setStudioLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ml/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: studioLoc,
          outdoor_temperature_C: studioTemp,
          wall_material: studioMat,
          wall_insulation_thickness_m: studioInsMm / 1000.0,
          roof_insulation_thickness_m: studioRoofInsMm / 1000.0,
          ach: parseFloat(studioAch),
          glazing_area_m2: parseFloat(studioGlazing),
          occupants: parseInt(studioOccupants, 10),
          heater_type: studioHeater,
          night_shutter: true,
        }),
      });
      const data = await res.json();
      setStudioResult(data);
    } catch (err) {
      console.error('Studio Prediction Error', err);
    } finally {
      setStudioLoading(false);
    }
  };

  return (
    <div className="cpwd-page">
      {/* 1. Header & Status */}
      <header className="cpwd-header">
        <div className="cpwd-title-group">
          <span className="cpwd-badge-tag">
            <Brain size={12} />
            DRDO PS 26051 · SURROGATE AI ENGINE
          </span>
          <h1 className="cpwd-title">THERMA Thermal AI & High-Altitude Knowledge Engine</h1>
          <p className="cpwd-subtitle">
            Physics-grounded surrogate intelligence for high-altitude shelter thermal design. Trained on the final
            120,000-row master timeseries across 39 Himalayan border posts, 102 envelope materials, and 5 surrogate ML models.
          </p>
        </div>

        <div className="cpwd-status-bar">
          <div className="status-pill online">
            <span className="status-dot"></span>
            <span>Ollama: llama3.2 (Active · Local)</span>
          </div>

          <div className="status-pill">
            <span>
              Final Dataset: <strong>120,000 Rows · 5,000 Simulations</strong>
            </span>
          </div>

          <div className="status-pill">
            <span>
              Surrogate Models: <strong>5 Active (Test R²: 0.9015 · Safety: 100%)</strong>
            </span>
          </div>
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <nav className="cpwd-tabs" aria-label="Thermal AI Tool Tabs">
        <button
          type="button"
          className="cpwd-tab-btn"
          style={{ color: '#0284c7', borderColor: 'rgba(2, 132, 199, 0.4)', background: 'rgba(2, 132, 199, 0.06)' }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-therma-orb'))}
          title="Open the Grounded Thermal AI Chatbox Orb"
        >
          <Sparkles size={15} />
          <span>Launch AI Assistant (Orb)</span>
        </button>

        <button
          type="button"
          className={`cpwd-tab-btn ${activeTab === 'sites' ? 'active' : ''}`}
          onClick={() => setActiveTab('sites')}
        >
          <MapPin size={15} />
          <span>Himalayan Sites Registry</span>
        </button>

        <button
          type="button"
          className={`cpwd-tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => setActiveTab('materials')}
        >
          <Boxes size={15} />
          <span>Envelope Materials Catalog</span>
        </button>

        <button
          type="button"
          className={`cpwd-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('studio');
            if (!studioResult) handleRunStudio();
          }}
        >
          <Sliders size={15} />
          <span>Parametric Envelope Studio</span>
        </button>

        <button
          type="button"
          className={`cpwd-tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          <FileText size={15} />
          <span>Master Dataset Registry</span>
        </button>
      </nav>

      {/* 3. Tab Contents */}

      {/* TAB: Himalayan Sites Registry */}
      {activeTab === 'sites' && (
        <section className="cpwd-card">
          <div className="cpwd-search-strip">
            <div className="cpwd-input-box">
              <Search size={16} className="cpwd-input-icon" />
              <input
                type="text"
                placeholder="Filter by site name, region, or altitude..."
                value={sitesSearch}
                onChange={(e) => setSitesSearch(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--espresso-70)' }}>
              Showing {sitesList.filter((s) => s.location.toLowerCase().includes(sitesSearch.toLowerCase())).length} of {sitesList.length} High-Altitude Sites
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="cpwd-data-table">
              <thead>
                <tr>
                  <th>Location Name</th>
                  <th>Region</th>
                  <th>Altitude (m)</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sitesList
                  .filter((s) => s.location.toLowerCase().includes(sitesSearch.toLowerCase()))
                  .map((site, sIdx) => (
                    <tr key={sIdx}>
                      <td style={{ fontWeight: 600 }}>{site.location.replace(/_/g, ' ')}</td>
                      <td>
                        <span className="citation-pill" style={{ padding: '2px 8px' }}>
                          {site.region}
                        </span>
                      </td>
                      <td className="mono">{site.altitude_m?.toLocaleString()} m</td>
                      <td className="mono">{site.latitude_deg?.toFixed(2)}° N</td>
                      <td className="mono">{site.longitude_deg?.toFixed(2)}° E</td>
                      <td>
                        <button
                          type="button"
                          className="cpwd-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => {
                            const q = `What is the predicted indoor temperature for a shelter in ${site.location}?`;
                            window.dispatchEvent(new CustomEvent('open-therma-orb', {
                              detail: { query: q, site: site.location }
                            }));
                          }}
                        >
                          Ask AI
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: Envelope Materials Catalog */}
      {activeTab === 'materials' && (
        <section className="cpwd-card">
          <div className="cpwd-search-strip">
            <div className="cpwd-input-box">
              <Search size={16} className="cpwd-input-icon" />
              <input
                type="text"
                placeholder="Filter materials by name or category..."
                value={materialsSearch}
                onChange={(e) => setMaterialsSearch(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--espresso-70)' }}>
              102 Scientific Materials Verified in Final Dataset
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="cpwd-data-table">
              <thead>
                <tr>
                  <th>Material ID / Name</th>
                  <th>Thermal Conductivity (k)</th>
                  <th>Density (ρ)</th>
                  <th>Specific Heat (Cp)</th>
                  <th>Solar Absorptance</th>
                  <th>Query AI</th>
                </tr>
              </thead>
              <tbody>
                {materialsList
                  .filter((m) => m.material.toLowerCase().includes(materialsSearch.toLowerCase()))
                  .map((mat, mIdx) => (
                    <tr key={mIdx}>
                      <td style={{ fontWeight: 600 }}>{mat.material.replace(/_/g, ' ')}</td>
                      <td className="mono">{mat.k_W_mK} W/m·K</td>
                      <td className="mono">{mat.rho_kg_m3} kg/m³</td>
                      <td className="mono">{mat.cp_J_kgK} J/kg·K</td>
                      <td className="mono">{mat.solar_absorptance}</td>
                      <td>
                        <button
                          type="button"
                          className="cpwd-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => {
                            const q = `How does using ${mat.material.replace(/_/g, ' ')} affect shelter thermal comfort in Dras?`;
                            window.dispatchEvent(new CustomEvent('open-therma-orb', {
                              detail: { query: q, site: 'Dras' }
                            }));
                          }}
                        >
                          Evaluate Material
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: Parametric Envelope Studio */}
      {activeTab === 'studio' && (
        <section className="cpwd-card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
            Parametric Envelope ML Studio
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--espresso-70)', margin: '0 0 20px 0' }}>
            Adjust shelter design parameters to observe instantaneous surrogate ML predictions across temperatures,
            heat loss flux breakdown, and life-safety status.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Himalayan Scenario Location
              </label>
              <select
                className="cpwd-select"
                style={{ width: '100%' }}
                value={studioLoc}
                onChange={(e) => setStudioLoc(e.target.value)}
              >
                {HIMALAYAN_SCENARIO_LOCATIONS.filter((l) => l.id !== 'all').map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                <span>Outdoor Ambient Temp</span>
                <span style={{ color: 'var(--orange)', fontFamily: 'var(--font-mono)' }}>{studioTemp} °C</span>
              </label>
              <input
                type="range"
                min="-35"
                max="5"
                step="1"
                value={studioTemp}
                onChange={(e) => setStudioTemp(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--orange)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Wall Construction Material
              </label>
              <select
                className="cpwd-select"
                style={{ width: '100%' }}
                value={studioMat}
                onChange={(e) => setStudioMat(e.target.value)}
              >
                <option value="stone_masonry">Stone Masonry (Granite)</option>
                <option value="mud_brick">Mud Brick (Adobe)</option>
                <option value="rammed_earth">Rammed Earth</option>
                <option value="puf_sandwich">PUF Sandwich Panel</option>
                <option value="eps">Expanded Polystyrene (EPS)</option>
                <option value="dense_concrete">Dense Concrete</option>
                <option value="wood_pine">Timber Pine</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                <span>Wall Insulation Thickness</span>
                <span style={{ color: 'var(--orange)', fontFamily: 'var(--font-mono)' }}>{studioInsMm} mm</span>
              </label>
              <input
                type="range"
                min="0"
                max="150"
                step="5"
                value={studioInsMm}
                onChange={(e) => setStudioInsMm(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--orange)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                <span>Ventilation Rate (ACH)</span>
                <span
                  style={{
                    color: studioHeater !== 'none' && studioAch < 0.35 ? '#dc2626' : 'var(--orange)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  {studioAch} ACH {studioHeater !== 'none' && studioAch < 0.35 ? '⚠️ UNSAFE' : ''}
                </span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={studioAch}
                onChange={(e) => setStudioAch(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--orange)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Heating Equipment
              </label>
              <select
                className="cpwd-select"
                style={{ width: '100%' }}
                value={studioHeater}
                onChange={(e) => setStudioHeater(e.target.value)}
              >
                <option value="none">None (Passive Solar)</option>
                <option value="bukkhari">Bukkhari (Combustion Wood/Coal)</option>
                <option value="kerosene">Kerosene Heater (Combustion)</option>
                <option value="electric">Electric Radiator</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="cpwd-btn-primary"
            style={{ marginBottom: '20px' }}
            disabled={studioLoading}
            onClick={handleRunStudio}
          >
            {studioLoading ? <RefreshCw size={15} className="spin" /> : <Sliders size={15} />}
            <span>Compute Surrogate ML Prediction</span>
          </button>

          {studioResult && (
            <div className="ai-response-box">
              <div className="thermal-metrics-grid">
                <div className="thermal-metric-tile">
                  <span className="thermal-metric-label">Predicted Tin</span>
                  <span className="thermal-metric-value">{studioResult.predicted_indoor_temperature_C} °C</span>
                  <span className="thermal-metric-sub">Lift: +{studioResult.predicted_temperature_lift_C} °C</span>
                </div>
                <div className="thermal-metric-tile">
                  <span className="thermal-metric-label">Operative Temp</span>
                  <span className="thermal-metric-value">{studioResult.predicted_operative_temperature_C} °C</span>
                  <span className="thermal-metric-sub">Tmrt: {studioResult.predicted_mean_radiant_temperature_C} °C</span>
                </div>
                <div className="thermal-metric-tile">
                  <span className="thermal-metric-label">Dominant Bottleneck</span>
                  <span className="thermal-metric-value" style={{ textTransform: 'uppercase', color: '#b91c1c' }}>
                    {studioResult.dominant_heat_loss_component}
                  </span>
                  <span className="thermal-metric-sub">Max heat loss path</span>
                </div>
                <div className="thermal-metric-tile">
                  <span className="thermal-metric-label">Safety Status</span>
                  <span
                    className={`thermal-badge ${
                      studioResult.predicted_safety_status === 'PASS' ? 'pass' : 'refused'
                    }`}
                  >
                    {studioResult.predicted_safety_status}
                  </span>
                  <span className="thermal-metric-sub">{studioResult.safety_reason}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 5: Master Dataset Registry */}
      {activeTab === 'registry' && (
        <section className="cpwd-card">
          <div className="registry-header">
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
              THERMA Final Master ML Dataset Registry (DRDO PS 26051)
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--espresso-70)', margin: 0 }}>
              Official physics-grounded dataset specifications partitioned strictly by simulation ID with zero data leakage.
            </p>
          </div>

          <div className="metric-stats-row" style={{ marginTop: '16px' }}>
            <div className="metric-stat-card">
              <div className="metric-stat-label">Total Timestep Records</div>
              <div className="metric-stat-value">120,000</div>
            </div>
            <div className="metric-stat-card">
              <div className="metric-stat-label">Distinct Simulations</div>
              <div className="metric-stat-value">5,000</div>
            </div>
            <div className="metric-stat-card">
              <div className="metric-stat-label">Model A Test R²</div>
              <div className="metric-stat-value" style={{ color: 'var(--sage)' }}>0.9015</div>
            </div>
            <div className="metric-stat-card">
              <div className="metric-stat-label">Model E Safety Accuracy</div>
              <div className="metric-stat-value" style={{ color: 'var(--sage)' }}>100.0%</div>
            </div>
          </div>

          <div style={{ marginTop: '20px', fontSize: '13px', lineHeight: '1.7', color: 'var(--espresso-70)' }}>
            <h4 style={{ color: 'var(--espresso)', marginBottom: '8px', fontSize: '14px' }}>
              Dataset Partitions & Provenance:
            </h4>
            <ul>
              <li><strong>Train Split (`train.csv`):</strong> 84,000 rows (3,500 simulations, 70%)</li>
              <li><strong>Validation Split (`validation.csv`):</strong> 18,000 rows (750 simulations, 15%)</li>
              <li><strong>Test Split (`test.csv`):</strong> 18,000 rows (750 simulations, 15%)</li>
              <li><strong>Zero Leakage Guarantee:</strong> Train ∩ Val ∩ Test = ∅ partitioned strictly on <code>simulation_id</code></li>
              <li><strong>Feature Dimensionality:</strong> 59 scientific columns per hourly row</li>
              <li><strong>Physical Grounding:</strong> Altitude-adjusted air density, solar incidence clamping, snow albedo, nocturnal sky radiation, and deterministic safety interlock ($ACH \ge 0.35$ for combustion).</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
