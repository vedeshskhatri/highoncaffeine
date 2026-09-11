/*
 * Shelter3DCanvas.jsx — High-End 3D Architectural Shelter Studio
 * Powered by Three.js & GSAP.
 *
 * Features:
 *   - Parametric 3D building generated from request geometry & envelope
 *   - Authentic material shaders (mud brick, rammed earth, stone, concrete, EPS, timber)
 *   - Interactive 3D material callout pins with physical & thermal metrics
 *   - 360° turntable floor ring with compass orientation
 *   - GSAP-animated exploded layer view and thermal heatmap mode
 *   - Solar vector & winter sun ray visualization
 *   - Preset view switches (Isometric, South Solar, North, Plan)
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { Compass, Eye, Maximize2, Layers, X } from 'lucide-react';
import { getMaterialSpec, computeLayerR, computeTotalU } from './materialsData';
import './Shelter3DCanvas.css';

export default function Shelter3DCanvas({
  request,
  viewMode = 'solid', // 'solid' | 'exploded' | 'thermal'
  showDimensions = true,
  showSolarRays = true,
  snowCover = true,
  onHotspotSelect,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Three.js internal references
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const shelterGroupRef = useRef(null);
  const roofMeshRef = useRef(null);
  const wallMeshesRef = useRef([]);
  const sunLightRef = useRef(null);
  const sunMeshRef = useRef(null);
  const solarRayMeshRef = useRef(null);
  const orbitStateRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    theta: Math.PI / 4,  // Azimuth
    phi: Math.PI / 3.2,  // Elevation
    radius: 14,          // Distance
    target: new THREE.Vector3(0, 1.2, 0),
  });

  // State for projected 2D hotspot pins & UI
  const [activePreset, setActivePreset] = useState('iso');
  const [azimuthDeg, setAzimuthDeg] = useState(45);
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinPositions, setPinPositions] = useState([]);

  // Extract geometry & envelope props safely
  const length_m = request?.geometry?.length_m ?? 6.0;
  const width_m  = request?.geometry?.width_m ?? 4.0;
  const height_m = request?.geometry?.height_m ?? 2.6;
  const orientation_deg = request?.geometry?.orientation_deg ?? 180;
  const walls = useMemo(() => request?.envelope?.walls || [], [request?.envelope?.walls]);
  const roof  = useMemo(() => request?.envelope?.roof  || [], [request?.envelope?.roof]);
  const floor = useMemo(() => request?.envelope?.floor || [], [request?.envelope?.floor]);
  const openings = useMemo(() => request?.openings || [], [request?.openings]);

  // Primary wall materials
  const outerWallMat = walls[0]?.material || 'mud_brick';
  const innerWallMat = walls[1]?.material || 'eps';
  const roofMat = roof[0]?.material || 'concrete';
  const floorMat = floor[0]?.material || 'concrete';

  const totalWallThickness = walls.reduce((sum, w) => sum + (Number(w.thickness_m) || 0.1), 0);
  const wallUValue = computeTotalU(walls);

  /* ─────────────────────────────────────────────────────────────────────────
     1. THREE.JS SCENE INITIALIZATION
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null; // transparent to show grid background

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xfff6ea, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfffbf0, 0x5a4838, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Directional Sun Light
    const sunLight = new THREE.DirectionalLight(0xffedd4, 1.8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -8;
    sunLight.shadow.camera.right = 8;
    sunLight.shadow.camera.top = 8;
    sunLight.shadow.camera.bottom = -8;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Sun Visual Glyph
    const sunGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xF77331 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // Soft Rim Light from north
    const rimLight = new THREE.DirectionalLight(0x7da4d4, 0.45);
    rimLight.position.set(0, 10, -12);
    scene.add(rimLight);

    // Architectural Ground Grid / Shadow Receiver
    const shadowPlaneGeo = new THREE.PlaneGeometry(24, 24);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Circular 360° Turntable Ring
    const turntableGroup = new THREE.Group();
    const ringRadius = 6.2;
    const ringGeo = new THREE.RingGeometry(ringRadius - 0.025, ringRadius + 0.025, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xC4AD8E,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    turntableGroup.add(ringMesh);

    // Cardinal Orientation Ticks (N, E, S, W)
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const tickLen = isCardinal ? 0.35 : 0.18;
      const tickGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ringRadius * Math.cos(rad), 0.01, ringRadius * Math.sin(rad)),
        new THREE.Vector3((ringRadius + tickLen) * Math.cos(rad), 0.01, (ringRadius + tickLen) * Math.sin(rad)),
      ]);
      const tickLine = new THREE.Line(
        tickGeo,
        new THREE.LineBasicMaterial({ color: isCardinal ? 0x200F07 : 0xC4AD8E, linewidth: isCardinal ? 2 : 1 })
      );
      turntableGroup.add(tickLine);
    }
    scene.add(turntableGroup);

    // Initial Camera position
    updateCameraPosition();

    // Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Render loop
    const renderLoop = () => {
      animFrameIdRef.current = requestAnimationFrame(renderLoop);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        updateProjectedPins();
      }
    };
    renderLoop();

    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     2. REBUILD 3D SHELTER MESH WHEN PARAMETERS CHANGE
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old shelter group if it exists
    if (shelterGroupRef.current) {
      scene.remove(shelterGroupRef.current);
      shelterGroupRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }

    const shelter = new THREE.Group();
    shelterGroupRef.current = shelter;
    wallMeshesRef.current = [];

    const l = length_m; // X dimension
    const w = width_m;  // Z dimension
    const h = height_m; // Y dimension

    const isThermal = viewMode === 'thermal';
    const isExploded = viewMode === 'exploded';

    // Materials helper
    const getMeshMat = (matId, thermalColor = null) => {
      if (isThermal && thermalColor) {
        return new THREE.MeshStandardMaterial({
          color: thermalColor,
          roughness: 0.4,
          metalness: 0.1,
        });
      }
      const spec = getMaterialSpec(matId);
      return new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: spec.roughness ?? 0.8,
        metalness: spec.metalness ?? 0.05,
      });
    };

    // ── Floor Slab & Thermal Mass ──────────────────────────────────────────
    const floorThick = 0.25;
    const floorGeo = new THREE.BoxGeometry(l + 0.3, floorThick, w + 0.3);
    const floorMeshMat = getMeshMat(floorMat, 0x238551);
    const floorMesh = new THREE.Mesh(floorGeo, floorMeshMat);
    floorMesh.position.set(0, floorThick / 2, 0);
    floorMesh.receiveShadow = true;
    floorMesh.castShadow = true;
    shelter.add(floorMesh);

    // ── Foundation Plinth ──────────────────────────────────────────────────
    const plinthGeo = new THREE.BoxGeometry(l + 0.5, 0.2, w + 0.5);
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x6e6860, roughness: 0.9 });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.set(0, 0.1, 0);
    plinthMesh.receiveShadow = true;
    shelter.add(plinthMesh);

    // ── Walls Assembly (North, South, East, West) ──────────────────────────
    const wallThick = Math.max(0.2, totalWallThickness);
    const wallY = floorThick + h / 2;

    // North Wall (Cold exterior facade: blue in thermal)
    const northGeo = new THREE.BoxGeometry(l, h, wallThick);
    const northMat = getMeshMat(outerWallMat, 0x1E3A8A); // Deep cold blue
    const northWall = new THREE.Mesh(northGeo, northMat);
    northWall.position.set(0, wallY, -w / 2 + wallThick / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    northWall.userData = { id: 'north_wall', role: 'wall', label: 'North Wall (Protected)' };
    shelter.add(northWall);
    wallMeshesRef.current.push(northWall);

    // East Wall
    const sideWallLen = w - wallThick * 2;
    const eastGeo = new THREE.BoxGeometry(wallThick, h, sideWallLen);
    const eastMat = getMeshMat(outerWallMat, 0x3B82F6);
    const eastWall = new THREE.Mesh(eastGeo, eastMat);
    eastWall.position.set(-l / 2 + wallThick / 2, wallY, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    shelter.add(eastWall);
    wallMeshesRef.current.push(eastWall);

    // West Wall
    const westWall = new THREE.Mesh(eastGeo, eastMat);
    westWall.position.set(l / 2 - wallThick / 2, wallY, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    shelter.add(westWall);
    wallMeshesRef.current.push(westWall);

    // South Wall with Solar Glazing Aperture (South is at +Z)
    // In thermal mode, South solar collector is warm amber (#F77331)
    const southGroup = new THREE.Group();
    southGroup.position.set(0, wallY, w / 2 - wallThick / 2);

    const southOpening = openings.find(o => o.facing === 'south') || { area_m2: 4.0, glazing: 'double_pane' };
    const winWidth = Math.min(l * 0.75, Math.max(1.5, Math.sqrt(southOpening.area_m2 * 1.5)));
    const winHeight = Math.min(h * 0.75, southOpening.area_m2 / winWidth);
    const winYOffset = -h / 2 + winHeight / 2 + 0.3;

    // Left and right opaque wall piers
    const pierWidth = Math.max(0.2, (l - winWidth) / 2);
    const pierGeo = new THREE.BoxGeometry(pierWidth, h, wallThick);
    const southPierMat = getMeshMat(outerWallMat, 0xF97316);

    const leftPier = new THREE.Mesh(pierGeo, southPierMat);
    leftPier.position.set(-l / 2 + pierWidth / 2, 0, 0);
    leftPier.castShadow = true;
    leftPier.receiveShadow = true;
    southGroup.add(leftPier);

    const rightPier = new THREE.Mesh(pierGeo, southPierMat);
    rightPier.position.set(l / 2 - pierWidth / 2, 0, 0);
    rightPier.castShadow = true;
    rightPier.receiveShadow = true;
    southGroup.add(rightPier);

    // Lintel above window
    const lintelHeight = h - (winHeight + 0.3);
    if (lintelHeight > 0.1) {
      const lintelGeo = new THREE.BoxGeometry(winWidth, lintelHeight, wallThick);
      const lintel = new THREE.Mesh(lintelGeo, southPierMat);
      lintel.position.set(0, h / 2 - lintelHeight / 2, 0);
      lintel.castShadow = true;
      southGroup.add(lintel);
    }

    // Window Glazing Frame (Timber / Powder-coated Aluminium)
    const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, wallThick * 0.4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4A3728, roughness: 0.7 });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(0, winYOffset, 0);
    southGroup.add(frameMesh);

    // Glass Panes (Transparent & Reflective)
    const glassGeo = new THREE.BoxGeometry(winWidth - 0.12, winHeight - 0.12, 0.02);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x9ed3eb,
      transparent: true,
      opacity: isThermal ? 0.85 : 0.42,
      roughness: 0.1,
      transmission: isThermal ? 0.0 : 0.88,
      ior: 1.52,
      reflectivity: 0.9,
    });
    if (isThermal) glassMat.color.setHex(0xF59E0B);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, winYOffset, 0);
    southGroup.add(glassMesh);

    // Night Shutter Indicator (if enabled)
    if (southOpening.night_shutter) {
      const shutterGeo = new THREE.BoxGeometry(winWidth - 0.1, winHeight - 0.1, 0.04);
      const shutterMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.6 });
      const shutterMesh = new THREE.Mesh(shutterGeo, shutterMat);
      shutterMesh.position.set(0, winYOffset, -wallThick * 0.2);
      southGroup.add(shutterMesh);
    }

    shelter.add(southGroup);
    wallMeshesRef.current.push(southGroup);

    // ── Roof Assembly ──────────────────────────────────────────────────────
    const roofThick = 0.22;
    const roofOverhang = 0.45;
    const roofGeo = new THREE.BoxGeometry(l + roofOverhang * 2, roofThick, w + roofOverhang * 2);
    const roofMeshMat = getMeshMat(roofMat, 0x1E293B); // Deep sky radiative cold in thermal
    const roofMesh = new THREE.Mesh(roofGeo, roofMeshMat);
    roofMesh.position.set(0, floorThick + h + roofThick / 2, 0);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    roofMeshRef.current = roofMesh;
    shelter.add(roofMesh);

    // Snow Cover Layer on Roof
    if (snowCover) {
      const snowGeo = new THREE.BoxGeometry(l + roofOverhang * 2, 0.08, w + roofOverhang * 2);
      const snowMat = new THREE.MeshStandardMaterial({
        color: 0xF8FAFC,
        roughness: 0.85,
        metalness: 0.05,
      });
      const snowMesh = new THREE.Mesh(snowGeo, snowMat);
      snowMesh.position.set(0, roofThick / 2 + 0.04, 0);
      snowMesh.receiveShadow = true;
      roofMesh.add(snowMesh);
    }

    // Exploded View GSAP Transitions
    if (isExploded) {
      gsap.to(roofMesh.position, { y: floorThick + h + roofThick / 2 + 2.0, duration: 0.8, ease: 'power2.out' });
      gsap.to(northWall.position, { z: -w / 2 + wallThick / 2 - 0.9, duration: 0.8, ease: 'power2.out' });
      gsap.to(southGroup.position, { z: w / 2 - wallThick / 2 + 0.9, duration: 0.8, ease: 'power2.out' });
      gsap.to(eastWall.position, { x: -l / 2 + wallThick / 2 - 0.9, duration: 0.8, ease: 'power2.out' });
      gsap.to(westWall.position, { x: l / 2 - wallThick / 2 + 0.9, duration: 0.8, ease: 'power2.out' });
    }

    scene.add(shelter);
  }, [length_m, width_m, height_m, walls, roof, floor, openings, viewMode, snowCover]);

  /* ─────────────────────────────────────────────────────────────────────────
     3. SUN & SOLAR VECTOR POSITIONING
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!sunLightRef.current || !sunMeshRef.current) return;

    // Winter sun in Leh (Lat 34.15° N) has noon altitude ~32.4°
    // Orientation: 180° = South (+Z), 0° = North (-Z), 90° = East (-X), 270° = West (+X)
    const rad = (orientation_deg * Math.PI) / 180;
    const sunDist = 11;
    const altitudeRad = (32.4 * Math.PI) / 180;

    const sunX = sunDist * Math.cos(altitudeRad) * Math.sin(rad);
    const sunY = sunDist * Math.sin(altitudeRad);
    const sunZ = sunDist * Math.cos(altitudeRad) * Math.cos(rad);

    gsap.to(sunLightRef.current.position, { x: sunX, y: sunY, z: sunZ, duration: 0.6, ease: 'power2.out' });
    gsap.to(sunMeshRef.current.position, { x: sunX * 1.1, y: sunY * 1.1, z: sunZ * 1.1, duration: 0.6, ease: 'power2.out' });

    // Luminous solar ray line into the south glazing
    if (showSolarRays && sceneRef.current) {
      if (solarRayMeshRef.current) sceneRef.current.remove(solarRayMeshRef.current);
      const points = [
        new THREE.Vector3(sunX * 0.9, sunY * 0.9, sunZ * 0.9),
        new THREE.Vector3(0, 1.2, width_m / 2),
      ];
      const rayGeo = new THREE.BufferGeometry().setFromPoints(points);
      const rayMat = new THREE.LineDashedMaterial({
        color: 0xF77331,
        dashSize: 0.4,
        gapSize: 0.2,
        linewidth: 2,
        transparent: true,
        opacity: 0.75,
      });
      const rayLine = new THREE.Line(rayGeo, rayMat);
      rayLine.computeLineDistances();
      sceneRef.current.add(rayLine);
      solarRayMeshRef.current = rayLine;
    }
  }, [orientation_deg, width_m, showSolarRays]);

  /* ─────────────────────────────────────────────────────────────────────────
     4. ORBIT CAMERA & TOUCH CONTROLS
     ───────────────────────────────────────────────────────────────────────── */
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { theta, phi, radius, target } = orbitStateRef.current;
    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);

    // Calculate current visual azimuth for the turntable badge
    let deg = Math.round((theta * 180) / Math.PI) % 360;
    if (deg < 0) deg += 360;
    setAzimuthDeg(deg);
  }, []);

  const handleMouseDown = (e) => {
    orbitStateRef.current.isDragging = true;
    orbitStateRef.current.prevX = e.clientX;
    orbitStateRef.current.prevY = e.clientY;
    if (selectedPin) setSelectedPin(null);
  };

  const handleMouseMove = (e) => {
    if (!orbitStateRef.current.isDragging) return;
    const deltaX = e.clientX - orbitStateRef.current.prevX;
    const deltaY = e.clientY - orbitStateRef.current.prevY;
    orbitStateRef.current.prevX = e.clientX;
    orbitStateRef.current.prevY = e.clientY;

    orbitStateRef.current.theta -= deltaX * 0.007;
    orbitStateRef.current.phi = Math.max(
      0.15,
      Math.min(Math.PI / 2.05, orbitStateRef.current.phi - deltaY * 0.007)
    );
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    orbitStateRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    orbitStateRef.current.radius = Math.max(
      6,
      Math.min(26, orbitStateRef.current.radius + e.deltaY * 0.015)
    );
    updateCameraPosition();
  };

  // View Preset Tweens
  const setPresetView = (presetKey) => {
    setActivePreset(presetKey);
    let targetTheta = Math.PI / 4;
    let targetPhi = Math.PI / 3.2;
    let targetRadius = 14;

    switch (presetKey) {
      case 'iso':
        targetTheta = Math.PI / 4;
        targetPhi = Math.PI / 3.2;
        targetRadius = 14;
        break;
      case 'south': // Look straight at South Glazing (+Z)
        targetTheta = 0;
        targetPhi = Math.PI / 2.3;
        targetRadius = 11;
        break;
      case 'north': // Look at North facade (-Z)
        targetTheta = Math.PI;
        targetPhi = Math.PI / 2.3;
        targetRadius = 11;
        break;
      case 'plan': // Top-down
        targetTheta = 0;
        targetPhi = 0.05;
        targetRadius = 15;
        break;
      default:
        break;
    }

    gsap.to(orbitStateRef.current, {
      theta: targetTheta,
      phi: targetPhi,
      radius: targetRadius,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: updateCameraPosition,
    });
  };

  /* ─────────────────────────────────────────────────────────────────────────
     5. 3D TO SCREEN HOTSPOT PROJECTION
     ───────────────────────────────────────────────────────────────────────── */
  const updateProjectedPins = useCallback(() => {
    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const rawHotspots = [
      {
        id: 'wall',
        label: `Wall: ${getMaterialSpec(outerWallMat).name}`,
        sub: `${Math.round(totalWallThickness * 1000)}mm · U: ${wallUValue.toFixed(2)} W/m²K`,
        category: 'Envelope',
        pos: new THREE.Vector3(length_m / 2, height_m * 0.6, width_m / 2),
        spec: getMaterialSpec(outerWallMat),
        thickness_mm: Math.round(totalWallThickness * 1000),
        rVal: (1 / wallUValue).toFixed(2),
        uVal: wallUValue.toFixed(2),
      },
      {
        id: 'glazing',
        label: 'South Glazing (Direct Gain)',
        sub: `${openings[0]?.area_m2 || 4.0} m² · ${openings[0]?.glazing?.replace('_', ' ') || 'double pane'}`,
        category: 'Passive Solar',
        pos: new THREE.Vector3(0, 1.2, width_m / 2 + 0.1),
        spec: { name: 'Double Pane Low-E Glazing', category: 'Glazing', k: 1.0, rho: 2500, cp: 840 },
        thickness_mm: '24 (4-16-4)',
        rVal: '0.36',
        uVal: '2.80',
      },
      {
        id: 'roof',
        label: `Roof: ${getMaterialSpec(roofMat).name}`,
        sub: `${Math.round((roof[0]?.thickness_m || 0.15) * 1000)}mm ${snowCover ? '· Snow Cover' : ''}`,
        category: 'Thermal Envelope',
        pos: new THREE.Vector3(-length_m / 3, height_m + 0.3, -width_m / 4),
        spec: getMaterialSpec(roofMat),
        thickness_mm: Math.round((roof[0]?.thickness_m || 0.15) * 1000),
        rVal: computeLayerR(roofMat, roof[0]?.thickness_m || 0.15).toFixed(2),
        uVal: (1 / (computeLayerR(roofMat, roof[0]?.thickness_m || 0.15) + 0.17)).toFixed(2),
      },
    ];

    const projected = rawHotspots.map((hs) => {
      const v = hs.pos.clone();
      v.project(camera);
      const x = ((v.x + 1) / 2) * w;
      const y = ((-v.y + 1) / 2) * h;
      const isVisible = v.z < 1.0;
      return { ...hs, screenX: x, screenY: y, isVisible };
    });

    setPinPositions(projected);
  }, [length_m, width_m, height_m, outerWallMat, totalWallThickness, wallUValue, openings, roofMat, roof, snowCover]);

  return (
    <div
      className="shelter-3d-wrapper"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* CAD Grid Texture */}
      <div className="shelter-3d-grid-bg" />

      {/* WebGL Canvas */}
      <canvas className="shelter-3d-canvas" ref={canvasRef} />

      {/* Hotspots Overlay */}
      <div className="hotspot-layer">
        {pinPositions.map(
          (pin) =>
            pin.isVisible && (
              <div
                key={pin.id}
                className={`hotspot-pin ${selectedPin?.id === pin.id ? 'active' : ''}`}
                style={{ left: pin.screenX, top: pin.screenY }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(selectedPin?.id === pin.id ? null : pin);
                  if (onHotspotSelect) onHotspotSelect(pin);
                }}
              >
                <span className="hotspot-dot" />
                <span className="hotspot-label">{pin.label}</span>

                {/* Popover Card */}
                {selectedPin?.id === pin.id && (
                  <div className="hotspot-popover" onClick={(e) => e.stopPropagation()}>
                    <div className="popover-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h4 className="popover-title">{pin.label}</h4>
                        <span className="popover-badge">{pin.category}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPin(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 4,
                        }}
                        aria-label="Close details"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="popover-desc">{pin.spec.description || pin.sub}</p>
                    <div className="popover-grid">
                      <div className="popover-stat">
                        <span className="popover-stat-label">Thickness</span>
                        <span className="popover-stat-val">{pin.thickness_mm} mm</span>
                      </div>
                      <div className="popover-stat">
                        <span className="popover-stat-label">Thermal Cond (k)</span>
                        <span className="popover-stat-val">{pin.spec.k ?? '—'} W/m·K</span>
                      </div>
                      <div className="popover-stat">
                        <span className="popover-stat-label">R-Value</span>
                        <span className="popover-stat-val">{pin.rVal} m²·K/W</span>
                      </div>
                      <div className="popover-stat">
                        <span className="popover-stat-label">U-Value</span>
                        <span className="popover-stat-val">{pin.uVal} W/m²·K</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
        )}
      </div>

      {/* 360° Turntable Readout Badge */}
      <div className="turntable-badge" title="Turntable Azimuth Angle">
        <Compass className="turntable-badge-icon" />
        <span>360° Orbit · {azimuthDeg}° Azimuth</span>
      </div>

      {/* View Presets Bar */}
      <div className="view-presets-bar">
        <button
          className={`preset-chip ${activePreset === 'iso' ? 'active' : ''}`}
          onClick={() => setPresetView('iso')}
          title="Isometric View"
        >
          Isometric
        </button>
        <button
          className={`preset-chip ${activePreset === 'south' ? 'active' : ''}`}
          onClick={() => setPresetView('south')}
          title="South Solar Aperture"
        >
          South Glazing
        </button>
        <button
          className={`preset-chip ${activePreset === 'north' ? 'active' : ''}`}
          onClick={() => setPresetView('north')}
          title="North Sheltered Facade"
        >
          North
        </button>
        <button
          className={`preset-chip ${activePreset === 'plan' ? 'active' : ''}`}
          onClick={() => setPresetView('plan')}
          title="Top-Down Plan View"
        >
          Plan
        </button>
      </div>
    </div>
  );
}
