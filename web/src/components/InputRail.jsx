/*
 * InputRail.jsx — Phase S1 (skeleton version)
 *
 * This component NEVER remounts. Only the canvas swaps on step change.
 * Verification: type a value, switch steps, switch back — value persists.
 *
 * Phase S2 will fill each section with real fields and validation.
 * For now it renders labelled section stubs so the layout is correct.
 */
import './InputRail.css';

export default function InputRail({ request, onUpdate }) {
  return (
    <div className="input-rail-inner">

      {/* ── Site ─────────────────────────────────────────────────── */}
      <div className="rail-section">
        <div className="rail-section-title">Site</div>
        <div className="rail-field-group">
          <div className="rail-field">
            <label className="rail-field-label" htmlFor="field-lat">Latitude</label>
            <input
              id="field-lat"
              className="rail-field-input"
              type="number"
              value={request.location.lat}
              onChange={e => onUpdate(prev => ({
                ...prev,
                location: { ...prev.location, lat: parseFloat(e.target.value) || 0 },
              }))}
              placeholder="34.1526"
            />
          </div>
          <div className="rail-field">
            <label className="rail-field-label" htmlFor="field-lon">Longitude</label>
            <input
              id="field-lon"
              className="rail-field-input"
              type="number"
              value={request.location.lon}
              onChange={e => onUpdate(prev => ({
                ...prev,
                location: { ...prev.location, lon: parseFloat(e.target.value) || 0 },
              }))}
              placeholder="77.5771"
            />
          </div>
          <div className="rail-field">
            <label className="rail-field-label" htmlFor="field-alt">Altitude (m)</label>
            <input
              id="field-alt"
              className="rail-field-input"
              type="number"
              value={request.location.altitude_m}
              onChange={e => onUpdate(prev => ({
                ...prev,
                location: { ...prev.location, altitude_m: parseFloat(e.target.value) || 0 },
              }))}
              placeholder="3500"
            />
          </div>
        </div>
      </div>

      {/* ── Geometry ─────────────────────────────────────────────── */}
      <div className="rail-section">
        <div className="rail-section-title">Geometry</div>
        <div className="rail-field-group">
          <div className="rail-field">
            <label className="rail-field-label" htmlFor="field-length">Length (m)</label>
            <input
              id="field-length"
              className="rail-field-input"
              type="number"
              value={request.geometry.length_m}
              onChange={e => onUpdate(prev => ({
                ...prev,
                geometry: { ...prev.geometry, length_m: parseFloat(e.target.value) || 0 },
              }))}
            />
          </div>
          <div className="rail-field">
            <label className="rail-field-label" htmlFor="field-width">Width (m)</label>
            <input
              id="field-width"
              className="rail-field-input"
              type="number"
              value={request.geometry.width_m}
              onChange={e => onUpdate(prev => ({
                ...prev,
                geometry: { ...prev.geometry, width_m: parseFloat(e.target.value) || 0 },
              }))}
            />
          </div>
          <div className="rail-field">
            <label className="rail-field-label" htmlFor="field-height">Height (m)</label>
            <input
              id="field-height"
              className="rail-field-input"
              type="number"
              value={request.geometry.height_m}
              onChange={e => onUpdate(prev => ({
                ...prev,
                geometry: { ...prev.geometry, height_m: parseFloat(e.target.value) || 0 },
              }))}
            />
          </div>
          <div className="rail-field">
            <label className="rail-field-label" htmlFor="field-orientation">
              Orientation (deg) — 0=N 90=E 180=S 270=W
            </label>
            <input
              id="field-orientation"
              className="rail-field-input"
              type="number"
              value={request.geometry.orientation_deg}
              onChange={e => onUpdate(prev => ({
                ...prev,
                geometry: { ...prev.geometry, orientation_deg: parseFloat(e.target.value) || 0 },
              }))}
            />
          </div>
        </div>
      </div>

      {/* ── Envelope ─────────────────────────────────────────────── */}
      <div className="rail-section">
        <div className="rail-section-title">Envelope</div>
        <div className="rail-placeholder">
          Layers (outside → inside) — Phase S2
        </div>
      </div>

      {/* ── Openings ─────────────────────────────────────────────── */}
      <div className="rail-section">
        <div className="rail-section-title">Openings</div>
        <div className="rail-placeholder">
          Windows & shutters — Phase S2
        </div>
      </div>

      {/* ── Ventilation ──────────────────────────────────────────── */}
      <div className="rail-section">
        <div className="rail-section-title">Ventilation</div>
        <div className="rail-placeholder">
          ACH, heater type — Phase S2
        </div>
      </div>

      {/* ── Occupancy ────────────────────────────────────────────── */}
      <div className="rail-section">
        <div className="rail-section-title">Occupancy & Ground</div>
        <div className="rail-placeholder">
          People, snow cover — Phase S2
        </div>
      </div>

      {/* ── Live cross-section SVG placeholder ───────────────────── */}
      <div className="cross-section-placeholder">
        <div className="cross-section-label">
          Live cross-section — Phase S3
        </div>
        {/* Phase S3: <CrossSectionSVG request={request} /> */}
      </div>
    </div>
  );
}
