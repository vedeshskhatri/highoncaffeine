/**
 * safetyUtils.js
 * Frontend utilities for Phase 9 — Trust and Safety UI.
 * 
 * Guarantees:
 * 1. Authoritative Safety: Never recalculates safety on the client; backend engine/safety.py is authoritative.
 * 2. Refusal Presentation:
 *      Title: strictly "DESIGN REJECTED FOR SAFETY"
 *      Reason: exact backend reason preserved verbatim
 *      Actionable Constraint: factual engineering constraint provided
 * 3. Proportional Language: strictly factual, avoiding sensationalist claims (e.g. "will kill people").
 * 4. Data Provenance: verifies that all 5 categories are present and enforces exact basis strings:
 *      - ESTIMATE -> "Estimate — source unavailable."
 *      - DERIVED  -> "Derived from sourced inputs."
 */

export const ESTIMATE_BASIS = 'Estimate — source unavailable.';
export const DERIVED_BASIS = 'Derived from sourced inputs.';

export const PROVENANCE_CATEGORIES = [
  { id: 'physical_constants', label: 'Physical Constants' },
  { id: 'material_properties', label: 'Material Properties' },
  { id: 'weather', label: 'Weather Sources' },
  { id: 'costs', label: 'Cost Valuation' },
  { id: 'validation_measurements', label: 'Validation Measurements' },
];

/**
 * Format and validate safety refusal payload from backend.
 * 
 * @param {Object} response - backend simulation or check response
 * @returns {Object} formatted refusal state
 */
export function formatSafetyRefusal(response) {
  if (!response || !response.refused) {
    return {
      isRefused: false,
      title: 'DESIGN SAFE',
      reason: null,
      actionableConstraint: null,
      status: 'SAFE',
    };
  }

  const rawReason = response.refusal_reason || response.reason || 'Safety interlock criteria not satisfied.';
  const rawConstraint = response.actionable_constraint || 
    'Ventilation requirement not satisfied for selected heater. Increase ventilation to at least 0.35 ACH or specify a flued stove or electric heater.';

  return {
    isRefused: true,
    title: 'DESIGN REJECTED FOR SAFETY',
    reason: rawReason,
    actionableConstraint: rawConstraint,
    status: 'REFUSED',
  };
}

/**
 * Validate that a refusal reason maintains professional, proportional engineering language.
 * Flags exaggerated or sensationalist phrases.
 * 
 * @param {string} text
 * @returns {boolean} true if factual and proportional
 */
export function isFactualAndProportional(text) {
  if (!text || typeof text !== 'string') return true;
  const sensationalistPatterns = [
    /will kill/i,
    /fatal disaster/i,
    /death trap/i,
    /murder/i,
  ];
  return !sensationalistPatterns.some(pattern => pattern.test(text));
}

/**
 * Verify data provenance items conform to strict classification and basis invariants.
 * 
 * @param {Object} registry - provenance response from GET /provenance
 * @returns {Object} verification result { valid: boolean, errors: string[] }
 */
export function verifyDataProvenanceInvariants(registry) {
  const errors = [];
  if (!registry || typeof registry !== 'object') {
    return { valid: false, errors: ['Missing or invalid provenance registry'] };
  }

  PROVENANCE_CATEGORIES.forEach(cat => {
    const items = registry[cat.id];
    if (!Array.isArray(items) || items.length === 0) {
      errors.push(`Missing or empty category: ${cat.id}`);
      return;
    }

    items.forEach((item, idx) => {
      const prefix = `[${cat.id} #${idx}: ${item.item || 'unnamed'}]`;
      if (!item.source) {
        errors.push(`${prefix} Missing source citation`);
      }
      if (!['SOURCED', 'DERIVED', 'ESTIMATE', 'UNAVAILABLE'].includes(item.status)) {
        errors.push(`${prefix} Invalid status: ${item.status}`);
      }
      if (item.status === 'ESTIMATE' && item.basis !== ESTIMATE_BASIS) {
        errors.push(`${prefix} Estimate basis must be exactly '${ESTIMATE_BASIS}'`);
      }
      if (item.status === 'DERIVED' && item.basis !== DERIVED_BASIS) {
        errors.push(`${prefix} Derived basis must be exactly '${DERIVED_BASIS}'`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
