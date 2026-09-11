import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, Sparkles, Command, ChevronRight, ArrowLeft } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ onOpenCmd, estate, activeTitle, breadcrumbs = [] }) {
  const navigate = useNavigate();

  return (
    <header className="platform-topbar">
      <div className="topbar-left">
        {breadcrumbs.length > 0 && (
          <button
            type="button"
            className="topbar-back-btn"
            onClick={() => navigate(-1)}
            title="Go back to previous page"
            aria-label="Go back"
          >
            <ArrowLeft size={14} />
          </button>
        )}

        <span className="topbar-estate-pill">{estate} Estate</span>

        {breadcrumbs.length > 0 ? (
          <nav className="topbar-breadcrumbs" aria-label="Breadcrumbs">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={b.label + idx}>
                <span className="topbar-sep"><ChevronRight size={12} /></span>
                {b.to ? (
                  <Link to={b.to} className="breadcrumb-link">
                    {b.label}
                  </Link>
                ) : (
                  <span className="breadcrumb-current">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <>
            <span className="topbar-sep">/</span>
            <h1 className="topbar-page-title">{activeTitle}</h1>
          </>
        )}
      </div>

      <div className="topbar-center">
        <button type="button" className="topbar-cmd-btn" onClick={onOpenCmd}>
          <Search size={14} />
          <span>Search sites, drawings, districts...</span>
          <kbd className="cmd-badge">
            <Command size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> K
          </kbd>
        </button>
      </div>

      <div className="topbar-right">
        <div className="engine-status-pill" title="All figures generated from real ISO 52016-1 engine runs">
          <span className="status-dot-live" />
          <span className="status-label">Gate A Active</span>
        </div>
      </div>
    </header>
  );
}
