/*
 * presets.js — Shared canonical site presets, fallback materials, and step definitions.
 * Single source of truth across InputRail, App, and commandParser.
 */

/* ── Site Presets ────────────────────────────────────────────────────────── */
export const SITE_PRESETS = [
  { label: 'Leh',     lat: 34.1526, lon: 77.5771, altitude_m: 3500 },
  { label: 'Kargil',  lat: 34.5539, lon: 76.1349, altitude_m: 2676 },
  { label: 'Manali',  lat: 32.2396, lon: 77.1887, altitude_m: 2050 },
  { label: 'Keylong', lat: 32.5726, lon: 76.9950, altitude_m: 3094 },
];

/* ── Fallback materials (when API unreachable) ─────────────────────────── */
export const FALLBACK_MATERIALS = [
  { id: 'mud_brick',    name: 'Mud brick (adobe)' },
  { id: 'rammed_earth', name: 'Rammed earth' },
  { id: 'stone',        name: 'Stone (local)' },
  { id: 'concrete',     name: 'Concrete' },
  { id: 'eps',          name: 'EPS insulation' },
  { id: 'xps',          name: 'XPS insulation' },
  { id: 'timber',       name: 'Timber (softwood)' },
  { id: 'plywood',      name: 'Plywood' },
  { id: 'polythene',    name: 'Polythene sheet' },
];

/* ── Application Steps ──────────────────────────────────────────────────── */
export const STEPS = [
  { id: 'design',   label: 'Design Studio', number: 1 },
  { id: 'simulate', label: 'Simulation',    number: 2 },
  { id: 'optimize', label: 'Optimization',  number: 3 },
  { id: 'watch',    label: 'Forecast Watch', number: 4 },
];
