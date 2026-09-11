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
  BookOpen,
  Award,
  Globe2,
  Brain,
  Sparkles,
  Zap,
} from 'lucide-react';

import './SidebarNav.css';

export default function SidebarNav({ estate, onEstateChange, alertsCount = 0 }) {
  const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sites', label: 'Site Registry & Map', icon: MapPin },
    { to: '/programme', label: 'Programme Planner', icon: TrendingUp },
    { to: '/alerts', label: 'Cold Snap Alerts', icon: AlertTriangle, badge: alertsCount },
    { to: '/cpwd', label: 'Thermal AI Assistant', icon: Brain },
    { to: '/library', label: 'Design Library', icon: Layers },

    { to: '/forecast', label: 'Sortie Logistics', icon: Plane },
    { to: '/materials', label: 'Materials Catalog', icon: Boxes },
    { to: '/method', label: 'Method & Physics', icon: BookOpen },
    { to: '/validation', label: 'Empirical Checks', icon: Award },
    { to: '/verify', label: 'Interactive Verify', icon: Award },
  ];


  return (
    <aside className="platform-sidebar" aria-label="Platform Sidebar">
      {/* 1. Brand Header */}
      <div className="sidebar-brand-wrapper">
        <NavLink to="/" className="sidebar-logo">
          <div className="logo-icon-box">
            <Sparkles size={16} />
          </div>
          <div className="logo-text-group">
            <span className="logo-main">THERMA</span>
            <span className="logo-badge">DRDO · SIH</span>
          </div>
        </NavLink>
      </div>

      {/* 2. User Profile Card (from Inspo UI) */}
      <div className="sidebar-user-card">
        <div className="user-avatar-wrap">
          <div className="user-avatar-img">VS</div>
          <span className="user-online-dot" />
        </div>
        <div className="user-details">
          <span className="user-name">Col. V. Sharma</span>
          <span className="user-role">Directorate of High Altitude</span>
        </div>
      </div>

      {/* 3. Estate Selector Toggle */}
      <div className="sidebar-estate-selector">
        <div className="estate-selector-label">
          <Globe2 size={12} />
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

      {/* 4. Navigation Links */}
      <nav className="sidebar-nav-links">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <div className="sidebar-link-icon-wrap">
                <Icon size={17} />
              </div>
              <span className="sidebar-link-text">{item.label}</span>
              {Boolean(item.badge) && item.badge > 0 && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 5. Bottom Dark Status Card (Inspo UI Card) */}
      <div className="sidebar-bottom-section">
        <div className="sidebar-dark-promo-card">
          <div className="promo-card-header">
            <div className="promo-icon-badge">
              <Zap size={14} />
            </div>
            <span className="promo-badge-text">GATE A ENGINE</span>
          </div>
          <p className="promo-card-desc">
            ISO 52016-1 real-time solver active with diurnal sol-air radiation.
          </p>
          <NavLink to="/sites/site_siachen_base/design" className="promo-card-btn">
            <span>Shelter Studio</span>
            <span className="promo-arrow">→</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
}

