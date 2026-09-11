import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Layers, AlertTriangle, Building2, ChevronRight, Filter } from 'lucide-react';
import './CommandPalette.css';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [sites, setSites] = useState([]);
  const [designs, setDesigns] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    fetch('http://127.0.0.1:8000/sites')
      .then(r => r.json())
      .then(data => setSites(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch('http://127.0.0.1:8000/designs')
      .then(r => r.json())
      .then(data => setDesigns(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSites = sites.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.district.toLowerCase().includes(query.toLowerCase()) ||
    s.site_type.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDesigns = designs.filter(d =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    d.author.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-search-input-wrapper">
          <Search size={18} className="cmd-search-icon" />
          <input
            type="text"
            className="cmd-search-input"
            placeholder="Search posts, sites, library drawings, districts... (Cmd+K)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="cmd-esc-badge" onClick={onClose}>ESC</kbd>
        </div>

        <div className="cmd-results-list">
          {/* Platform Quick Links */}
          <div className="cmd-section-header">PLATFORM NAVIGATION</div>
          <div className="cmd-item" onClick={() => handleSelect('/dashboard')}>
            <Building2 size={16} className="cmd-item-icon" />
            <span>Estate Dashboard</span>
            <span className="cmd-item-meta">Macro Overview</span>
          </div>
          <div className="cmd-item" onClick={() => handleSelect('/sites')}>
            <MapPin size={16} className="cmd-item-icon" />
            <span>Site Registry & Map</span>
            <span className="cmd-item-meta">All Posts</span>
          </div>
          <div className="cmd-item" onClick={() => handleSelect('/programme')}>
            <Filter size={16} className="cmd-item-icon" />
            <span>Programme Planner</span>
            <span className="cmd-item-meta">Procurement & Retrofit</span>
          </div>
          <div className="cmd-item" onClick={() => handleSelect('/alerts')}>
            <AlertTriangle size={16} className="cmd-item-icon" />
            <span>Cold Snap Alerts</span>
            <span className="cmd-item-meta">Operational Warnings</span>
          </div>

          {/* Sites Section */}
          {filteredSites.length > 0 && (
            <>
              <div className="cmd-section-header">REGISTERED SITES ({filteredSites.length})</div>
              {filteredSites.slice(0, 5).map(s => (
                <div key={s.id} className="cmd-item" onClick={() => handleSelect(`/sites/${s.id}`)}>
                  <MapPin size={16} className="cmd-item-icon" />
                  <div className="cmd-item-main">
                    <span className="cmd-item-title">{s.name}</span>
                    <span className="cmd-item-subtitle">{s.district} · {s.altitude_m}m · {s.site_type}</span>
                  </div>
                  <ChevronRight size={14} className="cmd-item-chevron" />
                </div>
              ))}
            </>
          )}

          {/* Designs Section */}
          {filteredDesigns.length > 0 && (
            <>
              <div className="cmd-section-header">LIBRARY DRAWINGS ({filteredDesigns.length})</div>
              {filteredDesigns.slice(0, 4).map(d => (
                <div key={d.id} className="cmd-item" onClick={() => handleSelect('/library')}>
                  <Layers size={16} className="cmd-item-icon" />
                  <div className="cmd-item-main">
                    <span className="cmd-item-title">{d.name} (Rev {d.revision})</span>
                    <span className="cmd-item-subtitle">{d.author} · {d.status}</span>
                  </div>
                  <ChevronRight size={14} className="cmd-item-chevron" />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
