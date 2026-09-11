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

export default function RetrofitList({ items = DEFAULT_RETROFITS, budgetCap = 20000 }) {
  const list = items && items.length > 0 ? items : DEFAULT_RETROFITS;

  return (
    <div style={{
      width: '100%',
      background: 'var(--surface-1)',
      border: 'var(--border-width) solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      overflowX: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-subhead-size)',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Ranked Retrofit Pathway (Cost-Efficiency Sequence)
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            Interventions ordered by °C gained per ₹1,000 invested · Budget cutoff line
          </p>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--accent)',
          background: 'var(--surface-2)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
        }}>
          Budget Limit: ₹{budgetCap.toLocaleString()}
        </div>
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-caption-size)',
        textAlign: 'left',
      }}>
        <thead>
          <tr style={{
            borderBottom: 'var(--border-width) solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: 11,
          }}>
            <th style={{ padding: '6px 8px' }}>Rank</th>
            <th style={{ padding: '6px 8px' }}>Intervention</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>ΔT Lift</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cost</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--solar)' }}>°C / ₹1,000</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cumulative Cost</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Indoor Min</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row, idx) => {
            const isExceeded = row.cumulative_cost > budgetCap;
            const prevRow = list[idx - 1];
            const isBudgetBoundary = !isExceeded && (list[idx + 1]?.cumulative_cost > budgetCap);

            return (
              <tr
                key={row.id || row.rank}
                style={{
                  borderBottom: isBudgetBoundary
                    ? '2px dashed var(--danger)'
                    : 'var(--border-width) solid var(--border)',
                  background: isExceeded ? 'var(--surface-2)' : 'transparent',
                  opacity: isExceeded ? 0.6 : 1.0,
                }}
              >
                <td style={{ padding: 'var(--space-2)', color: 'var(--text-secondary)' }}>#{row.rank}</td>
                <td style={{ padding: 'var(--space-2)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  {row.label}
                </td>
                <td style={{ padding: 'var(--space-2)', textAlign: 'right', color: 'var(--comfort)', fontWeight: 600 }}>
                  +{row.delta_t.toFixed(1)} °C
                </td>
                <td style={{ padding: 'var(--space-2)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  ₹{row.cost_inr.toLocaleString()}
                </td>
                <td style={{ padding: 'var(--space-2)', textAlign: 'right', color: 'var(--solar)', fontWeight: 600 }}>
                  {row.degrees_per_1000.toFixed(2)} °C
                </td>
                <td style={{ padding: 'var(--space-2)', textAlign: 'right', color: isExceeded ? 'var(--danger)' : 'var(--text-primary)' }}>
                  ₹{row.cumulative_cost.toLocaleString()}
                </td>
                <td style={{ padding: 'var(--space-2)', textAlign: 'right', color: row.cumulative_min_c >= 18.0 ? 'var(--comfort)' : 'var(--danger)', fontWeight: 600 }}>
                  {row.cumulative_min_c.toFixed(1)} °C
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
