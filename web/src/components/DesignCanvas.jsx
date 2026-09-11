/*
 * DesignCanvas.jsx — Phase S3
 * Main canvas display for Step 1: Design.
 * Renders full-width architectural cross-section with live shelter telemetry.
 */
import CrossSectionSVG from './CrossSectionSVG';

export default function DesignCanvas({ request }) {
  const wallLayers = request?.envelope?.walls || [];
  const roofLayers = request?.envelope?.roof || [];
  const floorLayers = request?.envelope?.floor || [];

  const totalWall_m = wallLayers.reduce((s, l) => s + (Number(l.thickness_m) || 0), 0);
  const totalRoof_m = roofLayers.reduce((s, l) => s + (Number(l.thickness_m) || 0), 0);
  const totalFloor_m = floorLayers.reduce((s, l) => s + (Number(l.thickness_m) || 0), 0);

  return (
    <div style={{
      width: '100%',
      maxWidth: 900,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: 'var(--space-2)',
    }}>
      {/* Overview header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: 'var(--border-width) solid var(--border)',
        paddingBottom: 'var(--space-2)',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-title-size)',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Shelter Architecture &amp; Envelope
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '4px 0 0',
          }}>
            Live 2D cross-section · scaled proportionally · outside → inside layer ordering
          </p>
        </div>

        {/* Quick summary metrics */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-caption-size)',
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Span: </span>
            <span style={{ color: 'var(--text-primary)' }}>{request?.geometry?.length_m}m × {request?.geometry?.width_m}m</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Wall Thk: </span>
            <span style={{ color: 'var(--solar)' }}>{Math.round(totalWall_m * 1000)} mm</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Roof Thk: </span>
            <span style={{ color: 'var(--text-primary)' }}>{Math.round(totalRoof_m * 1000)} mm</span>
          </div>
        </div>
      </div>

      {/* Main architectural cross-section */}
      <CrossSectionSVG request={request} />

      {/* Quick guide */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-1)',
      }}>
        <div style={{
          background: 'var(--surface-1)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-2)',
        }}>
          <div style={{ color: 'var(--solar)', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            SOLAR PASSIVE ORIENTATION
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.4 }}>
            Sun glyph dynamically orbits around the building based on the orientation angle. South glazing captures maximum winter irradiance.
          </p>
        </div>

        <div style={{
          background: 'var(--surface-1)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-2)',
        }}>
          <div style={{ color: 'var(--accent)', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            MULTI-LAYER ENVELOPE
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.4 }}>
            Layers render strictly to scale outside-to-inside. Hover any layer on the diagram to inspect its material and millimeter thickness.
          </p>
        </div>

        <div style={{
          background: 'var(--surface-1)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-2)',
        }}>
          <div style={{ color: 'var(--comfort)', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            GROUND &amp; ALBEDO
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.4 }}>
            Toggling snow cover applies a snow drift to the terrain and roof, driving high ground albedo (0.80) solar reflection into south openings.
          </p>
        </div>
      </div>
    </div>
  );
}
