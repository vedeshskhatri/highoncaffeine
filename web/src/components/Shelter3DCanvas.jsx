/*
 * Shelter3DCanvas.jsx — High-End 3D Architectural Shelter Studio
 * Powered by Three.js & GSAP.
 *
 * Features:
 *   - Parametric 3D building with authentic procedural PBR textures (Adobe, Stone, Timber, EPS, Snow, Concrete)
 *   - Architectural details: exposed timber rafters (Talashing), stone plinth, window mullions, night shutter, airlock vestibule
 *   - Multi-layer exploded view with individual material layer separation & 3D HUD callouts
 *   - Atmospheric Himalayan panorama: snow-capped mountain ridges, sky dome, and contoured plateau terrain
 *   - 3D celestial solar diurnal arc with hourly tick nodes
 *   - Integrated interactive SolarController: time scrubbing (06h-18h), 24h diurnal transit play, live telemetry
 *   - 360° turntable orbit with compass orientation and camera presets
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { Compass, Eye, Maximize2, Layers, X, Mountain, Grid, Sun, Flame, Sparkles } from 'lucide-react';
import { getMaterialSpec, computeLayerR, computeTotalU } from './materialsData';
import {
  getAdobeTexture,
  getStoneTexture,
  getTimberTexture,
  getEpsTexture,
  getSnowTexture,
  getConcreteTexture,
} from './threeUtils/proceduralTextures';
import {
  createSkyDome,
  createHimalayanMountains,
  createPlateauGround,
  createCelestialSolarArc,
} from './threeUtils/himalayanEnvironment';
import SolarController, { computeSolarPosition } from './SolarController';
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
  const explodedLayersRef = useRef([]);
  const explodedPartsRef = useRef(null);
  const prevExplodedRef = useRef(viewMode === 'exploded');
  const updateProjectedPinsRef = useRef(null);
  const sunLightRef = useRef(null);
  const sunGroupRef = useRef(null);
  const solarRayMeshRef = useRef(null);
  const solarArcGroupRef = useRef(null);
  const himalayanEnvRef = useRef(null);

  const orbitStateRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    theta: Math.PI / 4,  // Azimuth
    phi: Math.PI / 3.2,  // Elevation
    radius: 14.5,        // Distance
    target: new THREE.Vector3(0, 1.3, 0),
  });

  // State for projected 2D hotspot pins & UI
  const [activePreset, setActivePreset] = useState('iso');
  const [azimuthDeg, setAzimuthDeg] = useState(45);
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinPositions, setPinPositions] = useState([]);
  const [explodedTags, setExplodedTags] = useState([]);

  // Solar & Environment UI States
  const [solarHour, setSolarHour] = useState(12.0);
  const [season, setSeason] = useState('winter');
  const [envMode, setEnvMode] = useState('himalayas'); // 'himalayas' | 'studio'

  // Extract geometry & envelope props safely
  const length_m = request?.geometry?.length_m ?? 6.0;
  const width_m  = request?.geometry?.width_m ?? 4.0;
  const height_m = request?.geometry?.height_m ?? 2.6;
  const orientation_deg = request?.geometry?.orientation_deg ?? 180;
  const walls = useMemo(() => request?.envelope?.walls || [], [request?.envelope?.walls]);
  const roof  = useMemo(() => request?.envelope?.roof  || [], [request?.envelope?.roof]);
  const floor = useMemo(() => request?.envelope?.floor || [], [request?.envelope?.floor]);
  const openings = useMemo(() => request?.openings || [], [request?.openings]);

  const outerWallMat = walls[0]?.material || 'mud_brick';
  const innerWallMat = walls[1]?.material || 'eps';
  const roofMat = roof[0]?.material || 'concrete';
  const floorMat = floor[0]?.material || 'concrete';

  const totalWallThickness = walls.reduce((sum, w) => sum + (Number(w.thickness_m) || 0.1), 0);
  const wallUValue = computeTotalU(walls);

  const isThermal = viewMode === 'thermal';
  const isExploded = viewMode === 'exploded';

  /* ─────────────────────────────────────────────────────────────────────────
     1. THREE.JS SCENE & ENVIRONMENT INITIALIZATION
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Atmospheric Fog
    scene.fog = new THREE.FogExp2(0xE8EDF2, 0.012);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 150);
    cameraRef.current = camera;

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

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xeef6fb, 0x6e5d48, 0.7);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    // Directional Sun Light (High-altitude winter sun)
    const sunLight = new THREE.DirectionalLight(0xfff1db, 2.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Soft Rim Light from North for edge definition
    const rimLight = new THREE.DirectionalLight(0x89b6e8, 0.6);
    rimLight.position.set(0, 12, -16);
    scene.add(rimLight);

    // ── Sun Visual Glyph (Luminous core + corona ring) ──
    const sunGroup = new THREE.Group();
    const coreGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFA044 });
    const sunCore = new THREE.Mesh(coreGeo, coreMat);
    sunGroup.add(sunCore);

    // Corona Ring
    const coronaGeo = new THREE.RingGeometry(0.65, 0.95, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xF77331,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    sunGroup.add(coronaMesh);

    scene.add(sunGroup);
    sunGroupRef.current = sunGroup;

    // ── Himalayan Panorama Environment ──
    const envGroup = new THREE.Group();
    envGroup.name = 'himalayan-environment';
    const sky = createSkyDome();
    const mountains = createHimalayanMountains();
    const plateau = createPlateauGround();
    envGroup.add(sky);
    envGroup.add(mountains);
    envGroup.add(plateau);
    scene.add(envGroup);
    himalayanEnvRef.current = envGroup;

    // Ground Shadow Receiver (for studio mode or fine shadow catch)
    const shadowPlaneGeo = new THREE.PlaneGeometry(36, 36);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.24 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.01;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ── Circular 360° Turntable Ring & Compass ──
    const turntableGroup = new THREE.Group();
    const ringRadius = 6.6;
    const ringGeo = new THREE.RingGeometry(ringRadius - 0.03, ringRadius + 0.03, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x9A8C84,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
    turntableGroup.add(ringMesh);

    // Cardinal Orientation Ticks (N, E, S, W)
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const tickLen = isCardinal ? 0.45 : 0.2;
      const tickGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ringRadius * Math.cos(rad), 0.04, ringRadius * Math.sin(rad)),
        new THREE.Vector3((ringRadius + tickLen) * Math.cos(rad), 0.04, (ringRadius + tickLen) * Math.sin(rad)),
      ]);
      const tickLine = new THREE.Line(
        tickGeo,
        new THREE.LineBasicMaterial({
          color: isCardinal ? 0xF77331 : 0x9A8C84,
          linewidth: isCardinal ? 2 : 1,
        })
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
        if (sunGroupRef.current) {
          sunGroupRef.current.lookAt(cameraRef.current.position);
        }
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        if (updateProjectedPinsRef.current) {
          updateProjectedPinsRef.current();
        } else {
          updateProjectedPins();
        }
      }
    };
    renderLoop();

    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
    };
  }, []);

  // Toggle Environment Mode (Himalayas vs Studio Grid)
  useEffect(() => {
    if (!himalayanEnvRef.current) return;
    himalayanEnvRef.current.visible = envMode === 'himalayas';
    if (sceneRef.current) {
      sceneRef.current.fog = envMode === 'himalayas'
        ? new THREE.FogExp2(0xE8EDF2, 0.012)
        : null;
    }
  }, [envMode]);

  /* ─────────────────────────────────────────────────────────────────────────
     2. REBUILD 3D ARCHITECTURAL SHELTER (PROCEDURAL TEXTURES & DETAILS)
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up old shelter group
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
    explodedLayersRef.current = [];

    const l = length_m; // X dimension
    const w = width_m;  // Z dimension
    const h = height_m; // Y dimension

    // Textures
    const adobeTex = getAdobeTexture();
    const stoneTex = getStoneTexture();
    const timberTex = getTimberTexture();
    const epsTex = getEpsTexture();
    const snowTex = getSnowTexture();
    const concreteTex = getConcreteTexture();

    // PBR Material generator with authentic procedural maps
    const createMat = (type, thermalColor, roughness = 0.85, metalness = 0.05) => {
      if (isThermal && thermalColor) {
        return new THREE.MeshStandardMaterial({
          color: thermalColor,
          roughness: 0.35,
          metalness: 0.1,
        });
      }

      switch (type) {
        case 'adobe':
          return new THREE.MeshStandardMaterial({
            map: adobeTex,
            roughness: 0.92,
            metalness: 0.02,
          });
        case 'stone':
          return new THREE.MeshStandardMaterial({
            map: stoneTex,
            roughness: 0.88,
            metalness: 0.08,
          });
        case 'timber':
          return new THREE.MeshStandardMaterial({
            map: timberTex,
            roughness: 0.65,
            metalness: 0.04,
          });
        case 'eps':
          return new THREE.MeshStandardMaterial({
            map: epsTex,
            roughness: 0.55,
            metalness: 0.0,
          });
        case 'snow':
          return new THREE.MeshStandardMaterial({
            map: snowTex,
            roughness: 0.82,
            metalness: 0.05,
          });
        case 'concrete':
        default:
          return new THREE.MeshStandardMaterial({
            map: concreteTex,
            roughness: 0.8,
            metalness: 0.1,
          });
      }
    };

    const wallTexType = outerWallMat === 'stone' ? 'stone' : 'adobe';
    const wallExteriorMat = createMat(wallTexType, 0xF97316);
    const wallInsulationMat = createMat('eps', 0xEAB308);
    const wallInteriorMat = createMat('adobe', 0x22C55E);
    const timberMat = createMat('timber', 0xB45309);
    const stonePlinthMat = createMat('stone', 0x475569);
    const concreteFloorMat = createMat('concrete', 0x15803D);

    // ── 1. Chamfered Foundation Plinth ──
    const plinthThick = 0.28;
    const plinthGeo = new THREE.BoxGeometry(l + 0.6, plinthThick, w + 0.6);
    const plinthMesh = new THREE.Mesh(plinthGeo, stonePlinthMat);
    plinthMesh.position.set(0, plinthThick / 2, 0);
    plinthMesh.receiveShadow = true;
    plinthMesh.castShadow = true;
    shelter.add(plinthMesh);

    // ── 2. Thermal Mass Floor Slab & Timber Interior Deck ──
    const floorSlabThick = 0.22;
    const floorGeo = new THREE.BoxGeometry(l + 0.2, floorSlabThick, w + 0.2);
    const floorMesh = new THREE.Mesh(floorGeo, concreteFloorMat);
    floorMesh.position.set(0, plinthThick + floorSlabThick / 2, 0);
    floorMesh.receiveShadow = true;
    floorMesh.castShadow = true;
    shelter.add(floorMesh);

    // Interior timber finish visible through window
    const timberFloorGeo = new THREE.BoxGeometry(l - 0.2, 0.02, w - 0.2);
    const timberFloorMesh = new THREE.Mesh(timberFloorGeo, timberMat);
    timberFloorMesh.position.set(0, plinthThick + floorSlabThick + 0.01, 0);
    timberFloorMesh.receiveShadow = true;
    shelter.add(timberFloorMesh);

    // ── 3. Multi-Layer Wall Assemblies (Exterior, EPS Core, Interior) ──
    const totalWallThick = Math.max(0.25, totalWallThickness);
    const extThick = totalWallThick * 0.65;  // 65% outer mass
    const coreThick = totalWallThick * 0.25; // 25% EPS core
    const intThick = totalWallThick * 0.10;  // 10% interior finish
    const wallBaseY = plinthThick + floorSlabThick + h / 2;

    // Corner Stone / Timber Quoins for architectural authenticity
    const quoinSize = totalWallThick * 1.1;
    const quoinGeo = new THREE.BoxGeometry(quoinSize, h, quoinSize);
    const corners = [
      { x: -l / 2 + quoinSize / 2, z: -w / 2 + quoinSize / 2 },
      { x:  l / 2 - quoinSize / 2, z: -w / 2 + quoinSize / 2 },
      { x: -l / 2 + quoinSize / 2, z:  w / 2 - quoinSize / 2 },
      { x:  l / 2 - quoinSize / 2, z:  w / 2 - quoinSize / 2 },
    ];
    corners.forEach(c => {
      const qMesh = new THREE.Mesh(quoinGeo, stonePlinthMat);
      qMesh.position.set(c.x, wallBaseY, c.z);
      qMesh.castShadow = true;
      qMesh.receiveShadow = true;
      shelter.add(qMesh);
    });

    // ── A. North Wall (Cold exterior facade: Deep blue in thermal) ──
    const northGroup = new THREE.Group();
    northGroup.position.set(0, wallBaseY, -w / 2 + totalWallThick / 2);

    // Exterior Mud Brick Layer
    const northExtGeo = new THREE.BoxGeometry(l, h, extThick);
    const northExt = new THREE.Mesh(northExtGeo, wallExteriorMat);
    northExt.position.z = -coreThick / 2 - intThick / 2;
    northExt.castShadow = true;
    northExt.receiveShadow = true;
    northGroup.add(northExt);

    // Core EPS Insulation Layer
    const northCoreGeo = new THREE.BoxGeometry(l, h, coreThick);
    const northCore = new THREE.Mesh(northCoreGeo, wallInsulationMat);
    northCore.position.z = 0;
    northGroup.add(northCore);

    // Interior Plaster Layer
    const northIntGeo = new THREE.BoxGeometry(l, h, intThick);
    const northInt = new THREE.Mesh(northIntGeo, wallInteriorMat);
    northInt.position.z = coreThick / 2 + intThick / 2;
    northGroup.add(northInt);

    shelter.add(northGroup);

    // ── B. East & West Side Walls with Vestibule Airlock Door on East ──
    const sideWallLen = w - totalWallThick * 2;
    const eastGroup = new THREE.Group();
    eastGroup.position.set(-l / 2 + totalWallThick / 2, wallBaseY, 0);

    const eastExtGeo = new THREE.BoxGeometry(extThick, h, sideWallLen);
    const eastExt = new THREE.Mesh(eastExtGeo, wallExteriorMat);
    eastExt.position.x = -coreThick / 2 - intThick / 2;
    eastExt.castShadow = true;
    eastExt.receiveShadow = true;
    eastGroup.add(eastExt);

    const eastCoreGeo = new THREE.BoxGeometry(coreThick, h, sideWallLen);
    const eastCore = new THREE.Mesh(eastCoreGeo, wallInsulationMat);
    eastGroup.add(eastCore);

    // Mountain Entry Airlock Doorway on East Facade
    const doorWidth = 0.95;
    const doorHeight = 1.95;
    const doorFrameGeo = new THREE.BoxGeometry(extThick * 1.15, doorHeight + 0.1, doorWidth + 0.1);
    const doorFrame = new THREE.Mesh(doorFrameGeo, timberMat);
    doorFrame.position.set(-coreThick / 2 - intThick / 2, -h / 2 + doorHeight / 2 + 0.05, 0.4);
    eastGroup.add(doorFrame);

    const doorLeafGeo = new THREE.BoxGeometry(0.06, doorHeight, doorWidth);
    const doorLeaf = new THREE.Mesh(doorLeafGeo, timberMat);
    doorLeaf.position.set(-coreThick / 2 - intThick / 2 - 0.02, -h / 2 + doorHeight / 2 + 0.05, 0.4);
    eastGroup.add(doorLeaf);

    shelter.add(eastGroup);

    // West Wall
    const westGroup = new THREE.Group();
    westGroup.position.set(l / 2 - totalWallThick / 2, wallBaseY, 0);

    const westExt = new THREE.Mesh(eastExtGeo, wallExteriorMat);
    westExt.position.x = coreThick / 2 + intThick / 2;
    westExt.castShadow = true;
    westExt.receiveShadow = true;
    westGroup.add(westExt);

    const westCore = new THREE.Mesh(eastCoreGeo, wallInsulationMat);
    westGroup.add(westCore);
    shelter.add(westGroup);

    // ── C. South Wall with Solar Glazing Aperture (+Z South) ──
    const southGroup = new THREE.Group();
    southGroup.position.set(0, wallBaseY, w / 2 - totalWallThick / 2);

    const southOpening = openings.find(o => o.facing === 'south') || { area_m2: 4.0, glazing: 'double_pane', night_shutter: true };
    const winWidth = Math.min(l * 0.76, Math.max(1.6, Math.sqrt(southOpening.area_m2 * 1.5)));
    const winHeight = Math.min(h * 0.75, southOpening.area_m2 / winWidth);
    const winYOffset = -h / 2 + winHeight / 2 + 0.35;

    // Left and right south wall piers
    const pierWidth = Math.max(0.2, (l - winWidth) / 2);
    const pierGeo = new THREE.BoxGeometry(pierWidth, h, totalWallThick);
    const leftPier = new THREE.Mesh(pierGeo, wallExteriorMat);
    leftPier.position.set(-l / 2 + pierWidth / 2, 0, 0);
    leftPier.castShadow = true;
    leftPier.receiveShadow = true;
    southGroup.add(leftPier);

    const rightPier = new THREE.Mesh(pierGeo, wallExteriorMat);
    rightPier.position.set(l / 2 - pierWidth / 2, 0, 0);
    rightPier.castShadow = true;
    rightPier.receiveShadow = true;
    southGroup.add(rightPier);

    // Heavy Timber Lintel above window
    const lintelHeight = h - (winHeight + 0.35);
    if (lintelHeight > 0.1) {
      const lintelGeo = new THREE.BoxGeometry(winWidth, lintelHeight, totalWallThick * 1.05);
      const lintel = new THREE.Mesh(lintelGeo, timberMat);
      lintel.position.set(0, h / 2 - lintelHeight / 2, 0);
      lintel.castShadow = true;
      southGroup.add(lintel);
    }

    // Architectural Timber Window Frame with Mullion & Sill
    const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, totalWallThick * 0.5);
    const frameMesh = new THREE.Mesh(frameGeo, timberMat);
    frameMesh.position.set(0, winYOffset, 0);
    southGroup.add(frameMesh);

    // Timber Mullion Divider (Vertical split)
    const mullionGeo = new THREE.BoxGeometry(0.08, winHeight, totalWallThick * 0.55);
    const mullion = new THREE.Mesh(mullionGeo, timberMat);
    mullion.position.set(0, winYOffset, 0.01);
    southGroup.add(mullion);

    // Projecting Timber Window Sill
    const sillGeo = new THREE.BoxGeometry(winWidth + 0.15, 0.08, totalWallThick * 0.7);
    const sill = new THREE.Mesh(sillGeo, timberMat);
    sill.position.set(0, winYOffset - winHeight / 2 - 0.04, 0.05);
    sill.castShadow = true;
    southGroup.add(sill);

    // High-Spec Glass Panes (Double Pane Low-E)
    const glassGeo = new THREE.BoxGeometry(winWidth - 0.12, winHeight - 0.12, 0.025);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x8cc4db,
      transparent: true,
      opacity: isThermal ? 0.85 : 0.42,
      roughness: 0.1,
      transmission: isThermal ? 0.0 : 0.88,
      ior: 1.52,
      reflectivity: 0.85,
    });
    if (isThermal) glassMat.color.setHex(0xF59E0B);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, winYOffset, 0);
    southGroup.add(glassMesh);

    // Operable Timber Night Shutter with Louver Slats
    const shutterGroup = new THREE.Group();
    shutterGroup.position.set(0, winYOffset, -totalWallThick * 0.25);

    const shutterLeafGeo = new THREE.BoxGeometry(winWidth * 0.48, winHeight - 0.1, 0.04);
    const shutterLeft = new THREE.Mesh(shutterLeafGeo, timberMat);
    shutterLeft.position.set(-winWidth * 0.24, 0, 0);
    shutterGroup.add(shutterLeft);

    const shutterRight = new THREE.Mesh(shutterLeafGeo, timberMat);
    shutterRight.position.set(winWidth * 0.24, 0, 0);
    shutterGroup.add(shutterRight);

    southGroup.add(shutterGroup);
    shelter.add(southGroup);

    // ── 4. Detailed Roof Assembly with Exposed Timber Rafters (Talashing) ──
    const roofGroup = new THREE.Group();
    const roofOverhang = 0.52;
    const roofLen = l + roofOverhang * 2;
    const roofWid = w + roofOverhang * 2;
    const roofBaseY = plinthThick + floorSlabThick + h;

    roofGroup.position.set(0, roofBaseY, 0);

    // Structural Exposed Timber Rafters (Talashing beams extending under eaves)
    const rafterCount = Math.max(6, Math.round(l / 0.65));
    const rafterGeo = new THREE.BoxGeometry(0.12, 0.16, roofWid - 0.1);
    for (let i = 0; i < rafterCount; i++) {
      const rx = -l / 2 - roofOverhang * 0.7 + (i / (rafterCount - 1)) * (roofLen - roofOverhang * 0.6);
      const rafter = new THREE.Mesh(rafterGeo, timberMat);
      rafter.position.set(rx, 0.08, 0);
      rafter.castShadow = true;
      roofGroup.add(rafter);
    }

    // Ceiling Timber Plank Decking
    const deckGeo = new THREE.BoxGeometry(roofLen - 0.05, 0.04, roofWid - 0.05);
    const deckMesh = new THREE.Mesh(deckGeo, timberMat);
    deckMesh.position.set(0, 0.18, 0);
    deckMesh.castShadow = true;
    roofGroup.add(deckMesh);

    // Continuous Roof EPS Insulation Board
    const roofInsulGeo = new THREE.BoxGeometry(roofLen, 0.15, roofWid);
    const roofInsulMesh = new THREE.Mesh(roofInsulGeo, wallInsulationMat);
    roofInsulMesh.position.set(0, 0.28, 0);
    roofGroup.add(roofInsulMesh);

    // Perimeter Timber Fascia Trim
    const fasciaThick = 0.04;
    const fasciaHeight = 0.32;
    const fasciaFrontGeo = new THREE.BoxGeometry(roofLen, fasciaHeight, fasciaThick);
    const fasciaFront = new THREE.Mesh(fasciaFrontGeo, timberMat);
    fasciaFront.position.set(0, 0.2, roofWid / 2);
    roofGroup.add(fasciaFront);

    const fasciaBack = new THREE.Mesh(fasciaFrontGeo, timberMat);
    fasciaBack.position.set(0, 0.2, -roofWid / 2);
    roofGroup.add(fasciaBack);

    // Weatherproof Roof Deck / Concrete Screed
    const screedGeo = new THREE.BoxGeometry(roofLen - 0.04, 0.06, roofWid - 0.04);
    const screedMesh = new THREE.Mesh(screedGeo, concreteFloorMat);
    screedMesh.position.set(0, 0.38, 0);
    screedMesh.receiveShadow = true;
    roofGroup.add(screedMesh);

    // Himalayan Crystalline Snow Blanket on Roof
    let snowMeshRef = null;
    if (snowCover) {
      const snowGeo = new THREE.BoxGeometry(roofLen, 0.12, roofWid);
      const snowMesh = new THREE.Mesh(snowGeo, createMat('snow', null));
      snowMesh.position.set(0, 0.46, 0);
      snowMesh.receiveShadow = true;
      snowMesh.castShadow = true;
      roofGroup.add(snowMesh);
      snowMeshRef = snowMesh;
    }

    shelter.add(roofGroup);

    // Save references to components and coordinate anchors for exploded transitions
    explodedPartsRef.current = {
      roofGroup,
      snowMeshRef,
      northGroup,
      northExt,
      southGroup,
      eastGroup,
      westGroup,
      base: {
        roofY: roofBaseY,
        snowY: 0.46,
        northZ: -w / 2 + totalWallThick / 2,
        northExtZ: -coreThick / 2 - intThick / 2,
        southZ: w / 2 - totalWallThick / 2,
        eastX: -l / 2 + totalWallThick / 2,
        westX: l / 2 - totalWallThick / 2,
      },
      exploded: {
        roofY: roofBaseY + 2.4,
        snowY: 1.2,
        northZ: -w / 2 - 1.4,
        northExtZ: -0.6,
        southZ: w / 2 + 1.4,
        eastX: -l / 2 - 1.4,
        westX: l / 2 + 1.4,
      },
    };

    // If rebuilding while in exploded mode, position meshes at their exploded offsets
    if (isExploded) {
      roofGroup.position.y = roofBaseY + 2.4;
      if (snowMeshRef) snowMeshRef.position.y = 1.2;
      northGroup.position.z = -w / 2 - 1.4;
      northExt.position.z = -0.6;
      southGroup.position.z = w / 2 + 1.4;
      eastGroup.position.x = -l / 2 - 1.4;
      westGroup.position.x = l / 2 + 1.4;
    }

    scene.add(shelter);
  }, [length_m, width_m, height_m, walls, roof, floor, openings, isThermal, snowCover, outerWallMat]);

  /* ─────────────────────────────────────────────────────────────────────────
     2B. EXPLODED VIEW EXPANSION & CLOSING ANIMATIONS (GSAP)
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const parts = explodedPartsRef.current;
    if (!parts) return;

    if (prevExplodedRef.current === isExploded) return;
    prevExplodedRef.current = isExploded;

    const { roofGroup, snowMeshRef, northGroup, northExt, southGroup, eastGroup, westGroup, base, exploded } = parts;

    // Halt any active tweens on shelter elements to avoid conflicts
    gsap.killTweensOf([
      roofGroup.position,
      northGroup.position,
      northExt.position,
      southGroup.position,
      eastGroup.position,
      westGroup.position,
    ]);
    if (snowMeshRef) gsap.killTweensOf(snowMeshRef.position);

    if (isExploded) {
      // ── Opening Animation (Preserved exactly as configured) ──
      gsap.to(roofGroup.position, { y: exploded.roofY, duration: 0.9, ease: 'power3.out' });
      if (snowMeshRef) {
        gsap.to(snowMeshRef.position, { y: exploded.snowY, duration: 1.1, ease: 'power3.out' });
      }

      gsap.to(northGroup.position, { z: exploded.northZ, duration: 0.9, ease: 'power3.out' });
      gsap.to(northExt.position, { z: exploded.northExtZ, duration: 1.0, ease: 'power3.out' });

      gsap.to(southGroup.position, { z: exploded.southZ, duration: 0.9, ease: 'power3.out' });

      gsap.to(eastGroup.position, { x: exploded.eastX, duration: 0.9, ease: 'power3.out' });
      gsap.to(westGroup.position, { x:  exploded.westX, duration: 0.9, ease: 'power3.out' });
    } else {
      // ── Closing Animation (Smooth return back into solid envelope) ──
      gsap.to(roofGroup.position, { y: base.roofY, duration: 0.9, ease: 'power3.out' });
      if (snowMeshRef) {
        gsap.to(snowMeshRef.position, { y: base.snowY, duration: 0.9, ease: 'power3.out' });
      }

      gsap.to(northGroup.position, { z: base.northZ, duration: 0.9, ease: 'power3.out' });
      gsap.to(northExt.position, { z: base.northExtZ, duration: 0.9, ease: 'power3.out' });

      gsap.to(southGroup.position, { z: base.southZ, duration: 0.9, ease: 'power3.out' });

      gsap.to(eastGroup.position, { x: base.eastX, duration: 0.9, ease: 'power3.out' });
      gsap.to(westGroup.position, { x:  base.westX, duration: 0.9, ease: 'power3.out' });
    }
  }, [isExploded]);

  /* ─────────────────────────────────────────────────────────────────────────
     3. 3D CELESTIAL SUN PATH & DIURNAL SOLAR POSITIONING
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old solar arc
    if (solarArcGroupRef.current) {
      scene.remove(solarArcGroupRef.current);
    }

    if (showSolarRays) {
      const arc = createCelestialSolarArc(season, orientation_deg);
      scene.add(arc);
      solarArcGroupRef.current = arc;
    }

    // Compute sun coordinates from real astronomical telemetry
    const solarPos = computeSolarPosition(solarHour, season, orientation_deg);
    const sunDist = 13.5;

    let sunX = 0;
    let sunY = 8;
    let sunZ = 10;

    if (solarPos.isDay) {
      const altRad = (solarPos.altitudeDeg * Math.PI) / 180;
      const azRad = (solarPos.azimuthDeg * Math.PI) / 180;
      sunX = sunDist * Math.cos(altRad) * Math.sin(azRad);
      sunY = sunDist * Math.sin(altRad);
      sunZ = sunDist * Math.cos(altRad) * Math.cos(azRad);
    } else {
      // Night / Sub-horizon
      sunY = -2;
    }

    if (sunLightRef.current) {
      gsap.to(sunLightRef.current.position, { x: sunX, y: Math.max(0.5, sunY), z: sunZ, duration: 0.35, ease: 'power2.out' });
      sunLightRef.current.intensity = solarPos.isDay ? Math.max(0.4, (solarPos.dni_wm2 / 900) * 2.3) : 0.05;
    }

    if (sunGroupRef.current) {
      gsap.to(sunGroupRef.current.position, { x: sunX, y: sunY, z: sunZ, duration: 0.35, ease: 'power2.out' });
      sunGroupRef.current.visible = solarPos.isDay;
    }

    // ── Volumetric Sun Shaft & Interior Floor Solar Patch ──
    if (showSolarRays && solarPos.isDay && sceneRef.current) {
      if (solarRayMeshRef.current) sceneRef.current.remove(solarRayMeshRef.current);

      const rayGroup = new THREE.Group();
      rayGroup.name = 'solar-beam-shaft';

      // 1. Direct beam dashed centerline
      const rayPoints = [
        new THREE.Vector3(sunX * 0.95, sunY * 0.95, sunZ * 0.95),
        new THREE.Vector3(0, 1.4, width_m / 2),
      ];
      const rayGeo = new THREE.BufferGeometry().setFromPoints(rayPoints);
      const rayMat = new THREE.LineDashedMaterial({
        color: 0xF77331,
        dashSize: 0.5,
        gapSize: 0.25,
        linewidth: 2,
        transparent: true,
        opacity: Math.min(0.85, (solarPos.altitudeDeg / 35) + 0.25),
      });
      const rayLine = new THREE.Line(rayGeo, rayMat);
      rayLine.computeLineDistances();
      rayGroup.add(rayLine);

      // 2. Window Aperture coordinates (South window: width ~2.2m, height ~1.3m, center Y ~1.3m)
      const winW = 2.0;
      const winH = 1.3;
      const winY = 1.35;
      const winZ = width_m / 2;
      const floorY = 0.51; // Floor slab top surface

      const wCorners = [
        new THREE.Vector3(-winW / 2, winY + winH / 2, winZ),
        new THREE.Vector3( winW / 2, winY + winH / 2, winZ),
        new THREE.Vector3( winW / 2, winY - winH / 2, winZ),
        new THREE.Vector3(-winW / 2, winY - winH / 2, winZ),
      ];

      // Ray-plane intersection from Sun to floor for each window corner
      const fCorners = [];
      const sunVec = new THREE.Vector3(sunX, sunY, sunZ);

      wCorners.forEach((wc) => {
        const dir = new THREE.Vector3().subVectors(wc, sunVec).normalize();
        if (dir.y < -0.01) {
          const t = (floorY - sunVec.y) / dir.y;
          const hit = new THREE.Vector3().copy(sunVec).addScaledVector(dir, t);
          // Clamp within interior floor bounds
          hit.x = Math.max(-length_m / 2 + 0.2, Math.min(length_m / 2 - 0.2, hit.x));
          hit.z = Math.max(-width_m / 2 + 0.2, Math.min(width_m / 2 - 0.1, hit.z));
          fCorners.push(hit);
        } else {
          fCorners.push(new THREE.Vector3(wc.x * 0.8, floorY, 0));
        }
      });

      if (fCorners.length === 4) {
        // Floor Illuminated Solar Patch Mesh
        const patchGeo = new THREE.BufferGeometry();
        const patchVerts = [
          fCorners[0].x, fCorners[0].y + 0.005, fCorners[0].z,
          fCorners[1].x, fCorners[1].y + 0.005, fCorners[1].z,
          fCorners[2].x, fCorners[2].y + 0.005, fCorners[2].z,

          fCorners[0].x, fCorners[0].y + 0.005, fCorners[0].z,
          fCorners[2].x, fCorners[2].y + 0.005, fCorners[2].z,
          fCorners[3].x, fCorners[3].y + 0.005, fCorners[3].z,
        ];
        patchGeo.setAttribute('position', new THREE.Float32BufferAttribute(patchVerts, 3));
        patchGeo.computeVertexNormals();

        const patchMat = new THREE.MeshBasicMaterial({
          color: 0xFDBA74,
          transparent: true,
          opacity: Math.min(0.75, (solarPos.dni_wm2 / 1000) * 0.85),
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const patchMesh = new THREE.Mesh(patchGeo, patchMat);
        rayGroup.add(patchMesh);

        // Volumetric Shaft Frustum
        const shaftGeo = new THREE.BufferGeometry();
        const shaftVerts = [
          // Left Side
          wCorners[0].x, wCorners[0].y, wCorners[0].z,
          fCorners[0].x, fCorners[0].y, fCorners[0].z,
          fCorners[3].x, fCorners[3].y, fCorners[3].z,

          wCorners[0].x, wCorners[0].y, wCorners[0].z,
          fCorners[3].x, fCorners[3].y, fCorners[3].z,
          wCorners[3].x, wCorners[3].y, wCorners[3].z,

          // Right Side
          wCorners[1].x, wCorners[1].y, wCorners[1].z,
          fCorners[1].x, fCorners[1].y, fCorners[1].z,
          fCorners[2].x, fCorners[2].y, fCorners[2].z,

          wCorners[1].x, wCorners[1].y, wCorners[1].z,
          fCorners[2].x, fCorners[2].y, fCorners[2].z,
          wCorners[2].x, wCorners[2].y, wCorners[2].z,

          // Top Face
          wCorners[0].x, wCorners[0].y, wCorners[0].z,
          wCorners[1].x, wCorners[1].y, wCorners[1].z,
          fCorners[1].x, fCorners[1].y, fCorners[1].z,

          wCorners[0].x, wCorners[0].y, wCorners[0].z,
          fCorners[1].x, fCorners[1].y, fCorners[1].z,
          fCorners[0].x, fCorners[0].y, fCorners[0].z,

          // Bottom Face
          wCorners[3].x, wCorners[3].y, wCorners[3].z,
          wCorners[2].x, wCorners[2].y, wCorners[2].z,
          fCorners[2].x, fCorners[2].y, fCorners[2].z,

          wCorners[3].x, wCorners[3].y, wCorners[3].z,
          fCorners[2].x, fCorners[2].y, fCorners[2].z,
          fCorners[3].x, fCorners[3].y, fCorners[3].z,
        ];

        shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute(shaftVerts, 3));
        shaftGeo.computeVertexNormals();

        const shaftMat = new THREE.MeshBasicMaterial({
          color: 0xFDBA74,
          transparent: true,
          opacity: Math.min(0.18, (solarPos.dni_wm2 / 1000) * 0.22),
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
        rayGroup.add(shaftMesh);
      }

      sceneRef.current.add(rayGroup);
      solarRayMeshRef.current = rayGroup;
    } else if (solarRayMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(solarRayMeshRef.current);
      solarRayMeshRef.current = null;
    }
  }, [solarHour, season, orientation_deg, showSolarRays, width_m, length_m]);

  /* ─────────────────────────────────────────────────────────────────────────
     4. ORBIT CONTROLS & CAMERA PRESETS
     ───────────────────────────────────────────────────────────────────────── */
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { theta, phi, radius, target } = orbitStateRef.current;
    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);

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
      6.5,
      Math.min(28, orbitStateRef.current.radius + e.deltaY * 0.015)
    );
    updateCameraPosition();
  };

  const setPresetView = (presetKey) => {
    setActivePreset(presetKey);
    let targetTheta = Math.PI / 4;
    let targetPhi = Math.PI / 3.2;
    let targetRadius = 14.5;

    switch (presetKey) {
      case 'iso':
        targetTheta = Math.PI / 4;
        targetPhi = Math.PI / 3.2;
        targetRadius = 14.5;
        break;
      case 'south':
        targetTheta = 0;
        targetPhi = Math.PI / 2.35;
        targetRadius = 11.5;
        break;
      case 'north':
        targetTheta = Math.PI;
        targetPhi = Math.PI / 2.35;
        targetRadius = 11.5;
        break;
      case 'plan':
        targetTheta = 0;
        targetPhi = 0.05;
        targetRadius = 16;
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

    const isExploded = viewMode === 'exploded';

    // Dynamic Wall Hotspots (reflecting actual configured layers)
    const wallSpots = isExploded
      ? walls.map((w, idx) => {
          const spec = getMaterialSpec(w.material);
          const th_mm = Math.round((Number(w.thickness_m) || 0.1) * 1000);
          const layerR = computeLayerR(w.material, w.thickness_m);
          return {
            id: `wall-layer-${idx}`,
            label: `Layer ${idx + 1}: ${th_mm}mm ${spec.name}`,
            sub: `${spec.role || spec.category} · R = ${layerR.toFixed(2)} m²K/W`,
            category: spec.role || spec.category,
            pos: new THREE.Vector3(0, height_m * 0.6, -width_m / 2 - 0.7 * (idx + 1)),
            spec,
            thickness_mm: th_mm,
            rVal: layerR.toFixed(2),
            uVal: layerR > 0 ? (1 / (layerR + 0.17)).toFixed(2) : '—',
          };
        })
      : [
          {
            id: 'wall-assembly',
            label: `Wall: ${getMaterialSpec(outerWallMat).name} (${Math.round(totalWallThickness * 1000)}mm)`,
            sub: `${walls.length} Layers · U: ${wallUValue.toFixed(2)} W/m²K · R: ${(1 / (wallUValue || 1)).toFixed(2)} m²K/W`,
            category: 'Envelope Assembly',
            pos: new THREE.Vector3(length_m / 2, height_m * 0.6, width_m / 2),
            spec: getMaterialSpec(outerWallMat),
            thickness_mm: Math.round(totalWallThickness * 1000),
            rVal: (1 / (wallUValue || 1)).toFixed(2),
            uVal: wallUValue.toFixed(2),
          },
        ];

    // Dynamic Glazing Hotspot
    const primaryAperture = openings[0] || { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: true };
    const glazingUg = primaryAperture.glazing === 'single_pane' ? 5.7 : primaryAperture.glazing === 'triple_pane' ? 1.4 : 2.8;
    const glazingShgc = primaryAperture.glazing === 'single_pane' ? 0.82 : primaryAperture.glazing === 'triple_pane' ? 0.50 : 0.65;
    const hasNightShutter = !!primaryAperture.night_shutter;
    const glazingSpot = {
      id: 'glazing',
      label: `${primaryAperture.facing?.toUpperCase() || 'SOUTH'} Glazing (${primaryAperture.area_m2 || 4.0} m²)`,
      sub: `${primaryAperture.glazing?.replace('_', ' ') || 'double pane'} (U=${glazingUg}) ${hasNightShutter ? '· Insulated Shutter' : ''}`,
      category: 'Passive Solar Aperture',
      pos: new THREE.Vector3(0, 1.2, width_m / 2 + 0.1),
      spec: {
        id: primaryAperture.glazing,
        name: `${(primaryAperture.glazing || 'double_pane').replace('_', ' ')} Glazing Unit`,
        category: 'Glazing',
        role: 'Solar Direct Gain Collector',
        k: (glazingUg * 0.024).toFixed(3),
        rho: 2500,
        cp: 840,
        description: `High-transmission architectural glazing designed to admit low-angle winter solar radiation (SHGC=${glazingShgc}).`,
        whyUse: hasNightShutter
          ? 'Insulated night shutters deployed at sunset reduce night thermal loss by over 60%, maintaining diurnal solar gains.'
          : 'Transmits peak direct normal irradiance at noon. Deploying night shutters is recommended to stop midnight freezing.',
        standardsRef: 'CPWD ECBC 2017 / ASHRAE 90.1',
        logistics: 'Framed hermetic insulated glass unit (IGU)',
      },
      thickness_mm: primaryAperture.glazing === 'single_pane' ? 6 : primaryAperture.glazing === 'triple_pane' ? 36 : 24,
      rVal: (1 / glazingUg).toFixed(2),
      uVal: glazingUg.toFixed(2),
    };

    // Dynamic Roof Hotspot
    const roofThMm = Math.round((roof[0]?.thickness_m || 0.15) * 1000);
    const roofSpec = getMaterialSpec(roofMat);
    const roofR = computeLayerR(roofMat, roof[0]?.thickness_m || 0.15);
    const roofU = (1 / (roofR + 0.17)).toFixed(2);
    const roofSpot = {
      id: 'roof',
      label: `Roof: ${roofSpec.name} (${roofThMm}mm)`,
      sub: `R: ${roofR.toFixed(2)} m²K/W · U: ${roofU} W/m²K ${snowCover ? '· High Snow Albedo' : ''}`,
      category: 'Roof Assembly',
      pos: new THREE.Vector3(-length_m / 4, height_m + (isExploded ? 3.0 : 0.4), isExploded ? 0 : -width_m / 4),
      spec: roofSpec,
      thickness_mm: roofThMm,
      rVal: roofR.toFixed(2),
      uVal: roofU,
    };

    const rawHotspots = [...wallSpots, glazingSpot, roofSpot];

    const projected = rawHotspots.map((hs) => {
      const v = hs.pos.clone();
      v.project(camera);
      const x = ((v.x + 1) / 2) * w;
      const y = ((-v.y + 1) / 2) * h;
      const isVisible = v.z < 1.0;
      return { ...hs, screenX: x, screenY: y, isVisible };
    });

    setPinPositions(projected);
  }, [length_m, width_m, height_m, outerWallMat, totalWallThickness, wallUValue, openings, roofMat, roof, snowCover, viewMode, walls]);
  updateProjectedPinsRef.current = updateProjectedPins;

  return (
    <div
      className={`shelter-3d-wrapper ${envMode}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Studio CAD Grid Texture (active in studio mode) */}
      <div className={`shelter-3d-grid-bg ${envMode === 'studio' ? 'visible' : ''}`} />

      {/* WebGL Canvas */}
      <canvas className="shelter-3d-canvas" ref={canvasRef} />

      {/* Interactive Floating Solar Controller Station */}
      {showSolarRays && (
        <SolarController
          solarHour={solarHour}
          onHourChange={setSolarHour}
          season={season}
          onSeasonChange={setSeason}
          orientationDeg={orientation_deg}
          southGlazingArea={openings[0]?.area_m2 || 4.0}
        />
      )}

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

                    {pin.spec.whyUse && (
                      <div style={{ marginTop: 6, padding: '6px 8px', background: '#F8FAFC', borderRadius: 4, borderLeft: '2px solid #1E40AF', fontSize: 11, color: '#334155' }}>
                        <div style={{ fontWeight: 700, fontSize: 9.5, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
                          Engineering Justification:
                        </div>
                        <div style={{ marginTop: 2, lineHeight: 1.4 }}>{pin.spec.whyUse}</div>
                      </div>
                    )}

                    <div className="popover-grid" style={{ marginTop: 8 }}>
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

                    {pin.spec.standardsRef && (
                      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#64748B' }}>
                        <span>Ref: {pin.spec.standardsRef}</span>
                        <span>{pin.spec.logistics}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
        )}
      </div>

      {/* Bottom Bar: Turntable Badge + Environment Switcher */}
      <div className="shelter-bottom-controls">
        <div className="turntable-badge" title="Turntable Azimuth Angle">
          <Compass className="turntable-badge-icon" />
          <span>360° Orbit · {azimuthDeg}° Azimuth</span>
        </div>

        {/* Environment Panorama Toggle */}
        <button
          className="env-toggle-chip"
          onClick={() => setEnvMode(envMode === 'himalayas' ? 'studio' : 'himalayas')}
          title={envMode === 'himalayas' ? 'Switch to Studio CAD Grid' : 'Switch to Himalayan Panorama'}
        >
          {envMode === 'himalayas' ? (
            <>
              <Mountain size={13} style={{ color: 'var(--ice)' }} />
              <span>Ladakh Range</span>
            </>
          ) : (
            <>
              <Grid size={13} style={{ color: 'var(--espresso-40)' }} />
              <span>Studio Grid</span>
            </>
          )}
        </button>
      </div>

      {/* Thermal Heatmap Gradient Scale HUD */}
      {isThermal && (
        <div className="thermal-heatmap-hud">
          <div className="thermal-hud-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={14} className="thermal-hud-icon" />
              <span className="thermal-hud-title">3D Thermal Surface Gradient</span>
            </div>
            <span className="thermal-hud-live">Live</span>
          </div>
          <div className="thermal-scale-bar">
            <div className="thermal-scale-gradient" />
            <div className="thermal-scale-ticks">
              <span>-20°C</span>
              <span>-10°C</span>
              <span>0°C</span>
              <span>+10°C</span>
              <span>+24°C</span>
            </div>
          </div>
          <div className="thermal-surface-readouts">
            <div className="surface-readout-item hot">
              <span className="surface-name">South Glazing / Trombe</span>
              <span className="surface-temp">+21.4 °C</span>
            </div>
            <div className="surface-readout-item comfort">
              <span className="surface-name">Internal Mass Floor</span>
              <span className="surface-temp">+17.2 °C</span>
            </div>
            <div className="surface-readout-item cold">
              <span className="surface-name">North Shaded Wall</span>
              <span className="surface-temp">-11.8 °C</span>
            </div>
            <div className="surface-readout-item extreme">
              <span className="surface-name">Snow-Covered Roof</span>
              <span className="surface-temp">-15.6 °C</span>
            </div>
          </div>
        </div>
      )}

      {/* Exploded View HUD Legend */}
      {isExploded && (
        <div className="exploded-view-hud">
          <div className="exploded-hud-title">
            <Layers size={13} style={{ color: 'var(--accent)' }} />
            <span>Envelope Exploded Layer Studio</span>
          </div>
          <div className="exploded-hud-layers">
            <div className="exploded-hud-chip"><span className="dot mass" /> 1. Heavy Mud Brick Mass</div>
            <div className="exploded-hud-chip"><span className="dot eps" /> 2. 100mm Continuous EPS Core</div>
            <div className="exploded-hud-chip"><span className="dot timber" /> 3. Poplar Talashing Rafters</div>
          </div>
        </div>
      )}

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
