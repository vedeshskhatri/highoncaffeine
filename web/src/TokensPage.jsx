import './TokensPage.css';

/* ── Colour token definitions ──────────────────────────────────────────────
 * Each entry: { token, value, meaning? }
 * 'meaning' is only for semantic colours — the four colours with hard rules.
 */
const SURFACE_COLOURS = [
  { token: '--bg-base',       value: '#0E0F11', label: 'bg-base' },
  { token: '--surface-1',     value: '#16181B', label: 'surface-1' },
  { token: '--surface-2',     value: '#1E2125', label: 'surface-2' },
  { token: '--border',        value: '#2A2E33', label: 'border' },
  { token: '--border-strong', value: '#3A3F46', label: 'border-strong' },
];

const TEXT_COLOURS = [
  { token: '--text-primary',   value: '#ECEDEE', label: 'text-primary' },
  { token: '--text-secondary', value: '#A0A6AD', label: 'text-secondary' },
  { token: '--text-muted',     value: '#6B7178', label: 'text-muted' },
];

const SEMANTIC_COLOURS = [
  { token: '--accent',   value: '#4C9EE8', label: 'accent',   meaning: 'Interactive only: buttons, active step, links' },
  { token: '--solar',    value: '#E8A33D', label: 'solar',    meaning: 'Solar gain, daytime, warm surfaces' },
  { token: '--danger',   value: '#E05C5C', label: 'danger',   meaning: 'ONLY: below health threshold (18 °C)' },
  { token: '--comfort',  value: '#3FA87A', label: 'comfort',  meaning: 'ONLY: inside comfort band' },
  { token: '--estimate', value: '#8B7A55', label: 'estimate', meaning: 'ONLY: the [estimate] tag on unsourced cost figures' },
];

/* ── Type scale ─────────────────────────────────────────────────────────── */
const TYPE_SCALE = [
  {
    token: '--text-display',
    sample: 'Display — 28px / 1.2 / 600 / -0.02em',
    family: 'var(--font-heading)',
    size: 'var(--text-display-size)',
    lh: 'var(--text-display-lh)',
    weight: 'var(--text-display-weight)',
    spacing: 'var(--text-display-spacing)',
    details: '28px · Montserrat 600 · -0.02em',
  },
  {
    token: '--text-title',
    sample: 'Title — 20px / 1.3 / 600 / -0.01em',
    family: 'var(--font-heading)',
    size: 'var(--text-title-size)',
    lh: 'var(--text-title-lh)',
    weight: 'var(--text-title-weight)',
    spacing: 'var(--text-title-spacing)',
    details: '20px · Montserrat 600 · -0.01em',
  },
  {
    token: '--text-body',
    sample: 'Body — 15px / 1.5 / 400 — The thermal mass of a wall delays and attenuates the temperature wave.',
    family: 'var(--font-body)',
    size: 'var(--text-body-size)',
    lh: 'var(--text-body-lh)',
    weight: 'var(--text-body-weight)',
    spacing: 'normal',
    details: '15px · DM Sans 400',
  },
  {
    token: '--text-label',
    sample: 'Label — 13px / 1.4 / 500 — Wall thickness · Material · Facing',
    family: 'var(--font-body)',
    size: 'var(--text-label-size)',
    lh: 'var(--text-label-lh)',
    weight: 'var(--text-label-weight)',
    spacing: 'normal',
    details: '13px · DM Sans 500',
  },
  {
    token: '--text-caption',
    sample: 'Caption — 12px / 1.4 / 400 — ~₹500/window · local craftsman, 1 day   [estimate]',
    family: 'var(--font-body)',
    size: 'var(--text-caption-size)',
    lh: 'var(--text-caption-lh)',
    weight: 'var(--text-caption-weight)',
    spacing: 'normal',
    details: '12px · DM Sans 400',
  },
  {
    token: '--text-metric',
    sample: '−17.2 °C    86%    1,180 L    ₹4,200',
    family: 'var(--font-mono)',
    size: 'var(--text-metric-size)',
    lh: 'var(--text-metric-lh)',
    weight: 'var(--text-metric-weight)',
    spacing: 'normal',
    details: '24px · JetBrains Mono 500',
  },
];

/* ── Spacing ────────────────────────────────────────────────────────────── */
const SPACING = [
  { token: '--space-1', value: '4px',  px: 4 },
  { token: '--space-2', value: '8px',  px: 8 },
  { token: '--space-3', value: '16px', px: 16 },
  { token: '--space-4', value: '24px', px: 24 },
];

/* ── Font families ─────────────────────────────────────────────────────── */
const FONT_FAMILIES = [
  {
    token: '--font-heading',
    family: 'Montserrat',
    cssFamily: "'Montserrat', system-ui, sans-serif",
    weights: [600, 700],
    role: 'Headings',
  },
  {
    token: '--font-body',
    family: 'DM Sans',
    cssFamily: "'DM Sans', system-ui, sans-serif",
    weights: [400, 500],
    role: 'Body / UI (swap target for Google Sans — Decision D13)',
  },
  {
    token: '--font-mono',
    family: 'JetBrains Mono',
    cssFamily: "'JetBrains Mono', ui-monospace, monospace",
    weights: [400, 500],
    role: 'All numbers — temperatures, rupees, percentages',
  },
];

/* ── Swatch component ───────────────────────────────────────────────────── */
function Swatch({ token, value, label, meaning }) {
  return (
    <div className="swatch">
      <div className="swatch-block" style={{ backgroundColor: value }} />
      <div className="swatch-label">
        <span className="swatch-name">{label}</span>
        <span className="swatch-value">{value}</span>
        {meaning && <span className="swatch-meaning">{meaning}</span>}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function TokensPage() {
  return (
    <div className="tokens-page">
      <h1>THERMA — Design Token Specimen</h1>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-body-size)',
        marginBottom: 'var(--space-4)',
        fontStyle: 'italic',
      }}>
        Palette is <strong>provisional</strong> (Decision D14). Replace values in{' '}
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>tokens.css</code>{' '}
        only — no component hardcodes a colour.
      </p>

      {/* ── Font families ─── */}
      <section className="tokens-section">
        <h2>Font Families</h2>
        <div className="font-specimens">
          {FONT_FAMILIES.map((f) => (
            <div key={f.token} className="font-specimen">
              <div className="font-meta">
                <code>{f.token}</code> · {f.role}
              </div>
              {f.weights.map((w) => (
                <div
                  key={w}
                  className={`font-sample-${w}`}
                  style={{ fontFamily: f.cssFamily, fontWeight: w }}
                >
                  {f.family} {w} — The quick brown fox
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Type scale ─── */}
      <section className="tokens-section">
        <h2>Type Scale</h2>
        <div className="type-specimen-grid">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="type-specimen">
              <div className="type-meta">
                <div className="type-token-name">{t.token}</div>
                <div className="type-details">{t.details}</div>
              </div>
              <div
                style={{
                  fontFamily: t.family,
                  fontSize: t.size,
                  lineHeight: t.lh,
                  fontWeight: t.weight,
                  letterSpacing: t.spacing,
                  color: 'var(--text-primary)',
                  flex: 1,
                }}
              >
                {t.sample}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Colour — surfaces ─── */}
      <section className="tokens-section">
        <h2>Surfaces</h2>
        <div className="swatch-grid">
          {SURFACE_COLOURS.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      {/* ── Colour — text ─── */}
      <section className="tokens-section">
        <h2>Text</h2>
        <div className="swatch-grid">
          {TEXT_COLOURS.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      {/* ── Colour — semantic ─── */}
      <section className="tokens-section">
        <h2>Semantic Colours — each has exactly ONE meaning</h2>
        <div className="swatch-grid">
          {SEMANTIC_COLOURS.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      {/* ── Spacing ─── */}
      <section className="tokens-section">
        <h2>Spacing Scale (4 values only)</h2>
        <div className="spacing-grid">
          {SPACING.map((s) => (
            <div key={s.token} className="spacing-row">
              <div className="spacing-label">
                <code>{s.token}</code> · {s.value}
              </div>
              <div className="spacing-bar-wrap">
                <div
                  className="spacing-bar"
                  style={{ width: `${s.px * 6}px` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="tokens-footer">
        THERMA · Phase S0 · Swapnil · All colours provisional per Decision D14 ·
        Font swap target: --font-body → Google Sans (Decision D13)
      </div>
    </div>
  );
}
