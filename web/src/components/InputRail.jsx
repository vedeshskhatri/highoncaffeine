/*
 * InputRail.jsx — Phase S2 (complete)
 *
 * NEVER remounts. Only the canvas swaps on step change.
 *
 * Sections:
 *   1. Site (lat, lon, altitude) + presets
 *   2. Geometry (length, width, height) + CompassControl for orientation
 *   3. Envelope (walls, roof, floor) — EnvelopeBuilder
 *   4. Openings (facing, area, glazing, night shutter)
 *   5. Ventilation (ACH, heater type)
 *   6. Occupancy & Ground (people, watts/person, snow cover)
 *   7. Simulate button (disabled when any field invalid)
 *
 * All inline errors shown per-field in --danger.
 * GET /materials is fetched once on mount; falls back to FALLBACK_MATERIALS.
 */
import { useState, useEffect, useMemo } from 'react';
import './InputRail.css';
import CompassControl   from './CompassControl';
import EnvelopeBuilder  from './EnvelopeBuilder';
import CrossSectionSVG  from './CrossSectionSVG';
import { validateRequest, fieldError } from './validation';

import { SITE_PRESETS, FALLBACK_MATERIALS } from '../lib/presets';
export { SITE_PRESETS, FALLBACK_MATERIALS };

const GLAZING_OPTIONS = [
  { value: 'single_pane', label: 'Single pane' },
  { value: 'double_pane', label: 'Double pane' },
  { value: 'triple_pane', label: 'Triple pane' },
];

const HEATER_OPTIONS = [
  { value: 'none',               label: 'None' },
  { value: 'unflued_combustion', label: 'Unflued combustion' },
  { value: 'flued_stove',        label: 'Flued stove' },
  { value: 'electric',           label: 'Electric' },
];

const FACING_OPTIONS = ['north', 'east', 'south', 'west', 'roof'];

/* ── Toggle component ───────────────────────────────────────────────────── */
function Toggle({ id, checked, onChange, label }) {
  return (
    <div className="toggle-row">
      <label className="toggle-label" htmlFor={id}>{label}</label>
      <label className="toggle-switch">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="toggle-track" />
        <span className="toggle-thumb" />
      </label>
    </div>
  );
}

/* ── Field + error wrapper ──────────────────────────────────────────────── */
function Field({ label, htmlFor, error, children }) {
  return (
    <div className="rail-field">
      {label && (
        <label className="rail-field-label" htmlFor={htmlFor}>{label}</label>
      )}
      {children}
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}

/* ── InputRail ──────────────────────────────────────────────────────────── */
export default function InputRail({ request, onUpdate, onSimulate }) {
  /* ── Fetch materials once ─────────────────────────────────────────── */
  const [materials, setMaterials] = useState(FALLBACK_MATERIALS);

  useEffect(() => {
    fetch('http://localhost:8000/materials')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (Array.isArray(data?.materials) && data.materials.length > 0) {
          setMaterials(data.materials.map(m => ({ id: m.id, name: m.name })));
        }
      })
      .catch(() => {
        // Backend not running — fallback list stays, no error shown
      });
  }, []);

  /* ── Validation ───────────────────────────────────────────────────── */
  const materialIds = useMemo(() => materials.map(m => m.id), [materials]);
  const errors = useMemo(
    () => validateRequest(request, materialIds),
    [request, materialIds]
  );
  const hasErrors = Object.keys(errors).length > 0;

  /* ── Partial update helpers ───────────────────────────────────────── */
  const setLoc  = (patch) => onUpdate(p => ({ ...p, location:  { ...p.location,  ...patch } }));
  const setGeo  = (patch) => onUpdate(p => ({ ...p, geometry:  { ...p.geometry,  ...patch } }));
  const setEnv  = (patch) => onUpdate(p => ({ ...p, envelope:  { ...p.envelope,  ...patch } }));
  const setVent = (patch) => onUpdate(p => ({ ...p, ventilation: { ...p.ventilation, ...patch } }));
  const setOcc  = (patch) => onUpdate(p => ({ ...p, occupancy:  { ...p.occupancy,  ...patch } }));
  const setGnd  = (patch) => onUpdate(p => ({ ...p, ground:  { ...p.ground,  ...patch } }));

  const setOpening = (i, patch) => onUpdate(p => {
    const ops = [...(p.openings || [])];
    ops[i] = { ...ops[i], ...patch };
    return { ...p, openings: ops };
  });

  const addOpening = () => onUpdate(p => ({
    ...p,
    openings: [
      ...(p.openings || []),
      { facing: 'south', area_m2: 2.0, glazing: 'double_pane', night_shutter: false },
    ],
  }));

  const removeOpening = (i) => onUpdate(p => ({
    ...p,
    openings: p.openings.filter((_, idx) => idx !== i),
  }));

  return (
    <div className="input-rail-inner">

      {/* ═══ 1. SITE ═══════════════════════════════════════════════════ */}
      <div className="rail-section">
        <div className="rail-section-title">Site</div>

        {/* Presets */}
        <div className="preset-list" role="group" aria-label="Location presets">
          {SITE_PRESETS.map(p => (
            <button
              key={p.label}
              className="preset-btn"
              onClick={() => setLoc({ lat: p.lat, lon: p.lon, altitude_m: p.altitude_m })}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="rail-field-group">
          <Field
            label="Latitude"
            htmlFor="field-lat"
            error={fieldError(errors, 'location.lat')}
          >
            <input
              id="field-lat"
              className={`rail-field-input${errors['location.lat'] ? ' invalid' : ''}`}
              type="number"
              value={request.location.lat}
              min={-90} max={90} step={0.0001}
              onChange={e => setLoc({ lat: parseFloat(e.target.value) })}
            />
          </Field>

          <Field
            label="Longitude"
            htmlFor="field-lon"
            error={fieldError(errors, 'location.lon')}
          >
            <input
              id="field-lon"
              className={`rail-field-input${errors['location.lon'] ? ' invalid' : ''}`}
              type="number"
              value={request.location.lon}
              min={-180} max={180} step={0.0001}
              onChange={e => setLoc({ lon: parseFloat(e.target.value) })}
            />
          </Field>

          <Field
            label="Altitude (m)"
            htmlFor="field-alt"
            error={fieldError(errors, 'location.altitude_m')}
          >
            <input
              id="field-alt"
              className={`rail-field-input${errors['location.altitude_m'] ? ' invalid' : ''}`}
              type="number"
              value={request.location.altitude_m}
              min={0} max={8849} step={1}
              onChange={e => setLoc({ altitude_m: parseFloat(e.target.value) })}
            />
          </Field>
        </div>
      </div>

      {/* ═══ 2. GEOMETRY ══════════════════════════════════════════════ */}
      <div className="rail-section">
        <div className="rail-section-title">Geometry</div>
        <div className="rail-field-group">
          <Field
            label="Length (m)"
            htmlFor="field-length"
            error={fieldError(errors, 'geometry.length_m')}
          >
            <input
              id="field-length"
              className={`rail-field-input${errors['geometry.length_m'] ? ' invalid' : ''}`}
              type="number"
              value={request.geometry.length_m}
              min={0.1} step={0.1}
              onChange={e => setGeo({ length_m: parseFloat(e.target.value) })}
            />
          </Field>

          <Field
            label="Width (m)"
            htmlFor="field-width"
            error={fieldError(errors, 'geometry.width_m')}
          >
            <input
              id="field-width"
              className={`rail-field-input${errors['geometry.width_m'] ? ' invalid' : ''}`}
              type="number"
              value={request.geometry.width_m}
              min={0.1} step={0.1}
              onChange={e => setGeo({ width_m: parseFloat(e.target.value) })}
            />
          </Field>

          <Field
            label="Height (m)"
            htmlFor="field-height"
            error={fieldError(errors, 'geometry.height_m')}
          >
            <input
              id="field-height"
              className={`rail-field-input${errors['geometry.height_m'] ? ' invalid' : ''}`}
              type="number"
              value={request.geometry.height_m}
              min={0.1} step={0.1}
              onChange={e => setGeo({ height_m: parseFloat(e.target.value) })}
            />
          </Field>

          <div className="rail-field">
            <label className="rail-field-label">
              Orientation — 0° N · 90° E · 180° S · 270° W
            </label>
            <CompassControl
              value={request.geometry.orientation_deg}
              onChange={deg => setGeo({ orientation_deg: deg })}
              hasError={!!errors['geometry.orientation_deg']}
            />
            {errors['geometry.orientation_deg'] && (
              <div className="field-error">{errors['geometry.orientation_deg']}</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 3. ENVELOPE ══════════════════════════════════════════════ */}
      <div className="rail-section">
        <div className="rail-section-title">Envelope</div>

        <EnvelopeBuilder
          id="walls" label="Walls"
          layers={request.envelope.walls}
          materials={materials}
          errors={errors}
          errPrefix="envelope.walls"
          onChange={walls => setEnv({ walls })}
        />

        <EnvelopeBuilder
          id="roof" label="Roof"
          layers={request.envelope.roof}
          materials={materials}
          errors={errors}
          errPrefix="envelope.roof"
          onChange={roof => setEnv({ roof })}
        />

        <EnvelopeBuilder
          id="floor" label="Floor"
          layers={request.envelope.floor}
          materials={materials}
          errors={errors}
          errPrefix="envelope.floor"
          onChange={floor => setEnv({ floor })}
        />

        <div className="rail-field" style={{ marginTop: 'var(--space-2)' }}>
          <label className="rail-field-label" htmlFor="field-emissivity">
            Roof emissivity (0 – 1)
          </label>
          <input
            id="field-emissivity"
            className={`rail-field-input${errors['envelope.roof_emissivity'] ? ' invalid' : ''}`}
            type="number"
            value={request.envelope.roof_emissivity}
            min={0} max={1} step={0.01}
            onChange={e => setEnv({ roof_emissivity: parseFloat(e.target.value) })}
          />
          {errors['envelope.roof_emissivity'] && (
            <div className="field-error">{errors['envelope.roof_emissivity']}</div>
          )}
        </div>
      </div>

      {/* ═══ 4. OPENINGS ══════════════════════════════════════════════ */}
      <div className="rail-section">
        <div className="rail-section-title">Openings</div>

        {(request.openings || []).map((op, i) => (
          <div key={i} className="opening-row">
            <div className="opening-row-header">
              <span className="opening-label">Opening {i + 1}</span>
              <button
                className="opening-del-btn"
                onClick={() => removeOpening(i)}
                aria-label={`Remove opening ${i + 1}`}
              >✕</button>
            </div>

            <div className="opening-grid">
              <Field
                label="Facing"
                htmlFor={`field-facing-${i}`}
                error={fieldError(errors, `openings[${i}].facing`)}
              >
                <select
                  id={`field-facing-${i}`}
                  className={`rail-field-select${errors[`openings[${i}].facing`] ? ' invalid' : ''}`}
                  value={op.facing}
                  onChange={e => setOpening(i, { facing: e.target.value })}
                >
                  {FACING_OPTIONS.map(f => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Area (m²)"
                htmlFor={`field-area-${i}`}
                error={fieldError(errors, `openings[${i}].area_m2`)}
              >
                <input
                  id={`field-area-${i}`}
                  className={`rail-field-input${errors[`openings[${i}].area_m2`] ? ' invalid' : ''}`}
                  type="number"
                  value={op.area_m2}
                  min={0.01} step={0.1}
                  onChange={e => setOpening(i, { area_m2: parseFloat(e.target.value) })}
                />
              </Field>

              <Field
                label="Glazing"
                htmlFor={`field-glazing-${i}`}
                error={fieldError(errors, `openings[${i}].glazing`)}
              >
                <select
                  id={`field-glazing-${i}`}
                  className={`rail-field-select${errors[`openings[${i}].glazing`] ? ' invalid' : ''}`}
                  value={op.glazing}
                  onChange={e => setOpening(i, { glazing: e.target.value })}
                >
                  {GLAZING_OPTIONS.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </Field>

              <Field>
                <Toggle
                  id={`field-shutter-${i}`}
                  checked={op.night_shutter}
                  onChange={v => setOpening(i, { night_shutter: v })}
                  label="Night shutter"
                />
              </Field>
            </div>
          </div>
        ))}

        <button className="add-layer-btn" onClick={addOpening}>
          + Add opening
        </button>
      </div>

      {/* ═══ 5. VENTILATION ═══════════════════════════════════════════ */}
      <div className="rail-section">
        <div className="rail-section-title">Ventilation</div>
        <div className="rail-field-group">
          <Field
            label="ACH (air changes per hour)"
            htmlFor="field-ach"
            error={fieldError(errors, 'ventilation.ach')}
          >
            <input
              id="field-ach"
              className={`rail-field-input${errors['ventilation.ach'] ? ' invalid' : ''}`}
              type="number"
              value={request.ventilation.ach}
              min={0.01} step={0.1}
              onChange={e => setVent({ ach: parseFloat(e.target.value) })}
            />
          </Field>

          <Field
            label="Heater type"
            htmlFor="field-heater"
            error={fieldError(errors, 'ventilation.heater_type')}
          >
            <select
              id="field-heater"
              className={`rail-field-select${errors['ventilation.heater_type'] ? ' invalid' : ''}`}
              value={request.ventilation.heater_type}
              onChange={e => setVent({ heater_type: e.target.value })}
            >
              {HEATER_OPTIONS.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ═══ 6. OCCUPANCY & GROUND ════════════════════════════════════ */}
      <div className="rail-section">
        <div className="rail-section-title">Occupancy &amp; Ground</div>
        <div className="rail-field-group">
          <Field
            label="People"
            htmlFor="field-people"
            error={fieldError(errors, 'occupancy.people')}
          >
            <input
              id="field-people"
              className={`rail-field-input${errors['occupancy.people'] ? ' invalid' : ''}`}
              type="number"
              value={request.occupancy.people}
              min={1} step={1}
              onChange={e => setOcc({ people: parseInt(e.target.value, 10) })}
            />
          </Field>

          <Field
            label="Watts per person"
            htmlFor="field-watts"
            error={fieldError(errors, 'occupancy.watts_per_person')}
          >
            <input
              id="field-watts"
              className={`rail-field-input${errors['occupancy.watts_per_person'] ? ' invalid' : ''}`}
              type="number"
              value={request.occupancy.watts_per_person}
              min={1} step={5}
              onChange={e => setOcc({ watts_per_person: parseFloat(e.target.value) })}
            />
          </Field>

          <Toggle
            id="field-snow"
            checked={request.ground.snow_cover}
            onChange={v => setGnd({ snow_cover: v, albedo: null })}
            label="Snow cover (derives albedo)"
          />
        </div>
      </div>

      {/* ═══ Live cross-section SVG ═════════════════════════════════ */}
      <div className="rail-section" style={{ padding: 'var(--space-2)' }}>
        <CrossSectionSVG request={request} />
      </div>

      {/* ═══ 7. SUBMIT BAR ════════════════════════════════════════════ */}
      <div className="submit-bar">
        <button
          id="simulate-btn"
          className="simulate-btn"
          disabled={hasErrors}
          onClick={onSimulate}
          aria-disabled={hasErrors}
        >
          Run simulation
        </button>
        {hasErrors && (
          <div className="simulate-btn-hint">
            {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's' : ''} need attention
          </div>
        )}
      </div>

    </div>
  );
}
