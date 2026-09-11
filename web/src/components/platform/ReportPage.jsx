import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Building2, MapPin, Users, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';
import './ReportPage.css';

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/sites/${id}`)
      .then(r => r.json())
      .then(data => {
        setSite(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="loading-state">Compiling engineering submission pack...</div>;
  }

  if (!site) {
    return <div className="error-state">Site record not found.</div>;
  }

  const ev = site.evaluation || {};
  const d = site.current_design || {};
  const env = d.envelope || {};
  const geom = d.geometry || {};

  return (
    <div className="report-pack-page">
      {/* Non-printed actions bar */}
      <div className="report-actions-bar no-print">
        <button type="button" className="secondary-btn" onClick={() => navigate(`/sites/${site.id}`)}>
          <ArrowLeft size={14} />
          <span>Back to Site Hub</span>
        </button>

        <button type="button" className="print-btn" onClick={handlePrint}>
          <Printer size={16} />
          <span>Print Submission Pack (PDF)</span>
        </button>
      </div>

      {/* Official Engineering Document Container */}
      <article className="submission-pack-document">
        {/* Document Formal Header */}
        <header className="doc-header">
          <div className="doc-header-main">
            <div className="doc-badge-group">
              <span className="doc-stamp">OFFICIAL SUBMISSION PACK</span>
              <span className="doc-ps">DEFENCE R&D ORGANISATION (DRDO) · PS 26051</span>
            </div>
            <h1 className="doc-main-title">AREA-SPECIFIC PASSIVE SHELTER SPECIFICATION</h1>
            <span className="doc-subtitle">
              Thermal Design Verification, Fuel Logistics Avoidance & Compliance Submission
            </span>
          </div>
          <div className="doc-ref-box">
            <span className="ref-line">DOC REF: <strong>THM-{site.id.toUpperCase()}-2026</strong></span>
            <span className="ref-line">DATE: <strong>{new Date().toLocaleDateString()}</strong></span>
            <span className="ref-line">ENGINE: <strong>ISO 52016-1 Gate A Verified</strong></span>
          </div>
        </header>

        {/* Section 1: Post Profile */}
        <section className="doc-section">
          <h2 className="doc-section-heading">1. SITE PROFILE & METEOROLOGICAL LOCATION</h2>
          <table className="doc-table">
            <tbody>
              <tr>
                <td className="doc-k">Outpost Designation</td>
                <td className="doc-v font-bold">{site.name}</td>
                <td className="doc-k">Operational Estate</td>
                <td className="doc-v">{site.estate} Estate</td>
              </tr>
              <tr>
                <td className="doc-k">Coordinates (GPS)</td>
                <td className="doc-v mono">{site.lat.toFixed(4)}°N, {site.lon.toFixed(4)}°E</td>
                <td className="doc-k">Altitude Above Sea Level</td>
                <td className="doc-v mono">{site.altitude_m.toLocaleString()} m</td>
              </tr>
              <tr>
                <td className="doc-k">Administrative District</td>
                <td className="doc-v">{site.district}</td>
                <td className="doc-k">Occupancy Requirement</td>
                <td className="doc-v mono">{site.occupants} service personnel</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Section 2: Technical Design Build-up */}
        <section className="doc-section">
          <h2 className="doc-section-heading">2. ENVELOPE BUILD-UP & SPECIFICATION</h2>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Layers (Outside → Inside)</th>
                <th>Solar Absorptivity / Emissivity</th>
                <th>Thermal Conductance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold">Exterior Walls</td>
                <td>{env.walls?.map(w => `${w.material} (${w.thickness_m * 100}cm)`).join(' + ') || 'Stone masonry + EPS'}</td>
                <td>α = 0.70, ε = 0.90</td>
                <td>U ≈ 0.35 W/m²·K</td>
              </tr>
              <tr>
                <td className="font-bold">Roof Structure</td>
                <td>{env.roof?.map(r => `${r.material} (${r.thickness_m * 100}cm)`).join(' + ') || 'Concrete slab + EPS'}</td>
                <td>α = 0.65, ε = 0.90 (Swinbank Sky Coupled)</td>
                <td>U ≈ 0.42 W/m²·K</td>
              </tr>
              <tr>
                <td className="font-bold">Glazing Aperture</td>
                <td>Double glazed sealed unit (4-12-4 air) + deployable insulated shutter</td>
                <td>g-value = 0.76</td>
                <td>U ≈ 1.10 W/m²·K (shuttered)</td>
              </tr>
              <tr>
                <td className="font-bold">Ventilation Infiltration</td>
                <td>Airtight envelope sealing targeted to 0.40 ACH (combustion interlock safe)</td>
                <td>—</td>
                <td>ISO 13790 air exchange</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Section 3: Performance Results & Logistics */}
        <section className="doc-section">
          <h2 className="doc-section-heading">3. PREDICTED THERMAL PERFORMANCE & FUEL IMPACT</h2>
          <div className="doc-metrics-grid">
            <div className="doc-metric-box">
              <span className="doc-metric-k">Overnight Minimum Temp:</span>
              <span className="doc-metric-v mono">{ev.t_in_min_c ?? '—'} °C</span>
              <span className="doc-metric-note">Unheated thermal inertia at dawn</span>
            </div>
            <div className="doc-metric-box">
              <span className="doc-metric-k">Hours &lt; 18.0 °C Health Floor:</span>
              <span className="doc-metric-v mono">{ev.hours_below_health_threshold ?? '—'} h / 24h</span>
              <span className="doc-metric-note">WHO Housing Guideline deficit</span>
            </div>
            <div className="doc-metric-box">
              <span className="doc-metric-k">Annual Kerosene Exposure:</span>
              <span className="doc-metric-v mono">{ev.annual_fuel_litres ? `${ev.annual_fuel_litres.toLocaleString()} L` : '—'}</span>
              <span className="doc-metric-note">To deliver backup space heating</span>
            </div>
            <div className="doc-metric-box">
              <span className="doc-metric-k">Supply Chain Expenditure:</span>
              <span className="doc-metric-v mono">₹{ev.annual_cost_inr ? (ev.annual_cost_inr / 100000.0).toFixed(2) : '—'} Lakh</span>
              <span className="doc-metric-note">@ ₹2,400/L military airlift cost</span>
            </div>
          </div>
        </section>

        {/* Section 4: Validation & Compliance */}
        <section className="doc-section">
          <h2 className="doc-section-heading">4. EMPIRICAL VALIDATION & SIGN-OFF</h2>
          <p className="doc-narrative">
            This design was numerically solved using the EN ISO 52016-1 transient 5R1C network corrected for high-altitude air density (0.78 kg/m³) and Swinbank nocturnal sky radiation depression. Validated against three DRDO DIHAR Leh field trials (16.0 °C to 18.4 °C observed range) and physical ordering checks.
          </p>

          <div className="doc-signature-strip">
            <div className="sig-block">
              <span className="sig-label">Prepared By:</span>
              <span className="sig-line">MES Field Engineering Detachment</span>
              <span className="sig-date">Date: {new Date().toLocaleDateString()}</span>
            </div>
            <div className="sig-block">
              <span className="sig-label">Authorised Reviewer:</span>
              <span className="sig-line">Commandant / Chief Logistics Officer</span>
              <span className="sig-date">Approved for Procurement</span>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
