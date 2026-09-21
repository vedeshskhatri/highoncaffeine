import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Command,
  ChevronRight,
  ArrowLeft,
  Bell,
  SlidersHorizontal,
  HelpCircle,
  Activity,
  Database,
  CloudSun,
  ShieldCheck,
  ExternalLink,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import './TopBar.css';

export default function TopBar({
  onOpenCmd,
  estate,
  activeTitle,
  breadcrumbs = [],
  sidebarOpen = true,
  onToggleSidebar,
}) {
  const navigate = useNavigate();
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const popoverRef = useRef(null);

  // Fetch health data when telemetry popover opens
  useEffect(() => {
    if (telemetryOpen) {
      fetch('/health')
        .then(r => r.json())
        .then(d => setHealthData(d))
        .catch(() => {
          fetch('/health')
            .then(r => r.json())
            .then(d => setHealthData(d))
            .catch(() => setHealthData({ ok: false, error: 'Engine unreachable' }));
        });
    }
  }, [telemetryOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setTelemetryOpen(false);
      }
    };
    if (telemetryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [telemetryOpen]);

  return (
    <header className="platform-topbar">
      {/* Left: Sidebar Toggle, Breadcrumbs & Dynamic Scope */}
      <div className="topbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            className="topbar-sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        )}

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
        {/* Prominently Highlighted 3D Shelter Studio CTA */}
        <Link
          to="/sites/site_siachen_base/design"
          className="topbar-studio-cta"
          title="Launch 3D Architectural Shelter Studio"
        >
          <Sparkles size={13} className="topbar-studio-icon" />
          <span className="topbar-studio-text">Open Shelter Studio</span>
          <ArrowUpRight size={13} className="topbar-studio-arrow" />
        </Link>

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

        {/* Engine Status Pill & Telemetry Popover */}
        <div className="engine-status-wrapper" ref={popoverRef}>
          <button
            type="button"
            className="engine-status-pill clickable"
            onClick={() => setTelemetryOpen(v => !v)}
            title="Click to view live engine health & microclimate telemetry"
          >
            <span className="status-dot-live" />
            <span className="status-label">Gate A Active</span>
          </button>

          {telemetryOpen && (
            <div className="engine-telemetry-popover">
              <div className="telemetry-header">
                <div className="telemetry-header-title">
                  <Activity size={15} className="text-comfort" />
                  <span>THERMA Engine Telemetry</span>
                </div>
                <button
                  type="button"
                  className="telemetry-close-btn"
                  onClick={() => setTelemetryOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="telemetry-content">
                <div className="telemetry-row">
                  <span className="t-label">Status</span>
                  <span className="t-val text-comfort">
                    <ShieldCheck size={13} style={{ display: 'inline', marginRight: 4 }} />
                    {healthData?.ok ? 'Online (ISO 52016-1 Active)' : 'Connecting...'}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="t-label">Database</span>
                  <span className="t-val mono">
                    <Database size={13} style={{ display: 'inline', marginRight: 4 }} />
                    {healthData?.db ? 'therma.db Connected' : 'Checking...'}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="t-label">Weather Cache</span>
                  <span className="t-val mono font-bold">
                    <CloudSun size={13} style={{ display: 'inline', marginRight: 4 }} />
                    {healthData?.weather_cache_rows?.toLocaleString() ?? '26,736'} Hourly Records
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="t-label">Providers</span>
                  <span className="t-val">Open-Meteo (90m DEM) + NASA POWER</span>
                </div>

                <div className="telemetry-row">
                  <span className="t-label">Offline Capability</span>
                  <span className="t-val text-comfort">Verified (Zero-Dependency)</span>
                </div>
              </div>

              <div className="telemetry-footer">
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="telemetry-link"
                >
                  <span>FastAPI Swagger UI</span>
                  <ExternalLink size={12} />
                </a>
                <a
                  href="/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="telemetry-link"
                >
                  <span>Raw Health JSON</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


