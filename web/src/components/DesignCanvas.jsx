/*
 * DesignCanvas.jsx — Phase S3 Redesign
 * Main canvas display for Step 1: Design.
 * Centers the live architectural cross-section as the dominant interactive element.
 */
import CrossSectionSVG from './CrossSectionSVG';

const CATEGORIES = [
  { label: 'structural', color: 'var(--solar)' },
  { label: 'insulation', color: 'var(--accent)' },
  { label: 'glazing',    color: 'var(--text-secondary)' },
  { label: 'mass',       color: 'var(--comfort)' },
  { label: 'membrane',   color: 'var(--text-muted)' },
];

export default function DesignCanvas({ request }) {
  const length_m = request?.geometry?.length_m ?? 6;
  const width_m = request?.geometry?.width_m ?? 4;
  const orientation_deg = request?.geometry?.orientation_deg ?? 180;

  const wallLayers = request?.envelope?.walls || [];
  const totalWall_m = wallLayers.reduce((s, l) => s + (Math.max(0, Number(l.thickness_m)) || 0), 0);
  const totalWall_mm = Math.round(totalWall_m * 1000);

  return (
    <div
      className="design-canvas"
      style={{
        width: '100%',
        maxWidth: 860,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <style>{`
        .design-canvas .cross-section-container {
          width: 100%;
          max-width: 860px;
          background: var(--surface-1);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: none;
        }
        .design-canvas .cross-section-header {
          display: none;
        }
        .design-canvas .cross-section-legend {
          display: none;
        }
        .design-canvas .cross-section-svg-wrapper {
          width: 100%;
          height: 400px;
          max-height: 400px;
          aspect-ratio: auto;
        }
      `}</style>

      {/* 1. Header bar above SVG */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 'var(--space-2)',
          borderBottom: 'var(--border-width) solid var(--border)',
          boxShadow: 'none',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-title-size)',
            lineHeight: 'var(--text-title-lh)',
            fontWeight: 'var(--text-title-weight)',
            letterSpacing: 'var(--text-title-spacing)',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Shelter cross-section
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-caption-size)',
            lineHeight: 'var(--text-caption-lh)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>span={length_m}m × {width_m}m</span>
          <span style={{ color: 'var(--border-strong)', userSelect: 'none' }}>|</span>
          <span>wall {totalWall_mm}mm</span>
          <span style={{ color: 'var(--border-strong)', userSelect: 'none' }}>|</span>
          <span>orient {orientation_deg}°</span>
        </div>
      </div>

      {/* 2. Dominant architectural cross-section */}
      <CrossSectionSVG request={request} />

      {/* 3. Slim legend row below SVG */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 'var(--space-3)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-caption-size)',
          lineHeight: 'var(--text-caption-lh)',
          color: 'var(--text-muted)',
          paddingTop: 'var(--space-1)',
        }}
      >
        {CATEGORIES.map(cat => (
          <div
            key={cat.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: cat.color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
