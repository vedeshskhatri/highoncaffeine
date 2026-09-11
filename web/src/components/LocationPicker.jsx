/*
 * LocationPicker.jsx — Universal Earth Coordinates & Meteorological Profile Selector
 * Supports all terrain & microclimates from extreme high-altitude alpine posts to plains, deserts & coasts.
 * Features:
 * 1. Fast Place Search (backend proxy / Open-Meteo geocoding with elevation & region)
 * 2. High-Resolution Tactical World Map (Leaflet with satellite, topo, dark, and street layers + draggable beacon)
 * 3. 3D Earth Globe option with planetary rotation & benchmark beacons
 * 4. Categorized Climate Benchmarks (Extreme Alpine, Mountain Valleys, Continental Plains, Hot Arid, Coastal)
 * 5. Reverse Geocoding with real-time site identification
 * 6. Live Meteorological Intelligence (SiteWeatherIntel with min/mean/max temp, solar radiation, wind, snow)
 * 7. Browser Geolocation & Manual Lat/Lon/Elevation editing with strict validation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Globe,
  Sliders,
  AlertTriangle,
  RefreshCw,
  X,
  Compass,
  Mountain,
} from 'lucide-react';
import TacticalWorldMap from './TacticalWorldMap';
import EarthGlobe3D from './EarthGlobe3D';
import SiteWeatherIntel from './SiteWeatherIntel';
import './LocationPicker.css';

const CLIMATE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'alpine', label: 'High Alpine' },
  { id: 'mountain', label: 'Mountain & Valley' },
  { id: 'plains', label: 'Plains & Plateau' },
  { id: 'desert', label: 'Hot Arid' },
  { id: 'coastal', label: 'Coastal' },
];

const COMPREHENSIVE_PRESETS = [
  // Extreme High Alpine / Glacial
  { label: 'Siachen Base Camp', cat: 'alpine', lat: 35.2000, lon: 77.2100, altitude_m: 3600, desc: 'Glacial Alpine · 3,600m · Severe Freeze' },
  { label: 'Leh', cat: 'alpine', lat: 34.1526, lon: 77.5771, altitude_m: 3500, desc: 'Cold Alpine · 3,500m · High Solar' },
  { label: 'Dras', cat: 'alpine', lat: 34.4327, lon: 75.7547, altitude_m: 3280, desc: 'Extreme Cold · 3,280m · -35°C Min' },
  { label: 'Nyoma', cat: 'alpine', lat: 33.2000, lon: 78.6500, altitude_m: 4180, desc: 'High Plateau · 4,180m · Sub-Zero' },
  { label: 'Khardung La', cat: 'alpine', lat: 34.2789, lon: 77.6044, altitude_m: 5359, desc: 'Ultra High Pass · 5,359m · Severe Hypoxia' },
  { label: 'Pangong Tso', cat: 'alpine', lat: 33.7500, lon: 78.6667, altitude_m: 4250, desc: 'Endorheic High Lake · 4,250m' },
  { label: 'Tawang', cat: 'alpine', lat: 27.5861, lon: 91.8653, altitude_m: 3048, desc: 'Eastern Himalaya · 3,048m · High Moisture' },
  { label: 'Baralacha La', cat: 'alpine', lat: 32.7500, lon: 77.4300, altitude_m: 4890, desc: 'Zanskar Pass · 4,890m · Deep Snow' },

  // Mountain & Hilly Valleys
  { label: 'Shimla', cat: 'mountain', lat: 31.1048, lon: 77.1734, altitude_m: 2276, desc: 'Himalayan Ridge · 2,276m · Temperate Cold' },
  { label: 'Manali', cat: 'mountain', lat: 32.2396, lon: 77.1887, altitude_m: 2050, desc: 'Kullu Valley · 2,050m · Alpine Slope' },
  { label: 'Srinagar', cat: 'mountain', lat: 34.0837, lon: 74.7973, altitude_m: 1585, desc: 'Kashmir Valley · 1,585m · Moderate Winter' },
  { label: 'Keylong', cat: 'mountain', lat: 32.5726, lon: 76.9950, altitude_m: 3094, desc: 'Lahaul Valley · 3,094m · Cold Arid' },
  { label: 'Auli High Camp', cat: 'mountain', lat: 30.5300, lon: 79.5700, altitude_m: 2800, desc: 'Garhwal Himalaya · 2,800m' },
  { label: 'Rasuwa', cat: 'mountain', lat: 28.1200, lon: 85.2800, altitude_m: 2400, desc: 'Nepal Relief Zone · 2,400m' },
  { label: 'Darjeeling', cat: 'mountain', lat: 27.0410, lon: 88.2663, altitude_m: 2042, desc: 'Lesser Himalaya · 2,042m · Humid Montane' },

  // Continental Plains & Plateau
  { label: 'New Delhi', cat: 'plains', lat: 28.6139, lon: 77.2090, altitude_m: 216, desc: 'Indo-Gangetic Plain · 216m · High Diurnal Swing' },
  { label: 'Chandigarh', cat: 'plains', lat: 30.7333, lon: 76.7794, altitude_m: 321, desc: 'Shivalik Foothills · 321m' },
  { label: 'Bengaluru', cat: 'plains', lat: 12.9716, lon: 77.5946, altitude_m: 920, desc: 'Deccan Plateau · 920m · Mild Temperate' },

  // Hot Arid / Desert
  { label: 'Jaisalmer', cat: 'desert', lat: 26.9157, lon: 70.9083, altitude_m: 225, desc: 'Thar Desert · 225m · Intense Diurnal Range' },
  { label: 'Bikaner', cat: 'desert', lat: 28.0167, lon: 73.3119, altitude_m: 224, desc: 'Arid Lowland · 224m · Low Humidity' },

  // Coastal / Humid
  { label: 'Mumbai', cat: 'coastal', lat: 19.0760, lon: 72.8777, altitude_m: 14, desc: 'West Coast · 14m · High Humidity Marine' },
  { label: 'Chennai', cat: 'coastal', lat: 13.0827, lon: 80.2707, altitude_m: 10, desc: 'Coromandel Coast · 10m · Tropical Maritime' },

  // International Benchmarks
  { label: 'Denver / Rockies', cat: 'mountain', lat: 39.7392, lon: -104.9903, altitude_m: 1603, desc: 'High Plains Foothills · 1,603m' },
  { label: 'Tokyo', cat: 'coastal', lat: 35.6762, lon: 139.6503, altitude_m: 41, desc: 'Temperate Maritime · 41m' },
  { label: 'London', cat: 'plains', lat: 51.5074, lon: -0.1278, altitude_m: 25, desc: 'Oceanic Basin · 25m' },
];

export default function LocationPicker({ location, onChange, errors = {} }) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'map' | 'manual'
  const [mapSubView, setMapSubView] = useState('tactical'); // 'tactical' | '3d'
  const [activePresetCategory, setActivePresetCategory] = useState('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchError, setSearchError] = useState(null);

  const [placeName, setPlaceName] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const [elevLoading, setElevLoading] = useState(false);
  const [elevPrompt, setElevPrompt] = useState(null);

  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Reverse Geocode place name whenever lat or lon changes
  useEffect(() => {
    if (!location || location.lat === undefined || location.lon === undefined) return;
    let isMounted = true;

    const resolvePlace = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/location/reverse?lat=${location.lat}&lon=${location.lon}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.name) {
            const display = data.region ? `${data.name}, ${data.region}` : data.name;
            setPlaceName(display);
          }
        }
      } catch {
        // Silently fallback to coordinates
      }
    };

    const timer = setTimeout(resolvePlace, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [location.lat, location.lon]);

  // Debounced Place Search (Open-Meteo Geocoding API + Local Proxy)
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
        let data = null;
        try {
          const res = await fetch(`http://127.0.0.1:8000/location/search?q=${encodeURIComponent(searchQuery)}&count=8`);
          if (res.ok) {
            const json = await res.json();
            data = json.results || [];
          }
        } catch {
          // Direct client fallback
          const direct = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=8&language=en&format=json`);
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
          setSearchError('No matching places found. Try entering coordinates or clicking the world map.');
        }
      } catch {
        setSearchError('Geocoding service unavailable. You can enter coordinates manually.');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

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
    setSearchQuery(`${place.name}${place.country ? `, ${place.country}` : ''}`);
    setSearchError(null);
    setPlaceName(`${place.name}${place.admin1 ? `, ${place.admin1}` : ''}`);

    const newLoc = {
      lat: Number(place.lat.toFixed(4)),
      lon: Number(place.lon.toFixed(4)),
      altitude_m: place.elevation_m !== null && place.elevation_m !== undefined
        ? Number(place.elevation_m)
        : location.altitude_m,
    };

    if (place.elevation_m === null || place.elevation_m === undefined) {
      lookupElevation(newLoc.lat, newLoc.lon);
    } else {
      setElevPrompt(null);
      onChange(newLoc);
    }
  };

  // Lookup Elevation via API with non-defaulting policy
  const lookupElevation = async (lat, lon) => {
    setElevLoading(true);
    setElevPrompt(null);
    try {
      let elev = null;

      // 1. Local backend proxy
      try {
        const res = await fetch(`http://127.0.0.1:8000/location/elevation?lat=${lat}&lon=${lon}`);
        if (res.ok) {
          const json = await res.json();
          if (json.elevation_m !== null && json.elevation_m !== undefined) {
            elev = json.elevation_m;
          }
        }
      } catch {
        // Fall through to direct tier
      }

      // 2. Direct Open-Elevation API
      if (elev === null || elev === undefined) {
        try {
          const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
          if (res.ok) {
            const json = await res.json();
            if (json.results && json.results[0] && json.results[0].elevation !== null) {
              elev = json.results[0].elevation;
            }
          }
        } catch {
          // Continue
        }
      }

      // 3. Direct Open-Meteo Elevation API
      if (elev === null || elev === undefined) {
        try {
          const direct = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
          if (direct.ok) {
            const json = await direct.json();
            if (json.elevation && json.elevation[0] !== null) {
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
      setGeoError('Geolocation is not supported by your browser.');
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
          lookupElevation(lat, lon);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError('Location permission denied. Please search or enter coordinates manually.');
        } else if (err.code === 2) {
          setGeoError('Position unavailable. Please search for a location or use the world map.');
        } else {
          setGeoError('Geolocation timed out. Please enter your location manually.');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Filtered presets
  const filteredPresets = activePresetCategory === 'all'
    ? COMPREHENSIVE_PRESETS
    : COMPREHENSIVE_PRESETS.filter(p => p.cat === activePresetCategory);

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
              placeholder="Search city, high-altitude post, mountain, or valley..."
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

      {/* ── 2. Click-Anywhere World Map (Tactical Leaflet / 3D Globe) ───────── */}
      {activeTab === 'map' && (
        <div className="loc-section map-mode">
          <div className="map-mode-header">
            <span className="map-hint">
              {mapSubView === 'tactical'
                ? 'High-res planetary map. Click or drag beacon to set target coordinates & altitude.'
                : 'Click anywhere on Earth to drop pin. Drag to rotate in 3D, scroll to zoom.'}
            </span>
            <div className="map-subview-toggle">
              <button
                type="button"
                className={`subview-btn ${mapSubView === 'tactical' ? 'active' : ''}`}
                onClick={() => setMapSubView('tactical')}
              >
                Tactical Map
              </button>
              <button
                type="button"
                className={`subview-btn ${mapSubView === '3d' ? 'active' : ''}`}
                onClick={() => setMapSubView('3d')}
              >
                3D Globe
              </button>
            </div>
          </div>

          {mapSubView === 'tactical' ? (
            <TacticalWorldMap
              location={location}
              onCoordsChange={(lat, lon) => lookupElevation(lat, lon)}
              placeName={placeName}
              elevation_m={location.altitude_m}
            />
          ) : (
            <EarthGlobe3D
              location={location}
              onChange={(newCoords) => onChange({ ...location, ...newCoords })}
              onResolveElevation={(lat, lon) => lookupElevation(lat, lon)}
              elevationLoading={elevLoading}
            />
          )}
        </div>
      )}

      {/* ── 3. Manual Coordinate Fields (Always Visible & Editable) ──────────── */}
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

      {/* ── Status Alerts ── */}
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

      {/* ── Comprehensive Climate & Terrain Presets ─────────────────────────── */}
      <div className="quick-climates-wrap">
        <div className="quick-header-row">
          <span className="quick-label">
            {placeName ? `Active: ${placeName}` : 'Representative Microclimates:'}
          </span>
          <div className="climate-cat-tabs">
            {CLIMATE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`cat-chip ${activePresetCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActivePresetCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="quick-pills">
          {filteredPresets.map((c) => {
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
                  setPlaceName(c.label);
                  onChange({ lat: c.lat, lon: c.lon, altitude_m: c.altitude_m });
                }}
                title={c.desc}
              >
                <span className="pill-dot" />
                <span>{c.label}</span>
                <span className="pill-alt">{c.altitude_m}m</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live Site Climate & Meteorological Intelligence Card ────────────── */}
      <SiteWeatherIntel location={location} />
    </div>
  );
}
