import { useState, useEffect } from 'react';
import './MaterialsTray.css';

// Default fallback materials conforming to data/materials.csv
const DEFAULT_MATERIALS = [
  { id: 'mud_brick', name: 'Mud brick (adobe)', category: 'structural', k: 0.75, rho: 1700, cp: 880, locally_available: true, default_thickness: 0.30 },
  { id: 'rammed_earth', name: 'Rammed earth', category: 'structural', k: 1.25, rho: 2000, cp: 900, locally_available: true, default_thickness: 0.35 },
  { id: 'stone_masonry', name: 'Field stone masonry', category: 'structural', k: 2.20, rho: 2400, cp: 840, locally_available: true, default_thickness: 0.30 },
  { id: 'eps', name: 'Expanded polystyrene (EPS)', category: 'insulation', k: 0.038, rho: 25, cp: 1400, locally_available: true, default_thickness: 0.05 },
  { id: 'rockwool', name: 'Mineral wool (rockwool)', category: 'insulation', k: 0.038, rho: 48, cp: 840, locally_available: true, default_thickness: 0.05 },
  { id: 'straw_bale', name: 'Straw bale', category: 'insulation', k: 0.070, rho: 110, cp: 1800, locally_available: true, default_thickness: 0.10 },
  { id: 'concrete', name: 'Heavyweight concrete', category: 'mass', k: 1.75, rho: 2300, cp: 1000, locally_available: true, default_thickness: 0.15 },
  { id: 'stone_floor', name: 'Dressed stone floor', category: 'mass', k: 2.00, rho: 2500, cp: 850, locally_available: true, default_thickness: 0.10 },
  { id: 'prefab_sandwich', name: 'Prefab PUF sandwich', category: 'structural', k: 0.035, rho: 45, cp: 1400, locally_available: false, default_thickness: 0.08 },
  { id: 'tarpaulin', name: 'HDPE Tarpaulin', category: 'relief', k: 0.19, rho: 950, cp: 1800, locally_available: true, default_thickness: 0.01 },
  { id: 'plastic_sheeting', name: 'PE Plastic Sheeting', category: 'relief', k: 0.33, rho: 920, cp: 1900, locally_available: true, default_thickness: 0.005 },
  { id: 'blanket_layer', name: 'Woolen felt blanket', category: 'relief', k: 0.045, rho: 120, cp: 1360, locally_available: true, default_thickness: 0.02 },
  { id: 'mud_skirt', name: 'Compacted mud skirt', category: 'relief', k: 0.85, rho: 1600, cp: 840, locally_available: true, default_thickness: 0.15 },
  { id: 'air_gap', name: 'Air cavity (25mm)', category: 'insulation', k: 0.150, rho: 1.2, cp: 1005, locally_available: true, default_thickness: 0.025 },
];

export default function MaterialsTray({ onAddLayer, allowedMaterialIds = null }) {
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [lehOnly, setLehOnly] = useState(false);

  useEffect(() => {
    fetch('/materials')
      .then((res) => res.json())
      .then((data) => {
        if (data?.materials?.length > 0) {
          const mapped = data.materials.map((m) => ({
            ...m,
            default_thickness: m.category === 'insulation' ? 0.05 : m.category === 'relief' ? 0.02 : 0.20,
          }));
          setMaterials(mapped);
        }
      })
      .catch(() => {
        // Fallback already pre-populated
      });
  }, []);

  const filteredMaterials = materials.filter((m) => {
    if (lehOnly && !m.locally_available) return false;
    if (allowedMaterialIds && allowedMaterialIds.length > 0) {
      return allowedMaterialIds.includes(m.id);
    }
    return true;
  });

  const handleDragStart = (e, mat) => {
    e.dataTransfer.setData('application/json', JSON.stringify(mat));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="materials-tray">
      <div className="tray-header">
        <div className="tray-title-row">
          <span className="tray-title">MATERIALS TRAY</span>
          <span className="tray-count mono">{filteredMaterials.length} available</span>
        </div>
        <label className="tray-filter-label">
          <input
            type="checkbox"
            checked={lehOnly}
            onChange={(e) => setLehOnly(e.target.checked)}
            className="tray-checkbox"
          />
          <span>Locally available in Leh only</span>
        </label>
      </div>

      <div className="materials-list">
        {filteredMaterials.map((mat) => {
          // Conductivity signature bar: normalized between 0.02 (insulation) and 2.5 (stone)
          const kNorm = Math.min(100, Math.max(8, (mat.k / 2.5) * 100));
          const isGoodInsulator = mat.k < 0.1;

          return (
            <div
              key={mat.id}
              className="material-block"
              draggable
              onDragStart={(e) => handleDragStart(e, mat)}
            >
              <div className="mat-top">
                <span className="mat-name">{mat.name}</span>
                <span className="mat-cat mono">{mat.category}</span>
              </div>

              {/* Thermal signature bar */}
              <div className="mat-sig-container" title={`Conductivity k = ${mat.k} W/m-K`}>
                <div className="sig-bar-track">
                  <div
                    className={`sig-bar-fill ${isGoodInsulator ? 'insulator' : 'conductive'}`}
                    style={{ width: `${kNorm}%` }}
                  />
                </div>
                <div className="sig-meta mono">
                  <span>k: {mat.k} W/m·K</span>
                  <span>ρ: {mat.rho} kg/m³</span>
                </div>
              </div>

              <div className="mat-actions">
                <span className="drag-hint">Drag into Roof/Wall/Floor →</span>
                <div className="quick-add-group">
                  <button
                    type="button"
                    title="Add to Wall"
                    className="quick-add-btn"
                    onClick={() => onAddLayer('walls', mat)}
                  >
                    +W
                  </button>
                  <button
                    type="button"
                    title="Add to Roof"
                    className="quick-add-btn"
                    onClick={() => onAddLayer('roof', mat)}
                  >
                    +R
                  </button>
                  <button
                    type="button"
                    title="Add to Floor"
                    className="quick-add-btn"
                    onClick={() => onAddLayer('floor', mat)}
                  >
                    +F
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
