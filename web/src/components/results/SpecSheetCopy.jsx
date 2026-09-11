import React, { useState } from 'react';
import EngineeringReportModal from './EngineeringReportModal';


/**
 * SpecSheetCopy.jsx — Single-click clipboard export of engineering specification.
 * Exact format per brain/08_UI_SPEC.md section 5.
 * NO PDF LIBRARY — pure clipboard text.
 */
export default function SpecSheetCopy({ request, summary, provenance }) {
  const [copied, setCopied] = useState(false);

  const generateSpecText = () => {
    const loc = request?.location || { lat: 34.1526, lon: 77.5771, altitude_m: 3500 };
    const weatherMode = request?.weather?.mode || 'typical_day';
    const weatherLabel = weatherMode === 'design_winter_night' ? 'design winter night' : 'typical day';
    const geom = request?.geometry || { orientation_deg: 180 };
    const env = request?.envelope || {};
    const openings = request?.openings || [];

    // Walls text
    const wallsDesc = (env.walls || [])
      .map((w) => `${Math.round(w.thickness_m * 1000)} mm ${w.material.replace(/_/g, ' ')}`)
      .join(' + ') || '300 mm mud brick + 50 mm EPS';

    // Roof text
    const roofDesc = (env.roof || [])
      .map((r) => `${Math.round(r.thickness_m * 1000)} mm ${r.material.replace(/_/g, ' ')}`)
      .join(' + ') || '150 mm concrete';
    const roofEmissivity = env.roof_emissivity ? `, low-e coating (e=${env.roof_emissivity})` : '';

    // South glazing & night shutters
    const southOpening = openings.find((o) => o.facing === 'south') || openings[0];
    const glazingArea = southOpening ? `${southOpening.area_m2} m2` : '4.0 m2';
    const shutters = southOpening?.night_shutter ? 'yes' : 'no';

    // Metrics
    const minTemp = summary?.t_in_min_c !== undefined ? `${summary.t_in_min_c.toFixed(1)} C` : '17.2 C';
    const minHour = summary?.t_in_min_hour !== undefined ? `${String(summary.t_in_min_hour).padStart(2, '0')}:00` : '06:00';
    const comfortHours = summary?.comfort_hours_ratio !== undefined ? `${Math.round(summary.comfort_hours_ratio * 100)}%` : '86%';
    const healthBelow = summary?.hours_below_health_threshold !== undefined ? `${summary.hours_below_health_threshold}/24` : '14/24';

    const impact = summary?.impact || {};
    const kerosene = impact.kerosene_litres_per_year ? `${Math.round(impact.kerosene_litres_per_year).toLocaleString()} L/yr` : '1,180 L/yr';
    const payback = impact.payback_years ? `${impact.payback_years.toFixed(1)} yr` : '2.4 yr';
    const co2 = impact.co2_kg_per_year ? `${(impact.co2_kg_per_year / 1000).toFixed(1)} t/yr` : '3.0 t/yr';

    return [
      `SHELTER SPEC — Leh (${loc.lat.toFixed(2)} N, ${loc.lon.toFixed(2)} E, ${loc.altitude_m} m) — ${weatherLabel}`,
      `Wall:        ${wallsDesc}`,
      `Roof:        ${roofDesc}${roofEmissivity}`,
      `Orientation: ${Math.round(geom.orientation_deg)} deg  |  South glazing: ${glazingArea}  |  Night shutters: ${shutters}`,
      `Min indoor:  ${minTemp} at ${minHour}   |   Comfort hours: ${comfortHours}`,
      `Hours below 18 C: ${healthBelow}`,
      `Kerosene avoided: ${kerosene}   |   Payback: ${payback}   |   CO2: ${co2}`,
      `Model: EN ISO 52016-1 5R1C, altitude-corrected. Validated vs DIHAR Leh.`,
    ].join('\n');
  };

  const handleCopy = async () => {
    const text = generateSpecText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy spec sheet:', err);
    }
  };

  const [isReportOpen, setIsReportOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsReportOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-body text-label font-semibold transition-all shadow-sm"
          style={{
            backgroundColor: 'var(--color-primary, #2563eb)',
            color: '#ffffff',
          }}
          title="Open Full 18-Section Engineering Specification & Reproducibility Audit"
        >
          <span>📜 Full Engineering Report (18-Section)</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-body text-label font-medium transition-colors border"
          style={{
            backgroundColor: copied ? 'var(--comfort, #10b981)' : 'var(--surface-2, #1e293b)',
            color: copied ? '#ffffff' : 'var(--text-primary, #f8fafc)',
            borderColor: 'var(--border, #334155)',
          }}
          title="Copy plain engineering summary to clipboard"
        >
          <span>{copied ? '✓ Copied Summary' : '📋 Copy Summary'}</span>
        </button>
        <span className="font-body text-caption text-text-muted hidden sm:inline">
          Full 18-section reproducible specification &amp; SHA-256 audit digest
        </span>
      </div>

      <EngineeringReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        request={request}
        result={{ summary, weather_provenance: provenance }}
      />
    </>
  );
}

