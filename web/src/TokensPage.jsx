import { useState, useEffect } from 'react';
import './TokensPage.css';

/* ── Token definitions (values read live from CSS custom properties) ──────── */
const TOKEN_SPECS = [
  { token: '--cream',       label: 'cream',       role: 'Page background, majority surface' },
  { token: '--cream-2',     label: 'cream-2',     role: 'Raised panels, table stripes' },
  { token: '--espresso',    label: 'espresso',    role: 'Primary text, dark full-bleed sections' },
  { token: '--espresso-70', label: 'espresso-70', role: 'Secondary text' },
  { token: '--espresso-40', label: 'espresso-40', role: 'Captions, axis labels, estimate chip border' },
  { token: '--rule',        label: 'rule',        role: 'Hairlines, section borders' },
  { token: '--orange',      label: 'orange',      role: 'Buttons, links, active state, SOLAR GAIN' },
  { token: '--orange-soft', label: 'orange-soft', role: 'Fills, hover, highlight bands' },
  { token: '--ice',         label: 'ice',         role: 'Cold, heat loss, below health threshold' },
  { token: '--ice-soft',    label: 'ice-soft',    role: 'Shading below health threshold' },
  { token: '--sage',        label: 'sage',        role: 'Inside the comfort band' },
  { token: '--sage-soft',   label: 'sage-soft',   role: 'Comfort band highlight' },
];

const SEMANTIC_RULES = [
  {
    name: 'Vivid Orange',
    token: '--orange',
    meaning: 'Warmth, sun, solar gain, primary brand action',
    bg: 'var(--orange)',
    fg: 'var(--cream)',
  },
  {
    name: 'Ice Blue',
    token: '--ice',
    meaning: 'Cold, heat loss, below 18 °C health threshold',
    bg: 'var(--ice)',
    fg: 'var(--cream)',
  },
  {
    name: 'Sage Green',
    token: '--sage',
    meaning: 'Comfort band (inside 18–26 °C band)',
    bg: 'var(--sage)',
    fg: 'var(--cream)',
  },
];

const TYPE_SCALE = [
  {
    token: '--text-hero',
    sample: 'Rs 2,400 to deliver one litre of kerosene.',
    family: 'var(--font-heading)',
    size: 'var(--text-hero-size)',
    lh: 'var(--text-hero-lh)',
    weight: 'var(--text-hero-weight)',
    details: '56–72px · Montserrat 700 · -0.025em',
  },
  {
    token: '--text-display',
    sample: 'The Physics is Solved. The Decision Isn’t.',
    family: 'var(--font-heading)',
    size: 'var(--text-display-size)',
    lh: 'var(--text-display-lh)',
    weight: 'var(--text-display-weight)',
    details: '32px · Montserrat 700 · -0.02em',
  },
  {
    token: '--text-title',
    sample: 'Shelter Cross-Section & Thermal Envelope',
    family: 'var(--font-heading)',
    size: 'var(--text-title-size)',
    lh: 'var(--text-title-lh)',
    weight: 'var(--text-title-weight)',
    details: '22px · Montserrat 700 · -0.01em',
  },
  {
    token: '--text-subhead',
    sample: 'Transient ISO 52016-1 thermal response across 24 hours',
    family: 'var(--font-heading)',
    size: 'var(--text-subhead-size)',
    lh: 'var(--text-subhead-lh)',
    weight: 'var(--text-subhead-weight)',
    details: '18px · Montserrat 600',
  },
  {
    token: '--text-body',
    sample: 'A standard uninsulated tent collapses to -32 C overnight in Ladakh. Adding 50 mm EPS lifts the night minimum by 14.8 C.',
    family: 'var(--font-body)',
    size: 'var(--text-body-size)',
    lh: 'var(--text-body-lh)',
    weight: 'var(--text-body-weight)',
    details: '15px · DM Sans 400',
  },
  {
    token: '--text-metric',
    sample: '-32.28 °C · 2,400 INR/L · 15.34 kWh · 04:00',
    family: 'var(--font-mono)',
    size: 'var(--text-metric-size)',
    lh: 'var(--text-metric-lh)',
    weight: 'var(--text-metric-weight)',
    details: '24px · JetBrains Mono 500 (Every Number)',
  },
];

export default function TokensPage() {
  const [resolvedValues, setResolvedValues] = useState({});

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement);
    const vals = {};
    TOKEN_SPECS.forEach((s) => {
      vals[s.token] = computed.getPropertyValue(s.token).trim();
    });
    setResolvedValues(vals);
  }, []);

  return (
    <div className="tokens-page">
      <header className="tokens-header">
        <a href="/" className="back-link">← Back to Shelter Builder</a>
        <h1 className="tokens-title">Design Tokens — Editorial Engineering</h1>
        <p className="tokens-subtitle">
          Single source of truth for THERMA. Warm cream foundation, midnight espresso typography,
          and strict semantic colour discipline.
        </p>
      </header>

      {/* Colour palette */}
      <section className="tokens-section">
        <h2>1. Palette Tokens</h2>
        <div className="swatch-grid">
          {TOKEN_SPECS.map((c) => (
            <div key={c.token} className="swatch">
              <div className="swatch-block" style={{ backgroundColor: `var(${c.token})` }} />
              <div className="swatch-label">
                <span className="swatch-name">{c.label}</span>
                <span className="swatch-token">{c.token}</span>
                <span className="swatch-value">{resolvedValues[c.token] || 'Loading...'}</span>
                <span className="swatch-role">{c.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Semantic discipline */}
      <section className="tokens-section">
        <h2>2. Semantic Colour Discipline</h2>
        <p className="section-note">
          Every colour carries exact physics and narrative meaning. The night collapse reads
          directly as a slide from orange (sun, warmth) into ice blue (cold, loss).
        </p>
        <div className="semantic-grid">
          {SEMANTIC_RULES.map((s) => (
            <div key={s.token} className="semantic-card" style={{ borderLeftColor: s.bg }}>
              <div className="semantic-badge" style={{ backgroundColor: s.bg, color: s.fg }}>
                {s.name}
              </div>
              <div className="semantic-meta">
                <span className="semantic-token">{s.token}</span>
                <span className="semantic-meaning">{s.meaning}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Estimate chip token */}
      <section className="tokens-section">
        <h2>3. Estimate Tag Chip Spec</h2>
        <p className="section-note">
          Per specification, unsourced material or cost estimates render as a subtle outlined chip
          in <code>--espresso-40</code>, not an alert colour.
        </p>
        <div className="estimate-demo-box">
          <span>Cost per m²: ₹1,450 </span>
          <span className="estimate-chip">[estimate]</span>
        </div>
      </section>

      {/* Typography */}
      <section className="tokens-section">
        <h2>4. Typography Scale</h2>
        <div className="type-specimen-grid">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="type-specimen">
              <div className="type-meta">
                <div className="type-token-name">{t.token}</div>
                <div className="type-details">{t.details}</div>
              </div>
              <div
                className="type-sample"
                style={{
                  fontFamily: t.family,
                  fontSize: t.size,
                  lineHeight: t.lh,
                  fontWeight: t.weight,
                }}
              >
                {t.sample}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
