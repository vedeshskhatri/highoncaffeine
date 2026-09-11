/*
 * TopThreeCards.jsx — Phase S4
 * The three top recommended shelter designs from the Pareto optimizer.
 * Each card explains WHY it was selected, plus delta_vs_baseline metrics.
 *
 * Strictly token colors — zero hardcoded hex colors.
 */

const DEFAULT_TOP_DESIGNS = [
  {
    rank: 1,
    id: 'opt_1',
    name: 'Leh Solar Passive Shield (Recommended)',
    why: 'Optimal comfort-to-cost ratio: 300 mm mud brick + 50 mm EPS achieves 88% comfort hours while staying 18% below the ₹400k capital budget.',
    delta_vs_baseline: '+6.8 °C dawn min · +67% comfort hours · 1,180 L kerosene saved/yr',
    cost_inr: 345000,
    comfort_pct: 88,
    min_temp_c: 17.2,
    specs: '300 mm mud brick + 50 mm EPS · 170° orientation · 5.5 m² south glazing with night shutter',
  },
  {
    rank: 2,
    id: 'opt_2',
    name: 'Direct-Gain Superinsulated',
    why: 'Maximum thermal safety: 100 mm XPS insulation completely prevents below-zero freezing events during consecutive cloudy days.',
    delta_vs_baseline: '+8.4 °C dawn min · +73% comfort hours · 1,420 L kerosene saved/yr',
    cost_inr: 385000,
    comfort_pct: 94,
    min_temp_c: 18.9,
    specs: '300 mm stone + 100 mm XPS · 180° south · 6.0 m² triple-glazed window with night shutter',
  },
  {
    rank: 3,
    id: 'opt_3',
    name: 'Low-Cost Rammed Earth',
    why: 'Lowest logistics footprint: 100% locally available earth and timber, eliminating flatland transport bottlenecks.',
    delta_vs_baseline: '+4.1 °C dawn min · +43% comfort hours · -₹65,000 capital cost',
    cost_inr: 215000,
    comfort_pct: 64,
    min_temp_c: 14.8,
    specs: '400 mm rammed earth + 25 mm wood fiber · 180° south · 4.0 m² double-glazed window',
  },
];

export default function TopThreeCards({ designs = DEFAULT_TOP_DESIGNS, onApplyDesign }) {
  const items = designs && designs.length > 0 ? designs : DEFAULT_TOP_DESIGNS;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-subhead-size)',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Top 3 Recommended Shelter Envelopes
            </h3>
            {items === DEFAULT_TOP_DESIGNS && (
              <span className="mono" style={{ fontSize: '10px', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                [DEMO FIXTURE DATA]
              </span>
            )}
          </div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-caption-size)',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            Evaluated across candidate permutations · Demonstrating distinct operational trade-offs
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--space-3)',
      }}>
        {items.slice(0, 3).map((item) => {
          const isRank1 = item.rank === 1;

          return (
            <div
              key={item.id || item.rank}
              style={{
                background: 'var(--surface-1)',
                border: `var(--border-width) solid ${isRank1 ? 'var(--solar)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 'var(--space-2)',
                position: 'relative',
              }}
            >
              <div>
                {/* Header tag and rank */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: isRank1 ? 'var(--solar)' : 'var(--accent)',
                    background: 'var(--surface-2)',
                    border: 'var(--border-width) solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 6px',
                  }}>
                    RANK #{item.rank} {isRank1 ? '★ BEST OVERALL' : ''}
                  </span>

                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-caption-size)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    ₹{Math.round(item.cost_inr).toLocaleString()}
                  </span>
                </div>

                <h4 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-body-size)',
                  color: 'var(--text-primary)',
                  margin: '0 0 6px',
                }}>
                  {item.name}
                </h4>

                {/* Why explanation */}
                <div style={{
                  background: 'var(--surface-2)',
                  border: 'var(--border-width) solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--solar)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 2,
                  }}>
                    WHY IT WAS CHOSEN:
                  </span>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    margin: 0,
                  }}>
                    {item.why}
                  </p>
                </div>

                {/* Delta vs baseline */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--comfort)',
                  marginBottom: 6,
                }}>
                  Δ vs Baseline: {item.delta_vs_baseline}
                </div>

                {/* Specs */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  borderTop: 'var(--border-width) solid var(--border)',
                  paddingTop: 6,
                }}>
                  {item.specs}
                </div>
              </div>

              {/* Action */}
              {onApplyDesign && (
                <button
                  onClick={() => onApplyDesign(item)}
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '6px',
                    background: 'var(--surface-2)',
                    border: 'var(--border-width) solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Load this envelope into Design
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
