import React from 'react';
import { Search, ShieldAlert, Sparkles, Command } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ onOpenCmd, estate, activeTitle }) {
  return (
    <header className="platform-topbar">
      <div className="topbar-left">
        <span className="topbar-estate-pill">{estate} Estate</span>
        <span className="topbar-sep">/</span>
        <h1 className="topbar-page-title">{activeTitle}</h1>
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
