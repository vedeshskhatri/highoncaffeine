import './index.css';
import TokensPage from './TokensPage';

/*
 * App.jsx — Phase S0
 * No product components yet. Only the /tokens route.
 * Phase S1 will add the full shell with StepRail and canvases.
 */
export default function App() {
  const path = window.location.pathname;

  if (path === '/tokens') {
    return <TokensPage />;
  }

  return (
    <div style={{
      background: 'var(--bg-base)',
      color: 'var(--text-secondary)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-display-size)',
        fontWeight: 'var(--text-display-weight)',
        letterSpacing: 'var(--text-display-spacing)',
        color: 'var(--text-primary)',
      }}>
        THERMA
      </div>
      <div style={{ fontSize: 'var(--text-body-size)' }}>
        Phase S0 complete — shell coming in S1
      </div>
      <a
        href="/tokens"
        style={{
          color: 'var(--accent)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-label-size)',
          textDecoration: 'none',
          border: '1px solid var(--accent)',
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        → /tokens specimen sheet
      </a>
    </div>
  );
}
