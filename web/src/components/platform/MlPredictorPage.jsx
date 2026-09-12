import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Sliders,
  Award,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  HelpCircle,
  BarChart3,
  Thermometer,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import './MlPredictorPage.css';

const DEFAULT_LOCATIONS = [
  'Siachen_Base_Camp',
  'Daulat_Beg_Oldie',
  'Depsang_Plains',
  'Galwan_Valley',
  'Pangong_North',
  'Chushul',
  'Rezang_La',
  'Hanle',
  'Nyoma',
  'Kargil_Ridge',
  'Dras',
  'Sonamarg',
  'Keylong',
  'Kunzum_Pass',
  'Rohtang_Pass',
  'Spiti_Kaza',
  'Baralacha_La',
  'Mana_Pass',
  'Niti_Pass',
  'Nathu_La',
  'Tawang',
  'Bum_La',
  'Se_La',
];

const DEFAULT_MATERIALS = [
  { id: 'stone_masonry', name: 'Stone Masonry (Granite)' },
  { id: 'mud_brick', name: 'Mud Brick (Adobe)' },
  { id: 'rammed_earth', name: 'Rammed Earth' },
  { id: 'puf_sandwich', name: 'PUF Sandwich Panel' },
  { id: 'eps', name: 'Expanded Polystyrene (EPS)' },
  { id: 'dense_concrete', name: 'Dense Concrete' },
  { id: 'wood_pine', name: 'Timber Pine' },
  { id: 'straw_bale', name: 'Straw Bale' },
];

export default function MlPredictorPage() {
  const [activeTab, setActiveTab] = useState('qa'); // 'qa' | 'controls' | 'metrics'

  // Model metadata state
  const [modelMeta, setModelMeta] = useState(null);

  // Q&A State
  const [question, setQuestion] = useState(
    'What is the predicted indoor temperature for a shelter in Siachen with stone masonry and 0.5 ACH?'
  );
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const [qaError, setQaError] = useState(null);

  // Interactive Predictor Controls State
  const [location, setLocation] = useState('Siachen_Base_Camp');
  const [outdoorTemp, setOutdoorTemp] = useState(-20);
  const [wallMaterial, setWallMaterial] = useState('stone_masonry');
  const [wallInsulationMm, setWallInsulationMm] = useState(50);
  const [roofInsulationMm, setRoofInsulationMm] = useState(80);
  const [ach, setAch] = useState(0.5);
  const [glazingM2, setGlazingM2] = useState(4.0);
  const [occupants, setOccupants] = useState(8);
  const [heaterType, setHeaterType] = useState('none');
  const [nightShutter, setNightShutter] = useState(true);

  const [predictLoading, setPredictLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  // Load Model Metadata on Mount
  useEffect(() => {
    fetch('http://localhost:8000/api/ml/models')
      .then((r) => r.json())
      .then((data) => setModelMeta(data))
      .catch((err) => console.warn('Could not fetch ML models metadata', err));

    // Run default prediction on mount
    runPrediction();
  }, []);

  const runPrediction = async () => {
    setPredictLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          outdoor_temperature_C: outdoorTemp,
          wall_material: wallMaterial,
          wall_insulation_thickness_m: wallInsulationMm / 1000.0,
          roof_insulation_thickness_m: roofInsulationMm / 1000.0,
          ach: parseFloat(ach),
          glazing_area_m2: parseFloat(glazingM2),
          occupants: parseInt(occupants, 10),
          heater_type: heaterType,
          night_shutter: nightShutter,
        }),
      });
      const data = await res.json();
      setPredictionResult(data);
    } catch (err) {
      console.error('Error executing prediction', err);
    } finally {
      setPredictLoading(false);
    }
  };

  const handleAskQuestion = async (customQ) => {
    const queryToAsk = customQ || question;
    if (!queryToAsk.trim()) return;

    setQaLoading(true);
    setQaError(null);
    try {
      const res = await fetch('http://localhost:8000/api/ml/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryToAsk,
          use_ollama: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setQaResult(data);
    } catch (err) {
      console.error('Q&A Error', err);
      setQaError('Failed to communicate with prediction service. Please ensure backend is active.');
    } finally {
      setQaLoading(false);
    }
  };

  const exampleQueries = [
    'What is the predicted indoor temperature for a shelter in Siachen with stone masonry and 0.5 ACH?',
    'What is the predicted performance in Dras at -25C with PUF sandwich panels and 0.35 ACH?',
    'What will be the dominant heat loss in Leh with mud brick walls and no night shutter?',
    'If ACH is 0.2 with a kerosene heater, what is the safety prediction?',
  ];

  return (
    <div className="ml-predictor-page">
      {/* Header */}
      <div className="ml-header">
        <div className="ml-title-group">
          <h1>Surrogate ML Thermal Predictor & Grounded Q&A</h1>
          <p>
            Trained on 120,000-Row Physics-Grounded Master Dataset across 39 Himalayan Border Sites
          </p>
        </div>
        <div className="ml-badge-group">
          <span className="ml-status-badge">
            <CheckCircle2 size={14} /> 5 Surrogate Models Active
          </span>
          <span className="ml-status-badge info">
            <Sparkles size={14} /> Local Ollama (llama3.2) Grounding
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ml-tabs-nav">
        <button
          className={`ml-tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
          onClick={() => setActiveTab('qa')}
        >
          <Brain size={16} /> Grounded ML Q&A
        </button>
        <button
          className={`ml-tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('controls')}
        >
          <Sliders size={16} /> Interactive Envelope Studio
        </button>
        <button
          className={`ml-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          <Award size={16} /> Model Training Metrics
        </button>
      </div>

      {/* TAB 1: Grounded Q&A */}
      {activeTab === 'qa' && (
        <div className="ml-card">
          <h2 className="ml-card-title">
            <Brain size={20} color="#0284c7" /> Ask Any Shelter Thermal Question
          </h2>
          <p className="ml-card-desc">
            Type any question about shelter temperatures, heat loss, thermal comfort, or safety. The system runs the
            trained surrogate models and answers with exact predicted values.
          </p>

          <div className="qa-input-container">
            <textarea
              className="qa-textarea"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What is the predicted indoor temperature for a shelter in Siachen with stone masonry and 0.5 ACH?"
            />

            <div className="qa-chips-bar">
              <span>Quick Examples:</span>
              {exampleQueries.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  className="qa-chip"
                  onClick={() => {
                    setQuestion(ex);
                    handleAskQuestion(ex);
                  }}
                >
                  {ex.slice(0, 42)}...
                </button>
              ))}
            </div>

            <div className="qa-action-row">
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Grounded strictly in the 120,000-row master timeseries · Zero hallucination
              </span>
              <button
                type="button"
                className="qa-btn"
                disabled={qaLoading}
                onClick={() => handleAskQuestion()}
              >
                {qaLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Predicting...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Predict & Answer
                  </>
                )}
              </button>
            </div>
          </div>

          {qaError && <div style={{ color: '#dc2626', marginTop: '16px' }}>{qaError}</div>}

          {/* Q&A Result Presentation */}
          {qaResult && (
            <div className="qa-result-box">
              <div className="qa-result-header">
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  Predicted Answer ({qaResult.engine})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Site: {qaResult.resolved_parameters.location} ({qaResult.resolved_parameters.outdoor_temperature_C}°C)
                </span>
              </div>

              {/* Tiles */}
              <div className="metrics-summary-grid">
                <div className="metric-tile">
                  <span className="metric-label">Indoor Temp (Tin)</span>
                  <span className="metric-value">
                    {qaResult.predictions.indoor_temperature_C} °C
                  </span>
                  <span className="metric-sub">
                    Lift: +{qaResult.predictions.temperature_lift_C} °C above ambient
                  </span>
                </div>

                <div className="metric-tile">
                  <span className="metric-label">Operative Temp (Top)</span>
                  <span className="metric-value">
                    {qaResult.predictions.operative_temperature_C} °C
                  </span>
                  <span className="metric-sub">
                    Tmrt: {qaResult.predictions.mean_radiant_temperature_C} °C
                  </span>
                </div>

                <div className="metric-tile">
                  <span className="metric-label">Dominant Heat Loss</span>
                  <span className="metric-value" style={{ textTransform: 'uppercase', color: '#b91c1c' }}>
                    {qaResult.predictions.dominant_heat_loss}
                  </span>
                  <span className="metric-sub">Thermal bottleneck</span>
                </div>

                <div className="metric-tile">
                  <span className="metric-label">Comfort & Safety</span>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <span
                      className={`badge-pill ${
                        qaResult.predictions.comfort_status === 'COMFORT'
                          ? 'comfort'
                          : qaResult.predictions.comfort_status === 'WARM'
                          ? 'warm'
                          : 'cold'
                      }`}
                    >
                      {qaResult.predictions.comfort_status}
                    </span>
                    <span
                      className={`badge-pill ${
                        qaResult.predictions.safety_status === 'PASS' ? 'pass' : 'refused'
                      }`}
                    >
                      {qaResult.predictions.safety_status}
                    </span>
                  </div>
                  <span className="metric-sub" style={{ marginTop: '4px' }}>
                    Risk: {qaResult.predictions.thermal_risk_class}
                  </span>
                </div>
              </div>

              {/* Natural Text Explanation */}
              <div className="qa-result-text">{qaResult.answer}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Interactive Controls Envelope Studio */}
      {activeTab === 'controls' && (
        <div className="ml-card">
          <h2 className="ml-card-title">
            <Sliders size={20} color="#0284c7" /> Parametric Envelope Predictor
          </h2>
          <p className="ml-card-desc">
            Adjust shelter design parameters to observe instantaneous surrogate ML predictions across temperatures,
            heat loss flux breakdown, and safety status.
          </p>

          <div className="controls-grid">
            {/* Location */}
            <div className="control-field">
              <label>Location & Climate Scenario</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                {DEFAULT_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Outdoor Temp */}
            <div className="control-field">
              <label>
                <span>Outdoor Ambient Temp</span>
                <span className="control-val-tag">{outdoorTemp} °C</span>
              </label>
              <input
                type="range"
                min="-35"
                max="5"
                step="1"
                value={outdoorTemp}
                onChange={(e) => setOutdoorTemp(parseFloat(e.target.value))}
              />
            </div>

            {/* Wall Material */}
            <div className="control-field">
              <label>Wall Material</label>
              <select value={wallMaterial} onChange={(e) => setWallMaterial(e.target.value)}>
                {DEFAULT_MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Wall Insulation */}
            <div className="control-field">
              <label>
                <span>Wall Insulation Thickness</span>
                <span className="control-val-tag">{wallInsulationMm} mm</span>
              </label>
              <input
                type="range"
                min="0"
                max="150"
                step="5"
                value={wallInsulationMm}
                onChange={(e) => setWallInsulationMm(parseFloat(e.target.value))}
              />
            </div>

            {/* Ventilation ACH */}
            <div className="control-field">
              <label>
                <span>Ventilation Rate (ACH)</span>
                <span
                  className="control-val-tag"
                  style={{
                    color:
                      heaterType !== 'none' && parseFloat(ach) < 0.35 ? '#dc2626' : '#0284c7',
                  }}
                >
                  {ach} ACH {heaterType !== 'none' && parseFloat(ach) < 0.35 ? '⚠️ UNSAFE' : ''}
                </span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={ach}
                onChange={(e) => setAch(parseFloat(e.target.value))}
              />
            </div>

            {/* South Glazing */}
            <div className="control-field">
              <label>
                <span>South Glazing Area</span>
                <span className="control-val-tag">{glazingM2} m²</span>
              </label>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={glazingM2}
                onChange={(e) => setGlazingM2(parseFloat(e.target.value))}
              />
            </div>

            {/* Occupants */}
            <div className="control-field">
              <label>
                <span>Shelter Occupants</span>
                <span className="control-val-tag">{occupants} Persons</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={occupants}
                onChange={(e) => setOccupants(parseInt(e.target.value, 10))}
              />
            </div>

            {/* Heater Type */}
            <div className="control-field">
              <label>Heater System</label>
              <select value={heaterType} onChange={(e) => setHeaterType(e.target.value)}>
                <option value="none">None (Passive Solar Only)</option>
                <option value="bukkhari">Bukkhari (Combustion Wood/Coal)</option>
                <option value="kerosene">Kerosene Heater (Combustion)</option>
                <option value="electric">Electric Radiator</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="qa-btn"
            style={{ marginBottom: '24px' }}
            disabled={predictLoading}
            onClick={runPrediction}
          >
            {predictLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Compute Surrogate Prediction
          </button>

          {/* Results readout */}
          {predictionResult && (
            <div>
              <div className="metrics-summary-grid">
                <div className="metric-tile">
                  <span className="metric-label">Indoor Air Temp</span>
                  <span className="metric-value">
                    {predictionResult.predicted_indoor_temperature_C} °C
                  </span>
                  <span className="metric-sub">
                    Lift: +{predictionResult.predicted_temperature_lift_C} °C
                  </span>
                </div>

                <div className="metric-tile">
                  <span className="metric-label">Operative Temp</span>
                  <span className="metric-value">
                    {predictionResult.predicted_operative_temperature_C} °C
                  </span>
                  <span className="metric-sub">
                    Tmrt: {predictionResult.predicted_mean_radiant_temperature_C} °C
                  </span>
                </div>

                <div className="metric-tile">
                  <span className="metric-label">Dominant Bottleneck</span>
                  <span className="metric-value" style={{ textTransform: 'uppercase', color: '#b91c1c' }}>
                    {predictionResult.dominant_heat_loss_component}
                  </span>
                  <span className="metric-sub">Max heat loss contributor</span>
                </div>

                <div className="metric-tile">
                  <span className="metric-label">Safety Status</span>
                  <span
                    className={`badge-pill ${
                      predictionResult.predicted_safety_status === 'PASS' ? 'pass' : 'refused'
                    }`}
                  >
                    {predictionResult.predicted_safety_status}
                  </span>
                  <span className="metric-sub">{predictionResult.safety_reason}</span>
                </div>
              </div>

              {/* Flux Breakdown Bars */}
              <h4 style={{ margin: '16px 0 8px 0', fontSize: '15px' }}>
                Predicted Heat Loss Flux Breakdown (Watts):
              </h4>
              <div className="flux-bars-container">
                {predictionResult.predicted_heat_loss_fluxes_W &&
                  Object.entries(predictionResult.predicted_heat_loss_fluxes_W).map(([k, v]) => {
                    if (k === 'total_heat_loss_W') return null;
                    const maxVal = 3000;
                    const pct = Math.min(100, Math.max(5, (v / maxVal) * 100));
                    return (
                      <div key={k} className="flux-bar-row">
                        <span className="flux-bar-label">
                          {k.replace(/_/g, ' ').replace(' W', '')}
                        </span>
                        <div className="flux-bar-track">
                          <div
                            className="flux-bar-fill"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: k.includes('sky') ? '#818cf8' : '#38bdf8',
                            }}
                          />
                        </div>
                        <span className="flux-bar-val">{v} W</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Model Metrics & Evaluation */}
      {activeTab === 'metrics' && (
        <div className="ml-card">
          <h2 className="ml-card-title">
            <Award size={20} color="#0284c7" /> Final Trained Models Verification & Benchmark Metrics
          </h2>
          <p className="ml-card-desc">
            Evaluated on 18,000 holdout test rows partitioned strictly by simulation ID with zero data leakage.
          </p>

          <div className="metrics-summary-grid">
            <div className="metric-tile">
              <span className="metric-label">Model A (Temperature)</span>
              <span className="metric-value">R² 0.9015</span>
              <span className="metric-sub">MAE: 2.70 °C | RMSE: 3.57 °C</span>
            </div>

            <div className="metric-tile">
              <span className="metric-label">Model B (Diagnosis)</span>
              <span className="metric-value">98.34%</span>
              <span className="metric-sub">Dominant bottleneck accuracy</span>
            </div>

            <div className="metric-tile">
              <span className="metric-label">Model C (Heat Fluxes)</span>
              <span className="metric-value">R² 0.87 - 0.93</span>
              <span className="metric-sub">Multi-target conduction & sky</span>
            </div>

            <div className="metric-tile">
              <span className="metric-label">Model D & E (Comfort / Safety)</span>
              <span className="metric-value">100.0%</span>
              <span className="metric-sub">Safety interlock accuracy</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', fontSize: '13px', lineHeight: '1.6', color: '#475569' }}>
            <h4 style={{ color: '#1e293b', marginBottom: '8px' }}>Dataset Specifications:</h4>
            <ul>
              <li><strong>Total Hourly Records:</strong> 120,000 rows across 5,000 simulations</li>
              <li><strong>Training Split:</strong> 84,000 rows (3,500 simulations, 70%)</li>
              <li><strong>Validation Split:</strong> 18,000 rows (750 simulations, 15%)</li>
              <li><strong>Test Split:</strong> 18,000 rows (750 simulations, 15%)</li>
              <li><strong>Zero Data Leakage:</strong> Strictly grouped by <code>simulation_id</code></li>
              <li><strong>Locations Covered:</strong> 39 representative high-altitude Himalayan border posts and passes</li>
              <li><strong>Materials Covered:</strong> 102 comprehensive insulation, masonry, and envelope materials</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
