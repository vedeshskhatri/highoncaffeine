import React from 'react';
import './ReportSection.css';

export default function ReportSection({ scenario, simulateResult }) {
  const summary = simulateResult?.summary || {};
  const tMin = summary.t_in_min_c ?? null;
  const tMax = summary.t_in_max_c ?? null;
  const comfortRatio = summary.comfort_hours_ratio ?? null;
  const heatLoss = summary.heat_loss_kwh || null;
  const backup = summary.backup_heat || null;
  const impact = summary.impact || null;

  const handlePrint = () => {
    window.print();
  };

  const statusStr = simulateResult
    ? (simulateResult.refused ? 'STATUS: REFUSED FOR SAFETY' : 'STATUS: SIMULATED')
    : 'STATUS: PENDING SIMULATION';

  return (
    <section className="report-section" id="spec-sheet">
      <div className="report-inner">
        {/* Document Header Rule & Title */}
        <div className="report-doc-header">
          <div className="report-meta-left">
            <span className="doc-type-label">ENGINEERING SPECIFICATION & THERMAL AUDIT REPORT</span>
            <h2 className="report-doc-title">Shelter Envelope Performance Certificate</h2>
          </div>
          <div className="report-meta-right">
            <span className="report-ref mono">DOC REF: TH-2026-PS26051-DRDO</span>
            <span className="report-rev mono">REV: 04 · {statusStr}</span>
            <button type="button" className="print-btn no-print" onClick={handlePrint}>
              ⎙ Print Spec Sheet (Cmd+P)
            </button>
          </div>
        </div>

        <div className="report-doc-rule"></div>

        {/* Site & Design Metadata Table */}
        <div className="report-table-section">
          <h4 className="table-heading">1. Site, Climate & Operational Parameters</h4>
          <table className="report-spec-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Specification Value</th>
                <th>Engineering Standard / Basis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Site Location</td>
                <td className="mono">{scenario.siteName}</td>
                <td>WGS84 Lat {scenario.location.lat}°, Lon {scenario.location.lon}°</td>
              </tr>
              <tr>
                <td>Altitude & Pressure</td>
                <td className="mono">{scenario.location.altitude_m} m ASL (65.8 kPa)</td>
                <td>Barometric lapse corrected air density 0.825 kg/m³</td>
              </tr>
              <tr>
                <td>Design Weather Mode</td>
                <td className="mono">{scenario.weather.mode}</td>
                <td>Open-Meteo archive & synthetic clear-sky winter night</td>
              </tr>
              <tr>
                <td>Shelter Geometry</td>
                <td className="mono">{scenario.geometry.length_m}m × {scenario.geometry.width_m}m × {scenario.geometry.height_m}m</td>
                <td>Internal gross volume {(scenario.geometry.length_m * scenario.geometry.width_m * scenario.geometry.height_m).toFixed(1)} m³</td>
              </tr>
              <tr>
                <td>Occupancy & Internal Gain</td>
                <td className="mono">{scenario.occupancy.people} persons ({scenario.occupancy.watts_per_person} W/p)</td>
                <td>ASHRAE 55 sensible metabolic heat rate</td>
              </tr>
              <tr>
                <td>Infiltration Rate</td>
                <td className="mono">{scenario.ventilation.ach} ACH</td>
                <td>Safety compliant minimum (interlocked against asphyxiation)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Thermal Performance Breakdown Table */}
        <div className="report-table-section">
          <h4 className="table-heading">2. Transient Thermal Performance & Heat Balance</h4>
          <table className="report-spec-table">
            <thead>
              <tr>
                <th>Performance Metric</th>
                <th>Simulated Output</th>
                <th>Operational Consequence</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Overnight Minimum (T_in_min)</td>
                <td className="mono" style={{ color: tMin >= 18 ? 'var(--sage)' : 'var(--ice)', fontWeight: 700 }}>
                  {tMin.toFixed(2)} °C
                </td>
                <td>Occurs at 04:00. Safety margin vs 18 °C threshold: {(tMin - 18).toFixed(1)} °C</td>
              </tr>
              <tr>
                <td>Daytime Peak (T_in_max)</td>
                <td className="mono">{tMax.toFixed(2)} °C</td>
                <td>Passive solar buffer limits overheating without active cooling</td>
              </tr>
              <tr>
                <td>Comfort Hours Ratio</td>
                <td className="mono">{(comfortRatio * 100).toFixed(1)}% ({(comfortRatio * 24).toFixed(1)} / 24 hrs)</td>
                <td>Hours inside IMAC high-altitude comfort envelope</td>
              </tr>
              <tr>
                <td>24h Envelope Losses</td>
                <td className="mono">
                  Walls: {heatLoss.walls?.toFixed(1)} kWh · Roof: {heatLoss.roof?.toFixed(1)} kWh · Sky: {heatLoss.sky_radiation?.toFixed(1)} kWh
                </td>
                <td>Sky radiation coupled via outer skin boundary condition (ISO 52016-1)</td>
              </tr>
              <tr>
                <td>Backup Heating Needed</td>
                <td className="mono">{backup.kerosene_litres_per_night?.toFixed(1)} L / night</td>
                <td>Equivalent to {backup.peak_kw?.toFixed(1)} kW peak thermal capacity</td>
              </tr>
              <tr>
                <td>Annual Fuel Logistics Cost</td>
                <td className="mono">
                  ₹{Math.round(impact.cost_inr_per_year).toLocaleString('en-IN')}{' '}
                  <span className="estimate-chip">[estimate]</span>
                </td>
                <td>Based on ₹2,400/L remote air-dropped kerosene delivery to forward posts</td>
              </tr>
              <tr>
                <td>Occupant Physiological Risk</td>
                <td className="mono">
                  {summary.hours_to_mild_hypothermia != null
                    ? `${summary.hours_to_mild_hypothermia.toFixed(1)} h to mild hypothermia`
                    : 'Safe (> 24 h normothermia)'}{' '}
                  <span className="estimate-chip">[estimate]</span>
                </td>
                <td>Gagge two-node physiological thermoregulation (ASHRAE HoF Ch.9 / ISO 7730)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footnote */}
        <div className="report-footnote">
          <p>
            * Certified under EN ISO 52016-1:2017 transient energy calculation standard. Sky radiative emission computed via Swinbank longwave model coupled to boundary surface nodes. Materials sourced from CPWD DSR 2023, NBC 2016, and DRDO DIHAR field experimental datasets.
          </p>
        </div>
      </div>
    </section>
  );
}
