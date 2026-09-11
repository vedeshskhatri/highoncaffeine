import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import FloatingChatOrb from './FloatingChatOrb';
import './PlatformLayout.css';

const PAGE_TITLES = {
  '/dashboard': 'Estate Dashboard',
  '/sites': 'Site Registry & Map',
  '/programme': 'Retrofit Programme Planner',
  '/alerts': 'Cold Snap Operational Alerts',
  '/library': 'Standard Drawings Library',
  '/forecast': 'Seasonal Sortie & Fuel Forecast',
  '/materials': 'Materials & Regional Supply Realities',
  '/method': 'Methodology & Standards Specification',
  '/validation': 'Empirical Model Benchmark & Verification',
  '/cpwd': 'THERMA Thermal AI & High-Altitude Knowledge Engine',
  '/verify': 'Interactive Verification & Empirical Benchmarks',
};


export default function PlatformLayout() {
  const location = useLocation();
  const [estate, setEstate] = useState('Ladakh');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch active alerts count for badge
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/alerts?estate=${encodeURIComponent(estate)}`)
      .then(r => r.json())
      .then(data => setAlertsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, [estate]);

  // Determine active title and dynamic breadcrumbs
  let activeTitle = PAGE_TITLES[location.pathname] || 'Platform';
  let breadcrumbs = [];

  if (location.pathname.startsWith('/sites/') && location.pathname !== '/sites') {
    activeTitle = 'Site Hub & Diagnostics';
    const siteId = location.pathname.replace('/sites/', '');
    breadcrumbs = [
      { label: 'Site Registry', to: '/sites' },
      { label: siteId.replace('site_', '').replace(/_/g, ' ').toUpperCase() },
    ];
  } else if (location.pathname.startsWith('/reports/')) {
    activeTitle = 'Official Submission Pack';
    const siteId = location.pathname.replace('/reports/', '');
    breadcrumbs = [
      { label: 'Site Registry', to: '/sites' },
      { label: siteId.replace('site_', '').replace(/_/g, ' ').toUpperCase(), to: `/sites/${siteId}` },
      { label: 'Submission Pack' },
    ];
  } else if (location.pathname === '/reports') {
    activeTitle = 'Official Submission Pack';
    breadcrumbs = [
      { label: 'Site Registry', to: '/sites' },
      { label: 'Select Site' },
    ];
  } else if (location.pathname === '/verify') {
    activeTitle = 'Interactive Verification & Empirical Benchmarks';
    breadcrumbs = [
      { label: 'Empirical Checks', to: '/validation' },
      { label: 'Interactive Harness' },
    ];
  }

  return (
    <div className="platform-layout-container">
      <SidebarNav
        estate={estate}
        onEstateChange={setEstate}
        alertsCount={alertsCount}
      />

      <div className="platform-main-viewport">
        <TopBar
          onOpenCmd={() => setCmdOpen(true)}
          estate={estate}
          activeTitle={activeTitle}
          breadcrumbs={breadcrumbs}
        />

        <main className="platform-page-content">
          <Outlet context={{ estate, setEstate }} />
        </main>
      </div>

      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
      />

      <FloatingChatOrb />
    </div>
  );
}
