/*
 * CrossSectionSVG.jsx — Phase S3
 * Hand-written SVG cross-section of the shelter. NO LIBRARY.
 *
 * Redraws instantly on EVERY input change — no debounce, no animation.
 *
 * Features:
 *   - Wall layers TO SCALE, outside → inside, with distinct category pattern fills
 *   - Roof layers TO SCALE, outside (top) → inside (ceiling)
 *   - Floor layers TO SCALE, outside (bottom) → inside (floor surface)
 *   - Ground line with snow drift overlay when ground.snow_cover is true
 *   - Window openings on correct side (South on right wall, North on left wall, Roof on roof)
 *   - Window glazing panes (single, double, triple pane)
 *   - Night shutter indicator when enabled
 *   - Sun glyph on south side positioned by orientation_deg
 *   - Hover tooltip for layer material and thickness
 *   - Graceful degradation: 0 layers, 1 layer, or 10+ layers without overflow
 *
 * Token colors only — zero hardcoded hex colors.
 */
import { useState, useMemo } from 'react';
import './CrossSectionSVG.css';

/* ── Material display names ─────────────────────────────────────────────── */
const MATERIAL_NAMES = {
  mud_brick:    'Mud brick (adobe)',
  rammed_earth: 'Rammed earth',
  stone:        'Stone (local)',
  concrete:     'Concrete',
  eps:          'EPS insulation',
  xps:          'XPS insulation',
  timber:       'Timber (softwood)',
  plywood:      'Plywood',
  polythene:    'Polythene sheet',
};

function getMatName(id) {
  return MATERIAL_NAMES[id] || id?.replace(/_/g, ' ') || 'Unknown material';
}

function getMaterialPattern(id) {
  switch (id) {
    case 'mud_brick':
    case 'rammed_earth':
      return 'url(#pat-earth)';
    case 'stone':
      return 'url(#pat-stone)';
    case 'concrete':
      return 'url(#pat-concrete)';
    case 'eps':
    case 'xps':
      return 'url(#pat-insulation)';
    case 'timber':
    case 'plywood':
      return 'url(#pat-wood)';
    case 'polythene':
      return 'url(#pat-membrane)';
    default:
      return 'url(#pat-default)';
  }
}

export default function CrossSectionSVG({ request }) {
  const [hovered, setHovered] = useState(null);

  /* Safe access with defaults */
  const walls = useMemo(() => request?.envelope?.walls || [], [request?.envelope?.walls]);
  const roof  = useMemo(() => request?.envelope?.roof  || [], [request?.envelope?.roof]);
  const floor = useMemo(() => request?.envelope?.floor || [], [request?.envelope?.floor]);
  const openings = useMemo(() => request?.openings || [], [request?.openings]);
  const snowCover = !!request?.ground?.snow_cover;
  const orientationDeg = Number(request?.geometry?.orientation_deg) || 0;

  /* ── Canvas layout geometry ─────────────────────────────────────────── */
  const SVG_W = 440;
  const SVG_H = 270;

  // Ground level
  const Y_GROUND = 215;

  // Shelter box envelope
  const ROOM_W = 200; // interior width in px
  const ROOM_H = 110; // interior height in px

  const X_CENTER = SVG_W / 2;
  const X_LEFT_INNER  = X_CENTER - ROOM_W / 2;
  const X_RIGHT_INNER = X_CENTER + ROOM_W / 2;
  const Y_CEILING     = Y_GROUND - ROOM_H;
  const Y_FLOOR_TOP   = Y_GROUND;

  // Maximum pixel thickness budgets (to prevent overflow even with 10+ layers)
  const MAX_WALL_PX  = 40;
  const MAX_ROOF_PX  = 26;
  const MAX_FLOOR_PX = 20;

  // Sum of thicknesses
  const totalWall_m  = useMemo(() => walls.reduce((s, l) => s + (Math.max(0, Number(l.thickness_m)) || 0), 0), [walls]);
  const totalRoof_m  = useMemo(() => roof.reduce((s, l)  => s + (Math.max(0, Number(l.thickness_m)) || 0), 0), [roof]);
  const totalFloor_m = useMemo(() => floor.reduce((s, l) => s + (Math.max(0, Number(l.thickness_m)) || 0), 0), [floor]);

  // Scaled pixel widths (proportional to thickness)
  const wallPxTotal  = totalWall_m > 0  ? Math.min(MAX_WALL_PX, Math.max(12, totalWall_m * 50))  : 0;
  const roofPxTotal  = totalRoof_m > 0  ? Math.min(MAX_ROOF_PX, Math.max(10, totalRoof_m * 40))  : 0;
  const floorPxTotal = totalFloor_m > 0 ? Math.min(MAX_FLOOR_PX, Math.max(8, totalFloor_m * 40)) : 0;

  // Wall boundaries:
  // Left wall (North): Outside is left-most, inside is X_LEFT_INNER
  const X_LEFT_OUTER  = X_LEFT_INNER - wallPxTotal;
  // Right wall (South): Inside is X_RIGHT_INNER, outside is right-most
  const X_RIGHT_OUTER = X_RIGHT_INNER + wallPxTotal;

  // Roof boundaries:
  // Outside (top of roof) to inside (ceiling)
  const Y_ROOF_OUTER = Y_CEILING - roofPxTotal;

  // Floor boundaries:
  // Inside (floor top) to outside (ground foundation contact)
  const Y_FLOOR_OUTER = Y_FLOOR_TOP + floorPxTotal;

  /* ── Sun glyph position ─────────────────────────────────────────────── */
  // 180° is South (right wall). 0° is North (left wall). 90° East, 270° West.
  // Sun travels along an upper orbit arc
  const sunAngleRad = useMemo(() => {
    // map 0..360 where 180 is angle 0 (right/south), 0 is angle PI (left/north)
    const norm = (orientationDeg - 180) * (Math.PI / 180);
    return norm;
  }, [orientationDeg]);

  const sunX = X_CENTER + 150 * Math.cos(sunAngleRad);
  const sunY = Y_ROOF_OUTER - 20 - 35 * Math.abs(Math.sin(sunAngleRad));

  /* ── Openings ───────────────────────────────────────────────────────── */
  const southOpening = openings.find(o => o.facing === 'south');
  const northOpening = openings.find(o => o.facing === 'north');
  const roofOpening  = openings.find(o => o.facing === 'roof');

  return (
    <div className="cross-section-container">
      <div className="cross-section-header">
        <div className="cross-section-title">
          Live Cross-Section
          <span className="cross-section-badge">
            {orientationDeg}° {orientationDeg === 180 ? 'South-facing' : 'Oriented'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Outside → Inside
        </div>
      </div>

      <div className="cross-section-svg-wrapper">
        <svg
          className="cross-section-svg"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          aria-label="Shelter architectural cross section"
        >
          <defs>
            {/* Earth / Mud brick pattern */}
            <pattern id="pat-earth" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="var(--surface-2)" />
              <path d="M 0 4 L 8 4 M 4 0 L 4 8" stroke="var(--border-strong)" strokeWidth="0.75" />
            </pattern>

            {/* Insulation (EPS/XPS) pattern */}
            <pattern id="pat-insulation" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="var(--surface-1)" />
              <path d="M 0 8 L 8 0 M -2 2 L 2 -2 M 6 10 L 10 6" stroke="var(--solar)" strokeWidth="0.9" opacity="0.65" />
            </pattern>

            {/* Concrete pattern */}
            <pattern id="pat-concrete" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="var(--surface-2)" />
              <circle cx="2" cy="2" r="0.75" fill="var(--text-muted)" />
              <circle cx="5" cy="5" r="0.75" fill="var(--text-secondary)" />
            </pattern>

            {/* Stone pattern */}
            <pattern id="pat-stone" width="12" height="8" patternUnits="userSpaceOnUse">
              <rect width="12" height="8" fill="var(--surface-2)" />
              <path d="M 0 0 L 12 0 M 0 4 L 12 4 M 0 8 L 12 8 M 6 0 L 6 4 M 0 4 L 0 8 M 12 4 L 12 8" stroke="var(--border-strong)" strokeWidth="0.8" />
            </pattern>

            {/* Wood / Timber pattern */}
            <pattern id="pat-wood" width="8" height="12" patternUnits="userSpaceOnUse">
              <rect width="8" height="12" fill="var(--surface-2)" />
              <line x1="2" y1="0" x2="2" y2="12" stroke="var(--text-muted)" strokeWidth="0.8" />
              <line x1="6" y1="0" x2="6" y2="12" stroke="var(--border-strong)" strokeWidth="0.8" />
            </pattern>

            {/* Membrane pattern */}
            <pattern id="pat-membrane" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="var(--surface-1)" />
              <line x1="0" y1="2" x2="4" y2="2" stroke="var(--accent)" strokeWidth="1" />
            </pattern>

            {/* Fallback pattern */}
            <pattern id="pat-default" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* ═══ SKY / BACKGROUND ═══ */}
          <rect x="0" y="0" width={SVG_W} height={Y_GROUND} fill="var(--bg-base)" />

          {/* ═══ GROUND LINE & SUB-TERRAIN ═══ */}
          <rect x="0" y={Y_GROUND} width={SVG_W} height={SVG_H - Y_GROUND} fill="var(--surface-2)" opacity="0.6" />
          <line x1="0" y1={Y_GROUND} x2={SVG_W} y2={Y_GROUND} stroke="var(--border-strong)" strokeWidth="1.5" />

          {/* ═══ SNOW DRIFT (when snow_cover is true) ═══ */}
          {snowCover && (
            <g id="snow-cover-ground">
              {/* Ground snow layer */}
              <path
                d={`M 0 ${Y_GROUND - 4} Q 70 ${Y_GROUND - 7} 140 ${Y_GROUND - 4} T 280 ${Y_GROUND - 6} T ${SVG_W} ${Y_GROUND - 4} L ${SVG_W} ${Y_GROUND + 4} L 0 ${Y_GROUND + 4} Z`}
                fill="var(--text-primary)"
                opacity="0.9"
              />
              <text
                x="30" y={Y_GROUND + 18}
                fill="var(--text-muted)"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                ❄ Snow cover: true (Albedo 0.80)
              </text>
            </g>
          )}

          {/* ═══ INTERIOR CHAMBER ═══ */}
          <rect
            x={X_LEFT_INNER}
            y={Y_CEILING}
            width={ROOM_W}
            height={ROOM_H}
            fill="var(--surface-1)"
            stroke="var(--border)"
            strokeWidth="0.5"
          />
          {/* Interior room label */}
          <text
            x={X_CENTER}
            y={Y_CEILING + ROOM_H / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-body)"
            opacity="0.4"
            letterSpacing="0.08em"
          >
            INTERIOR AIR NODE
          </text>

          {/* ═══ SUN GLYPH ═══ */}
          <g
            id="sun-glyph"
            transform={`translate(${sunX}, ${sunY})`}
            style={{ pointerEvents: 'none' }}
          >
            {/* Sun rays */}
            <circle cx="0" cy="0" r="14" fill="var(--solar)" opacity="0.15" />
            <circle cx="0" cy="0" r="10" fill="var(--solar)" opacity="0.3" />
            <circle cx="0" cy="0" r="6" fill="var(--solar)" />
            {/* Ray spikes */}
            {[-45, 0, 45, 90, 135, 180, 225, 270].map(deg => (
              <line
                key={deg}
                x1="0" y1="0"
                x2={13 * Math.cos((deg * Math.PI) / 180)}
                y2={13 * Math.sin((deg * Math.PI) / 180)}
                stroke="var(--solar)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            ))}
            {/* Solar beam arrow toward south wall */}
            {orientationDeg >= 90 && orientationDeg <= 270 && (
              <line
                x1="0" y1="10"
                x2="35" y2="45"
                stroke="var(--solar)"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.6"
              />
            )}
            <text
              x="0" y="-12"
              textAnchor="middle"
              fill="var(--solar)"
              fontSize="9"
              fontFamily="var(--font-mono)"
              fontWeight="600"
            >
              ☀ SUN
            </text>
          </g>

          {/* ═══ ROOF LAYERS (Outside = top, Inside = ceiling) ═══ */}
          {roof.length === 0 ? (
            <rect
              x={X_LEFT_OUTER}
              y={Y_CEILING - 12}
              width={X_RIGHT_OUTER - X_LEFT_OUTER}
              height={12}
              fill="none"
              stroke="var(--border)"
              strokeDasharray="3,3"
            />
          ) : (
            (() => {
              let curY = Y_ROOF_OUTER;
              return roof.map((layer, idx) => {
                const thick_m = Math.max(0, Number(layer.thickness_m)) || 0;
                const h = totalRoof_m > 0 ? (thick_m / totalRoof_m) * roofPxTotal : 0;
                const rY = curY;
                curY += h;
                const isHovered = hovered?.type === 'roof' && hovered?.index === idx;

                return (
                  <rect
                    key={idx}
                    className={`cross-section-layer${isHovered ? ' active' : ''}`}
                    x={X_LEFT_OUTER}
                    y={rY}
                    width={X_RIGHT_OUTER - X_LEFT_OUTER}
                    height={Math.max(1, h)}
                    fill={getMaterialPattern(layer.material)}
                    stroke={isHovered ? 'var(--accent)' : 'var(--border-strong)'}
                    strokeWidth={isHovered ? 1.5 : 0.75}
                    onMouseEnter={() => setHovered({
                      type: 'roof',
                      index: idx,
                      label: `Roof Layer ${idx + 1} (${idx === 0 ? 'Outside' : idx === roof.length - 1 ? 'Inside' : 'Core'})`,
                      material: getMatName(layer.material),
                      thickness_m: thick_m,
                    })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`Roof layer ${idx + 1}: ${getMatName(layer.material)} (${thick_m} m)`}</title>
                  </rect>
                );
              });
            })()
          )}

          {/* Roof snow drift if snow_cover */}
          {snowCover && roof.length > 0 && (
            <path
              d={`M ${X_LEFT_OUTER - 4} ${Y_ROOF_OUTER} Q ${X_CENTER} ${Y_ROOF_OUTER - 5} ${X_RIGHT_OUTER + 4} ${Y_ROOF_OUTER} L ${X_RIGHT_OUTER + 4} ${Y_ROOF_OUTER + 2} L ${X_LEFT_OUTER - 4} ${Y_ROOF_OUTER + 2} Z`}
              fill="var(--text-primary)"
              opacity="0.95"
            />
          )}

          {/* Roof skylight if roof opening exists */}
          {roofOpening && (
            <g id="roof-opening">
              <rect
                x={X_CENTER - 18}
                y={Y_ROOF_OUTER - 1}
                width="36"
                height={Math.max(4, roofPxTotal + 2)}
                fill="var(--surface-1)"
                stroke="var(--accent)"
                strokeWidth="1"
              />
              <line
                x1={X_CENTER - 18} y1={Y_ROOF_OUTER + roofPxTotal / 2}
                x2={X_CENTER + 18} y2={Y_ROOF_OUTER + roofPxTotal / 2}
                stroke="var(--accent)" strokeWidth="1.5"
              />
            </g>
          )}

          {/* ═══ FLOOR LAYERS (Outside = bottom/ground, Inside = room floor) ═══ */}
          {floor.length === 0 ? (
            <rect
              x={X_LEFT_INNER}
              y={Y_FLOOR_TOP}
              width={ROOM_W}
              height={10}
              fill="none"
              stroke="var(--border)"
              strokeDasharray="3,3"
            />
          ) : (
            (() => {
              // Floor ordered outside (bottom) -> inside (top)
              // We render from inside (Y_FLOOR_TOP) down to Y_FLOOR_OUTER
              let curY = Y_FLOOR_TOP;
              // reverse to match outside (bottom) to inside (top)
              const reversed = [...floor].reverse();
              return reversed.map((layer, idx) => {
                const origIdx = floor.length - 1 - idx;
                const thick_m = Math.max(0, Number(layer.thickness_m)) || 0;
                const h = totalFloor_m > 0 ? (thick_m / totalFloor_m) * floorPxTotal : 0;
                const fY = curY;
                curY += h;
                const isHovered = hovered?.type === 'floor' && hovered?.index === origIdx;

                return (
                  <rect
                    key={origIdx}
                    className={`cross-section-layer${isHovered ? ' active' : ''}`}
                    x={X_LEFT_INNER}
                    y={fY}
                    width={ROOM_W}
                    height={Math.max(1, h)}
                    fill={getMaterialPattern(layer.material)}
                    stroke={isHovered ? 'var(--accent)' : 'var(--border-strong)'}
                    strokeWidth={isHovered ? 1.5 : 0.75}
                    onMouseEnter={() => setHovered({
                      type: 'floor',
                      index: origIdx,
                      label: `Floor Layer ${origIdx + 1} (${origIdx === 0 ? 'Outside/Ground' : 'Inside'})`,
                      material: getMatName(layer.material),
                      thickness_m: thick_m,
                    })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`Floor layer ${origIdx + 1}: ${getMatName(layer.material)} (${thick_m} m)`}</title>
                  </rect>
                );
              });
            })()
          )}

          {/* ═══ LEFT WALL (NORTH) ═══ */}
          {/* Outside is X_LEFT_OUTER (left-most), Inside is X_LEFT_INNER */}
          {walls.length === 0 ? (
            <rect
              x={X_LEFT_INNER - 15}
              y={Y_CEILING}
              width={15}
              height={ROOM_H}
              fill="none"
              stroke="var(--border)"
              strokeDasharray="3,3"
            />
          ) : (
            (() => {
              let curX = X_LEFT_OUTER;
              return walls.map((layer, idx) => {
                const thick_m = Math.max(0, Number(layer.thickness_m)) || 0;
                const w = totalWall_m > 0 ? (thick_m / totalWall_m) * wallPxTotal : 0;
                const layerX = curX;
                curX += w;
                const isHovered = hovered?.type === 'wall-left' && hovered?.index === idx;

                return (
                  <rect
                    key={`wall-left-${idx}`}
                    className={`cross-section-layer${isHovered ? ' active' : ''}`}
                    x={layerX}
                    y={Y_CEILING}
                    width={Math.max(1, w)}
                    height={ROOM_H}
                    fill={getMaterialPattern(layer.material)}
                    stroke={isHovered ? 'var(--accent)' : 'var(--border-strong)'}
                    strokeWidth={isHovered ? 1.5 : 0.75}
                    onMouseEnter={() => setHovered({
                      type: 'wall-left',
                      index: idx,
                      label: `North Wall Layer ${idx + 1} (${idx === 0 ? 'Outside' : idx === walls.length - 1 ? 'Inside' : 'Core'})`,
                      material: getMatName(layer.material),
                      thickness_m: thick_m,
                    })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`Wall layer ${idx + 1} (North): ${getMatName(layer.material)} (${thick_m} m)`}</title>
                  </rect>
                );
              });
            })()
          )}

          {/* North Opening (if present) */}
          {northOpening && (
            <g id="north-opening">
              {/* Window cut in left wall */}
              <rect
                x={X_LEFT_OUTER}
                y={Y_CEILING + 35}
                width={wallPxTotal}
                height="40"
                fill="var(--surface-1)"
                stroke="var(--accent)"
                strokeWidth="1"
              />
              {/* Glazing panes */}
              <line
                x1={X_LEFT_OUTER + wallPxTotal / 2} y1={Y_CEILING + 35}
                x2={X_LEFT_OUTER + wallPxTotal / 2} y2={Y_CEILING + 75}
                stroke="var(--accent)" strokeWidth="1.5"
              />
              {northOpening.night_shutter && (
                <rect
                  x={X_LEFT_OUTER - 4}
                  y={Y_CEILING + 33}
                  width="4"
                  height="44"
                  fill="var(--solar)"
                  stroke="var(--solar)"
                />
              )}
            </g>
          )}

          {/* ═══ RIGHT WALL (SOUTH) ═══ */}
          {/* Outside is X_RIGHT_OUTER (right-most), Inside is X_RIGHT_INNER */}
          {walls.length === 0 ? (
            <rect
              x={X_RIGHT_INNER}
              y={Y_CEILING}
              width={15}
              height={ROOM_H}
              fill="none"
              stroke="var(--border)"
              strokeDasharray="3,3"
            />
          ) : (
            (() => {
              // Outside -> Inside: layer 0 starts at X_RIGHT_OUTER and advances towards X_RIGHT_INNER (leftward)
              let curX = X_RIGHT_OUTER;
              return walls.map((layer, idx) => {
                const thick_m = Math.max(0, Number(layer.thickness_m)) || 0;
                const w = totalWall_m > 0 ? (thick_m / totalWall_m) * wallPxTotal : 0;
                curX -= w;
                const layerX = curX;
                const isHovered = hovered?.type === 'wall-right' && hovered?.index === idx;

                return (
                  <rect
                    key={`wall-right-${idx}`}
                    className={`cross-section-layer${isHovered ? ' active' : ''}`}
                    x={layerX}
                    y={Y_CEILING}
                    width={Math.max(1, w)}
                    height={ROOM_H}
                    fill={getMaterialPattern(layer.material)}
                    stroke={isHovered ? 'var(--accent)' : 'var(--border-strong)'}
                    strokeWidth={isHovered ? 1.5 : 0.75}
                    onMouseEnter={() => setHovered({
                      type: 'wall-right',
                      index: idx,
                      label: `South Wall Layer ${idx + 1} (${idx === 0 ? 'Outside' : idx === walls.length - 1 ? 'Inside' : 'Core'})`,
                      material: getMatName(layer.material),
                      thickness_m: thick_m,
                    })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`Wall layer ${idx + 1} (South): ${getMatName(layer.material)} (${thick_m} m)`}</title>
                  </rect>
                );
              });
            })()
          )}

          {/* South Opening (Window on right wall) */}
          {southOpening && (
            <g id="south-opening">
              {/* Window cut in south wall */}
              <rect
                x={X_RIGHT_INNER}
                y={Y_CEILING + 30}
                width={wallPxTotal}
                height="50"
                fill="var(--surface-1)"
                stroke="var(--accent)"
                strokeWidth="1.2"
              />
              {/* Glazing panes */}
              {southOpening.glazing === 'single_pane' && (
                <line
                  x1={X_RIGHT_INNER + wallPxTotal / 2} y1={Y_CEILING + 30}
                  x2={X_RIGHT_INNER + wallPxTotal / 2} y2={Y_CEILING + 80}
                  stroke="var(--accent)" strokeWidth="1.5"
                />
              )}
              {southOpening.glazing === 'double_pane' && (
                <>
                  <line
                    x1={X_RIGHT_INNER + wallPxTotal * 0.35} y1={Y_CEILING + 30}
                    x2={X_RIGHT_INNER + wallPxTotal * 0.35} y2={Y_CEILING + 80}
                    stroke="var(--accent)" strokeWidth="1.2"
                  />
                  <line
                    x1={X_RIGHT_INNER + wallPxTotal * 0.65} y1={Y_CEILING + 30}
                    x2={X_RIGHT_INNER + wallPxTotal * 0.65} y2={Y_CEILING + 80}
                    stroke="var(--accent)" strokeWidth="1.2"
                  />
                </>
              )}
              {southOpening.glazing === 'triple_pane' && (
                <>
                  <line
                    x1={X_RIGHT_INNER + wallPxTotal * 0.25} y1={Y_CEILING + 30}
                    x2={X_RIGHT_INNER + wallPxTotal * 0.25} y2={Y_CEILING + 80}
                    stroke="var(--accent)" strokeWidth="1"
                  />
                  <line
                    x1={X_RIGHT_INNER + wallPxTotal * 0.50} y1={Y_CEILING + 30}
                    x2={X_RIGHT_INNER + wallPxTotal * 0.50} y2={Y_CEILING + 80}
                    stroke="var(--accent)" strokeWidth="1"
                  />
                  <line
                    x1={X_RIGHT_INNER + wallPxTotal * 0.75} y1={Y_CEILING + 30}
                    x2={X_RIGHT_INNER + wallPxTotal * 0.75} y2={Y_CEILING + 80}
                    stroke="var(--accent)" strokeWidth="1"
                  />
                </>
              )}

              {/* Night shutter indicator */}
              {southOpening.night_shutter && (
                <g id="night-shutter-panel">
                  {/* Shutter exterior panel */}
                  <rect
                    x={X_RIGHT_OUTER}
                    y={Y_CEILING + 28}
                    width="6"
                    height="54"
                    fill="var(--solar)"
                    stroke="var(--solar)"
                    strokeWidth="1"
                  />
                  {/* Shutter slats */}
                  <line x1={X_RIGHT_OUTER} y1={Y_CEILING + 38} x2={X_RIGHT_OUTER + 6} y2={Y_CEILING + 38} stroke="var(--surface-1)" strokeWidth="1" />
                  <line x1={X_RIGHT_OUTER} y1={Y_CEILING + 48} x2={X_RIGHT_OUTER + 6} y2={Y_CEILING + 48} stroke="var(--surface-1)" strokeWidth="1" />
                  <line x1={X_RIGHT_OUTER} y1={Y_CEILING + 58} x2={X_RIGHT_OUTER + 6} y2={Y_CEILING + 58} stroke="var(--surface-1)" strokeWidth="1" />
                  <line x1={X_RIGHT_OUTER} y1={Y_CEILING + 68} x2={X_RIGHT_OUTER + 6} y2={Y_CEILING + 68} stroke="var(--surface-1)" strokeWidth="1" />

                  {/* Badge tag */}
                  <rect
                    x={X_RIGHT_OUTER + 10}
                    y={Y_CEILING + 42}
                    width="68"
                    height="18"
                    rx="3"
                    fill="var(--surface-2)"
                    stroke="var(--solar)"
                    strokeWidth="1"
                  />
                  <text
                    x={X_RIGHT_OUTER + 44}
                    y={Y_CEILING + 54}
                    textAnchor="middle"
                    fill="var(--solar)"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    SHUTTER ON
                  </text>
                </g>
              )}

              {/* Window label */}
              <text
                x={X_RIGHT_OUTER + 8}
                y={Y_CEILING + 76}
                fill="var(--text-secondary)"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                Window {southOpening.area_m2} m²
              </text>
            </g>
          )}

          {/* ═══ WALL LABELS (North on left, South on right) ═══ */}
          <text
            x={X_LEFT_OUTER - 8}
            y={Y_CEILING + ROOM_H / 2}
            textAnchor="end"
            dominantBaseline="central"
            fill="var(--text-secondary)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            North
          </text>
          <text
            x={X_RIGHT_OUTER + 8}
            y={Y_CEILING + 18}
            textAnchor="start"
            dominantBaseline="central"
            fill="var(--solar)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            fontWeight="600"
          >
            South
          </text>

          {/* ═══ SCALE ANNOTATION ═══ */}
          <line
            x1={X_LEFT_INNER}
            y1={Y_GROUND + floorPxTotal + 18}
            x2={X_RIGHT_INNER}
            y2={Y_GROUND + floorPxTotal + 18}
            stroke="var(--border-strong)"
            strokeWidth="1"
          />
          <line x1={X_LEFT_INNER} y1={Y_GROUND + floorPxTotal + 14} x2={X_LEFT_INNER} y2={Y_GROUND + floorPxTotal + 22} stroke="var(--border-strong)" />
          <line x1={X_RIGHT_INNER} y1={Y_GROUND + floorPxTotal + 14} x2={X_RIGHT_INNER} y2={Y_GROUND + floorPxTotal + 22} stroke="var(--border-strong)" />
          <text
            x={X_CENTER}
            y={Y_GROUND + floorPxTotal + 28}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="9"
            fontFamily="var(--font-mono)"
          >
            {request?.geometry?.width_m || 4} m span × {request?.geometry?.height_m || 2.6} m height
          </text>
        </svg>

        {/* ═══ INTERACTIVE HOVER CARD ═══ */}
        {hovered && (
          <div className="cross-section-hover-card">
            <strong>{hovered.label}:</strong> {hovered.material} — {hovered.thickness_m} m ({Math.round(hovered.thickness_m * 1000)} mm)
          </div>
        )}
      </div>

      {/* ═══ LEGEND OF MATERIALS IN CURRENT ENVELOPE ═══ */}
      <div className="cross-section-legend">
        {Array.from(new Set([...walls, ...roof, ...floor].map(l => l.material))).map(mat => (
          <div key={mat} className="legend-item">
            <svg width="12" height="12" style={{ borderRadius: 2, border: '1px solid var(--border-strong)' }}>
              <rect width="12" height="12" fill={getMaterialPattern(mat)} />
            </svg>
            <span>{getMatName(mat)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
