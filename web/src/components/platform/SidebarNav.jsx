import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Layers,
  Plane,
  Boxes,
  FileText,
  BookOpen,
  Award,
  Globe2,
  Calculator,
  Brain,
} from 'lucide-react';
import './SidebarNav.css';

export default function SidebarNav({ estate, onEstateChange, alertsCount = 0 }) {
  const NAV_ITEMS = [
    { to: '/dashboard', label: 'Estate Dashboard', icon: LayoutDashboard },
    { to: '/sites', label: 'Site Registry & Map', icon: MapPin },
    { to: '/programme', label: 'Programme Planner', icon: TrendingUp },
    { to: '/alerts', label: 'Cold Snap Alerts', icon: AlertTriangle, badge: alertsCount },
    { to: '/cpwd', label: 'Thermal AI Assistant', icon: Brain },
    { to: '/library', label: 'Design Library', icon: Layers },

    { to: '/forecast', label: 'Sortie Logistics', icon: Plane },
    { to: '/materials', label: 'Materials Catalog', icon: Boxes },
    { to: '/method', label: 'Method & Physics', icon: BookOpen },
    { to: '/validation', label: 'Empirical Checks', icon: Award },
  ];


  return (
    <aside className="platform-sidebar" aria-label="Platform Sidebar">
      {/* Brand & Identity */}
      <div className="sidebar-brand">
        <NavLink to="/" className="sidebar-logo">
          <span className="logo-main">THERMA</span>
          <span className="logo-sub">DRDO · PS 26051</span>
        </NavLink>
        <span className="sidebar-tag">ASSET MANAGEMENT</span>
      </div>

      {/* Estate Selector per Correction 2 */}
      <div className="sidebar-estate-selector">
        <div className="estate-selector-label">
          <Globe2 size={13} />
          <span>ESTATE SCOPE</span>
        </div>
        <div className="estate-toggle-group">
          <button
            type="button"
            className={`estate-btn ${estate === 'Ladakh' ? 'active' : ''}`}
            onClick={() => onEstateChange('Ladakh')}
          >
            Ladakh (11)
          </button>
          <button
            type="button"
            className={`estate-btn ${estate === 'Nepal Relief' ? 'active' : ''}`}
            onClick={() => onEstateChange('Nepal Relief')}
          >
            Nepal (1)
          </button>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav-links">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} className="sidebar-link-icon" />
              <span className="sidebar-link-text">{item.label}</span>
              {Boolean(item.badge) && item.badge > 0 && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Designer Studio Handoff Button (Swapnil's boundary) */}
      <div className="sidebar-bottom">
        <NavLink to="/sites/site_siachen_base/design" className="sidebar-designer-cta">
          <span>Open Shelter Studio</span>
          <span className="cta-arrow">→</span>
        </NavLink>
        <div className="sidebar-version">v1.0 · Gate A Verified Engine</div>
      </div>
    </aside>
  );
}
