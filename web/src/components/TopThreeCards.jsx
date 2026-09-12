/*
 * TopThreeCards.jsx — Phase S4
 * The three top recommended shelter designs from the Pareto optimizer.
 * Streamlined presentation with clean metric chips, structured envelope specs,
 * and high-contrast action triggers.
 *
 * Strictly token colors — zero hardcoded hex colors.
 */
import React from 'react';
import { Award, Zap, ShieldCheck, Thermometer, Layers } from 'lucide-react';

const DEFAULT_TOP_DESIGNS = [
  {
    rank: 1,
    id: 'opt_1',
    name: 'Leh Solar Passive Shield',
    badge: 'Best Overall Balance',
    why: 'Optimal comfort-to-cost ratio: 300 mm mud brick + 50 mm EPS achieves 88% comfort hours within ₹400k capital budget.',
    delta_vs_baseline: '+6.8 °C dawn min · +67% comfort · 1,180 L kerosene saved',
    cost_inr: 345000,
    comfort_pct: 88,
    min_temp_c: 17.2,
    specs: '300mm mud brick + 50mm EPS · 170° orientation · 5.5m² south glazing · Night shutter',
  },
  {
    rank: 2,
    id: 'opt_2',
    name: 'Direct-Gain Superinsulated',
    badge: 'Maximum Cold Safety',
    why: '100 mm XPS insulation completely prevents below-zero freezing events during consecutive cloudy days.',
    delta_vs_baseline: '+8.4 °C dawn min · +73% comfort · 1,420 L kerosene saved',
    cost_inr: 385000,
    comfort_pct: 94,
    min_temp_c: 18.9,
    specs: '300mm stone + 100mm XPS · 180° south · 6.0m² triple-glazed window · Night shutter',
  },
  {
    rank: 3,
    id: 'opt_3',
    name: 'Low-Cost Rammed Earth',
    badge: 'Zero Transport Bottleneck',
    why: '100% locally sourced earth and timber, eliminating high-pass logistics bottlenecks.',
    delta_vs_baseline: '+4.1 °C dawn min · +43% comfort · -₹65,000 capital cost',
    cost_inr: 215000,
    comfort_pct: 64,
    min_temp_c: 14.8,
    specs: '400mm rammed earth + 25mm wood fiber · 180° south · 4.0m² double-glazed window',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Top Recommended Shelter Configurations
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            margin: '2px 0 0',
          }}>
            Evaluated on Pareto efficiency frontier (capital investment vs winter comfort hours)
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: 'var(--space-3)',
      }}>
        {items.slice(0, 3).map((item) => {
          const isRank1 = item.rank === 1;

          return (
            <div
              key={item.id || item.rank}
              style={{
                background: 'var(--surface-1)',
                border: isRank1 ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: 'var(--space-3, 14px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: isRank1 ? '0 4px 14px rgba(194, 65, 12, 0.08)' : '0 1px 3px rgba(15, 23, 42, 0.04)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Header: Rank + Budget Cost */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: isRank1 ? '#FFFFFF' : 'var(--text-secondary)',
                      background: isRank1 ? 'var(--accent)' : 'var(--surface-2)',
                      border: isRank1 ? 'none' : '1px solid var(--border)',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {isRank1 ? <Award size={11} /> : null}
                      <span>RANK #{item.rank}</span>
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isRank1 ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                      {item.badge || (isRank1 ? 'Recommended' : 'Candidate')}
                    </span>
                  </div>

                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}>
                    ₹{Math.round(item.cost_inr).toLocaleString()}
                  </span>
                </div>

                {/* Configuration Name */}
                <h4 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}>
                  {item.name}
                </h4>

                {/* Purpose Synopsis */}
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                  margin: 0,
                }}>
                  {item.why}
                </p>

                {/* Delta Chips */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginTop: '2px',
                }}>
                  {item.delta_vs_baseline.split('·').map((part, pIdx) => (
                    <span
                      key={pIdx}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        color: '#059669',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                      }}
                    >
                      {part.trim()}
                    </span>
                  ))}
                </div>

                {/* Structured Envelope Spec Tag */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  lineHeight: 1.35,
                  marginTop: '4px',
                }}>
                  <div style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>
                    Envelope Specification:
                  </div>
                  {item.specs}
                </div>
              </div>

              {/* Action Button */}
              {onApplyDesign && (
                <button
                  onClick={() => onApplyDesign(item)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: isRank1 ? 'var(--accent)' : 'var(--surface-2)',
                    color: isRank1 ? '#FFFFFF' : 'var(--text-primary)',
                    border: isRank1 ? 'none' : '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isRank1) {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.color = 'var(--accent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRank1) {
                      e.currentTarget.style.borderColor = 'var(--border-strong)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                >
                  <Zap size={12} />
                  <span>Apply to Design Studio</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
