/*
 * TacticalMapModal.jsx — Full-Screen Tactical Planetary Cartography & GPS Lock
 * Provides an expansive, high-resolution world map that occupies the screen with a blurred backdrop.
 * Integrates:
 * 1. Device GPS lock (navigator.geolocation) with high accuracy
 * 2. Planetary place search (Open-Meteo geocoding proxy)
 * 3. Draggable crosshair beacon & click-to-pin anywhere on Earth
 * 4. Real-time reverse geocoding & DEM elevation resolution
 * 5. Mathematical Meteorological Intel (T_min, T_mean, T_max, DNI, snow)
 * 6. Site-Specific Material & Envelope recommendations based on resolved climate
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  Search,
  Navigation,
  Check,
  X,
  MapPin,
  Mountain,
  Thermometer,
  Sun,
  Snowflake,
  Sparkles,
  Layers,
  RefreshCw,
} from 'lucide-react';
import TacticalWorldMap from './TacticalWorldMap';
import './TacticalMapModal.css';

function determineClimateRecommendations(metrics, altitude_m) {
  const tMin = metrics?.t_air_min ?? (altitude_m > 3000 ? -20 : 5);
  const tMax = metrics?.t_air_max ?? 25;

  if (tMin <= -12 || altitude_m >= 3200) {
    return {
      category: 'Extreme Sub-Zero Alpine',
      biome: 'Glacial Alpine Tundra',
      wallSpec: '400mm Rammed Earth + 150mm EPS Foam (U ≈ 0.18 W/m²K)',
      roofSpec: '250mm Timber SIPs + 180mm XPS (U ≈ 0.16 W/m²K)',
      glazingSpec: 'Triple-Pane Low-E Argon + Night Thermal Shutter',
      strategy: 'Passive solar Trombe wall heat retention + airlock foyer',
      presetId: 'bunk',
      walls: [
        { material_id: 'rammed_earth', thickness_m: 0.40 },
        { material_id: 'eps', thickness_m: 0.15 },
        { material_id: 'gypsum_board', thickness_m: 0.015 },
      ],
      roof: [
        { material_id: 'corrugated_gi', thickness_m: 0.002 },
        { material_id: 'xps', thickness_m: 0.18 },
        { material_id: 'plywood', thickness_m: 0.019 },
      ],
    };
  } else if (tMin < 4 || altitude_m >= 1600) {
    return {
      category: 'Cold Mountain & Valley',
      biome: 'Montane Valley',
      wallSpec: '300mm Adobe/Stone + 100mm Rockwool (U ≈ 0.28 W/m²K)',
      roofSpec: '200mm Wood Truss + 120mm Glasswool Batt',
      glazingSpec: 'Double-Pane Low-E Sealed Unit (U ≈ 1.4 W/m²K)',
      strategy: 'Direct solar gain orientation with moderate thermal mass',
      presetId: 'passive_solar',
      walls: [
        { material_id: 'adobe_block', thickness_m: 0.30 },
        { material_id: 'rockwool', thickness_m: 0.10 },
        { material_id: 'gypsum_board', thickness_m: 0.015 },
      ],
      roof: [
        { material_id: 'corrugated_gi', thickness_m: 0.002 },
        { material_id: 'glasswool_batt', thickness_m: 0.12 },
        { material_id: 'plywood', thickness_m: 0.019 },
      ],
    };
  } else if (tMax >= 38) {
    return {
      category: 'Hot Arid Desert',
      biome: 'Arid Desert Basin',
      wallSpec: '350mm Stabilized Mud Brick + Radiant Cavity (U ≈ 0.42 W/m²K)',
      roofSpec: 'Double Roof with ventilated reflective air gap',
      glazingSpec: 'Double Solar Control Tinted + Deep 650mm Overhangs',
      strategy: 'High thermal mass time-lag damping + night flush ventilation',
      presetId: 'light_tactical',
      walls: [
        { material_id: 'adobe_block', thickness_m: 0.35 },
        { material_id: 'air_cavity', thickness_m: 0.05 },
        { material_id: 'plaster_render', thickness_m: 0.02 },
      ],
      roof: [
        { material_id: 'corrugated_gi', thickness_m: 0.002 },
        { material_id: 'puf', thickness_m: 0.08 },
        { material_id: 'plywood', thickness_m: 0.019 },
      ],
    };
  } else {
    return {
      category: 'Composite / Plains',
      biome: 'Continental Plains',
      wallSpec: '230mm Fly Ash Brick + 60mm PUF Core (U ≈ 0.45 W/m²K)',
      roofSpec: '150mm RCC Slab + 80mm Over-deck Extruded Polystyrene',
      glazingSpec: 'Double-Pane Sealed Low-E Unit (U ≈ 1.8 W/m²K)',
      strategy: 'Balanced diurnal mass with seasonal window shading',
      presetId: 'passive_solar',
      walls: [
        { material_id: 'brick_standard', thickness_m: 0.23 },
        { material_id: 'puf', thickness_m: 0.06 },
        { material_id: 'gypsum_board', thickness_m: 0.015 },
      ],
      roof: [
        { material_id: 'corrugated_gi', thickness_m: 0.002 },
        { material_id: 'glasswool_batt', thickness_m: 0.08 },
        { material_id: 'plywood', thickness_m: 0.019 },
      ],
    };
  }
}

export default function TacticalMapModal({
  isOpen,
  onClose,
  location,
  onSelectLocation,
  onApplyRecommendedEnvelope,
  activeSiteName,
}) {
  const [targetCoords, setTargetCoords] = useState({
    lat: location?.lat ?? 34.1526,
    lon: location?.lon ?? 77.5771,
    altitude_m: location?.altitude_m ?? 3500,
  });

  const [placeTitle, setPlaceTitle] = useState(activeSiteName || 'Site Location');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [isElevLoading, setIsElevLoading] = useState(false);
  const [weatherMetrics, setWeatherMetrics] = useState(null);
  const [materialAppliedNotice, setMaterialAppliedNotice] = useState(false);

  // Sync prop location when opening
  useEffect(() => {
    if (isOpen && location) {
      setTargetCoords({
        lat: location.lat ?? 34.1526,
        lon: location.lon ?? 77.5771,
        altitude_m: location.altitude_m ?? 3500,
      });
      if (activeSiteName) setPlaceTitle(activeSiteName);
      setMaterialAppliedNotice(false);
    }
  }, [isOpen, location, activeSiteName]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reverse geocode place title & weather metrics whenever targetCoords change
  useEffect(() => {
    if (!isOpen) return;
    const { lat, lon } = targetCoords;
    if (lat === undefined || lon === undefined) return;

    let isMounted = true;

    // 1. Reverse Geocode
    fetch(`http://127.0.0.1:8000/location/reverse?lat=${lat}&lon=${lon}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.name) {
          const display = data.region ? `${data.name}, ${data.region}` : data.name;
          setPlaceTitle(display);
        }
      })
      .catch(() => {});

    // 2. Weather Metrics from Mathematical Engine
    fetch(`http://127.0.0.1:8000/location/weather?lat=${lat}&lon=${lon}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.metrics) {
          setWeatherMetrics(data.metrics);
        }
      })
      .catch(() => {
        // Fallback synthetic calculation
        if (isMounted) {
          const latFactor = Math.cos((lat * Math.PI) / 180);
          const altLapse = ((targetCoords.altitude_m || 1000) / 1000) * 6.5;
          const baseMean = 22 * latFactor - altLapse - 5;
          setWeatherMetrics({
            t_air_min: Number((baseMean - 6.5).toFixed(1)),
            t_air_mean: Number(baseMean.toFixed(1)),
            t_air_max: Number((baseMean + 7.2).toFixed(1)),
            solar_dni_peak_wm2: 650,
            snow_cover: baseMean < 0,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetCoords.lat, targetCoords.lon, targetCoords.altitude_m]);

  // Elevation Lookup
  const resolveElevationForCoords = async (lat, lon) => {
    setIsElevLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/location/elevation?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const json = await res.json();
        if (json.elevation_m !== null && json.elevation_m !== undefined) {
          setTargetCoords((prev) => ({ ...prev, lat, lon, altitude_m: Math.round(json.elevation_m) }));
          return;
        }
      }
      // Fallback direct Open-Meteo
      const direct = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
      if (direct.ok) {
        const dJson = await direct.json();
        if (dJson.elevation && dJson.elevation[0] !== null) {
          setTargetCoords((prev) => ({ ...prev, lat, lon, altitude_m: Math.round(dJson.elevation[0]) }));
          return;
        }
      }
      setTargetCoords((prev) => ({ ...prev, lat, lon }));
    } catch {
      setTargetCoords((prev) => ({ ...prev, lat, lon }));
    } finally {
      setIsElevLoading(false);
    }
  };

  // Place Search Autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/location/search?q=${encodeURIComponent(searchQuery)}&count=6`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.results || []);
        } else {
          const direct = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=6&language=en&format=json`);
          if (direct.ok) {
            const dJson = await direct.json();
            setSearchResults(
              (dJson.results || []).map((r) => ({
                id: r.id,
                name: r.name,
                admin1: r.admin1 || '',
                country: r.country || '',
                lat: r.latitude,
                lon: r.longitude,
                elevation_m: r.elevation,
              }))
            );
          }
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select search result
  const handleSelectSearchResult = (result) => {
    setSearchResults([]);
    setSearchQuery(`${result.name}${result.country ? `, ${result.country}` : ''}`);
    const cleanLat = Number(result.lat.toFixed(4));
    const cleanLon = Number(result.lon.toFixed(4));
    const cleanElev = result.elevation_m != null ? Math.round(result.elevation_m) : targetCoords.altitude_m;

    setTargetCoords({
      lat: cleanLat,
      lon: cleanLon,
      altitude_m: cleanElev,
    });
    setPlaceTitle(`${result.name}${result.admin1 ? `, ${result.admin1}` : ''}`);

    if (result.elevation_m == null) {
      resolveElevationForCoords(cleanLat, cleanLon);
    }
  };

  // Device GPS Lock
  const handleAcquireGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeoLoading(false);
        const cleanLat = Number(pos.coords.latitude.toFixed(4));
        const cleanLon = Number(pos.coords.longitude.toFixed(4));
        const alt = pos.coords.altitude != null && !isNaN(pos.coords.altitude)
          ? Math.round(pos.coords.altitude)
          : null;

        if (alt !== null && alt >= 0) {
          setTargetCoords({ lat: cleanLat, lon: cleanLon, altitude_m: alt });
        } else {
          resolveElevationForCoords(cleanLat, cleanLon);
        }
      },
      (err) => {
        setIsGeoLoading(false);
        alert(`Could not acquire GPS location: ${err.message || 'Permission denied or timeout'}`);
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  // Calculate dynamic material recommendations
  const climateRec = determineClimateRecommendations(weatherMetrics, targetCoords.altitude_m);

  // Apply recommended climate envelope
  const handleApplyRecommendedMaterials = () => {
    if (onApplyRecommendedEnvelope) {
      onApplyRecommendedEnvelope({
        envelope: {
          walls: climateRec.walls,
          roof: climateRec.roof,
        },
      });
      setMaterialAppliedNotice(true);
      setTimeout(() => setMaterialAppliedNotice(false), 3000);
    }
  };

  // Confirm and close
  const handleConfirmAndClose = () => {
    if (onSelectLocation) {
      onSelectLocation(targetCoords);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="tactical-modal-backdrop" onClick={onClose}>
      <div className="tactical-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* ── 1. HUD Header ────────────────────────────────────────────── */}
        <header className="tactical-modal-header">
          <div className="tactical-modal-title-group">
            <div className="tactical-modal-icon-badge">
              <Globe size={18} />
            </div>
            <div>
              <h2 className="tactical-modal-title">
                Tactical Planetary Map
                <span className="tactical-modal-badge">GPS &amp; Microclimate Lock</span>
              </h2>
              <p className="tactical-modal-subtitle">
                Click anywhere or acquire device GPS to solve site-specific envelope physics.
              </p>
            </div>
          </div>

          {/* Place Search Bar */}
          <div className="tactical-modal-search">
            <div className="modal-search-input-wrap">
              <Search size={14} className="modal-search-icon" />
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search any landmark, summit, military post, or city worldwide..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <RefreshCw size={13} className="spin-icon modal-search-icon" />}
              {searchQuery && (
                <button
                  type="button"
                  className="modal-search-clear"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <ul className="modal-search-dropdown" role="listbox">
                {searchResults.map((r) => (
                  <li
                    key={r.id || `${r.lat}-${r.lon}`}
                    className="modal-search-item"
                    onClick={() => handleSelectSearchResult(r)}
                  >
                    <div>
                      <span className="modal-search-item-title">{r.name}</span>
                      <span className="modal-search-item-sub">
                        {[r.admin1, r.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    <span className="modal-search-item-elev">
                      {r.elevation_m != null ? `${Math.round(r.elevation_m)}m` : 'ASL'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action Buttons */}
          <div className="tactical-modal-actions">
            <button
              type="button"
              className="tactical-gps-btn"
              onClick={handleAcquireGPS}
              disabled={isGeoLoading}
              title="Lock to current device GPS position"
            >
              <Navigation size={13} className={isGeoLoading ? 'spin-icon' : ''} />
              <span>{isGeoLoading ? 'Acquiring GPS...' : 'Lock to My GPS'}</span>
            </button>

            <button
              type="button"
              className="tactical-confirm-btn"
              onClick={handleConfirmAndClose}
              title="Apply target coordinates & return to studio"
            >
              <Check size={14} />
              <span>Confirm Site Location</span>
            </button>

            <button
              type="button"
              className="tactical-close-btn"
              onClick={onClose}
              title="Close map (Esc)"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* ── 2. Main Map Canvas ────────────────────────────────────────── */}
        <div className="tactical-modal-body">
          <div className="tactical-modal-map-wrap">
            <TacticalWorldMap
              location={targetCoords}
              onCoordsChange={(lat, lon) => resolveElevationForCoords(lat, lon)}
              placeName={placeTitle}
              elevation_m={targetCoords.altitude_m}
              fullScreen={true}
            />
          </div>

          {/* ── 3. Floating Microclimate & Materials Intelligence HUD Card ─ */}
          <div className="modal-climate-hud-card">
            <div className="hud-card-header">
              <div>
                <h3 className="hud-place-title">{placeTitle}</h3>
                <div className="hud-card-coords-row">
                  <span>{targetCoords.lat >= 0 ? `${targetCoords.lat.toFixed(3)}°N` : `${Math.abs(targetCoords.lat).toFixed(3)}°S`}</span>
                  <span className="hud-coords-dot">·</span>
                  <span>{targetCoords.lon >= 0 ? `${targetCoords.lon.toFixed(3)}°E` : `${Math.abs(targetCoords.lon).toFixed(3)}°W`}</span>
                  <span className="hud-coords-dot">·</span>
                  <span className="hud-elev-pill">{isElevLoading ? 'Resolving elev...' : `${targetCoords.altitude_m}m ASL`}</span>
                </div>
              </div>
              <span className="hud-biome-badge">{climateRec.biome}</span>
            </div>

            {/* Meteorological Engine Stats */}
            <div className="hud-metrics-grid">
              <div className="hud-stat-cell">
                <span className="hud-stat-label">Min Ambient</span>
                <span className={`hud-stat-val ${weatherMetrics?.t_air_min < 0 ? 'cold' : ''}`}>
                  {weatherMetrics?.t_air_min != null ? `${weatherMetrics.t_air_min > 0 ? '+' : ''}${weatherMetrics.t_air_min}°C` : '—'}
                </span>
              </div>
              <div className="hud-stat-cell">
                <span className="hud-stat-label">Mean Temp</span>
                <span className="hud-stat-val">
                  {weatherMetrics?.t_air_mean != null ? `${weatherMetrics.t_air_mean > 0 ? '+' : ''}${weatherMetrics.t_air_mean}°C` : '—'}
                </span>
              </div>
              <div className="hud-stat-cell">
                <span className="hud-stat-label">Peak Solar</span>
                <span className="hud-stat-val solar">
                  {weatherMetrics?.solar_dni_peak_wm2 != null ? `${Math.round(weatherMetrics.solar_dni_peak_wm2)} W/m²` : '—'}
                </span>
              </div>
            </div>

            {/* Recommended Materials & Envelope for this Climate */}
            <div className="hud-material-box">
              <div className="hud-material-box-title">
                <Sparkles size={11} />
                <span>Site Material Recommendation</span>
              </div>
              <p className="hud-material-box-spec">
                <strong>Wall:</strong> {climateRec.wallSpec}
              </p>
              <p className="hud-material-box-spec" style={{ marginTop: 3 }}>
                <strong>Glazing:</strong> {climateRec.glazingSpec}
              </p>
              <p className="hud-material-box-spec" style={{ marginTop: 3, color: '#94a3b8', fontSize: 10 }}>
                {climateRec.strategy}
              </p>
            </div>

            {onApplyRecommendedEnvelope && (
              <button
                type="button"
                className="hud-apply-material-btn"
                onClick={handleApplyRecommendedMaterials}
                title="Apply recommended wall & roof build-up for this site"
              >
                <Sparkles size={12} />
                <span>{materialAppliedNotice ? '✓ Envelope Applied!' : 'Apply Recommended Envelope for Site'}</span>
              </button>
            )}

            <div className="hud-card-hint">
              Click anywhere on map or drag crosshair to dynamically recalculate.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
