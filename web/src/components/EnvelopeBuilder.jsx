/*
 * EnvelopeBuilder.jsx — Phase S2
 * Manages a list of material layers ordered OUTSIDE → INSIDE.
 *
 * - Add layer (default: first available material, 0.10 m)
 * - Remove layer
 * - Reorder (up/down)
 * - Inline error on thickness if ≤ 0
 * - Material list from props (fetched by parent from GET /materials)
 */

export default function EnvelopeBuilder({
  id,         // e.g. "walls", "roof", "floor"
  label,      // e.g. "Walls"
  layers,     // array of { material, thickness_m }
  materials,  // array of { id, name }
  errors,     // validation errors object
  errPrefix,  // e.g. "envelope.walls"
  onChange,   // (newLayers) => void
}) {
  const defaultMaterial = materials[0]?.id ?? 'mud_brick';

  const addLayer = () => {
    onChange([...layers, { material: defaultMaterial, thickness_m: 0.10 }]);
  };

  const removeLayer = (i) => {
    onChange(layers.filter((_, idx) => idx !== i));
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const next = [...layers];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };

  const moveDown = (i) => {
    if (i === layers.length - 1) return;
    const next = [...layers];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  const setMaterial = (i, mat) => {
    const next = [...layers];
    next[i] = { ...next[i], material: mat };
    onChange(next);
  };

  const setThickness = (i, val) => {
    const next = [...layers];
    next[i] = { ...next[i], thickness_m: parseFloat(val) || 0 };
    onChange(next);
  };

  const rootErr = errors[errPrefix];

  return (
    <div className="envelope-surface">
      <div className="envelope-surface-label">
        {label}
        <span className="envelope-order-note">outside → inside</span>
      </div>

      {rootErr && <div className="field-error">{rootErr}</div>}

      <div className="layer-list">
        {layers.map((layer, i) => {
          const thickErr = errors[`${errPrefix}[${i}].thickness_m`];
          const matErr   = errors[`${errPrefix}[${i}].material`];

          return (
            <div key={i} className="layer-item-wrap">
              <div className="layer-row">
                <span className="layer-index">{i + 1}</span>

                <select
                  className="layer-select"
                  value={layer.material}
                  onChange={e => setMaterial(i, e.target.value)}
                  aria-label={`${label} layer ${i + 1} material`}
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  {/* Fallback if material not in list */}
                  {!materials.find(m => m.id === layer.material) && (
                    <option value={layer.material}>{layer.material}</option>
                  )}
                </select>

                <input
                  type="number"
                  className={`layer-thickness${thickErr ? ' invalid' : ''}`}
                  value={layer.thickness_m}
                  min={0.001}
                  step={0.01}
                  onChange={e => setThickness(i, e.target.value)}
                  title={thickErr || 'Thickness in metres'}
                  aria-label={`${label} layer ${i + 1} thickness metres`}
                />

                <button
                  className="layer-up-btn"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  aria-label="Move layer up"
                  title="Move outside"
                >↑</button>
                <button
                  className="layer-down-btn"
                  onClick={() => moveDown(i)}
                  disabled={i === layers.length - 1}
                  aria-label="Move layer down"
                  title="Move inside"
                >↓</button>
                <button
                  className="layer-del-btn"
                  onClick={() => removeLayer(i)}
                  aria-label="Remove layer"
                  title="Remove layer"
                >✕</button>
              </div>
              {(thickErr || matErr) && (
                <div className="field-error" style={{ marginLeft: 22 }}>
                  {thickErr || matErr}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="add-layer-btn" onClick={addLayer}>
        + Add layer
      </button>
    </div>
  );
}
