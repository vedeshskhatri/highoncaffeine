/*
 * RetrofitList.jsx — Phase S4
 * Ranked retrofit interventions by efficiency (°C per 1,000 INR)
 * with cumulative cost, cumulative min temp, and a visual budget line marker.
 *
 * Strictly token colors — zero hardcoded hex colors.
 */

const DEFAULT_RETROFITS = [
  {
    rank: 1,
    id: 'night_shutters',
    label: 'Thermal Night Shutters',
    delta_t: 6.1,
    cost_inr: 2500,
    degrees_per_1000: 2.44,
    cumulative_cost: 2500,
    cumulative_min_c: 9.2,
  },
  {
    rank: 2,
    id: 'weather_stripping',
    label: 'Airtightness Gaskets & Sweeps (0.4 ACH)',
    delta_t: 2.2,
    cost_inr: 1400,
    degrees_per_1000: 1.57,
    cumulative_cost: 3900,
    cumulative_min_c: 11.4,
  },
  {
    rank: 3,
    id: 'low_e_ceiling',
    label: 'Low-e Radiative Ceiling Barrier',
    delta_t: 2.7,
    cost_inr: 3200,
    degrees_per_1000: 0.84,
    cumulative_cost: 7100,
    cumulative_min_c: 14.1,
  },
  {
    rank: 4,
    id: 'eps_exterior',
    label: '50 mm EPS Exterior Wrap',
    delta_t: 4.8,
    cost_inr: 12500,
    degrees_per_1000: 0.38,
    cumulative_cost: 19600,
    cumulative_min_c: 17.5,
  },
  {
    rank: 5,
    id: 'double_glazing',
    label: 'Secondary Acrylic Glazing Pane',
    delta_t: 3.2,
    cost_inr: 9600,
    degrees_per_1000: 0.33,
    cumulative_cost: 29200,
    cumulative_min_c: 19.4,
  },
];

import React from 'react';
import DesignDoctorPanel from './results/DesignDoctorPanel';

export default function RetrofitList({ items, budgetCap = 25000, request = null, onApply = null }) {
  const data = items ? { interventions: items } : null;
  return (
    <DesignDoctorPanel
      data={data}
      request={request}
      initialBudget={budgetCap}
      onApplyIntervention={onApply}
    />
  );
}

