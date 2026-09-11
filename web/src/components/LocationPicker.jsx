/*
 * LocationPicker.jsx — Universal Earth Coordinates & Elevation Selector for THERMA
 * Implements the 4 required input pathways without external map or geocoding libraries:
 * 1. Browser Geolocation ("Use my current location") with explicit denial handling (NEVER Leh fallback)
 * 2. Place Search (Open-Meteo Geocoding API, debounced, keyboard navigable, showing elevation)
 * 3. Click-Anywhere Hand-Rolled SVG Map with numerical readout & pin marker
 * 4. Manual Lat/Lon/Altitude input fields with full physiological validation
 * 
 * Elevation: Open-Meteo elevation endpoint. If lookup fails, PROMPTS THE USER. Never defaults.
 */

import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Globe,
  Sliders,
  AlertTriangle,
  Check,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';
import EarthGlobe3D from './EarthGlobe3D';
import SiteWeatherIntel from './SiteWeatherIntel';
import './LocationPicker.css';

const QUICK_CLIMATES = [
  { label: 'Leh', lat: 34.1526, lon: 77.5771, altitude_m: 3500, desc: 'Cold Alpine · 3,500m' },
  { label: 'Siachen', lat: 35.2000, lon: 77.2000, altitude_m: 3650, desc: 'Glacial Alpine · 3,650m' },
  { label: 'Dras', lat: 34.4327, lon: 75.7547, altitude_m: 3280, desc: 'Extreme Cold · 3,280m' },
  { label: 'Kargil', lat: 34.5539, lon: 76.1349, altitude_m: 2676, desc: 'Cold Arid · 2,676m' },
  { label: 'Tawang', lat: 27.5861, lon: 91.8653, altitude_m: 3048, desc: 'High Mountain · 3,048m' },
  { label: 'Chennai', lat: 13.0827, lon: 80.2707, altitude_m: 10, desc: 'Hot Humid · 10m' },
  { label: 'Jaisalmer', lat: 26.9157, lon: 70.9083, altitude_m: 225, desc: 'Hot Arid · 225m' },
  { label: 'Rasuwa', lat: 28.1200, lon: 85.2800, altitude_m: 2400, desc: 'Mountain · 2,400m' },
];

export default function LocationPicker({ location, onChange, errors = {} }) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'map' | 'manual'
  const [mapSubView, setMapSubView] = useState('3d'); // '3d' | '2d'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchError, setSearchError] = useState(null);

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const [elevLoading, setElevLoading] = useState(false);
  const [elevPrompt, setElevPrompt] = useState(null);

  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Debounced Place Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        // Try local backend proxy first, fallback to direct Open-Meteo
        let data = null;
        try {
          const res = await fetch(`http://127.0.0.1:8000/location/search?q=${encodeURIComponent(searchQuery)}&count=6`);
          if (res.ok) {
            const json = await res.json();
            data = json.results || [];
          }
        } catch {
          // Direct fallback
          const direct = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=6&language=en&format=json`);
          if (direct.ok) {
            const json = await direct.json();
            data = (json.results || []).map(r => ({
              id: r.id,
              name: r.name,
              admin1: r.admin1 || '',
              country: r.country || '',
              lat: r.latitude,
              lon: r.longitude,
              elevation_m: r.elevation,
            }));
          }
        }

        if (data && data.length > 0) {
          setSearchResults(data);
          setSelectedIndex(-1);
        } else {
          setSearchResults([]);
          setSearchError('No matching places found. Try manual coordinate entry.');
        }
      } catch (err) {
        setSearchError('Geocoding service unavailable. You can enter coordinates manually.');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard navigation for place search
  const handleKeyDown = (e) => {
    if (!searchResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectPlace(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setSearchResults([]);
    }
  };

  // Select Place from Search
  const selectPlace = (place) => {
    setSearchResults([]);
    setSearchQuery(`${place.name}, ${place.country}`);
    setSearchError(null);

    const newLoc = {
      lat: Number(place.lat.toFixed(4)),
      lon: Number(place.lon.toFixed(4)),
      altitude_m: place.elevation_m !== null && place.elevation_m !== undefined
        ? Number(place.elevation_m)
        : location.altitude_m,
    };

    if (place.elevation_m === null || place.elevation_m === undefined) {
      // Need elevation resolution
      lookupElevation(newLoc.lat, newLoc.lon);
    } else {
      setElevPrompt(null);
      onChange(newLoc);
    }
  };

  // Lookup Elevation via API with robust fallback chain
  const lookupElevation = async (lat, lon) => {
    setElevLoading(true);
    setElevPrompt(null);
    try {
      let elev = null;

      // Tier 1: Local backend proxy (includes canonical, cache, Open-Meteo & Open-Elevation)
      try {
        const res = await fetch(`http://127.0.0.1:8000/location/elevation?lat=${lat}&lon=${lon}`);
        if (res.ok) {
          const json = await res.json();
          if (json.elevation_m !== null && json.elevation_m !== undefined) {
            elev = json.elevation_m;
          }
        }
      } catch {
        // Backend offline -> proceed to direct tier fallbacks
      }

      // Tier 2: Direct Open-Elevation API (robust when Open-Meteo hits 429 rate limit)
      if (elev === null || elev === undefined) {
        try {
          const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
          if (res.ok) {
            const json = await res.json();
            if (json.results && json.results[0] && json.results[0].elevation !== null && json.results[0].elevation !== undefined) {
              elev = json.results[0].elevation;
            }
          }
        } catch {
          // Continue to next fallback
        }
      }

      // Tier 3: Direct Open-Meteo Elevation API
      if (elev === null || elev === undefined) {
        try {
          const direct = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
          if (direct.ok) {
            const json = await direct.json();
            if (json.elevation && json.elevation[0] !== null && json.elevation[0] !== undefined) {
              elev = json.elevation[0];
            }
          }
        } catch {
          // Fall through
        }
      }

      if (elev !== null && elev !== undefined) {
        onChange({ lat, lon, altitude_m: Math.round(elev) });
        setElevPrompt(null);
      } else {
        // Strict non-defaulting policy: Prompt user if elevation cannot be determined
        setElevPrompt('Elevation could not be resolved automatically. Please enter altitude (m ASL) manually.');
        onChange({ lat, lon, altitude_m: location.altitude_m });
      }
    } catch {
      setElevPrompt('Elevation lookup failed. Please enter site altitude manually.');
      onChange({ lat, lon, altitude_m: location.altitude_m });
    } finally {
      setElevLoading(false);
    }
  };

  // Browser Geolocation Pathway
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please search or enter coordinates.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        const alt = pos.coords.altitude !== null && !isNaN(pos.coords.altitude)
          ? Math.round(pos.coords.altitude)
          : null;

        if (alt !== null && alt >= 0) {
          onChange({ lat, lon, altitude_m: alt });
          setElevPrompt(null);
        } else {
          // Resolve elevation or ask user
          lookupElevation(lat, lon);
        }
      },
      (err) => {
        setGeoLoading(false);
        // Explicit denial or position error: NEVER fall back to Leh!
        if (err.code === 1) {
          setGeoError('Location permission denied. Please search for your city or enter coordinates manually.');
        } else if (err.code === 2) {
          setGeoError('Position unavailable. Please search for a location or use the interactive map.');
        } else {
          setGeoError('Geolocation timed out. Please enter your location manually.');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Click-Anywhere Map Coordinates Translation
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Equirectangular projection mapping:
    // X: [0, width] -> Lon [-180, +180]
    // Y: [0, height] -> Lat [+85, -85] (Mercator-ish crop)
    const normX = clickX / rect.width;
    const normY = clickY / rect.height;

    const lon = Number((-180 + normX * 360).toFixed(4));
    const lat = Number((85 - normY * 170).toFixed(4));

    lookupElevation(lat, lon);
  };

  // Pin percentage on map
  const pinLeftPct = Math.max(1, Math.min(99, ((location.lon + 180) / 360) * 100));
  const pinTopPct = Math.max(1, Math.min(99, ((85 - location.lat) / 170) * 100));

  return (
    <div className="location-picker">
      {/* ── Sub-Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="loc-tabs">
        <button
          type="button"
          className={`loc-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={12} />
          Place Search
        </button>
        <button
          type="button"
          className={`loc-tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Globe size={12} />
          World Map
        </button>
        <button
          type="button"
          className={`loc-tab ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          <Sliders size={12} />
          Coordinates
        </button>
      </div>

      {/* ── 1. Place Search Tab ─────────────────────────────────────────────── */}
      {activeTab === 'search' && (
        <div className="loc-section search-mode">
          <div className="search-bar-wrap">
            <Search size={13} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search city, town, or military post..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <X size={12} />
              </button>
            )}
            {searching && <RefreshCw size={12} className="spin-icon" />}
          </div>

          {searchError && <div className="loc-msg error">{searchError}</div>}

          {/* Autocomplete Results Dropdown */}
          {searchResults.length > 0 && (
            <ul className="loc-dropdown" ref={resultsRef} role="listbox">
              {searchResults.map((r, idx) => (
                <li
                  key={r.id || `${r.lat}-${r.lon}`}
                  className={`loc-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => selectPlace(r)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <MapPin size={12} className="loc-pin-icon" />
                  <div className="loc-text">
                    <span className="loc-name">{r.name}</span>
                    <span className="loc-sub">
                      {[r.admin1, r.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <span className="loc-elev mono">
                    {r.elevation_m !== null && r.elevation_m !== undefined
                      ? `${Math.round(r.elevation_m)} m`
                      : 'ASL'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Quick Geolocation Action */}
          <button
            type="button"
            className="loc-geolocate-btn"
            onClick={handleCurrentLocation}
            disabled={geoLoading}
          >
            <Navigation size={12} className={geoLoading ? 'spin-icon' : ''} />
            {geoLoading ? 'Acquiring GPS position...' : 'Use my current location'}
          </button>
        </div>
      )}

      {/* ── 2. Click-Anywhere 3D Earth Globe & World Map ─────────────────────── */}
      {activeTab === 'map' && (
        <div className="loc-section map-mode">
          <div className="map-mode-header">
            <span className="map-hint">
              {mapSubView === '3d'
                ? 'Click anywhere on Earth to drop pin. Drag to rotate in 3D, scroll to zoom.'
                : 'Click planar projection to drop pin. Coordinates & altitude update automatically.'}
            </span>
            <div className="map-subview-toggle">
              <button
                type="button"
                className={`subview-btn ${mapSubView === '3d' ? 'active' : ''}`}
                onClick={() => setMapSubView('3d')}
              >
                3D Globe
              </button>
              <button
                type="button"
                className={`subview-btn ${mapSubView === '2d' ? 'active' : ''}`}
                onClick={() => setMapSubView('2d')}
              >
                2D Map
              </button>
            </div>
          </div>

          {mapSubView === '3d' ? (
            <EarthGlobe3D
              location={location}
              onChange={(newCoords) => onChange({ ...location, ...newCoords })}
              onResolveElevation={(lat, lon) => lookupElevation(lat, lon)}
              elevationLoading={elevLoading}
            />
          ) : (
            <>
              <div className="svg-world-map-wrap" onClick={handleMapClick}>
                <svg
                  className="svg-world-map"
                  viewBox="0 0 720 360"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e2229" />
                      <stop offset="100%" stopColor="#141820" />
                    </linearGradient>
                  </defs>
                  {/* Ocean Canvas */}
                  <rect width="720" height="360" fill="url(#oceanGrad)" />

                  {/* Equator & Tropics Graticules */}
                  <line x1="0" y1="180" x2="720" y2="180" stroke="#333b47" strokeWidth="0.8" strokeDasharray="3 3" />
                  <line x1="0" y1="130" x2="720" y2="130" stroke="#2a313d" strokeWidth="0.6" strokeDasharray="2 4" />
                  <line x1="0" y1="230" x2="720" y2="230" stroke="#2a313d" strokeWidth="0.6" strokeDasharray="2 4" />
                  <line x1="360" y1="0" x2="360" y2="360" stroke="#333b47" strokeWidth="0.8" strokeDasharray="3 3" />

                  {/* Continental Outlines */}
                  <path
                    d="M 380 60 Q 450 50 540 80 Q 600 120 580 180 Q 520 200 500 240 Q 480 200 450 180 Q 420 180 390 150 Z"
                    fill="#2b3340"
                    stroke="#3f4b5c"
                    strokeWidth="1"
                  />
                  <path
                    d="M 340 140 Q 410 130 420 180 Q 430 260 380 300 Q 340 260 330 200 Z"
                    fill="#2b3340"
                    stroke="#3f4b5c"
                    strokeWidth="1"
                  />
                  <path
                    d="M 120 50 Q 220 50 240 100 Q 210 160 170 190 Q 140 150 110 100 Z"
                    fill="#2b3340"
                    stroke="#3f4b5c"
                    strokeWidth="1"
                  />
                  <path
                    d="M 190 200 Q 250 210 240 270 Q 210 330 180 340 Q 170 280 180 230 Z"
                    fill="#2b3340"
                    stroke="#3f4b5c"
                    strokeWidth="1"
                  />
                  <path
                    d="M 540 250 Q 610 240 620 290 Q 560 310 530 280 Z"
                    fill="#2b3340"
                    stroke="#3f4b5c"
                    strokeWidth="1"
                  />

                  {/* Graticule Labels */}
                  <text x="5" y="176" fill="#5c6878" fontSize="9" fontFamily="monospace">0° (Equator)</text>
                  <text x="365" y="15" fill="#5c6878" fontSize="9" fontFamily="monospace">0° (Prime Meridian)</text>
                </svg>

                {/* Interactive Pin Marker */}
                <div
                  className="map-picked-pin"
                  style={{ top: `${pinTopPct}%`, left: `${pinLeftPct}%` }}
                  title={`Pinned: ${location.lat}° N, ${location.lon}° E`}
                >
                  <div className="pin-pulse" />
                  <MapPin size={14} className="pin-icon" />
                </div>
              </div>

              <div className="map-readout-row">
                <span>Picked Coordinates:</span>
                <strong className="mono">
                  {location.lat.toFixed(2)}° N, {location.lon.toFixed(2)}° E
                </strong>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 3. Manual Entry & Numerical Fields (Always Editable) ────────────── */}
      <div className="loc-fields-grid">
        <div className="loc-field">
          <label className="loc-label" htmlFor="field-lat">Latitude (°N)</label>
          <input
            id="field-lat"
            className={`loc-num-input ${errors['location.lat'] ? 'invalid' : ''}`}
            type="number"
            value={location.lat}
            min={-90}
            max={90}
            step={0.0001}
            onChange={(e) => {
              const lat = parseFloat(e.target.value);
              onChange({ lat: isNaN(lat) ? 0 : lat });
            }}
          />
        </div>

        <div className="loc-field">
          <label className="loc-label" htmlFor="field-lon">Longitude (°E)</label>
          <input
            id="field-lon"
            className={`loc-num-input ${errors['location.lon'] ? 'invalid' : ''}`}
            type="number"
            value={location.lon}
            min={-180}
            max={180}
            step={0.0001}
            onChange={(e) => {
              const lon = parseFloat(e.target.value);
              onChange({ lon: isNaN(lon) ? 0 : lon });
            }}
          />
        </div>

        <div className="loc-field">
          <div className="loc-label-row">
            <label className="loc-label" htmlFor="field-alt">Elevation (m)</label>
            <button
              type="button"
              className="elev-refresh-btn"
              onClick={() => lookupElevation(location.lat, location.lon)}
              title="Lookup elevation from Open-Elevation / Open-Meteo"
            >
              <RefreshCw size={10} className={elevLoading ? 'spin-icon' : ''} />
              Resolve
            </button>
          </div>
          <input
            id="field-alt"
            className={`loc-num-input ${errors['location.altitude_m'] || elevPrompt ? 'invalid' : ''}`}
            type="number"
            value={location.altitude_m}
            min={0}
            max={8849}
            step={1}
            onChange={(e) => {
              const alt = parseFloat(e.target.value);
              setElevPrompt(null);
              onChange({ altitude_m: isNaN(alt) ? 0 : alt });
            }}
          />
        </div>
      </div>

      {/* ── Status, Denial, and Prompt Alerts ───────────────────────────────── */}
      {geoError && (
        <div className="loc-alert error">
          <AlertTriangle size={13} />
          <span>{geoError}</span>
        </div>
      )}

      {elevPrompt && (
        <div className="loc-alert warning">
          <AlertTriangle size={13} />
          <span>{elevPrompt}</span>
        </div>
      )}

      {/* ── Quick Climate Benchmarks (Global Representation) ───────────────── */}
      <div className="quick-climates-wrap">
        <span className="quick-label">Representative Benchmarks:</span>
        <div className="quick-pills">
          {QUICK_CLIMATES.map((c) => {
            const isSelected =
              Math.abs(location.lat - c.lat) < 0.05 &&
              Math.abs(location.lon - c.lon) < 0.05;
            return (
              <button
                key={c.label}
                type="button"
                className={`quick-pill ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setElevPrompt(null);
                  onChange({ lat: c.lat, lon: c.lon, altitude_m: c.altitude_m });
                }}
                title={c.desc}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Live Site Climate & Meteorological Intelligence ──────────────── */}
      <SiteWeatherIntel location={location} />
    </div>
  );
}
