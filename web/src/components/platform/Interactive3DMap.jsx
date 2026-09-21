import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus,
  Minus,
  MapPin,
  Layers,
  Check,
  ExternalLink,
  Maximize2,
  X,
  Activity,
  ChevronRight
} from 'lucide-react';
import { DEFENSE_OUTPOSTS } from './outpostData';
import './Interactive3DMap.css';

// 100% Free OpenStreetMap & Open Raster Tiles (No API key required, zero watermarks)
const TILE_STYLES = {
  osm: {
    id: 'osm',
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    subdomains: 'abc',
  },
  hot: {
    id: 'hot',
    label: 'Humanitarian Topo',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap, Humanitarian Team',
    subdomains: 'abc',
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite Aerial',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    subdomains: '',
  },
};

// Tactical Routes
const TACTICAL_ROUTES = [
  {
    name: 'Siachen Northern Supply Corridor',
    color: '#2563EB',
    coords: [
      [34.15, 77.58],
      [34.28, 77.52],
      [34.62, 77.45],
      [34.95, 77.30],
      [35.21, 77.21],
      [35.42, 77.10],
    ],
  },
  {
    name: 'DS-DBO Strategic Highline',
    color: '#EF4444',
    coords: [
      [34.15, 77.58],
      [34.05, 77.92],
      [34.02, 78.18],
      [34.78, 77.85],
      [35.38, 77.92],
    ],
  },
  {
    name: 'Pangong-Chushul Vector',
    color: '#F97316',
    coords: [
      [34.02, 78.18],
      [33.75, 78.45],
      [33.58, 78.65],
      [33.20, 78.71],
    ],
  },
];

const Interactive3DMap = forwardRef(
  ({ sites = [], selectedSiteId, onSelectSite, onPinDrop }, ref) => {
    // Container Ref
    const mapContainerRef = useRef(null);

    // 2D Leaflet Refs
    const mapRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markersRef = useRef(new Map());
    const routesGroupRef = useRef(null);

    // Merge passed sites with default outposts
    const displayOutposts = useMemo(() => {
      if (sites && sites.length > 0) {
        return sites.map((s, idx) => {
          const matched = DEFENSE_OUTPOSTS.find((d) => d.id === s.id || d.name === s.name);
          const hasEval = s.has_evaluation;
          const status = hasEval ? s.evaluation.status : matched ? matched.status : (s.altitude_m > 4500 ? 'critical' : 'warning');
          
          return {
            ...matched,
            ...s,
            id: s.id,
            name: s.name,
            lat: s.lat || (matched ? matched.lat : 34.2),
            lon: s.lon || (matched ? matched.lon : 77.6),
            altitude_m: s.altitude_m || (matched ? matched.altitude_m : 3500),
            status,
            occupants: s.occupants || (matched ? matched.occupants : 12),
            commander: matched ? matched.commander : `Post Cmdr #${idx + 1}`,
            commanderRank: matched ? matched.commanderRank : 'Capt',
            avatar: matched ? matched.avatar : DEFENSE_OUTPOSTS[idx % DEFENSE_OUTPOSTS.length].avatar,
            solar_irradiance: matched ? matched.solar_irradiance : (s.altitude_m > 4000 ? 2050 : 1920),
            t_ambient_min: hasEval 
              ? s.evaluation.t_in_min_c 
              : matched 
              ? matched.t_ambient_min 
              : (s.altitude_m > 4500 ? -32.0 : -18.5),
            fuel_burn_litres: hasEval 
              ? s.evaluation.annual_fuel_litres 
              : matched 
              ? matched.fuel_burn_litres 
              : (s.altitude_m > 4500 ? 3800 : 1600),
            t_inside_pred: hasEval
              ? s.evaluation.t_in_max_c
              : matched
              ? matched.t_inside_pred
              : 16.0,
          };
        });
      }
      return DEFENSE_OUTPOSTS;
    }, [sites]);

    const [activeSite, setActiveSite] = useState(displayOutposts[0] || DEFENSE_OUTPOSTS[0]);
    const [tileStyleKey, setTileStyleKey] = useState('osm');
    const [styleMenuOpen, setStyleMenuOpen] = useState(false);
    const [dropPinMode, setDropPinMode] = useState(false);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [showRoutes, setShowRoutes] = useState(false); // Clean: off by default to reduce clutter

    // Expose flyToSite method
    useImperativeHandle(ref, () => ({
      flyToSite: (site) => {
        const target = displayOutposts.find((o) => o.id === site.id) || site;
        setActiveSite(target);
        setInspectorOpen(true);

        if (mapRef.current && target.lat && target.lon) {
          mapRef.current.flyTo([target.lat, target.lon], 11, {
            duration: 0.7,
            easeLinearity: 0.25,
          });
        }
      },
    }));

    // Update activeSite if selectedSiteId changes externally
    useEffect(() => {
      if (selectedSiteId) {
        const match = displayOutposts.find((o) => o.id === selectedSiteId);
        if (match) {
          setActiveSite(match);
          setInspectorOpen(true);
        }
      }
    }, [selectedSiteId, displayOutposts]);

    // ─────────────────────────────────────────────────────────────────────────────
    // INITIALIZE LEAFLET MAP
    // ─────────────────────────────────────────────────────────────────────────────
    const dropPinModeRef = useRef(dropPinMode);
    useEffect(() => {
      dropPinModeRef.current = dropPinMode;
    }, [dropPinMode]);

    useEffect(() => {
      if (!mapContainerRef.current) return;
      if (mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [34.35, 77.85],
        zoom: 8,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
      });

      map.dragging.enable();

      // Default Tile Layer (OpenStreetMap)
      const cfg = TILE_STYLES[tileStyleKey] || TILE_STYLES.osm;
      const tileLayer = L.tileLayer(cfg.url, {
        maxZoom: 19,
        subdomains: cfg.subdomains || 'abc',
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Create Route Group
      const routeGroup = L.featureGroup().addTo(map);
      routesGroupRef.current = routeGroup;

      mapRef.current = map;

      // Handle Pin Drop Click
      map.on('click', (e) => {
        if (dropPinModeRef.current && onPinDrop) {
          onPinDrop({ lat: e.latlng.lat, lon: e.latlng.lng });
          setDropPinMode(false);
        } else {
          // Clicking empty terrain deselects inspector
          setInspectorOpen(false);
        }
      });

      const timer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }, []);

    // Continuous ResizeObserver
    useEffect(() => {
      if (!mapContainerRef.current) return;
      const observer = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      observer.observe(mapContainerRef.current);
      return () => observer.disconnect();
    }, []);

    // Handle Tile Style change
    useEffect(() => {
      if (!mapRef.current || !tileLayerRef.current) return;
      const cfg = TILE_STYLES[tileStyleKey] || TILE_STYLES.osm;
      mapRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(cfg.url, {
        maxZoom: 19,
        subdomains: cfg.subdomains || 'abc',
      }).addTo(mapRef.current);
      tileLayerRef.current = newLayer;
    }, [tileStyleKey]);

    // Render Supply Routes dynamically
    useEffect(() => {
      if (!routesGroupRef.current) return;
      routesGroupRef.current.clearLayers();

      if (showRoutes) {
        TACTICAL_ROUTES.forEach((r) => {
          L.polyline(r.coords, {
            color: r.color,
            weight: 2.5,
            dashArray: '5, 6',
            opacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round',
            interactive: false,
          }).addTo(routesGroupRef.current);
        });
      }
    }, [showRoutes]);

    // Render Clean Non-Overlapping 2D Markers
    useEffect(() => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current.clear();

      displayOutposts.forEach((post) => {
        const isSelected = activeSite?.id === post.id;
        const isCrit = post.status === 'critical';
        const isOpt = post.status === 'optimal';

        // Clean, compact tactical radar marker (name expands only on hover or selection)
        const customIcon = L.divIcon({
          className: 'leaflet-custom-marker-wrapper',
          html: `
            <div class="tactical-map-pin ${isSelected ? 'pin-selected' : ''} ${
              isCrit ? 'pin-crit' : isOpt ? 'pin-optimal' : 'pin-warning'
            }">
              <div class="pin-radar-pip">
                <span class="pin-status-dot"></span>
                <span class="pin-temp-label">${Math.round(post.t_ambient_min)}°</span>
              </div>
              <div class="pin-expanded-label">
                <span class="pin-name">${post.name}</span>
                <span class="pin-alt">${post.altitude_m?.toLocaleString()}m</span>
              </div>
            </div>
          `,
          iconSize: [42, 28],
          iconAnchor: [21, 14],
        });

        const marker = L.marker([post.lat, post.lon], { icon: customIcon }).addTo(map);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setActiveSite(post);
          setInspectorOpen(true);
          if (onSelectSite) onSelectSite(post);
          map.flyTo([post.lat, post.lon], 11, { duration: 0.7 });
        });

        markersRef.current.set(post.id, marker);
      });
    }, [displayOutposts, activeSite, onSelectSite]);

    // Zoom and Fit Handlers
    const handleZoomIn = () => {
      if (mapRef.current) mapRef.current.zoomIn();
    };

    const handleZoomOut = () => {
      if (mapRef.current) mapRef.current.zoomOut();
    };

    const handleFitAll = () => {
      if (mapRef.current && displayOutposts.length > 0) {
        const group = new L.featureGroup(Array.from(markersRef.current.values()));
        mapRef.current.fitBounds(group.getBounds().pad(0.12), { duration: 0.6 });
      }
    };

    return (
      <div className="fast-2d-map-wrapper">
        {/* Map Canvas */}
        <div
          ref={mapContainerRef}
          className={`fast-2d-map-canvas ${dropPinMode ? 'cursor-pin' : ''}`}
        />

        {/* ─────────────────────────────────────────────────────────────────────────────
            TACTICAL DOCK: Floating Non-Intrusive Controls (Top-Right)
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="map-tactical-dock">
          {/* Basemap Style Picker */}
          <div className="dock-dropdown-wrapper">
            <button
              type="button"
              className="dock-pill-btn"
              onClick={() => setStyleMenuOpen(!styleMenuOpen)}
              title="Change Map Basemap"
            >
              <Layers size={13} />
              <span>{TILE_STYLES[tileStyleKey].label.split(' ')[0]}</span>
            </button>

            {styleMenuOpen && (
              <div className="dock-popover-menu">
                <div className="dock-popover-title">BASEMAP LAYER</div>
                {Object.entries(TILE_STYLES).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    className={`dock-popover-item ${tileStyleKey === key ? 'active' : ''}`}
                    onClick={() => {
                      setTileStyleKey(key);
                      setStyleMenuOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                    {tileStyleKey === key && <Check size={13} className="check-mark" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Supply Routes */}
          <button
            type="button"
            className={`dock-pill-btn ${showRoutes ? 'active' : ''}`}
            onClick={() => setShowRoutes(!showRoutes)}
            title="Toggle Strategic Supply Corridors"
          >
            <Activity size={13} />
            <span>Routes</span>
          </button>

          {/* Drop Pin Mode */}
          <button
            type="button"
            className={`dock-pill-btn ${dropPinMode ? 'active-accent' : ''}`}
            onClick={() => setDropPinMode(!dropPinMode)}
            title="Drop pin to register outpost"
          >
            <MapPin size={13} />
            <span>{dropPinMode ? 'Click Map' : 'Drop Pin'}</span>
          </button>

          {/* Fit Bounds */}
          <button
            type="button"
            className="dock-pill-btn icon-only"
            onClick={handleFitAll}
            title="Fit All Outposts in View"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            MINIMAL FLOATING ZOOM BAR (Bottom-Left)
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="map-vertical-zoom-bar">
          <button type="button" className="zoom-icon-btn" onClick={handleZoomIn} title="Zoom In">
            <Plus size={15} />
          </button>
          <div className="zoom-separator" />
          <button type="button" className="zoom-icon-btn" onClick={handleZoomOut} title="Zoom Out">
            <Minus size={15} />
          </button>
        </div>

        {/* Minimal Corner Attribution */}
        <div className="map-corner-attribution">
          {TILE_STYLES[tileStyleKey].attribution} · 2D Cartography
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            SLEEK FLOATING OUTPOST CARD (Bottom-Right, Compact & Non-Intrusive)
            ───────────────────────────────────────────────────────────────────────────── */}
        {inspectorOpen && activeSite && (
          <aside className="outpost-inspector-floating-card" aria-label="Selected Outpost Details">
            <div className="mini-card-header">
              <div className="mini-card-badge-row">
                <span className={`inspector-status-pill pill-${activeSite.status}`}>
                  {activeSite.status === 'critical'
                    ? 'Critical Risk'
                    : activeSite.status === 'optimal'
                    ? 'Compliant'
                    : 'Fuel Deficit'}
                </span>
                <span className="mini-card-alt">{activeSite.altitude_m?.toLocaleString()} m</span>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => setInspectorOpen(false)}
                  title="Close Card"
                >
                  <X size={13} />
                </button>
              </div>

              <h4 className="mini-card-title">{activeSite.name}</h4>
              <span className="mini-card-sub">{activeSite.sector || activeSite.district || 'Ladakh Sector'}</span>
            </div>

            <div className="mini-card-metrics-grid">
              <div className="mini-stat-cell">
                <span className="mini-stat-label">Min Ambient</span>
                <span className="mini-stat-val cold-val">{activeSite.t_ambient_min}°C</span>
              </div>
              <div className="mini-stat-cell">
                <span className="mini-stat-label">Solar Rad</span>
                <span className="mini-stat-val">{activeSite.solar_irradiance}</span>
              </div>
              <div className="mini-stat-cell">
                <span className="mini-stat-label">Annual Fuel</span>
                <span className="mini-stat-val">{activeSite.fuel_burn_litres?.toLocaleString()} L</span>
              </div>
              <div className="mini-stat-cell">
                <span className="mini-stat-label">Inside Temp</span>
                <span className="mini-stat-val opt-val">{activeSite.t_inside_pred || 16}°C</span>
              </div>
            </div>

            <div className="mini-card-actions-row">
              <Link
                to={`/sites/${activeSite.id}/design`}
                className="mini-primary-action"
              >
                <span>Shelter Studio</span>
                <ExternalLink size={11} />
              </Link>
              <Link
                to={`/sites/${activeSite.id}`}
                className="mini-secondary-action"
              >
                <span>Site Hub</span>
              </Link>
            </div>
          </aside>
        )}
      </div>
    );
  }
);

export default Interactive3DMap;
