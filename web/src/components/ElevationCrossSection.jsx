import { useState } from 'react';
import './ElevationCrossSection.css';

// SVG Pattern fills for material categories
const CATEGORY_PATTERNS = {
  insulation: 'insulation-hatch',
  structural: 'masonry-brick',
  mass: 'concrete-stipple',
  relief: 'relief-cross',
  default: 'neutral-fill',
};

function getCategory(matId) {
  if (['eps', 'eps_board', 'rockwool', 'straw_bale', 'air_gap', 'air_cavity_unvented'].includes(matId)) {
    return 'insulation';
  }
  if (['concrete', 'dense_concrete', 'stone_floor', 'water_wall'].includes(matId)) {
    return 'mass';
  }
  if (['tarpaulin', 'plastic_sheeting', 'blanket_layer', 'mud_skirt', 'wool_blanket_layer'].includes(matId)) {
    return 'relief';
  }
  return 'structural';
}

function formatMatName(id) {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ElevationCrossSection({
  envelope,
  onDropLayer,
  onReorderLayer,
  onRemoveLayer,
  onUpdateThickness,
  scrubHour = 4,
  simulateResult = null,
}) {
  const [dragOverZone, setDragOverZone] = useState(null);
  const [draggedLayerIdx, setDraggedLayerIdx] = useState(null);

  const walls = envelope.walls || [];
  const roof = envelope.roof || [];
  const floor = envelope.floor || [];

  // Scrubber data extraction
  const series = simulateResult?.series || [];
  const curSeries = series.find((s) => s.hour === scrubHour) || series[0] || {};
  const tIn = curSeries.t_in ?? -32.28;
  const tOut = curSeries.t_out ?? -28.1;
  const ghi = curSeries.ghi ?? 0;

  // Temperature tinting: from --orange (warmth/peak solar > 10 C) to --ice (cold < 0 C)
  // Interpolation factor between -35 C and +20 C
  const tClamped = Math.max(-35, Math.min(20, tIn));
  const warmthRatio = (tClamped - (-35)) / 55; // 0 = ice (-35), 1 = orange (+20)

  // Sun geometry: sun arcs across 06:00 to 18:00
  const isDaylight = scrubHour >= 6 && scrubHour <= 18;
  const sunProgress = isDaylight ? (scrubHour - 6) / 12 : -1;
  const sunX = isDaylight ? 60 + sunProgress * (520 - 60) : -100;
  const sunY = isDaylight ? 180 - Math.sin(sunProgress * Math.PI) * 110 : 200;

  // Flux arrows from simulateResult surfaces
  const surfaces = simulateResult?.surfaces || [];
  const roofFlux = surfaces.find((s) => s.name?.includes('roof'))?.flux_w ?? 45.0;
  const wallFlux = surfaces.find((s) => s.name?.includes('wall'))?.flux_w ?? 30.0;

  // Drag handlers
  const handleDragOver = (e, zone) => {
    e.preventDefault();
    setDragOverZone(zone);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleDrop = (e, zone) => {
    e.preventDefault();
    setDragOverZone(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const mat = JSON.parse(dataStr);
        onDropLayer(zone, mat);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="elevation-container">
      {/* Top Cross-Section Elevation Graphic */}
      <div className="elevation-canvas-box">
        <div className="canvas-header-row">
          <span className="canvas-title">2D SECTION ELEVATION (SCALE 1:50)</span>
          <span className="telemetry-badge mono">
            Hour {String(scrubHour).padStart(2, '0')}:00 · T_in: {tIn.toFixed(1)} °C · T_out: {tOut.toFixed(1)} °C
          </span>
        </div>

        <svg
          className="shelter-elevation-svg"
          viewBox="0 0 580 340"
          style={{
            backgroundColor: `color-mix(in srgb, var(--orange-soft) ${Math.round(warmthRatio * 40)}%, var(--ice-soft))`,
          }}
        >
          <defs>
            <pattern id="pat-insulation" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M0,4 Q2,0 4,4 T8,4" fill="none" stroke="var(--sage)" strokeWidth="1" />
            </pattern>
            <pattern id="pat-masonry" width="16" height="8" patternUnits="userSpaceOnUse">
              <rect width="16" height="8" fill="var(--cream-2)" stroke="var(--espresso-40)" strokeWidth="0.5" />
              <line x1="8" y1="0" x2="8" y2="4" stroke="var(--espresso-40)" strokeWidth="0.5" />
              <line x1="0" y1="4" x2="16" y2="4" stroke="var(--espresso-40)" strokeWidth="0.5" />
              <line x1="16" y1="4" x2="16" y2="8" stroke="var(--espresso-40)" strokeWidth="0.5" />
            </pattern>
            <pattern id="pat-concrete" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill="var(--cream-2)" />
              <circle cx="3" cy="3" r="1" fill="var(--espresso-70)" />
              <circle cx="9" cy="8" r="1.5" fill="var(--espresso-70)" />
              <circle cx="6" cy="11" r="0.8" fill="var(--espresso-70)" />
            </pattern>
            <pattern id="pat-relief" width="10" height="10" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="10" y2="10" stroke="var(--ice)" strokeWidth="1" />
              <line x1="10" y1="0" x2="0" y2="10" stroke="var(--ice)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Sky background / horizon line */}
          <line x1="0" y1="260" x2="580" y2="260" stroke="var(--rule)" strokeWidth="2" />
          <text x="20" y="278" className="svg-ground-text mono">Ground Line (3,500 m altitude)</text>

          {/* Sun glyph when daylight */}
          {isDaylight && (
            <g className="sun-glyph" transform={`translate(${sunX}, ${sunY})`}>
              <circle r="16" fill="var(--orange)" opacity="0.9" />
              <circle r="22" fill="none" stroke="var(--orange)" strokeWidth="2" strokeDasharray="3 3" />
              <text y="32" textAnchor="middle" className="sun-text mono">
                GHI {Math.round(ghi)} W/m²
              </text>
            </g>
          )}

          {/* Building Outer Shell */}
          {/* Main room interior air space */}
          <rect
            x="140"
            y="90"
            width="300"
            height="160"
            className="room-air-node"
            style={{
              fill: `color-mix(in srgb, var(--orange-soft) ${Math.round(warmthRatio * 60)}%, var(--ice-soft))`,
            }}
          />

          {/* Roof envelope stack (top: outside -> bottom: ceiling) */}
          <g className="roof-graphic-stack">
            {roof.map((layer, idx) => {
              const h = Math.max(8, layer.thickness_m * 60);
              const y = 90 - (idx + 1) * h;
              const cat = getCategory(layer.material);
              return (
                <g key={`roof-g-${idx}`}>
                  <rect
                    x="110"
                    y={y}
                    width="360"
                    height={h}
                    fill={cat === 'insulation' ? 'url(#pat-insulation)' : cat === 'mass' ? 'url(#pat-concrete)' : 'url(#pat-masonry)'}
                    stroke="var(--espresso)"
                    strokeWidth="1"
                  />
                  <text x="290" y={y + h / 2 + 3} textAnchor="middle" className="svg-layer-label mono">
                    {formatMatName(layer.material)} ({(layer.thickness_m * 1000).toFixed(0)} mm)
                  </text>
                </g>
              );
            })}
          </g>

          {/* North Wall stack (Left, outside -> inside) */}
          <g className="wall-left-stack">
            {walls.map((layer, idx) => {
              const w = Math.max(8, layer.thickness_m * 60);
              const x = 140 - (idx + 1) * w;
              const cat = getCategory(layer.material);
              return (
                <rect
                  key={`wall-l-${idx}`}
                  x={x}
                  y="90"
                  width={w}
                  height="160"
                  fill={cat === 'insulation' ? 'url(#pat-insulation)' : cat === 'mass' ? 'url(#pat-concrete)' : 'url(#pat-masonry)'}
                  stroke="var(--espresso)"
                  strokeWidth="1"
                />
              );
            })}
          </g>

          {/* South Wall stack (Right, inside -> outside) */}
          <g className="wall-right-stack">
            {walls.map((layer, idx) => {
              const w = Math.max(8, layer.thickness_m * 60);
              const x = 440 + idx * w;
              const cat = getCategory(layer.material);
              return (
                <rect
                  key={`wall-r-${idx}`}
                  x={x}
                  y="90"
                  width={w}
                  height="160"
                  fill={cat === 'insulation' ? 'url(#pat-insulation)' : cat === 'mass' ? 'url(#pat-concrete)' : 'url(#pat-masonry)'}
                  stroke="var(--espresso)"
                  strokeWidth="1"
                />
              );
            })}
          </g>

          {/* Glazing aperture on South face */}
          <rect x="440" y="130" width="16" height="70" fill="var(--ice)" stroke="var(--espresso)" strokeWidth="1.5" />
          <text x="470" y="170" className="svg-window-label mono">4.0m² Glazing</text>

          {/* Floor envelope stack (inside: floor -> outside: ground) */}
          <g className="floor-graphic-stack">
            {floor.map((layer, idx) => {
              const h = Math.max(6, layer.thickness_m * 50);
              const y = 250 + idx * h;
              const cat = getCategory(layer.material);
              return (
                <g key={`floor-g-${idx}`}>
                  <rect
                    x="130"
                    y={y}
                    width="320"
                    height={h}
                    fill={cat === 'mass' ? 'url(#pat-concrete)' : 'url(#pat-masonry)'}
                    stroke="var(--espresso)"
                    strokeWidth="1"
                  />
                  <text x="290" y={y + h / 2 + 3} textAnchor="middle" className="svg-layer-label mono">
                    {formatMatName(layer.material)} ({(layer.thickness_m * 1000).toFixed(0)} mm)
                  </text>
                </g>
              );
            })}
          </g>

          {/* Room Air Node Readout */}
          <text x="290" y="165" textAnchor="middle" className="svg-air-title">INDOOR AIR NODE</text>
          <text x="290" y="195" textAnchor="middle" className="svg-air-temp mono">
            {tIn.toFixed(1)} °C
          </text>

          {/* Heat flux arrows */}
          {/* Roof flux arrow pointing outward to sky */}
          <g className="flux-arrow-roof">
            <line x1="290" y1="50" x2="290" y2="10" stroke="var(--ice)" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <text x="300" y="30" className="flux-text mono">Sky Flux {Math.round(roofFlux)} W</text>
          </g>

          {/* South Wall flux arrow */}
          <g className="flux-arrow-wall">
            <line x1="470" y1="110" x2="520" y2="110" stroke="var(--orange)" strokeWidth="2" />
            <text x="500" y="102" className="flux-text mono">{Math.round(wallFlux)} W</text>
          </g>
        </svg>
      </div>

      {/* Interactive Drop Zones & Layer Stacks */}
      <div className="drop-zones-grid">
        {/* ROOF ZONE */}
        <div
          className={`drop-zone-card ${dragOverZone === 'roof' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'roof')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'roof')}
        >
          <div className="zone-header">
            <span className="zone-name">ROOF ASSEMBLY</span>
            <span className="zone-dir mono">Outside (Top) → Inside (Ceiling)</span>
          </div>
          {roof.length === 0 ? (
            <div className="empty-zone-notice">Drag insulation or concrete here</div>
          ) : (
            <div className="layers-stack">
              {roof.map((layer, idx) => (
                <div
                  key={`roof-${idx}`}
                  className="layer-item"
                  draggable
                  onDragStart={() => setDraggedLayerIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedLayerIdx !== null && draggedLayerIdx !== idx) {
                      onReorderLayer('roof', draggedLayerIdx, idx);
                      setDraggedLayerIdx(null);
                    }
                  }}
                >
                  <div className="layer-row">
                    <span className="layer-pos mono">L{idx + 1}</span>
                    <span className="layer-name">{formatMatName(layer.material)}</span>
                    <button
                      type="button"
                      className="layer-remove-btn"
                      title="Remove layer"
                      onClick={() => onRemoveLayer('roof', idx)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="thickness-control">
                    <span className="th-label mono">{(layer.thickness_m * 1000).toFixed(0)} mm</span>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={Math.round(layer.thickness_m * 1000)}
                      onChange={(e) => onUpdateThickness('roof', idx, Number(e.target.value) / 1000)}
                      className="thickness-slider"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WALLS ZONE */}
        <div
          className={`drop-zone-card ${dragOverZone === 'walls' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'walls')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'walls')}
        >
          <div className="zone-header">
            <span className="zone-name">WALL ASSEMBLY</span>
            <span className="zone-dir mono">Outside Skin → Inside Living Face</span>
          </div>
          {walls.length === 0 ? (
            <div className="empty-zone-notice">Drag mud brick, stone, or EPS here</div>
          ) : (
            <div className="layers-stack">
              {walls.map((layer, idx) => (
                <div
                  key={`walls-${idx}`}
                  className="layer-item"
                  draggable
                  onDragStart={() => setDraggedLayerIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedLayerIdx !== null && draggedLayerIdx !== idx) {
                      onReorderLayer('walls', draggedLayerIdx, idx);
                      setDraggedLayerIdx(null);
                    }
                  }}
                >
                  <div className="layer-row">
                    <span className="layer-pos mono">L{idx + 1}</span>
                    <span className="layer-name">{formatMatName(layer.material)}</span>
                    <button
                      type="button"
                      className="layer-remove-btn"
                      title="Remove layer"
                      onClick={() => onRemoveLayer('walls', idx)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="thickness-control">
                    <span className="th-label mono">{(layer.thickness_m * 1000).toFixed(0)} mm</span>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="5"
                      value={Math.round(layer.thickness_m * 1000)}
                      onChange={(e) => onUpdateThickness('walls', idx, Number(e.target.value) / 1000)}
                      className="thickness-slider"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FLOOR ZONE */}
        <div
          className={`drop-zone-card ${dragOverZone === 'floor' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'floor')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'floor')}
        >
          <div className="zone-header">
            <span className="zone-name">FLOOR SUB-BASE</span>
            <span className="zone-dir mono">Under-Bed Ground → Top Surface</span>
          </div>
          {floor.length === 0 ? (
            <div className="empty-zone-notice">Drag concrete or stone floor here</div>
          ) : (
            <div className="layers-stack">
              {floor.map((layer, idx) => (
                <div
                  key={`floor-${idx}`}
                  className="layer-item"
                  draggable
                  onDragStart={() => setDraggedLayerIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedLayerIdx !== null && draggedLayerIdx !== idx) {
                      onReorderLayer('floor', draggedLayerIdx, idx);
                      setDraggedLayerIdx(null);
                    }
                  }}
                >
                  <div className="layer-row">
                    <span className="layer-pos mono">L{idx + 1}</span>
                    <span className="layer-name">{formatMatName(layer.material)}</span>
                    <button
                      type="button"
                      className="layer-remove-btn"
                      title="Remove layer"
                      onClick={() => onRemoveLayer('floor', idx)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="thickness-control">
                    <span className="th-label mono">{(layer.thickness_m * 1000).toFixed(0)} mm</span>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={Math.round(layer.thickness_m * 1000)}
                      onChange={(e) => onUpdateThickness('floor', idx, Number(e.target.value) / 1000)}
                      className="thickness-slider"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
