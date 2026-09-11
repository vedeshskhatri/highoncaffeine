import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Compass,
  Plus,
  Minus,
  MapPin,
  Eye,
  Check,
  Navigation,
  ExternalLink,
  Snowflake,
  Sun,
  Shield,
  X,
  Flame,
  Maximize2,
  Box,
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hand,
  RotateCcw,
} from 'lucide-react';
import { DEFENSE_OUTPOSTS } from './outpostData';
import './Interactive3DMap.css';

// 100% Free OpenStreetMap & Open Raster Tiles (No API key required, zero watermarks!)
const TILE_STYLES = {
  osm: {
    id: 'osm',
    label: 'OpenStreetMap (Free)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    subdomains: 'abc',
  },
  hot: {
    id: 'hot',
    label: 'Humanitarian Topo',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, Humanitarian Team',
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
  (
    {
      sites = [],
      selectedSiteId,
      onSelectSite,
      onPinDrop,
      mapMode: controlledMapMode,
      onToggleMapMode,
    },
    ref
  ) => {
    // Mode: '2d' | '3d' (controlled or internal)
    const [internalMapMode, setInternalMapMode] = useState('2d');
    const mapMode = controlledMapMode !== undefined ? controlledMapMode : internalMapMode;
    const setMapMode = (mode) => {
      setInternalMapMode(mode);
      if (onToggleMapMode) onToggleMapMode(mode);
    };

    // 3D interaction mode: 'pan' (default so left-drag pans terrain) | 'rotate'
    const [threeInteractionMode, setThreeInteractionMode] = useState('pan');

    // Container Refs
    const mapContainerRef = useRef(null);
    const threeContainerRef = useRef(null);

    // 2D Leaflet Refs
    const mapRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markersRef = useRef(new Map());

    // 3D Three.js Refs
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);

    // Merge passed sites with default outposts
    const displayOutposts = useMemo(() => {
      if (sites && sites.length > 0) {
        return sites.map((s, idx) => {
          const matched = DEFENSE_OUTPOSTS.find((d) => d.id === s.id);
          const hasEval = s.has_evaluation;
          const status = hasEval ? s.evaluation.status : matched ? matched.status : 'optimal';
          return {
            ...matched,
            ...s,
            id: s.id,
            name: s.name,
            lat: s.lat || 34.2,
            lon: s.lon || 77.6,
            altitude_m: s.altitude_m || 3500,
            status,
            occupants: s.occupants || 12,
            commander: matched ? matched.commander : `Post Cmdr #${idx + 1}`,
            commanderRank: matched ? matched.commanderRank : 'Capt',
            avatar: matched ? matched.avatar : DEFENSE_OUTPOSTS[idx % DEFENSE_OUTPOSTS.length].avatar,
            solar_irradiance: matched ? matched.solar_irradiance : 1980,
            t_ambient_min: hasEval ? s.evaluation.t_in_min_c : matched ? matched.t_ambient_min : -25,
            fuel_burn_litres: hasEval ? s.evaluation.annual_fuel_litres : matched ? matched.fuel_burn_litres : 1500,
            x: matched ? matched.x : ((idx % 4) - 1.5) * 30,
            z: matched ? matched.z : (Math.floor(idx / 4) - 1) * 30,
            height: matched ? matched.height : 18,
          };
        });
      }
      return DEFENSE_OUTPOSTS;
    }, [sites]);

    const [activeSite, setActiveSite] = useState(displayOutposts[0] || DEFENSE_OUTPOSTS[0]);
    const [tileStyleKey, setTileStyleKey] = useState('osm'); // 'osm' default (no watermark!)
    const [styleMenuOpen, setStyleMenuOpen] = useState(false);
    const [dropPinMode, setDropPinMode] = useState(false);
    const [inspectorOpen, setInspectorOpen] = useState(false);

    // Expose flyToSite method
    useImperativeHandle(ref, () => ({
      flyToSite: (site) => {
        const target = displayOutposts.find((o) => o.id === site.id) || site;
        setActiveSite(target);
        setInspectorOpen(true);

        // Fly 2D map
        if (mapRef.current && target.lat && target.lon) {
          mapRef.current.flyTo([target.lat, target.lon], 11, {
            duration: 0.8,
            easeLinearity: 0.25,
          });
        }

        // Fly 3D camera
        if (controlsRef.current && cameraRef.current && target.x !== undefined) {
          const controls = controlsRef.current;
          const camera = cameraRef.current;
          const targetPos = new THREE.Vector3(target.x, 0, target.z);
          const cameraPos = new THREE.Vector3(target.x + 35, 30, target.z + 35);
          controls.target.copy(targetPos);
          camera.position.copy(cameraPos);
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
    // 1. INITIALIZE 2D LEAFLET MAP (Initialized once, kept active for fast toggling)
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

      // Explicitly enable dragging
      map.dragging.enable();

      // Default Tile Layer (OpenStreetMap free)
      const cfg = TILE_STYLES[tileStyleKey] || TILE_STYLES.osm;
      const tileLayer = L.tileLayer(cfg.url, {
        maxZoom: 19,
        subdomains: cfg.subdomains || 'abc',
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Add Tactical Routes Polylines (interactive: false so they NEVER block mouse drag!)
      const routeGroup = L.featureGroup().addTo(map);
      TACTICAL_ROUTES.forEach((r) => {
        L.polyline(r.coords, {
          color: '#FFFFFF',
          weight: 6,
          opacity: 0.75,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false,
        }).addTo(routeGroup);

        L.polyline(r.coords, {
          color: r.color,
          weight: 3.5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false,
        }).addTo(routeGroup);
      });

      mapRef.current = map;

      // Handle Pin Drop Click
      map.on('click', (e) => {
        if (dropPinModeRef.current && onPinDrop) {
          onPinDrop({ lat: e.latlng.lat, lon: e.latlng.lng });
          setDropPinMode(false);
        }
      });

      // Recalculate size when mounted
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

    // Invalidate size whenever 2D mode becomes active or container resizes
    useEffect(() => {
      if (mapMode === '2d' && mapRef.current) {
        mapRef.current.invalidateSize();
        const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 50);
        const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 180);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    }, [mapMode]);

    // Continuous ResizeObserver to guarantee the map fills 100% height and width
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

    // Handle 2D Tile Style change
    useEffect(() => {
      if (mapMode !== '2d') return;
      if (!mapRef.current || !tileLayerRef.current) return;
      const cfg = TILE_STYLES[tileStyleKey] || TILE_STYLES.osm;
      mapRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(cfg.url, {
        maxZoom: 19,
        subdomains: cfg.subdomains || 'abc',
      }).addTo(mapRef.current);
      tileLayerRef.current = newLayer;
    }, [tileStyleKey, mapMode]);

    // Render 2D Markers
    useEffect(() => {
      if (mapMode !== '2d') return;
      if (!mapRef.current) return;
      const map = mapRef.current;

      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current.clear();

      displayOutposts.forEach((post) => {
        const isSelected = activeSite.id === post.id;
        const isCrit = post.status === 'critical';
        const isOpt = post.status === 'optimal';

        const customIcon = L.divIcon({
          className: 'leaflet-custom-marker-wrapper',
          html: `
            <div class="quick-map-pin ${isSelected ? 'pin-selected' : ''} ${
            isCrit ? 'pin-crit' : isOpt ? 'pin-optimal' : 'pin-warning'
          }">
              <div class="pin-marker-core">
                <div class="pin-status-dot"></div>
                <span class="pin-short-temp">${Math.round(post.t_ambient_min)}°</span>
              </div>
              <div class="pin-label-pill">
                <span class="pin-name">${post.name}</span>
              </div>
            </div>
          `,
          iconSize: [110, 46],
          iconAnchor: [55, 46],
        });

        const marker = L.marker([post.lat, post.lon], { icon: customIcon }).addTo(map);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setActiveSite(post);
          setInspectorOpen(true);
          if (onSelectSite) onSelectSite(post);
          map.flyTo([post.lat, post.lon], 11, { duration: 0.8 });
        });

        markersRef.current.set(post.id, marker);
      });
    }, [displayOutposts, activeSite.id, mapMode]);

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. INITIALIZE 3D THREE.JS DIGITAL TWIN
    // ─────────────────────────────────────────────────────────────────────────────
    useEffect(() => {
      if (mapMode !== '3d') return;
      if (!threeContainerRef.current) return;

      const container = threeContainerRef.current;
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color('#F0F4F8');
      scene.fog = new THREE.FogExp2('#F0F4F8', 0.005);

      const camera = new THREE.PerspectiveCamera(42, width / height, 1, 1000);
      camera.position.set(60, 50, 70);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      rendererRef.current = renderer;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.minDistance = 20;
      controls.maxDistance = 220;
      controls.target.set(0, 0, 0);
      controls.mouseButtons = {
        LEFT: threeInteractionMode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: threeInteractionMode === 'pan' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
      };
      controlsRef.current = controls;

      const hemiLight = new THREE.HemisphereLight('#FFFFFF', '#CBD5E1', 0.95);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight('#FFFBEB', 1.6);
      dirLight.position.set(70, 90, 50);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const terrainSize = 200;
      const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 48, 48);
      const pos = terrainGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const elev =
          Math.sin(vx * 0.04) * Math.cos(vy * 0.04) * 6 +
          Math.sin(vx * 0.08) * 3.5;
        pos.setZ(i, elev);
      }
      terrainGeo.computeVertexNormals();

      const terrainMat = new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        roughness: 0.8,
        metalness: 0.05,
        flatShading: true,
      });
      const terrain = new THREE.Mesh(terrainGeo, terrainMat);
      terrain.rotation.x = -Math.PI / 2;
      terrain.receiveShadow = true;
      scene.add(terrain);

      const grid = new THREE.GridHelper(terrainSize, 40, 0x94a3b8, 0xcbd5e1);
      grid.position.y = 0.05;
      scene.add(grid);

      // Supply Routes Splines
      const rPoints1 = [
        new THREE.Vector3(-45, 0.4, -30),
        new THREE.Vector3(-20, 0.4, -15),
        new THREE.Vector3(5, 0.4, 5),
        new THREE.Vector3(25, 0.4, -20),
        new THREE.Vector3(45, 0.4, -45),
      ];
      const spline1 = new THREE.CatmullRomCurve3(rPoints1);
      const tubeGeo1 = new THREE.TubeGeometry(spline1, 48, 0.8, 8, false);
      const tubeMat1 = new THREE.MeshBasicMaterial({ color: '#2563EB' });
      scene.add(new THREE.Mesh(tubeGeo1, tubeMat1));

      // 3D Outpost Buildings
      const blueMat = new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.3 });
      const redMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.3 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.2 });

      displayOutposts.forEach((post) => {
        const group = new THREE.Group();
        group.position.set(post.x, 0, post.z);

        const isOpt = post.status === 'optimal';
        const bGeo = new THREE.BoxGeometry(7, post.height, 7);
        const bMesh = new THREE.Mesh(bGeo, isOpt ? blueMat : redMat);
        bMesh.position.y = post.height / 2;
        bMesh.castShadow = true;
        group.add(bMesh);

        const rGeo = new THREE.BoxGeometry(7.6, 0.8, 7.6);
        const rMesh = new THREE.Mesh(rGeo, whiteMat);
        rMesh.position.y = post.height + 0.4;
        group.add(rMesh);

        const ringGeo = new THREE.RingGeometry(5, 6.5, 20);
        const ringMat = new THREE.MeshBasicMaterial({
          color: isOpt ? '#3B82F6' : '#EF4444',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.1;
        group.add(ring);

        scene.add(group);
      });

      let animId;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        if (rendererRef.current) {
          rendererRef.current.dispose();
          rendererRef.current = null;
        }
      };
    }, [mapMode, displayOutposts]);

    // Sync Three.js OrbitControls interaction mode (Pan vs Orbit)
    useEffect(() => {
      if (controlsRef.current) {
        controlsRef.current.mouseButtons = {
          LEFT: threeInteractionMode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: threeInteractionMode === 'pan' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
        };
      }
    }, [threeInteractionMode]);

    // Directional Pan Handlers
    const handlePanDirection = (dir) => {
      const step = 160;
      if (mapMode === '2d' && mapRef.current) {
        if (dir === 'up') mapRef.current.panBy([0, -step], { animate: true });
        if (dir === 'down') mapRef.current.panBy([0, step], { animate: true });
        if (dir === 'left') mapRef.current.panBy([-step, 0], { animate: true });
        if (dir === 'right') mapRef.current.panBy([step, 0], { animate: true });
      } else if (mapMode === '3d' && controlsRef.current && cameraRef.current) {
        const controls = controlsRef.current;
        const camera = cameraRef.current;
        const d = 25;
        if (dir === 'up') {
          camera.position.z -= d;
          controls.target.z -= d;
        }
        if (dir === 'down') {
          camera.position.z += d;
          controls.target.z += d;
        }
        if (dir === 'left') {
          camera.position.x -= d;
          controls.target.x -= d;
        }
        if (dir === 'right') {
          camera.position.x += d;
          controls.target.x += d;
        }
        controls.update();
      }
    };

    // Keyboard Arrow navigation for smooth map panning
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
          e.preventDefault();
          if (e.key === 'ArrowUp') handlePanDirection('up');
          if (e.key === 'ArrowDown') handlePanDirection('down');
          if (e.key === 'ArrowLeft') handlePanDirection('left');
          if (e.key === 'ArrowRight') handlePanDirection('right');
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mapMode]);

    // Zoom Controls
    const handleZoomIn = () => {
      if (mapMode === '2d' && mapRef.current) {
        mapRef.current.zoomIn();
      } else if (mapMode === '3d' && cameraRef.current) {
        cameraRef.current.position.multiplyScalar(0.85);
      }
    };

    const handleZoomOut = () => {
      if (mapMode === '2d' && mapRef.current) {
        mapRef.current.zoomOut();
      } else if (mapMode === '3d' && cameraRef.current) {
        cameraRef.current.position.multiplyScalar(1.15);
      }
    };

    const handleFitAll = () => {
      if (mapMode === '2d' && mapRef.current && displayOutposts.length > 0) {
        const group = new L.featureGroup(Array.from(markersRef.current.values()));
        mapRef.current.fitBounds(group.getBounds().pad(0.15), { duration: 0.8 });
      } else if (mapMode === '3d' && controlsRef.current && cameraRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        cameraRef.current.position.set(60, 50, 70);
      }
    };

    return (
      <div className="fast-2d-map-wrapper">
        {/* ─────────────────────────────────────────────────────────────────────────────
            1. 2D / 3D CANVAS STAGE (Both preserved in DOM for instant zero-lag switching)
            ───────────────────────────────────────────────────────────────────────────── */}
        <div
          ref={mapContainerRef}
          className={`fast-2d-map-canvas ${dropPinMode ? 'cursor-pin' : ''}`}
          style={{
            display: mapMode === '2d' ? 'block' : 'none',
          }}
        />
        <div
          ref={threeContainerRef}
          className="three-digital-twin-canvas-interactive"
          style={{
            display: mapMode === '3d' ? 'block' : 'none',
          }}
        />

        {/* ─────────────────────────────────────────────────────────────────────────────
            2. TOP FLOATING ACTION BAR: 2D ⇄ 3D MODE TOGGLE, STYLE PICKER, PIN DROP, FIT
            (High z-index: 1000 so it sits ABOVE map tiles!)
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="map-top-action-bar">
          {/* 2D ⇄ 3D Mode Segmented Toggle Button */}
          <div className="view-mode-toggle-pill">
            <button
              type="button"
              className={`mode-toggle-tab ${mapMode === '2d' ? 'active' : ''}`}
              onClick={() => setMapMode('2d')}
              title="Switch to 2D Top-Down Cartography"
            >
              <Navigation size={13} />
              <span>2D Top-Down</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-tab ${mapMode === '3d' ? 'active' : ''}`}
              onClick={() => setMapMode('3d')}
              title="Switch to 3D Digital Twin Model"
            >
              <Box size={13} />
              <span>3D Model</span>
            </button>
          </div>

          {/* 3D Interaction Mode Pill: Pan Terrain vs Orbit */}
          {mapMode === '3d' && (
            <div className="view-mode-toggle-pill">
              <button
                type="button"
                className={`mode-toggle-tab ${threeInteractionMode === 'pan' ? 'active' : ''}`}
                onClick={() => setThreeInteractionMode('pan')}
                title="Left-click & drag to move across terrain"
              >
                <Hand size={12} />
                <span>Pan / Move</span>
              </button>
              <button
                type="button"
                className={`mode-toggle-tab ${threeInteractionMode === 'rotate' ? 'active' : ''}`}
                onClick={() => setThreeInteractionMode('rotate')}
                title="Left-click & drag to orbit camera"
              >
                <RotateCcw size={12} />
                <span>Orbit</span>
              </button>
            </div>
          )}

          {/* Drop Pin Mode */}
          <button
            type="button"
            className={`map-pill-action-btn ${dropPinMode ? 'active-pin-mode' : ''}`}
            onClick={() => setDropPinMode(!dropPinMode)}
            title="Click anywhere on the map to drop a pin and register an outpost"
          >
            <MapPin size={14} />
            <span>{dropPinMode ? 'Click Map to Place' : 'Drop Pin'}</span>
          </button>

          {/* Fit All Outposts */}
          <button
            type="button"
            className="map-pill-action-btn"
            onClick={handleFitAll}
            title="Fit all registered outposts into view"
          >
            <Maximize2 size={13} />
            <span>Fit All</span>
          </button>

          {/* Tile Style Picker (for 2D mode) */}
          {mapMode === '2d' && (
            <div className="style-dropdown-wrapper">
              <button
                type="button"
                className="map-pill-action-btn"
                onClick={() => setStyleMenuOpen(!styleMenuOpen)}
                title="Change Map Tile Style"
              >
                <Eye size={14} />
                <span>{TILE_STYLES[tileStyleKey].label.split(' ')[0]}</span>
              </button>

              {styleMenuOpen && (
                <div className="style-popover-dropdown">
                  <div className="popover-title">Map Tile Layer</div>
                  {Object.entries(TILE_STYLES).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      className={`style-option-item ${tileStyleKey === key ? 'active' : ''}`}
                      onClick={() => {
                        setTileStyleKey(key);
                        setStyleMenuOpen(false);
                      }}
                    >
                      <span>{item.label}</span>
                      {tileStyleKey === key && <Check size={14} className="check-mark" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            3. MINIMAL FLOATING ZOOM STRIP
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="map-vertical-zoom-bar">
          <button type="button" className="zoom-icon-btn" onClick={handleZoomIn} title="Zoom In">
            <Plus size={16} />
          </button>
          <div className="zoom-separator" />
          <button type="button" className="zoom-icon-btn" onClick={handleZoomOut} title="Zoom Out">
            <Minus size={16} />
          </button>
          <div className="zoom-separator" />
          <button
            type="button"
            className="zoom-icon-btn"
            onClick={handleFitAll}
            title="Recenter & Fit All Outposts"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Attribution */}
        <div className="map-corner-attribution">
          {mapMode === '2d' ? TILE_STYLES[tileStyleKey].attribution : '3D High-Altitude Twin'} · Interactive Map
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            4. SLEEK FLOATING OUTPOST INSPECTOR MINI-CARD (Bottom-Right, Non-Intrusive)
            ───────────────────────────────────────────────────────────────────────────── */}
        {inspectorOpen && activeSite && (
          <div className="outpost-inspector-floating-card">
            <div className="mini-card-header">
              <div className="mini-card-badge-row">
                <span className={`inspector-status-pill pill-${activeSite.status}`}>
                  {activeSite.status === 'critical'
                    ? '🔴 Critical Risk'
                    : activeSite.status === 'optimal'
                    ? '🟢 Compliant'
                    : '🟠 Fuel Deficit'}
                </span>
                <span className="mini-card-alt">{activeSite.altitude_m?.toLocaleString()} m</span>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => setInspectorOpen(false)}
                  title="Close Inspector"
                >
                  <X size={14} />
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
                <span className="mini-stat-label">Solar Rad.</span>
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

            <div className="mini-card-cmdr-row">
              <img
                src={activeSite.avatar}
                alt={activeSite.commander}
                className="mini-card-avatar"
              />
              <div className="mini-cmdr-info">
                <span className="mini-cmdr-name">
                  {activeSite.commanderRank} {activeSite.commander}
                </span>
                <span className="mini-cmdr-role">{activeSite.occupants} Troops Assigned</span>
              </div>
            </div>

            <div className="mini-card-actions-row">
              <a
                href={`/sites/${activeSite.id}/design`}
                className="mini-primary-action"
              >
                <span>Shelter Studio</span>
                <ExternalLink size={12} />
              </a>
              <a
                href={`/sites/${activeSite.id}`}
                className="mini-secondary-action"
              >
                <span>Site Hub</span>
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default Interactive3DMap;
