import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Command,
  ChevronRight,
  ArrowLeft,
  Bell,
  SlidersHorizontal,
  HelpCircle,
} from 'lucide-react';
import './TopBar.css';

export default function TopBar({ onOpenCmd, estate, activeTitle, breadcrumbs = [] }) {
  const navigate = useNavigate();

  return (
    <header className="platform-topbar">
      {/* Left: Breadcrumbs & Dynamic Scope */}
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

        <span className="topbar-estate-pill">{estate} Scope</span>

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

      {/* Center: Search Command Bar */}
      <div className="topbar-center">
        <button type="button" className="topbar-cmd-btn" onClick={onOpenCmd}>
          <Search size={14} className="cmd-search-icon" />
          <span className="cmd-search-placeholder">Search posts, thermal telemetry, drawings...</span>
          <kbd className="cmd-badge">
            <Command size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> K
          </kbd>
        </button>
      </div>

      {/* Right: Notification Actions & Engine Status */}
      <div className="topbar-right">
        <div className="topbar-icon-actions">
          <button
            type="button"
            className="topbar-circle-action"
            onClick={() => navigate('/alerts')}
            title="Cold Snap Alerts & Warnings"
          >
            <Bell size={16} />
            <span className="notification-dot" />
          </button>

          <button
            type="button"
            className="topbar-circle-action"
            onClick={() => navigate('/programme')}
            title="Sortie & Retrofit Filters"
          >
            <SlidersHorizontal size={16} />
          </button>

          <button
            type="button"
            className="topbar-circle-action"
            onClick={() => navigate('/method')}
            title="Methodology & Help"
          >
            <HelpCircle size={16} />
          </button>
        </div>

        <div className="engine-status-pill" title="All figures computed from real ISO 52016-1 physics engine">
          <span className="status-dot-live" />
          <span className="status-label">Gate A Active</span>
        </div>
      </div>
    </header>
  );
}

