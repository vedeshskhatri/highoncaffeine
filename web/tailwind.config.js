/** @type {import('tailwindcss').Config} */
/*
 * tailwind.config.js — THERMA
 * Owner: Swapnil (Rule R4)
 *
 * Every token from tokens.css is mapped here.
 * After this, no component ever uses a raw value.
 * The palette is PROVISIONAL (Decision D14) — update tokens.css, not here.
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    /* ── Override Tailwind defaults entirely — use tokens ── */
    colors: {
      /* Surfaces */
      'bg-base':       'var(--bg-base)',
      'surface-1':     'var(--surface-1)',
      'surface-2':     'var(--surface-2)',
      'border':        'var(--border)',
      'border-strong': 'var(--border-strong)',

      /* Text */
      'text-primary':   'var(--text-primary)',
      'text-secondary': 'var(--text-secondary)',
      'text-muted':     'var(--text-muted)',

      /* Semantic — each with exactly ONE meaning */
      'accent':   'var(--accent)',    /* interactive: buttons, active step, links */
      'solar':    'var(--solar)',     /* solar gain, daytime, warm surfaces */
      'danger':   'var(--danger)',    /* ONLY: below health threshold */
      'comfort':  'var(--comfort)',   /* ONLY: inside comfort band */
      'estimate': 'var(--estimate)',  /* ONLY: the [estimate] tag */

      /* Transparent black/white for overlays */
      transparent: 'transparent',
      current: 'currentColor',
    },

    fontFamily: {
      heading: 'var(--font-heading)',
      body:    'var(--font-body)',      /* swap target for Google Sans */
      mono:    'var(--font-mono)',
    },

    fontSize: {
      display: [
        'var(--text-display-size)',
        {
          lineHeight:    'var(--text-display-lh)',
          fontWeight:    'var(--text-display-weight)',
          letterSpacing: 'var(--text-display-spacing)',
        },
      ],
      title: [
        'var(--text-title-size)',
        {
          lineHeight:    'var(--text-title-lh)',
          fontWeight:    'var(--text-title-weight)',
          letterSpacing: 'var(--text-title-spacing)',
        },
      ],
      body: [
        'var(--text-body-size)',
        { lineHeight: 'var(--text-body-lh)', fontWeight: 'var(--text-body-weight)' },
      ],
      label: [
        'var(--text-label-size)',
        { lineHeight: 'var(--text-label-lh)', fontWeight: 'var(--text-label-weight)' },
      ],
      caption: [
        'var(--text-caption-size)',
        { lineHeight: 'var(--text-caption-lh)', fontWeight: 'var(--text-caption-weight)' },
      ],
      metric: [
        'var(--text-metric-size)',
        { lineHeight: 'var(--text-metric-lh)', fontWeight: 'var(--text-metric-weight)' },
      ],
    },

    spacing: {
      /* Four values only — nothing else */
      '0':  '0px',
      '1':  'var(--space-1)',  /* 4px  */
      '2':  'var(--space-2)',  /* 8px  */
      '3':  'var(--space-3)', /* 16px */
      '4':  'var(--space-4)', /* 24px */
      /* Allow full/screen for layout needs */
      'full':   '100%',
      'screen': '100vw',
    },

    borderRadius: {
      sm: 'var(--radius-sm)',   /* 4px */
      md: 'var(--radius-md)',   /* 6px */
      none: '0',
      full: '9999px',
    },

    borderWidth: {
      DEFAULT: 'var(--border-width)', /* 1px hairline */
      '0': '0px',
    },

    extend: {
      /* No raw values here — only semantic aliases */
    },
  },
  plugins: [],
};
