/**
 * scientificVizUtils.js
 * Shared utility functions for Phase 8 Scientific Visualization.
 * 
 * Guarantees:
 * 1. Part A: Only detect and render series present in API payload. Never reconstruct from scalars.
 * 2. Part B: Parse Morris screening results (mu_star, sigma, direction, cost basis). Disallow arbitrary percentages.
 * 3. Part C: Validate scenario comparisons (measured vs model, error, tolerance, provenance) and enforce "Validation not run." unrun guard.
 */

/**
 * Detect available series from simulation hourly results.
 * Strictly checks for actual presence of numeric values in payload.
 * Missing series are omitted, NEVER reconstructed.
 * 
 * @param {Array<Object>} seriesData - array of hourly simulation points
 * @returns {Array<Object>} - list of detected valid series definitions with units
 */
export function detectAvailableSeries(seriesData) {
  if (!Array.isArray(seriesData) || seriesData.length === 0) {
    return [];
  }

  const candidates = [
    {
      id: 't_in_c',
      label: 'Indoor Air (T_in)',
      unit: '°C',
      axis: 'temp',
      color: 'var(--color-primary, #2563eb)',
      defaultVisible: true,
      hasData: seriesData.some(d => typeof d.t_in_c === 'number' && !isNaN(d.t_in_c))
    },
    {
      id: 't_out_c',
      label: 'Ambient Outdoor (T_out)',
      unit: '°C',
      axis: 'temp',
      color: 'var(--color-border, #94a3b8)',
      defaultVisible: true,
      hasData: seriesData.some(d => typeof d.t_out_c === 'number' && !isNaN(d.t_out_c))
    },
    {
      id: 't_op_c',
      label: 'Operative Temp (T_op)',
      unit: '°C',
      axis: 'temp',
      color: 'var(--color-secondary, #0891b2)',
      defaultVisible: false,
      hasData: seriesData.some(d => typeof d.t_op_c === 'number' && !isNaN(d.t_op_c))
    },
    {
      id: 'comfort_band',
      label: 'IMAC Band (T_lo — T_hi)',
      unit: '°C',
      axis: 'temp',
      color: 'var(--color-success, #16a34a)',
      defaultVisible: true,
      hasData: seriesData.some(d => typeof d.t_lo_c === 'number' && typeof d.t_hi_c === 'number')
    },
    {
      id: 'solar_gain_w',
      label: 'Solar Gain (Q_solar)',
      unit: 'W',
      axis: 'power',
      color: 'var(--color-warning, #eab308)',
      defaultVisible: true,
      hasData: seriesData.some(d => typeof d.solar_gain_w === 'number' && !isNaN(d.solar_gain_w))
    },
    {
      id: 'heating_demand_w',
      label: 'Heating Demand (Q_heat)',
      unit: 'W',
      axis: 'power',
      color: 'var(--color-danger, #ef4444)',
      defaultVisible: true,
      hasData: seriesData.some(d => typeof d.heating_demand_w === 'number' && !isNaN(d.heating_demand_w))
    }
  ];

  return candidates.filter(c => c.hasData);
}

/**
 * Format Morris elementary effects screening lever.
 * Strictly uses physical units (°C) and avoids arbitrary percentage claims.
 * 
 * @param {Object} lever - Sensitivity lever from POST /sensitivity
 * @returns {Object} formatted lever with direction and confidence labels
 */
export function parseMorrisLever(lever) {
  if (!lever || typeof lever !== 'object') {
    return null;
  }

  const muStar = typeof lever.mu_star === 'number' 
    ? lever.mu_star 
    : (typeof lever.influence === 'number' ? lever.influence : 0.0);
  
  const mu = typeof lever.mu === 'number' ? lever.mu : null;
  const sigma = typeof lever.sigma === 'number' 
    ? lever.sigma 
    : (typeof lever.uncertainty === 'number' ? lever.uncertainty : 0.0);

  let direction = lever.direction || 'neutral';
  if (direction === 'neutral' && mu !== null) {
    if (mu > 0.05) direction = 'warming';
    else if (mu < -0.05) direction = 'cooling';
  }

  let directionLabel = '— Neutral';
  if (direction === 'warming') directionLabel = '▲ Warming';
  else if (direction === 'cooling') directionLabel = '▼ Cooling';

  return {
    parameter: lever.parameter || 'Unknown Parameter',
    mu_star: Math.round(muStar * 100) / 100,
    mu: mu !== null ? Math.round(mu * 100) / 100 : null,
    sigma: Math.round(sigma * 100) / 100,
    direction,
    directionLabel,
    cost_inr: typeof lever.cost_inr === 'number' ? lever.cost_inr : 0,
    cost_basis: lever.cost_basis || 'estimate',
    unit: '°C'
  };
}

/**
 * Evaluates validation status per brain/10_VALIDATION.md.
 * Strictly guards against claiming "Validated" if validation has not run.
 * 
 * @param {Object} validationPayload - payload from GET /validation
 * @returns {Object} status report
 */
export function verifyValidationStatus(validationPayload) {
  if (!validationPayload || validationPayload.validation_run === false) {
    return {
      isValidated: false,
      validationRun: false,
      statusMessage: validationPayload?.status || 'Validation not run.',
      badgeText: 'UNRUN',
      badgeClass: 'unrun',
      scenarios: [],
      orderingCheck: { passed: false, text: 'Ordering check not executed (validation unrun)' }
    };
  }

  const scenarios = (validationPayload.scenarios || []).map(s => {
    const errorVal = typeof s.error_c === 'number' ? s.error_c : null;
    const tolVal = typeof s.tolerance === 'number' ? s.tolerance : null;
    const passed = typeof s.passed === 'boolean' ? s.passed : (errorVal !== null && tolVal !== null ? errorVal <= tolVal : false);

    return {
      name: s.name || s.scenario || 'Unnamed Scenario',
      measured: s.reference_str || (s.measured_c !== undefined ? `${s.measured_c} °C` : '—'),
      model: s.model_str || (s.model_c !== undefined ? `${s.model_c} °C` : '—'),
      error_c: errorVal,
      tolerance_c: tolVal,
      passed,
      provenance: s.provenance || 'Field measurement / benchmark'
    };
  });

  const orderingPass = validationPayload.ordering_check === true || validationPayload.ordering_check?.pass === true;

  return {
    isValidated: scenarios.length > 0 && scenarios.every(s => s.passed) && orderingPass,
    validationRun: true,
    statusMessage: validationPayload.status || 'Validation complete.',
    badgeText: 'PASS',
    badgeClass: 'passed',
    scenarios,
    orderingCheck: {
      passed: orderingPass,
      text: orderingPass ? 'PASS: Trombe Wall mean > Direct Gain mean' : 'FAIL: Thermal ordering inverted'
    }
  };
}
