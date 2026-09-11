import React from 'react';
import './Header.css';

export default function Header({ onOpenMethod, onScrollToBuilder, onScrollToValidation }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="/" className="logo-group">
          <span className="logo-mark">THERMA</span>
          <span className="logo-badge">DRDO · SIH 2026</span>
        </a>

        <nav className="header-nav">
          <button type="button" className="nav-link" onClick={onScrollToValidation}>
            Validation
          </button>
          <button type="button" className="nav-link" onClick={onOpenMethod}>
            Method & Standards
          </button>
          <a href="/?view=tokens" className="nav-link nav-tokens">
            Tokens
          </a>
          <button type="button" className="header-cta" onClick={onScrollToBuilder}>
            Try Shelter Builder
          </button>
        </nav>
      </div>
    </header>
  );
}
