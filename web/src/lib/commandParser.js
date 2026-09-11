/**
 * commandParser.js — Pure function deterministic command parser for THERMA.
 *
 * Implements strict pattern matching for natural commands in field instruments.
 * Fully offline — zero LLM, zero external API, zero network dependencies.
 *
 * Supported patterns:
 *  - "open <step>" / "go to <step>" -> { type: 'NAVIGATE_STEP', step }
 *  - "simulate <site>" -> { type: 'SET_SITE_AND_NAVIGATE', site, step: 'simulate' }
 *  - "simulate <site> with <material> walls" -> { type: 'SET_SITE_AND_MATERIAL_AND_NAVIGATE', site, material, step: 'simulate' }
 *  - "compare <material A> vs <material B>" -> { type: 'COMPARE_MATERIALS', materialA, materialB }
 *  - "show validation" -> { type: 'NAVIGATE_STEP', step: 'validation panel toggle' }
 */

import { SITE_PRESETS, FALLBACK_MATERIALS, STEPS } from './presets.js';

/**
 * Normalizes user input string (trim, lowercase, collapse whitespace).
 * @param {string} str
 * @returns {string}
 */
export function normalize(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolves a step from input string: matches 'design', 'simulate', 'optimize', 'watch',
 * or their labels 'design studio', 'simulation', 'optimization', 'forecast watch'.
 * @param {string} input
 * @param {Array} [stepsList]
 * @returns {string|null}
 */
export function resolveStep(input, stepsList = STEPS) {
  const norm = normalize(input);
  if (!norm) return null;

  for (const step of stepsList) {
    if (step.id.toLowerCase() === norm) return step.id;
    if (step.label.toLowerCase() === norm) return step.id;
  }

  // Common synonyms / short names
  if (norm === 'simulation') return 'simulate';
  if (norm === 'optimization') return 'optimize';
  if (norm === 'forecast') return 'watch';
  if (norm === 'forecast watch') return 'watch';

  return null;
}

/**
 * Resolves site from presets: matches against label (e.g. 'Leh', 'Kargil', 'Manali', 'Keylong').
 * @param {string} input
 * @param {Array} [presets]
 * @returns {Object|null}
 */
export function resolveSite(input, presets = SITE_PRESETS) {
  const norm = normalize(input);
  if (!norm) return null;

  for (const preset of presets) {
    if (preset.label.toLowerCase() === norm) {
      return preset;
    }
  }
  return null;
}

/**
 * Resolves material from list of materials or material IDs.
 * Matches against ID or common human name (e.g. 'rammed earth', 'mud brick', 'stone', 'eps').
 * @param {string} input
 * @param {Array} [materials]
 * @returns {Object|null}
 */
export function resolveMaterial(input, materials = FALLBACK_MATERIALS) {
  const norm = normalize(input);
  if (!norm) return null;

  const list = materials.map(m => {
    if (typeof m === 'string') {
      return { id: m, name: m.replace(/_/g, ' ') };
    }
    return m;
  });

  for (const mat of list) {
    const id = mat.id.toLowerCase();
    const idNoUnderscore = id.replace(/_/g, ' ');
    const name = (mat.name || '').toLowerCase();
    // e.g. "mud brick (adobe)" -> "mud brick"
    const baseName = name.replace(/\s*\(.*?\)\s*/g, '').trim();

    if (norm === id || norm === idNoUnderscore || norm === name || norm === baseName) {
      return mat;
    }

    // Specific aliases matching standard vocabulary
    if (id === 'eps' && (norm === 'eps' || norm === 'eps insulation')) return mat;
    if (id === 'xps' && (norm === 'xps' || norm === 'xps insulation')) return mat;
    if (id === 'mud_brick' && norm === 'adobe') return mat;
    if (id === 'polythene' && (norm === 'polythene' || norm === 'polythene sheet')) return mat;
    if (id === 'timber' && (norm === 'timber' || norm === 'timber softwood' || norm === 'timber (softwood)')) return mat;
    if (id === 'stone' && (norm === 'stone' || norm === 'stone local' || norm === 'stone (local)')) return mat;
  }

  return null;
}

/**
 * Pure function: parses typed command and drives the existing UI/state directly.
 * Returns an Action object if recognized with high confidence, or null if unrecognized.
 *
 * @param {string} text - Raw typed user command.
 * @param {Object} [context] - Execution context containing sitePresets and/or materialIds.
 * @returns {Object|null}
 */
export function parseCommand(text, context = {}) {
  if (typeof text !== 'string') return null;
  const raw = text.trim();
  if (!raw) return null;

  const sites = context.sitePresets || SITE_PRESETS;
  const materials = context.materialIds || context.materials || FALLBACK_MATERIALS;

  // Pattern 1: Validation panel toggle
  // "show validation", "open validation", "show validation panel", "toggle validation"
  if (/^(?:show|open|toggle)\s+validation(?:\s+panel)?$/i.test(raw)) {
    return {
      type: 'NAVIGATE_STEP',
      step: 'validation panel toggle',
    };
  }

  // Pattern 2: Navigation to step
  // "open <step>" or "go to <step>"
  const navMatch = raw.match(/^(?:open|go\s+to)\s+(.+)$/i);
  if (navMatch) {
    const target = navMatch[1].trim();
    if (/^validation(?:\s+panel)?$/i.test(target)) {
      return {
        type: 'NAVIGATE_STEP',
        step: 'validation panel toggle',
      };
    }
    const step = resolveStep(target);
    if (step) {
      return {
        type: 'NAVIGATE_STEP',
        step,
      };
    }
    // Ambiguous or unsupported navigation target
    return null;
  }

  // Pattern 3: Simulate site with material walls
  // "simulate <site> with <material> walls" or "simulate <site> with <material>"
  const simMatMatch = raw.match(/^simulate\s+(.+?)\s+with\s+(.+?)(?:\s+walls)?$/i);
  if (simMatMatch) {
    const siteStr = simMatMatch[1].trim();
    const matStr = simMatMatch[2].trim();
    const site = resolveSite(siteStr, sites);
    const material = resolveMaterial(matStr, materials);
    if (site && material) {
      return {
        type: 'SET_SITE_AND_MATERIAL_AND_NAVIGATE',
        site,
        material,
        step: 'simulate',
      };
    }
    // Low confidence / unmatched site or material
    return null;
  }

  // Pattern 4: Simulate site
  // "simulate <site>"
  const simMatch = raw.match(/^simulate\s+(.+)$/i);
  if (simMatch) {
    const siteStr = simMatch[1].trim();
    const site = resolveSite(siteStr, sites);
    if (site) {
      return {
        type: 'SET_SITE_AND_NAVIGATE',
        site,
        step: 'simulate',
      };
    }
    // Low confidence / unmatched site
    return null;
  }

  // Pattern 5: Compare materials
  // "compare <material A> vs <material B>" or "compare <material A> versus <material B>" or "compare <material A> and <material B>"
  const compMatch = raw.match(/^compare\s+(.+?)\s+(?:vs\.?|versus|and)\s+(.+?)$/i);
  if (compMatch) {
    const matAStr = compMatch[1].trim();
    const matBStr = compMatch[2].trim();
    const materialA = resolveMaterial(matAStr, materials);
    const materialB = resolveMaterial(matBStr, materials);
    if (materialA && materialB) {
      return {
        type: 'COMPARE_MATERIALS',
        materialA,
        materialB,
      };
    }
    // Low confidence / unknown material
    return null;
  }

  // Unrecognized input — never guess
  return null;
}
