/*
 * ArchitecturalElevationSheet.jsx — Professional Architectural CAD Drafting Sheet
 * Inspired by engineering elevation construction blueprints (CIV-EL-001 to 004).
 *
 * Renders:
 * - Multi-Elevation Architectural CAD Drafting Sheet (1:100 Scale)
 * - Structural Grid Bubble System (A, B, C, D) with witness lines & metric dimensions
 * - Height Datum Level Markers (+3.10m Parapet, +2.80m Ceiling, +1.80m Lintel, ±0.00m FFL)
 * - Authoritative Material Reference Schedule box matching blueprint specs
 * - Architectural Entourage (trees, Himalayan terrain, human scale figure)
 * - Standard Architectural Title Block with Compass Rose, Scale, Date, and Notes
 * - Interactive Projection Tabs (All Sheet, South Solar, North Front, Sides, Section)
 */
import { useState, useMemo } from 'react';
import { getMaterialSpec, computeTotalU, computeLayerR } from './materialsData';
import { Layers, Eye, Compass, Maximize2, Download, Printer } from 'lucide-react';
import './ArchitecturalElevationSheet.css';

export default function ArchitecturalElevationSheet({
  request,
  activeSiteName = 'Siachen Base Camp',
  siteWeather = null,
  showDimensions = true,
  showSolarRays = true,
  snowCover = true,
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'south' | 'north' | 'sides' | 'section'
  const [hoveredElement, setHoveredElement] = useState(null);

  // Structural Dimensions
  const length_m = Number(request?.geometry?.length_m) || 8.0;
  const width_m = Number(request?.geometry?.width_m) || 4.5;
  const height_m = Number(request?.geometry?.height_m) || 2.8;
  const orientationDeg = Number(request?.geometry?.orientation_deg) || 180;
  const altitude_m = request?.location?.altitude_m ?? 3600;
  const lat = request?.location?.lat ?? 35.2;
  const lon = request?.location?.lon ?? 77.2;

  // Envelope layers
  const walls = useMemo(() => request?.envelope?.walls || [], [request?.envelope?.walls]);
  const roof = useMemo(() => request?.envelope?.roof || [], [request?.envelope?.roof]);
  const floor = useMemo(() => request?.envelope?.floor || [], [request?.envelope?.floor]);
  const openings = useMemo(() => request?.openings || [], [request?.openings]);

  // Primary materials & specs
  const extWallMatId = walls[0]?.material || 'stone_masonry';
  const insulWallMatId = walls[1]?.material || 'eps_board';
  const massWallMatId = walls[walls.length - 1]?.material || 'mud_brick';
  const roofMatId = roof[0]?.material || 'cgi_sheet';
  const floorMatId = floor[0]?.material || 'concrete';

  const extWallSpec = useMemo(() => getMaterialSpec(extWallMatId), [extWallMatId]);
  const insulWallSpec = useMemo(() => getMaterialSpec(insulWallMatId), [insulWallMatId]);
  const massWallSpec = useMemo(() => getMaterialSpec(massWallMatId), [massWallMatId]);
  const roofSpec = useMemo(() => getMaterialSpec(roofMatId), [roofMatId]);
  const floorSpec = useMemo(() => getMaterialSpec(floorMatId), [floorMatId]);

  const totalWallThickM = walls.reduce((s, l) => s + (Number(l.thickness_m) || 0), 0);
  const wallU = useMemo(() => computeTotalU(walls), [walls]);
  const roofU = useMemo(() => computeTotalU(roof), [roof]);

  const southOpening = openings.find((o) => o.facing === 'south');
  const southWinArea = southOpening ? Number(southOpening.area_m2) || 4.0 : 4.0;
  const hasShutter = southOpening?.shutter ?? true;

  // Level Datum calculations
  const parapetH = (height_m + 0.35).toFixed(2);
  const ceilingH = height_m.toFixed(2);
  const lintelH = (height_m * 0.72).toFixed(2);
  const sillH = (height_m * 0.32).toFixed(2);

  // SVG Pattern resolver
  const getPatternForId = (id) => {
    const s = id.toLowerCase();
    if (s.includes('stone')) return 'url(#pat-stone-ashlar)';
    if (s.includes('mud') || s.includes('adobe')) return 'url(#pat-mud-brick)';
    if (s.includes('rammed')) return 'url(#pat-rammed-earth)';
    if (s.includes('timber') || s.includes('wood')) return 'url(#pat-wood-battens)';
    if (s.includes('pu') || s.includes('sandwich') || s.includes('cgi')) return 'url(#pat-panel-ribs)';
    return 'url(#pat-stone-ashlar)';
  };

  const extWallPattern = getPatternForId(extWallMatId);

  return (
    <div className="cad-sheet-wrapper">
      {/* ── Top CAD Control & View Switcher Bar ────────────────────────── */}
      <div className="cad-control-bar">
        <div className="cad-view-tabs">
          <button
            type="button"
            className={`cad-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Layers size={13} />
            <span>Complete Sheet (1:100)</span>
          </button>
          <button
            type="button"
            className={`cad-tab-btn ${activeTab === 'south' ? 'active' : ''}`}
            onClick={() => setActiveTab('south')}
          >
            <Eye size={13} />
            <span>Rear Elevation (South)</span>
          </button>
          <button
            type="button"
            className={`cad-tab-btn ${activeTab === 'north' ? 'active' : ''}`}
            onClick={() => setActiveTab('north')}
          >
            <Eye size={13} />
            <span>Front Elevation (North)</span>
          </button>
          <button
            type="button"
            className={`cad-tab-btn ${activeTab === 'sides' ? 'active' : ''}`}
            onClick={() => setActiveTab('sides')}
          >
            <Eye size={13} />
            <span>Side Elevations (East / West)</span>
          </button>
          <button
            type="button"
            className={`cad-tab-btn ${activeTab === 'section' ? 'active' : ''}`}
            onClick={() => setActiveTab('section')}
          >
            <Layers size={13} />
            <span>Technical Cross-Section</span>
          </button>
        </div>

        <div className="cad-quick-actions">
          <span className="cad-badge">
            <Compass size={12} color="#C2410C" />
            <span>{orientationDeg}° South-Facing</span>
          </span>
          <span className="cad-badge">
            <span>U-Wall: {wallU.toFixed(2)} W/m²K</span>
          </span>
          <button
            type="button"
            className="cad-action-btn"
            onClick={() => window.print()}
            title="Print or Export Blueprint PDF"
          >
            <Printer size={13} />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* ── Drafting Sheet Board (SVG Blueprint Canvas) ────────────────── */}
      <div className="cad-sheet-board">
        <svg
          className="cad-sheet-svg"
          viewBox={
            activeTab === 'all'
              ? '0 0 1050 1480'
              : activeTab === 'south' || activeTab === 'north'
              ? '0 0 1050 680'
              : activeTab === 'sides'
              ? '0 0 1050 600'
              : '0 0 1050 720'
          }
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* ── Pattern 1: Ashlar Stone ─────────────────────────────── */}
            <pattern id="pat-stone-ashlar" width="40" height="24" patternUnits="userSpaceOnUse">
              <rect width="40" height="24" fill="#EAE5DC" />
              <path
                d="M 0 0 L 40 0 M 0 12 L 40 12 M 0 24 L 40 24 M 0 0 L 0 12 M 20 12 L 20 24 M 40 0 L 40 12"
                stroke="#B8B0A2"
                strokeWidth="1.2"
              />
              <path
                d="M 2 2 L 18 2 M 22 14 L 38 14"
                stroke="#CBC3B5"
                strokeWidth="0.8"
                strokeDasharray="2,3"
              />
            </pattern>

            {/* ── Pattern 2: Mud Brick / Adobe Bond ───────────────────── */}
            <pattern id="pat-mud-brick" width="28" height="14" patternUnits="userSpaceOnUse">
              <rect width="28" height="14" fill="#D9C3AA" />
              <path
                d="M 0 0 L 28 0 M 0 7 L 28 7 M 0 14 L 28 14 M 0 0 L 0 7 M 14 7 L 14 14 M 28 0 L 28 7"
                stroke="#AC9278"
                strokeWidth="1.0"
              />
            </pattern>

            {/* ── Pattern 3: Rammed Earth Strata ──────────────────────── */}
            <pattern id="pat-rammed-earth" width="60" height="24" patternUnits="userSpaceOnUse">
              <rect width="60" height="24" fill="#DECBB8" />
              <path
                d="M 0 6 Q 15 8 30 5 T 60 7 M 0 12 Q 20 10 40 13 T 60 11 M 0 18 Q 18 19 35 17 T 60 19"
                stroke="#BCA691"
                strokeWidth="1.2"
                fill="none"
              />
            </pattern>

            {/* ── Pattern 4: Vertical Timber Battens (Ref EXT-02) ──────── */}
            <pattern id="pat-wood-battens" width="10" height="40" patternUnits="userSpaceOnUse">
              <rect width="10" height="40" fill="#7C5237" />
              <line x1="0" y1="0" x2="0" y2="40" stroke="#452715" strokeWidth="1.5" />
              <line x1="5" y1="0" x2="5" y2="40" stroke="#9A6B4A" strokeWidth="0.8" opacity="0.6" />
              <line x1="10" y1="0" x2="10" y2="40" stroke="#3D2111" strokeWidth="1.5" />
            </pattern>

            {/* ── Pattern 5: Modular Coated PUF Panel Ribs ─────────────── */}
            <pattern id="pat-panel-ribs" width="24" height="40" patternUnits="userSpaceOnUse">
              <rect width="24" height="40" fill="#E2E8F0" />
              <line x1="0" y1="0" x2="0" y2="40" stroke="#94A3B8" strokeWidth="1.2" />
              <line x1="12" y1="0" x2="12" y2="40" stroke="#CBD5E1" strokeWidth="0.8" />
              <line x1="24" y1="0" x2="24" y2="40" stroke="#94A3B8" strokeWidth="1.2" />
            </pattern>

            {/* ── Pattern 6: Concrete Plinth Stipple ──────────────────── */}
            <pattern id="pat-concrete" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#D1D5DB" />
              <circle cx="3" cy="4" r="0.9" fill="#6B7280" />
              <circle cx="11" cy="6" r="1.1" fill="#4B5563" />
              <circle cx="7" cy="12" r="0.8" fill="#6B7280" />
              <circle cx="14" cy="13" r="1.0" fill="#9CA3AF" />
            </pattern>

            {/* ── Pattern 7: Thermal Insulation Zig-Zag Hatch ─────────── */}
            <pattern id="pat-insulation" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill="#FEF3C7" />
              <path
                d="M 0 14 L 7 0 L 14 14"
                stroke="#D97706"
                strokeWidth="1.0"
                fill="none"
                opacity="0.85"
              />
            </pattern>

            {/* ── Pattern 8: Sub-grade Ground Hatch ────────────────────── */}
            <pattern id="pat-earth-hatch" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#EDE9DF" />
              <line x1="0" y1="16" x2="16" y2="0" stroke="#A8A29E" strokeWidth="1.0" />
              <line x1="-4" y1="4" x2="4" y2="-4" stroke="#A8A29E" strokeWidth="1.0" />
              <line x1="12" y1="20" x2="20" y2="12" stroke="#A8A29E" strokeWidth="1.0" />
            </pattern>

            {/* ── Tree Graphic Entourage ───────────────────────────────── */}
            <g id="pine-tree-entourage">
              <line x1="0" y1="0" x2="0" y2="85" stroke="#475569" strokeWidth="2.5" />
              <path
                d="M 0 -75 L -16 -40 L -10 -40 L -22 -10 L -12 -10 L -28 25 L 28 25 L 12 -10 L 22 -10 L 10 -40 L 16 -40 Z"
                fill="#334155"
                stroke="#0F172A"
                strokeWidth="1.2"
                opacity="0.9"
              />
              <path
                d="M 0 -75 L 0 25 L 28 25 L 12 -10 L 22 -10 L 10 -40 L 16 -40 Z"
                fill="#1E293B"
                opacity="0.3"
              />
            </g>

            {/* ── Human Scale Architect Silhouette (1.75m) ─────────────── */}
            <g id="human-scale-figure">
              <circle cx="0" cy="-56" r="4.5" fill="#334155" />
              <path
                d="M -3.5 -50 L 3.5 -50 L 5 -30 L 2.5 -30 L 3.5 -2 L 1 -2 L 0 -18 L -1 -2 L -3.5 -2 L -2.5 -30 L -5 -30 Z"
                fill="#334155"
              />
            </g>

            {/* ── Architectural Compass Rose ──────────────────────────── */}
            <g id="compass-rose-cad">
              <circle cx="0" cy="0" r="26" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="23" fill="none" stroke="#94A3B8" strokeWidth="0.75" />
              {/* Star points */}
              <polygon points="0,-22 4,-6 0,0 -4,-6" fill="#0F172A" />
              <polygon points="0,22 4,6 0,0 -4,6" fill="#94A3B8" />
              <polygon points="-22,0 -6,-4 0,0 -6,4" fill="#94A3B8" />
              <polygon points="22,0 6,-4 0,0 6,4" fill="#94A3B8" />
              <text x="0" y="-26" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily="monospace" fill="#0F172A">N</text>
              <text x="0" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="monospace" fill="#64748B">S</text>
              <text x="32" y="3" textAnchor="start" fontSize="8" fontWeight="700" fontFamily="monospace" fill="#64748B">E</text>
              <text x="-32" y="3" textAnchor="end" fontSize="8" fontWeight="700" fontFamily="monospace" fill="#64748B">W</text>
            </g>

            {/* ── Metric Graphic Scale Bar (1:100) ─────────────────────── */}
            <g id="graphic-scale-bar-cad">
              <rect x="0" y="0" width="30" height="4" fill="#0F172A" />
              <rect x="30" y="0" width="30" height="4" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.8" />
              <rect x="60" y="0" width="30" height="4" fill="#0F172A" />
              <rect x="90" y="0" width="30" height="4" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.8" />
              <rect x="120" y="0" width="30" height="4" fill="#0F172A" />
              <line x1="0" y1="0" x2="150" y2="0" stroke="#0F172A" strokeWidth="1.2" />
              <line x1="0" y1="4" x2="150" y2="4" stroke="#0F172A" strokeWidth="1.2" />
              <line x1="0" y1="-2" x2="0" y2="6" stroke="#0F172A" strokeWidth="1" />
              <line x1="30" y1="-2" x2="30" y2="6" stroke="#0F172A" strokeWidth="1" />
              <line x1="60" y1="-2" x2="60" y2="6" stroke="#0F172A" strokeWidth="1" />
              <line x1="90" y1="-2" x2="90" y2="6" stroke="#0F172A" strokeWidth="1" />
              <line x1="120" y1="-2" x2="120" y2="6" stroke="#0F172A" strokeWidth="1" />
              <line x1="150" y1="-2" x2="150" y2="6" stroke="#0F172A" strokeWidth="1" />
              <text x="0" y="-4" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#1E293B">0</text>
              <text x="30" y="-4" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#1E293B">2</text>
              <text x="60" y="-4" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#1E293B">4</text>
              <text x="90" y="-4" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#1E293B">6</text>
              <text x="120" y="-4" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#1E293B">8</text>
              <text x="150" y="-4" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#1E293B">10m</text>
              <text x="75" y="15" fontSize="8.5" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#475569">
                SCALE 1:100
              </text>
            </g>
          </defs>

          {/* ═══════════════════════════════════════════════════════════════
              SHEET BORDER & REGISTRATION FRAME (A3 Professional Border)
             ═══════════════════════════════════════════════════════════════ */}
          <rect
            x="14"
            y="14"
            width={activeTab === 'all' ? 1022 : 1022}
            height={activeTab === 'all' ? 1452 : activeTab === 'south' || activeTab === 'north' ? 652 : activeTab === 'sides' ? 572 : 692}
            fill="none"
            stroke="#0F172A"
            strokeWidth="2.5"
          />
          <rect
            x="20"
            y="20"
            width={activeTab === 'all' ? 1010 : 1010}
            height={activeTab === 'all' ? 1440 : activeTab === 'south' || activeTab === 'north' ? 640 : activeTab === 'sides' ? 560 : 680}
            fill="none"
            stroke="#64748B"
            strokeWidth="0.8"
          />

          {/* ═══════════════════════════════════════════════════════════════
              VIEW 1: FRONT ELEVATION — NORTH FACING (CIV-EL-001)
             ═══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'north') && (
            <g id="elevation-north-facade" transform={activeTab === 'all' ? 'translate(45, 60)' : 'translate(100, 70)'}>
              {/* Grid Bubbles A, B, C, D */}
              <g id="grid-bubbles-north">
                <line x1="80" y1="20" x2="80" y2="120" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />
                <line x1="200" y1="20" x2="200" y2="120" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />
                <line x1="380" y1="20" x2="380" y2="120" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />
                <line x1="500" y1="20" x2="500" y2="120" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />

                {/* Grid circle tags */}
                <circle cx="80" cy="16" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                <text x="80" y="19.5" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace">A</text>
                <circle cx="200" cy="16" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                <text x="200" y="19.5" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace">B</text>
                <circle cx="380" cy="16" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                <text x="380" y="19.5" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace">C</text>
                <circle cx="500" cy="16" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                <text x="500" y="19.5" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace">D</text>

                {/* Horizontal Dimension Lines */}
                <line x1="80" y1="40" x2="500" y2="40" stroke="#475569" strokeWidth="0.9" />
                <line x1="80" y1="36" x2="80" y2="44" stroke="#475569" strokeWidth="1.2" />
                <line x1="200" y1="36" x2="200" y2="44" stroke="#475569" strokeWidth="1.2" />
                <line x1="380" y1="36" x2="380" y2="44" stroke="#475569" strokeWidth="1.2" />
                <line x1="500" y1="36" x2="500" y2="44" stroke="#475569" strokeWidth="1.2" />
                <text x="140" y="36" textAnchor="middle" className="cad-dim-text">{(length_m * 0.28).toFixed(2)}m</text>
                <text x="290" y="36" textAnchor="middle" className="cad-dim-text">{(length_m * 0.44).toFixed(2)}m</text>
                <text x="440" y="36" textAnchor="middle" className="cad-dim-text">{(length_m * 0.28).toFixed(2)}m</text>

                {/* Overall Dimension */}
                <line x1="80" y1="56" x2="500" y2="56" stroke="#0F172A" strokeWidth="1.2" />
                <line x1="80" y1="51" x2="80" y2="61" stroke="#0F172A" strokeWidth="1.5" />
                <line x1="500" y1="51" x2="500" y2="61" stroke="#0F172A" strokeWidth="1.5" />
                <text x="290" y="52" textAnchor="middle" fontWeight="700" className="cad-dim-text">{length_m.toFixed(2)}m OVERALL</text>
              </g>

              {/* Surrounding Entourage Trees & Landscape */}
              <use href="#pine-tree-entourage" x="35" y="225" />
              <use href="#human-scale-figure" x="65" y="275" />

              {/* Sub-grade Soil Base */}
              <rect x="0" y="275" width="580" height="35" fill="url(#pat-earth-hatch)" />
              <line x1="0" y1="275" x2="580" y2="275" stroke="#0F172A" strokeWidth="2.5" />
              {snowCover && (
                <path d="M 0 273 Q 120 269 260 272 T 580 270 L 580 275 L 0 275 Z" fill="#FFFFFF" opacity="0.95" />
              )}

              {/* Building Mass (North Elevation) */}
              {/* Lower Plinth Ground Level */}
              <rect x="80" y="267" width="420" height="8" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="1.5" />

              {/* Main Exterior Wall Body (Cladding Texture) */}
              <rect x="80" y="150" width="420" height="117" fill={extWallPattern} stroke="#0F172A" strokeWidth="2" />

              {/* Upper Parapet & Fascia (EXT-02 Vertical battens/cladding or metal coping) */}
              <rect x="76" y="125" width="428" height="25" fill="url(#pat-wood-battens)" stroke="#0F172A" strokeWidth="2" />
              <rect x="74" y="120" width="432" height="6" fill="#CBD5E1" stroke="#0F172A" strokeWidth="1.5" />

              {/* Main Entrance Door & Vestibule Canopy (Cold Air Baffle) */}
              <g id="north-entrance-portal">
                {/* Canopy overhang */}
                <rect x="252" y="172" width="76" height="5" fill="#334155" stroke="#0F172A" strokeWidth="1.2" />
                {/* Door Frame */}
                <rect x="260" y="177" width="60" height="90" fill="#452715" stroke="#0F172A" strokeWidth="1.8" />
                <rect x="264" y="181" width="52" height="86" fill="url(#pat-wood-battens)" />
                {/* Door Handle */}
                <line x1="268" y1="220" x2="268" y2="235" stroke="#F1F5F9" strokeWidth="2.5" strokeLinecap="round" />
                {/* Door number plate */}
                <rect x="330" y="200" width="22" height="12" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1" />
                <text x="341" y="209" textAnchor="middle" fontSize="7.5" fontWeight="700" fontFamily="monospace">01</text>
              </g>

              {/* North Windows (High-Performance Triple Pane Snow Windows) */}
              <g id="north-windows">
                {/* Left window */}
                <rect x="130" y="185" width="80" height="70" fill="#E0F2FE" stroke="#0F172A" strokeWidth="1.8" />
                <rect x="134" y="189" width="34" height="62" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1" />
                <rect x="172" y="189" width="34" height="62" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1" />
                {/* Glass sheen diagonals */}
                <line x1="140" y1="192" x2="160" y2="248" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.75" />
                <line x1="178" y1="192" x2="198" y2="248" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.75" />

                {/* Right clerestory window */}
                <rect x="375" y="185" width="95" height="45" fill="#E0F2FE" stroke="#0F172A" strokeWidth="1.8" />
                <rect x="379" y="189" width="41" height="37" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1" />
                <rect x="425" y="189" width="41" height="37" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1" />
              </g>

              {/* Height Datum Level Markers (Right Side) */}
              <g id="datum-markers-north" transform="translate(520, 0)">
                {/* Level 1: Top of Parapet */}
                <line x1="0" y1="120" x2="65" y2="120" stroke="#0F172A" strokeWidth="1" strokeDasharray="3,3" />
                <polygon points="65,120 72,116 72,124" fill="#0F172A" />
                <text x="76" y="117" className="cad-datum-text">+{parapetH}m</text>
                <text x="76" y="126" className="cad-label-sub">TOP OF PARAPET</text>

                {/* Level 2: Ceiling Soffit */}
                <line x1="0" y1="150" x2="65" y2="150" stroke="#0F172A" strokeWidth="1" strokeDasharray="3,3" />
                <polygon points="65,150 72,146 72,154" fill="#0F172A" />
                <text x="76" y="147" className="cad-datum-text">+{ceilingH}m</text>
                <text x="76" y="156" className="cad-label-sub">CEILING LEVEL</text>

                {/* Level 3: Door Lintel */}
                <line x1="0" y1="177" x2="65" y2="177" stroke="#475569" strokeWidth="0.8" strokeDasharray="3,3" />
                <polygon points="65,177 72,173 72,181" fill="#475569" />
                <text x="76" y="174" className="cad-datum-text">+{lintelH}m</text>
                <text x="76" y="183" className="cad-label-sub">LINTEL LEVEL</text>

                {/* Level 4: Finished Ground Floor */}
                <line x1="0" y1="275" x2="65" y2="275" stroke="#0F172A" strokeWidth="1.2" />
                <polygon points="65,275 72,270 72,280" fill="#0F172A" />
                <text x="76" y="272" className="cad-datum-text">±0.00m</text>
                <text x="76" y="282" className="cad-label-sub">FFL GROUND FLOOR</text>

                {/* Right vertical dimension line */}
                <line x1="170" y1="120" x2="170" y2="275" stroke="#0F172A" strokeWidth="1.2" />
                <line x1="165" y1="120" x2="175" y2="120" stroke="#0F172A" strokeWidth="1.5" />
                <line x1="165" y1="275" x2="175" y2="275" stroke="#0F172A" strokeWidth="1.5" />
                <text x="180" y="202" className="cad-dim-text" transform="rotate(90 180 202)">{parapetH}m OVERALL</text>
              </g>

              {/* Drawing Title Underline */}
              <text x="290" y="325" textAnchor="middle" className="cad-title-main" fontSize="13">
                FRONT ELEVATION — NORTH FACING
              </text>
              <text x="290" y="340" textAnchor="middle" className="cad-label-sub" fontSize="10">
                DRAWING REF: CIV-EL-001 · ENTRANCE &amp; VESTIBULE PORTAL
              </text>
              <use href="#graphic-scale-bar-cad" x="215" y="355" />
            </g>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              UPPER RIGHT: MATERIAL REFERENCE SCHEDULE (Matching Image 2)
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'all' && (
            <g id="material-reference-schedule" transform="translate(730, 60)">
              <rect x="0" y="0" width="275" height="380" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
              {/* Header Box */}
              <rect x="0" y="0" width="275" height="26" fill="#0F172A" />
              <text x="137" y="17" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="800" fontFamily="monospace" letterSpacing="0.08em">
                MATERIAL REFERENCE SCHEDULE
              </text>

              {/* Swatch 1: Cladding */}
              <g transform="translate(14, 38)">
                <rect x="0" y="0" width="40" height="28" fill={extWallPattern} stroke="#0F172A" strokeWidth="1.2" />
                <text x="50" y="11" fontSize="9" fontWeight="800" fontFamily="monospace" fill="#0F172A">EXT-01</text>
                <text x="50" y="21" fontSize="8.5" fontWeight="600" fontFamily="sans-serif" fill="#334155">{extWallSpec.name.toUpperCase()}</text>
                <text x="50" y="30" fontSize="7.5" fontFamily="monospace" fill="#64748B">k={extWallSpec.conductivity_w_mk || 0.8} W/mK · {extWallSpec.citation || 'NBC 2016'}</text>
              </g>

              {/* Swatch 2: Insulation Core */}
              <g transform="translate(14, 82)">
                <rect x="0" y="0" width="40" height="28" fill="url(#pat-insulation)" stroke="#0F172A" strokeWidth="1.2" />
                <text x="50" y="11" fontSize="9" fontWeight="800" fontFamily="monospace" fill="#0F172A">EXT-02</text>
                <text x="50" y="21" fontSize="8.5" fontWeight="600" fontFamily="sans-serif" fill="#334155">{insulWallSpec.name.toUpperCase()}</text>
                <text x="50" y="30" fontSize="7.5" fontFamily="monospace" fill="#64748B">CONTINUOUS CORE INSULATION · k={insulWallSpec.conductivity_w_mk || 0.038} W/mK</text>
              </g>

              {/* Swatch 3: Glazing */}
              <g transform="translate(14, 126)">
                <rect x="0" y="0" width="40" height="28" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1.2" />
                <text x="50" y="11" fontSize="9" fontWeight="800" fontFamily="monospace" fill="#0F172A">EXT-03</text>
                <text x="50" y="21" fontSize="8.5" fontWeight="600" fontFamily="sans-serif" fill="#334155">LOW-E ARCHITECTURAL GLAZING</text>
                <text x="50" y="30" fontSize="7.5" fontFamily="monospace" fill="#64748B">DOUBLE/TRIPLE PANE WITH NIGHT SHUTTER</text>
              </g>

              {/* Swatch 4: Plinth */}
              <g transform="translate(14, 170)">
                <rect x="0" y="0" width="40" height="28" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="1.2" />
                <text x="50" y="11" fontSize="9" fontWeight="800" fontFamily="monospace" fill="#0F172A">EXT-04</text>
                <text x="50" y="21" fontSize="8.5" fontWeight="600" fontFamily="sans-serif" fill="#334155">{floorSpec.name.toUpperCase()}</text>
                <text x="50" y="30" fontSize="7.5" fontFamily="monospace" fill="#64748B">INSULATED SUB-BASE &amp; PERMAFROST SLAB</text>
              </g>

              {/* Swatch 5: Parapet Coping */}
              <g transform="translate(14, 214)">
                <rect x="0" y="0" width="40" height="28" fill="url(#pat-panel-ribs)" stroke="#0F172A" strokeWidth="1.2" />
                <text x="50" y="11" fontSize="9" fontWeight="800" fontFamily="monospace" fill="#0F172A">EXT-05</text>
                <text x="50" y="21" fontSize="8.5" fontWeight="600" fontFamily="sans-serif" fill="#334155">{roofSpec.name.toUpperCase()}</text>
                <text x="50" y="30" fontSize="7.5" fontFamily="monospace" fill="#64748B">ALUMINIUM COPING &amp; HIGH-SNOW CEILING</text>
              </g>

              {/* Swatch 6: Thermal Storage Mass */}
              <g transform="translate(14, 258)">
                <rect x="0" y="0" width="40" height="28" fill="url(#pat-mud-brick)" stroke="#0F172A" strokeWidth="1.2" />
                <text x="50" y="11" fontSize="9" fontWeight="800" fontFamily="monospace" fill="#0F172A">EXT-06</text>
                <text x="50" y="21" fontSize="8.5" fontWeight="600" fontFamily="sans-serif" fill="#334155">{massWallSpec.name.toUpperCase()}</text>
                <text x="50" y="30" fontSize="7.5" fontFamily="monospace" fill="#64748B">HIGH VOLUMETRIC HEAT CAPACITY MASS</text>
              </g>

              {/* Notes Sub-Section */}
              <line x1="10" y1="300" x2="265" y2="300" stroke="#CBD5E1" strokeWidth="1" />
              <text x="14" y="315" fontSize="8.5" fontWeight="800" fontFamily="monospace" fill="#0F172A">NOTES:</text>
              <text x="14" y="328" fontSize="7.5" fontFamily="monospace" fill="#475569">1. ALL LEVELS ARE IN METERS.</text>
              <text x="14" y="339" fontSize="7.5" fontFamily="monospace" fill="#475569">2. ALL DIMENSIONS TO BE VERIFIED ON SITE.</text>
              <text x="14" y="350" fontSize="7.5" fontFamily="monospace" fill="#475569">3. REFER TO DRDO PS 26051 THERMAL GUIDELINES.</text>
              <text x="14" y="361" fontSize="7.5" fontFamily="monospace" fill="#475569">4. ALL MATERIAL SPECIFICATIONS GOVERNED BY RULE R1.</text>
            </g>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW 2: REAR ELEVATION — SOUTH FACING (CIV-EL-003)
              (The Master Passive Solar Facade with Trombe Mass Wall & Glazing)
             ═══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'south') && (
            <g id="elevation-south-facade" transform={activeTab === 'all' ? 'translate(45, 490)' : 'translate(100, 70)'}>
              {/* Grid Bubbles A, B, C, D */}
              <g id="grid-bubbles-south">
                <line x1="80" y1="20" x2="80" y2="120" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />
                <line x1="200" y1="20" x2="200" y2="120" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />
                <line x1="380" y1="20" x2="380" y2="120" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />
                <line x1="500" y1="20" x2="500" y2="120" stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />

                <circle cx="80" cy="16" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                <text x="80" y="19.5" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace">A</text>
                <circle cx="200" cy="16" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                <text x="200" y="19.5" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace">B</text>
                <circle cx="380" cy="16" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                <text x="380" y="19.5" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace">C</text>
                <circle cx="500" cy="16" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                <text x="500" y="19.5" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace">D</text>

                {/* Overall Dimension */}
                <line x1="80" y1="56" x2="500" y2="56" stroke="#0F172A" strokeWidth="1.2" />
                <line x1="80" y1="51" x2="80" y2="61" stroke="#0F172A" strokeWidth="1.5" />
                <line x1="500" y1="51" x2="500" y2="61" stroke="#0F172A" strokeWidth="1.5" />
                <text x="290" y="52" textAnchor="middle" fontWeight="700" className="cad-dim-text">{length_m.toFixed(2)}m OVERALL (PASSIVE SOLAR FACADE)</text>
              </g>

              {/* Flanking Pine Trees & Architect Scale Figure */}
              <use href="#pine-tree-entourage" x="35" y="225" />
              <use href="#pine-tree-entourage" x="545" y="225" />
              <use href="#human-scale-figure" x="515" y="275" />

              {/* Sub-grade Soil Base */}
              <rect x="0" y="275" width="580" height="35" fill="url(#pat-earth-hatch)" />
              <line x1="0" y1="275" x2="580" y2="275" stroke="#0F172A" strokeWidth="2.5" />
              {snowCover && (
                <path d="M 0 273 Q 140 268 280 271 T 580 272 L 580 275 L 0 275 Z" fill="#FFFFFF" opacity="0.95" />
              )}

              {/* Building Mass (South Elevation) */}
              <rect x="80" y="267" width="420" height="8" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="1.5" />
              {/* Wall Piers (Cladding) */}
              <rect x="80" y="150" width="420" height="117" fill={extWallPattern} stroke="#0F172A" strokeWidth="2" />
              {/* Upper Parapet */}
              <rect x="76" y="125" width="428" height="25" fill="url(#pat-wood-battens)" stroke="#0F172A" strokeWidth="2" />
              <rect x="74" y="120" width="432" height="6" fill="#CBD5E1" stroke="#0F172A" strokeWidth="1.5" />

              {/* South Passive Solar Glazing Aperture (Large Panoramic Solar Window) */}
              <g id="south-solar-aperture">
                <rect x="110" y="160" width="360" height="100" fill="#E0F2FE" stroke="#0F172A" strokeWidth="2" />
                {/* 4 Bay Mullions */}
                <rect x="115" y="164" width="82" height="92" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1.2" />
                <rect x="202" y="164" width="85" height="92" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1.2" />
                <rect x="292" y="164" width="85" height="92" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1.2" />
                <rect x="382" y="164" width="83" height="92" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1.2" />

                {/* Glazing sheen highlights */}
                <line x1="125" y1="168" x2="165" y2="250" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8" />
                <line x1="212" y1="168" x2="252" y2="250" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8" />
                <line x1="302" y1="168" x2="342" y2="250" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8" />
                <line x1="392" y1="168" x2="432" y2="250" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8" />

                {/* Night Shutter Indicator Rail */}
                {hasShutter && (
                  <g id="shutter-tracks">
                    <rect x="106" y="156" width="368" height="4" fill="#EA580C" stroke="#0F172A" strokeWidth="0.8" />
                    <text x="290" y="153" textAnchor="middle" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#C2410C">
                      DEPLOYABLE NOCTURNAL INSULATED THERMAL SHUTTERS (R-2.1)
                    </text>
                  </g>
                )}

                {/* Aperture Area Badge */}
                <rect x="240" y="200" width="100" height="20" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="#FFFFFF" strokeWidth="0.8" />
                <text x="290" y="213" textAnchor="middle" fontSize="8.5" fontWeight="700" fontFamily="monospace" fill="#FEF3C7">
                  SOLAR APERTURE {southWinArea.toFixed(1)} m²
                </text>
              </g>

              {/* Winter Solar Angle Vector (32° Solstice Insolation) */}
              {showSolarRays && (
                <g id="winter-sun-angle-vector">
                  <line x1="530" y1="90" x2="450" y2="180" stroke="#EA580C" strokeWidth="1.5" strokeDasharray="4,3" />
                  <polygon points="450,180 456,171 462,178" fill="#EA580C" />
                  <circle cx="530" cy="90" r="12" fill="#F59E0B" opacity="0.9" />
                  <text x="530" y="72" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="monospace" fill="#B45309">
                    θ=32° WINTER SOLSTICE
                  </text>
                  <text x="530" y="115" textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#D97706">
                    {Math.round(siteWeather?.metrics?.solar_dni_peak_wm2 || 860)} W/m² DNI
                  </text>
                </g>
              )}

              {/* Height Datum Level Markers */}
              <g id="datum-markers-south" transform="translate(520, 0)">
                <line x1="0" y1="120" x2="65" y2="120" stroke="#0F172A" strokeWidth="1" strokeDasharray="3,3" />
                <polygon points="65,120 72,116 72,124" fill="#0F172A" />
                <text x="76" y="117" className="cad-datum-text">+{parapetH}m</text>
                <text x="76" y="126" className="cad-label-sub">TOP OF PARAPET</text>

                <line x1="0" y1="150" x2="65" y2="150" stroke="#0F172A" strokeWidth="1" strokeDasharray="3,3" />
                <polygon points="65,150 72,146 72,154" fill="#0F172A" />
                <text x="76" y="147" className="cad-datum-text">+{ceilingH}m</text>
                <text x="76" y="156" className="cad-label-sub">CEILING LEVEL</text>

                <line x1="0" y1="275" x2="65" y2="275" stroke="#0F172A" strokeWidth="1.2" />
                <polygon points="65,275 72,270 72,280" fill="#0F172A" />
                <text x="76" y="272" className="cad-datum-text">±0.00m</text>
                <text x="76" y="282" className="cad-label-sub">FFL GROUND FLOOR</text>
              </g>

              {/* Drawing Title Underline */}
              <text x="290" y="325" textAnchor="middle" className="cad-title-main" fontSize="13">
                REAR ELEVATION — SOUTH FACING
              </text>
              <text x="290" y="340" textAnchor="middle" className="cad-label-sub" fontSize="10">
                DRAWING REF: CIV-EL-003 · PASSIVE SOLAR GAIN &amp; TROMBE COLLECTOR
              </text>
              <use href="#graphic-scale-bar-cad" x="215" y="355" />
            </g>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW 3: SIDE ELEVATIONS — EAST & WEST (CIV-EL-002 & CIV-EL-004)
             ═══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'sides') && (
            <g id="side-elevations-group" transform={activeTab === 'all' ? 'translate(45, 920)' : 'translate(60, 80)'}>
              {/* Left Side: SIDE ELEVATION — EAST FACING */}
              <g id="elevation-east-side" transform="translate(0, 0)">
                {/* Dimensions */}
                <line x1="40" y1="30" x2="260" y2="30" stroke="#0F172A" strokeWidth="1.2" />
                <line x1="40" y1="25" x2="40" y2="35" stroke="#0F172A" strokeWidth="1.5" />
                <line x1="260" y1="25" x2="260" y2="35" stroke="#0F172A" strokeWidth="1.5" />
                <text x="150" y="26" textAnchor="middle" className="cad-dim-text">{width_m.toFixed(2)}m OVERALL (DEPTH)</text>

                {/* Sub-grade */}
                <rect x="0" y="195" width="300" height="25" fill="url(#pat-earth-hatch)" />
                <line x1="0" y1="195" x2="300" y2="195" stroke="#0F172A" strokeWidth="2" />

                {/* Wall mass */}
                <rect x="40" y="188" width="220" height="7" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="1.2" />
                <rect x="40" y="75" width="220" height="113" fill={extWallPattern} stroke="#0F172A" strokeWidth="1.8" />
                {/* Parapet */}
                <rect x="38" y="55" width="224" height="20" fill="url(#pat-wood-battens)" stroke="#0F172A" strokeWidth="1.5" />
                <rect x="36" y="50" width="228" height="5" fill="#CBD5E1" stroke="#0F172A" strokeWidth="1.2" />

                {/* East side ventilation louvre & egress door */}
                <rect x="65" y="105" width="35" height="40" fill="#E2E8F0" stroke="#0F172A" strokeWidth="1.2" />
                <line x1="65" y1="115" x2="100" y2="115" stroke="#0F172A" strokeWidth="0.8" />
                <line x1="65" y1="125" x2="100" y2="125" stroke="#0F172A" strokeWidth="0.8" />
                <line x1="65" y1="135" x2="100" y2="135" stroke="#0F172A" strokeWidth="0.8" />

                {/* Boundary Wind Baffle Wall (Ref Image 2) */}
                <rect x="260" y="125" width="20" height="70" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="1.2" />
                <text x="270" y="118" textAnchor="middle" fontSize="6.5" fontFamily="monospace" fill="#64748B">BAFFLE</text>

                {/* Title */}
                <text x="150" y="240" textAnchor="middle" className="cad-title-main" fontSize="11.5">
                  SIDE ELEVATION — EAST FACING
                </text>
                <text x="150" y="253" textAnchor="middle" className="cad-label-sub" fontSize="9">
                  CIV-EL-002 · SCALE 1:100
                </text>
                <use href="#graphic-scale-bar-cad" x="75" y="265" />
              </g>

              {/* Right Side: SIDE ELEVATION — WEST FACING */}
              <g id="elevation-west-side" transform="translate(480, 0)">
                <line x1="40" y1="30" x2="260" y2="30" stroke="#0F172A" strokeWidth="1.2" />
                <line x1="40" y1="25" x2="40" y2="35" stroke="#0F172A" strokeWidth="1.5" />
                <line x1="260" y1="25" x2="260" y2="35" stroke="#0F172A" strokeWidth="1.5" />
                <text x="150" y="26" textAnchor="middle" className="cad-dim-text">{width_m.toFixed(2)}m OVERALL (DEPTH)</text>

                <rect x="0" y="195" width="300" height="25" fill="url(#pat-earth-hatch)" />
                <line x1="0" y1="195" x2="300" y2="195" stroke="#0F172A" strokeWidth="2" />

                <rect x="40" y="188" width="220" height="7" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="1.2" />
                <rect x="40" y="75" width="220" height="113" fill={extWallPattern} stroke="#0F172A" strokeWidth="1.8" />
                <rect x="38" y="55" width="224" height="20" fill="url(#pat-wood-battens)" stroke="#0F172A" strokeWidth="1.5" />
                <rect x="36" y="50" width="228" height="5" fill="#CBD5E1" stroke="#0F172A" strokeWidth="1.2" />

                {/* West window opening */}
                <rect x="145" y="110" width="45" height="35" fill="#BAE6FD" stroke="#0F172A" strokeWidth="1.2" />
                <rect x="20" y="125" width="20" height="70" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="1.2" />

                <text x="150" y="240" textAnchor="middle" className="cad-title-main" fontSize="11.5">
                  SIDE ELEVATION — WEST FACING
                </text>
                <text x="150" y="253" textAnchor="middle" className="cad-label-sub" fontSize="9">
                  CIV-EL-004 · SCALE 1:100
                </text>
                <use href="#graphic-scale-bar-cad" x="75" y="265" />
              </g>
            </g>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW 4: TECHNICAL TRANSVERSE CROSS-SECTION (CIV-SEC-001)
              (Rendered when user selects Section tab)
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'section' && (
            <g id="section-detail-view" transform="translate(100, 80)">
              {/* Title & Dimension */}
              <text x="400" y="30" textAnchor="middle" className="cad-title-main" fontSize="15">
                TRANSVERSE BUILDING SECTION — CIV-SEC-001
              </text>
              <text x="400" y="46" textAnchor="middle" className="cad-label-sub" fontSize="11">
                COMPOSITE ENVELOPE BUILD-UP · U={wallU.toFixed(3)} W/m²K · THICKNESS {Math.round(totalWallThickM * 1000)}mm
              </text>

              {/* Sub-grade Soil Base */}
              <rect x="50" y="440" width="700" height="70" fill="url(#pat-earth-hatch)" />
              <line x1="50" y1="440" x2="750" y2="440" stroke="#0F172A" strokeWidth="3" />
              <text x="70" y="470" fontSize="10" fontFamily="monospace" fill="#64748B">PERMAFROST FROZEN SUB-GRADE (FROST DEPTH &gt; 1.5m)</text>

              {/* Foundation Footings */}
              <rect x="130" y="440" width="70" height="50" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="2" />
              <rect x="600" y="440" width="70" height="50" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="2" />

              {/* Floor Slab with Insulation Core */}
              <rect x="140" y="420" width="520" height="20" fill="url(#pat-insulation)" stroke="#0F172A" strokeWidth="1.5" />
              <rect x="140" y="405" width="520" height="15" fill="url(#pat-concrete)" stroke="#0F172A" strokeWidth="1.5" />
              <text x="400" y="416" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace" fill="#1E293B">
                INSULATED PLINTH SLAB (R={computeLayerR(0.1, 0.038).toFixed(2)} m²K/W)
              </text>

              {/* Left Wall Assembly (North Wall) */}
              <g id="sec-left-wall">
                {/* Layer 1: Exterior Cladding */}
                <rect x="135" y="180" width="22" height="225" fill={extWallPattern} stroke="#0F172A" strokeWidth="1.2" />
                {/* Layer 2: Core Insulation */}
                <rect x="157" y="180" width="18" height="225" fill="url(#pat-insulation)" stroke="#0F172A" strokeWidth="1.2" />
                {/* Layer 3: Thermal Mass Core */}
                <rect x="175" y="180" width="30" height="225" fill="url(#pat-mud-brick)" stroke="#0F172A" strokeWidth="1.2" />

                {/* Callout Arrow for North Wall */}
                <line x1="100" y1="240" x2="145" y2="240" stroke="#0F172A" strokeWidth="1" />
                <circle cx="100" cy="240" r="2.5" fill="#0F172A" />
                <text x="90" y="235" textAnchor="end" fontSize="9" fontWeight="700" fontFamily="monospace">NORTH WALL BUILD-UP</text>
                <text x="90" y="247" textAnchor="end" fontSize="8" fontFamily="monospace" fill="#475569">{extWallSpec.name} ({Math.round(totalWallThickM * 1000)}mm)</text>
              </g>

              {/* Right Wall Assembly (South Wall with Solar Aperture) */}
              <g id="sec-right-wall">
                <rect x="595" y="180" width="30" height="225" fill="url(#pat-mud-brick)" stroke="#0F172A" strokeWidth="1.2" />
                <rect x="625" y="180" width="18" height="225" fill="url(#pat-insulation)" stroke="#0F172A" strokeWidth="1.2" />
                <rect x="643" y="180" width="22" height="225" fill={extWallPattern} stroke="#0F172A" strokeWidth="1.2" />

                {/* Glazing aperture cut */}
                <rect x="610" y="240" width="55" height="110" fill="#BAE6FD" stroke="#EA580C" strokeWidth="2" />
                <line x1="610" y1="240" x2="665" y2="350" stroke="#FFFFFF" strokeWidth="1.5" />
                <text x="675" y="295" fontSize="9" fontWeight="700" fontFamily="monospace" fill="#C2410C">
                  PASSIVE TROMBE APERTURE
                </text>
                <text x="675" y="307" fontSize="8" fontFamily="monospace" fill="#475569">
                  DOUBLE GLAZING U=1.4 W/m²K
                </text>
              </g>

              {/* Roof Assembly */}
              <g id="sec-roof">
                <rect x="125" y="160" width="550" height="20" fill="url(#pat-wood-battens)" stroke="#0F172A" strokeWidth="1.5" />
                <rect x="120" y="150" width="560" height="10" fill="url(#pat-panel-ribs)" stroke="#0F172A" strokeWidth="1.5" />
                <text x="400" y="174" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace" fill="#FEF3C7">
                  ROOF INSULATION CORE (U={roofU.toFixed(2)} W/m²K · CEILING JOISTS)
                </text>
              </g>

              {/* Interior Air Node */}
              <g id="sec-interior-node">
                <rect x="205" y="180" width="390" height="225" fill="#F8FAFC" opacity="0.6" stroke="#94A3B8" strokeDasharray="3,3" />
                <circle cx="400" cy="290" r="38" fill="rgba(245, 158, 11, 0.12)" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4,2" />
                <text x="400" y="285" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="monospace" fill="#B45309">
                  INTERIOR AIR NODE
                </text>
                <text x="400" y="300" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#D97706">
                  STABILIZED +15°C COMFORT
                </text>
              </g>
            </g>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ARCHITECTURAL TITLE BLOCK (Spanning the bottom of the sheet)
             ═══════════════════════════════════════════════════════════════ */}
          <g id="cad-title-block-main" transform={activeTab === 'all' ? 'translate(20, 1315)' : 'translate(20, 520)'}>
            <rect x="0" y="0" width="1010" height="145" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />

            {/* Division Columns */}
            <line x1="340" y1="0" x2="340" y2="145" stroke="#0F172A" strokeWidth="1.5" />
            <line x1="440" y1="0" x2="440" y2="145" stroke="#0F172A" strokeWidth="1.5" />
            <line x1="570" y1="0" x2="570" y2="145" stroke="#0F172A" strokeWidth="1.5" />
            <line x1="770" y1="0" x2="770" y2="145" stroke="#0F172A" strokeWidth="1.5" />

            {/* Column 1: Project & Drawing Details */}
            <g transform="translate(16, 20)">
              <text x="0" y="0" fontSize="8" fontWeight="800" fontFamily="monospace" fill="#64748B">PROJECT NAME:</text>
              <text x="0" y="15" fontSize="12" fontWeight="800" fontFamily="sans-serif" fill="#0F172A">
                HIGH-ALTITUDE DEFENCE SHELTER
              </text>
              <text x="0" y="28" fontSize="9.5" fontWeight="700" fontFamily="monospace" fill="#C2410C">
                DRDO PROBLEM STATEMENT PS 26051
              </text>

              <line x1="0" y1="40" x2="310" y2="40" stroke="#E2E8F0" strokeWidth="1" />

              <text x="0" y="56" fontSize="8" fontWeight="800" fontFamily="monospace" fill="#64748B">DRAWING TITLE:</text>
              <text x="0" y="70" fontSize="12" fontWeight="800" fontFamily="sans-serif" fill="#0F172A">
                ELEVATIONS — ALL FACES &amp; THERMAL FABRIC
              </text>
              <text x="0" y="85" fontSize="8.5" fontFamily="monospace" fill="#475569">
                SITE: {activeSiteName} ({altitude_m}m ASL · {lat.toFixed(1)}°N, {lon.toFixed(1)}°E)
              </text>
              <text x="0" y="98" fontSize="9" fontWeight="700" fontFamily="monospace" fill="#0F172A">
                DRAWING NUMBERS: CIV-EL-001 TO CIV-EL-004 &amp; CIV-SEC-001
              </text>
            </g>

            {/* Column 2: North Compass Rose */}
            <g transform="translate(390, 70)">
              <text x="0" y="-46" textAnchor="middle" fontSize="8" fontWeight="800" fontFamily="monospace" fill="#64748B">NORTH</text>
              <use href="#compass-rose-cad" transform={`rotate(${orientationDeg - 180})`} />
              <text x="0" y="46" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="monospace" fill="#0F172A">
                {orientationDeg}° S
              </text>
            </g>

            {/* Column 3: Scale, Date, Drawn By */}
            <g transform="translate(455, 20)">
              <text x="0" y="0" fontSize="8" fontWeight="800" fontFamily="monospace" fill="#64748B">SCALE:</text>
              <text x="0" y="16" fontSize="12" fontWeight="800" fontFamily="monospace" fill="#0F172A">1:100 @ A3</text>

              <line x1="0" y1="28" x2="100" y2="28" stroke="#E2E8F0" strokeWidth="1" />

              <text x="0" y="44" fontSize="8" fontWeight="800" fontFamily="monospace" fill="#64748B">DATE:</text>
              <text x="0" y="58" fontSize="10" fontWeight="700" fontFamily="monospace" fill="#0F172A">2026-09-21</text>

              <line x1="0" y1="70" x2="100" y2="70" stroke="#E2E8F0" strokeWidth="1" />

              <text x="0" y="86" fontSize="8" fontWeight="800" fontFamily="monospace" fill="#64748B">ENGINEERING:</text>
              <text x="0" y="100" fontSize="9.5" fontWeight="700" fontFamily="sans-serif" fill="#0F172A">THERMA CAD</text>
            </g>

            {/* Column 4: Revision Table (Matching Image 2) */}
            <g transform="translate(582, 14)">
              <text x="0" y="6" fontSize="8.5" fontWeight="800" fontFamily="monospace" fill="#0F172A">REVISION TABLE</text>
              <line x1="0" y1="12" x2="175" y2="12" stroke="#0F172A" strokeWidth="1.2" />

              {/* Table headers */}
              <text x="2" y="24" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#64748B">REV</text>
              <text x="28" y="24" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#64748B">DATE</text>
              <text x="75" y="24" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#64748B">DESCRIPTION</text>
              <text x="155" y="24" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#64748B">BY</text>
              <line x1="0" y1="28" x2="175" y2="28" stroke="#CBD5E1" strokeWidth="0.8" />

              {/* Rows */}
              <text x="2" y="42" fontSize="7.5" fontFamily="monospace" fill="#0F172A">01</text>
              <text x="28" y="42" fontSize="7.5" fontFamily="monospace" fill="#0F172A">11-09-26</text>
              <text x="75" y="42" fontSize="7.5" fontFamily="monospace" fill="#0F172A">INITIAL ENVELOPE</text>
              <text x="155" y="42" fontSize="7.5" fontFamily="monospace" fill="#0F172A">AJ</text>

              <text x="2" y="58" fontSize="7.5" fontFamily="monospace" fill="#0F172A">02</text>
              <text x="28" y="58" fontSize="7.5" fontFamily="monospace" fill="#0F172A">18-09-26</text>
              <text x="75" y="58" fontSize="7.5" fontFamily="monospace" fill="#0F172A">TROMBE WALL ADDED</text>
              <text x="155" y="58" fontSize="7.5" fontFamily="monospace" fill="#0F172A">VK</text>

              <text x="2" y="74" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#C2410C">03</text>
              <text x="28" y="74" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#C2410C">21-09-26</text>
              <text x="75" y="74" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#C2410C">R1 COMPLIANT SYNC</text>
              <text x="155" y="74" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#C2410C">DRDO</text>
            </g>

            {/* Column 5: General Notes (Matching Image 2) */}
            <g transform="translate(782, 14)">
              <text x="0" y="6" fontSize="8.5" fontWeight="800" fontFamily="monospace" fill="#0F172A">GENERAL NOTES</text>
              <line x1="0" y1="12" x2="215" y2="12" stroke="#0F172A" strokeWidth="1.2" />

              <text x="0" y="24" fontSize="7.5" fontFamily="monospace" fill="#475569">1. DO NOT SCALE FROM DRAWINGS.</text>
              <text x="0" y="37" fontSize="7.5" fontFamily="monospace" fill="#475569">2. ALL DIMENSIONS ARE IN METERS.</text>
              <text x="0" y="50" fontSize="7.5" fontFamily="monospace" fill="#475569">3. ALL LEVELS IN METERS REFER TO DATUM.</text>
              <text x="0" y="63" fontSize="7.5" fontFamily="monospace" fill="#475569">4. ALL DISCREPANCIES TO BE REPORTED.</text>
              <text x="0" y="76" fontSize="7.5" fontFamily="monospace" fill="#475569">5. ENVELOPE U-VALUES MUST COMPLY WITH</text>
              <text x="0" y="87" fontSize="7.5" fontFamily="monospace" fill="#475569">   DRDO PS 26051 &amp; IS 3792 GUIDELINES.</text>
              <text x="0" y="100" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#0F172A">6. GROUND PERMAFROST DEPTH &gt; 1.50M.</text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
