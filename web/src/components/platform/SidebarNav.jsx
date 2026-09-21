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
  Sparkles,
  ArrowUpRight,
  Shield,
  Brain,
  PanelLeftClose,
} from 'lucide-react';
import './SidebarNav.css';

export default function SidebarNav({
  estate,
  onEstateChange,
  alertsCount = 0,
  isOpen = true,
  onToggleSidebar,
}) {
  const NAV_GROUPS = [
    {
      title: 'PLATFORM',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/sites', label: 'Site Registry & Map', icon: MapPin },
        { to: '/programme', label: 'Programme Planner', icon: TrendingUp },
        { to: '/alerts', label: 'Cold Snap Alerts', icon: AlertTriangle, badge: alertsCount },
        { to: '/cpwd', label: 'Thermal AI Assistant', icon: Brain },
      ],
    },
    {
      title: 'LOGISTICS & DESIGN',
      items: [
        { to: '/library', label: 'Standard Drawings', icon: Layers },
        { to: '/forecast', label: 'Sortie Logistics', icon: Plane },
        { to: '/materials', label: 'Materials Catalog', icon: Boxes },
      ],
    },
    {
      title: 'PHYSICS & COMPLIANCE',
      items: [
        { to: '/method', label: 'Method & Standards', icon: BookOpen },
        { to: '/validation', label: 'Empirical Verification', icon: Award },
        { to: '/verify', label: 'Interactive Harness', icon: Sparkles },
      ],
    },
  ];

  return (
    <aside
      className={`platform-sidebar ${isOpen ? 'expanded' : 'collapsed'}`}
      aria-label="Platform Sidebar"
    >
      {/* 1. Sleek Brand Header with Collapse Button */}
      <div className="sidebar-top-bar">
        <div className="sidebar-top-row">
          <NavLink to="/" className="sidebar-brand-link">
            <div className="brand-shield-box">
              <img 
                src="/thermometer_sticker.png" 
                alt="THERMA Logo" 
                className="sidebar-thermometer-img" 
              />
            </div>
            <div className="brand-titles">
              <span className="brand-name">THERMA</span>
              <span className="brand-org">DRDO · SIH 26051</span>
            </div>
          </NavLink>

          {onToggleSidebar && (
            <button
              type="button"
              className="sidebar-collapse-trigger-btn"
              onClick={onToggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Spacious Clean Navigation Groups */}
      <nav className="sidebar-scrollable-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-section-group">
            <span className="nav-section-title">{group.title}</span>
            <div className="nav-items-list">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `clean-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={16} className="nav-link-icon" />
                    <span className="nav-link-label">{item.label}</span>
                    {Boolean(item.badge) && item.badge > 0 && (
                      <span className="nav-link-badge">{item.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 3. Refined Bottom Footer: Prominently Highlighted Studio Link + User Profile */}
      <div className="sidebar-bottom-footer">
        <NavLink
          to="/sites/site_siachen_base/design"
          className="sidebar-studio-cta highlighted"
          title="Launch 3D Architectural Shelter Studio"
        >
          <div className="studio-cta-left">
            <div className="studio-cta-icon-badge">
              <Sparkles size={14} />
            </div>
            <div className="studio-cta-titles">
              <span className="studio-cta-badge-tag">3D STUDIO</span>
              <span className="studio-cta-name">Open Shelter Studio</span>
            </div>
          </div>
          <ArrowUpRight size={15} className="studio-cta-arrow" />
        </NavLink>

        <div className="sidebar-profile-row">
          <div className="user-mini-avatar">VS</div>
          <div className="user-mini-info">
            <span className="user-mini-name">Col. V. Sharma</span>
            <span className="user-mini-role">Directorate High Altitude</span>
          </div>
          <span className="user-status-dot" title="Connected" />
        </div>
      </div>
    </aside>
  );
}
