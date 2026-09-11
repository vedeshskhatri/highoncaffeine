/*
 * CompassControl.jsx — Phase S2
 * Orientation as a visual compass, not a raw number input.
 * The user thinks in directions (N/S/E/W), not degrees.
 *
 * - Click anywhere on the compass ring to set orientation
 * - Click cardinal direction labels to snap to N/E/S/W
 * - Numeric input accepts direct degree entry
 * - 0 = North, 90 = East, 180 = South, 270 = West
 */
import { useRef, useCallback } from 'react';

const SIZE = 88;          // SVG px
const R = 36;             // ring radius
const CX = SIZE / 2;
const CY = SIZE / 2;

/** degrees → { x, y } on the ring */
function degToXY(deg, r = R) {
  // 0° is north = top = -π/2 in math coords
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

/** Mouse/touch event position → degrees */
function xyToDeg(e, svgEl) {
  const rect = svgEl.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = ((clientX - rect.left) / rect.width) * SIZE - CX;
  const y = ((clientY - rect.top)  / rect.height) * SIZE - CY;
  // atan2 gives math angle; offset to make 0 = north = top
  let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  return Math.round(deg) % 360;
}

const CARDINALS = [
  { label: 'N', deg: 0   },
  { label: 'E', deg: 90  },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
];

function dirLabel(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (d <= 22.5 || d > 337.5)  return 'N';
  if (d > 22.5  && d <= 67.5)  return 'NE';
  if (d > 67.5  && d <= 112.5) return 'E';
  if (d > 112.5 && d <= 157.5) return 'SE';
  if (d > 157.5 && d <= 202.5) return 'S';
  if (d > 202.5 && d <= 247.5) return 'SW';
  if (d > 247.5 && d <= 292.5) return 'W';
  return 'NW';
}

export default function CompassControl({ value, onChange, hasError }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);

  const updateFromEvent = useCallback((e) => {
    if (!svgRef.current) return;
    const deg = xyToDeg(e, svgRef.current);
    onChange(deg);
  }, [onChange]);

  const handleMouseDown = useCallback((e) => {
    dragging.current = true;
    updateFromEvent(e);
    e.preventDefault();
  }, [updateFromEvent]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    updateFromEvent(e);
  }, [updateFromEvent]);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const needle = degToXY(value, R - 4);
  const needleBase = degToXY(value + 180, 10);

  return (
    <div className="compass-wrap">
      {/* SVG compass */}
      <div
        className="compass-svg-wrap"
        style={{ width: SIZE, height: SIZE }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        role="slider"
        aria-label="Orientation compass"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={value}
        aria-valuetext={`${value}° ${dirLabel(value)}`}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') onChange((value + 5) % 360);
          if (e.key === 'ArrowLeft')  onChange(((value - 5) + 360) % 360);
          if (e.key === 'ArrowUp')    onChange((value + 1) % 360);
          if (e.key === 'ArrowDown')  onChange(((value - 1) + 360) % 360);
        }}
      >
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ display: 'block' }}
        >
          {/* Outer ring */}
          <circle
            cx={CX} cy={CY} r={R + 2}
            fill="var(--surface-2)"
            stroke={hasError ? 'var(--danger)' : 'var(--border-strong)'}
            strokeWidth="1"
          />
          {/* Inner circle */}
          <circle cx={CX} cy={CY} r={10} fill="var(--surface-1)" />

          {/* Cardinal tick marks */}
          {CARDINALS.map(({ label, deg }) => {
            const outer = degToXY(deg, R + 1);
            const inner = degToXY(deg, R - 5);
            const lpos  = degToXY(deg, R + 10);
            return (
              <g key={label}>
                <line
                  x1={inner.x} y1={inner.y}
                  x2={outer.x} y2={outer.y}
                  stroke="var(--text-muted)" strokeWidth="1.5"
                />
                <text
                  x={lpos.x} y={lpos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="8"
                  fontFamily="var(--font-body)"
                  fill={label === 'S' ? 'var(--solar)' : 'var(--text-muted)'}
                  fontWeight={label === 'S' ? '700' : '400'}
                  onClick={(e) => { e.stopPropagation(); onChange(deg); }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Needle — points toward current orientation */}
          <line
            x1={needleBase.x} y1={needleBase.y}
            x2={needle.x} y2={needle.y}
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Needle tip dot */}
          <circle cx={needle.x} cy={needle.y} r="3" fill="var(--accent)" />
          {/* Centre dot */}
          <circle cx={CX} cy={CY} r="2" fill="var(--text-muted)" />
        </svg>
      </div>

      {/* Degree input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <input
          type="number"
          className={`compass-deg-input${hasError ? ' invalid' : ''}`}
          value={value}
          min={0}
          max={360}
          id="field-orientation"
          onChange={e => {
            const v = parseFloat(e.target.value);
            onChange(isNaN(v) ? 0 : v);
          }}
          aria-label="Orientation degrees"
        />
        <span className="compass-dir-label">{dirLabel(value)}</span>
      </div>
    </div>
  );
}
