/*
 * Shelter3DCanvas.jsx — High-End 3D Architectural Shelter Studio
 * Powered by Three.js & GSAP.
 *
 * Features:
 *   - Multi-Biome procedural environments (Glacial Alpine, High Cold Plateau, Forested Valley, Arid Desert, Plains)
 *   - Passive Solar Architecture: Pitched solar shed roof, south Trombe mass wall, mullioned glazing,
 *     arctic airlock vestibule, rooftop solar PV array, stainless chimney, and chamfered stone plinth.
 *   - Multi-layer exploded view with individual material layer separation & 3D HUD callouts.
 *   - Dynamic astronomical celestial solar diurnal arc with live latitude & altitude scaling.
 *   - 3D Dimension measurement lines and volumetric solar rays.
 *   - 4 View Modes: Solid Architectural, Exploded Assembly, Thermal Heatmap, and Structural Framing.
 *   - 360° turntable orbit with compass orientation and camera presets.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { Compass, Eye, Maximize2, Layers, X, Mountain, Grid, Sun, Flame, Sparkles, Box, Wind } from 'lucide-react';
import { getMaterialSpec, computeLayerR, computeTotalU } from './materialsData';
import {
  getAdobeTexture,
  getStoneTexture,
  getTimberTexture,
  getEpsTexture,
  getSnowTexture,
  getConcreteTexture,
  getMetalSeamRoofTexture,
  getSolarPanelTexture,
} from './threeUtils/proceduralTextures';
import {
  detectBiome,
  getBiomeMeta,
  createSkyDome,
  createDynamicMountains,
  createDynamicGround,
  createCelestialSolarArc,
} from './threeUtils/himalayanEnvironment';
import SolarController, { computeSolarPosition } from './SolarController';
import './Shelter3DCanvas.css';

export default function Shelter3DCanvas({
  request,
  viewMode = 'solid', // 'solid' | 'exploded' | 'thermal' | 'framing'
  showDimensions = true,
  showSolarRays = true,
  snowCover = true,
  activeSiteName = null,
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
  const framingGroupRef = useRef(null);
  const dimensionGroupRef = useRef(null);
  const explodedLayersRef = useRef([]);
  const explodedPartsRef = useRef(null);
  const prevExplodedRef = useRef(viewMode === 'exploded');
  const updateProjectedPinsRef = useRef(null);
  const sunLightRef = useRef(null);
  const sunGroupRef = useRef(null);
  const hemiLightRef = useRef(null);
  const ambientLightRef = useRef(null);
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
  const [dimensionBadges, setDimensionBadges] = useState([]);

  // Solar & Environment UI States
  const [solarHour, setSolarHour] = useState(12.0);
  const [season, setSeason] = useState('winter');
  const [envMode, setEnvMode] = useState('himalayas'); // 'himalayas' | 'studio'

  // Location & Biome reactivity
  const lat = request?.location?.lat ?? 34.1526;
  const lon = request?.location?.lon ?? 77.5771;
  const altitude_m = request?.location?.altitude_m ?? 3500;
  const biome = useMemo(
    () => detectBiome(request?.location, activeSiteName),
    [request?.location?.lat, request?.location?.lon, request?.location?.altitude_m, activeSiteName]
  );
  const biomeMeta = useMemo(() => getBiomeMeta(biome), [biome]);

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
  const isFraming = viewMode === 'framing';

  /* ─────────────────────────────────────────────────────────────────────────
     1. THREE.JS SCENE INITIALIZATION
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Atmospheric Fog (initialized with current biome parameters)
    scene.fog = new THREE.FogExp2(biomeMeta.fogColor, biomeMeta.fogDensity);

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
    const ambientLight = new THREE.AmbientLight(biomeMeta.lightColor, 0.95);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(biomeMeta.hemiSky, biomeMeta.hemiGround, 0.75);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Directional Sun Light
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

    // Soft Rim Light for clean architectural edge silhouette
    const rimLight = new THREE.DirectionalLight(0x89b6e8, 0.6);
    rimLight.position.set(0, 12, -16);
    scene.add(rimLight);

    // ── Luminous Celestial Sun & Solar Halo ──
    const sunGroup = new THREE.Group();
    sunGroup.name = 'celestial-sun';

    // 1. Incandescent solar core
    const coreGeo = new THREE.SphereGeometry(0.42, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFFDF0 });
    const sunCore = new THREE.Mesh(coreGeo, coreMat);
    sunGroup.add(sunCore);

    // 2. Procedural soft radiant solar flare sprite (auto billboard)
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = 128;
    flareCanvas.height = 128;
    const fCtx = flareCanvas.getContext('2d');
    const fGrad = fCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    fGrad.addColorStop(0.0, 'rgba(255, 255, 245, 1.0)');
    fGrad.addColorStop(0.2, 'rgba(255, 215, 130, 0.85)');
    fGrad.addColorStop(0.5, 'rgba(247, 115, 49, 0.35)');
    fGrad.addColorStop(0.85, 'rgba(247, 115, 49, 0.08)');
    fGrad.addColorStop(1.0, 'rgba(247, 115, 49, 0.0)');
    fCtx.fillStyle = fGrad;
    fCtx.fillRect(0, 0, 128, 128);

    const flareTexture = new THREE.CanvasTexture(flareCanvas);
    const flareMat = new THREE.SpriteMaterial({
      map: flareTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flareSprite = new THREE.Sprite(flareMat);
    flareSprite.scale.set(3.2, 3.2, 1.0);
    sunGroup.add(flareSprite);

    scene.add(sunGroup);
    sunGroupRef.current = sunGroup;

    // ── Environment Group ──
    const envGroup = new THREE.Group();
    envGroup.name = 'dynamic-environment';
    scene.add(envGroup);
    himalayanEnvRef.current = envGroup;

    // Ground Shadow Receiver
    const shadowPlaneGeo = new THREE.PlaneGeometry(36, 36);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.24 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.01;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ── Circular Turntable Ring & Compass ──
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

    // Cardinal Orientation Ticks
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

    // Dimension Group for 3D measurement lines
    const dimGroup = new THREE.Group();
    dimGroup.name = 'dimension-lines';
    scene.add(dimGroup);
    dimensionGroupRef.current = dimGroup;

    updateCameraPosition();

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

    const renderLoop = () => {
      animFrameIdRef.current = requestAnimationFrame(renderLoop);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        if (sunGroupRef.current) {
          sunGroupRef.current.lookAt(cameraRef.current.position);
        }
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        if (updateProjectedPinsRef.current) {
          updateProjectedPinsRef.current();
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

  /* ─────────────────────────────────────────────────────────────────────────
     2. DYNAMIC PROCEDURAL BIOME ENVIRONMENT REBUILD
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const scene = sceneRef.current;
    const envGroup = himalayanEnvRef.current;
    if (!scene || !envGroup) return;

    // Clear existing environment children
    while (envGroup.children.length > 0) {
      const child = envGroup.children[0];
      envGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    if (envMode === 'himalayas') {
      const sky = createSkyDome(biome);
      const mountains = createDynamicMountains(biome);
      const ground = createDynamicGround(biome, snowCover);
      envGroup.add(sky);
      envGroup.add(mountains);
      envGroup.add(ground);

      if (scene.fog) {
        scene.fog.color.setHex(biomeMeta.fogColor);
        scene.fog.density = biomeMeta.fogDensity;
      }
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(biomeMeta.lightColor);
      }
      if (hemiLightRef.current) {
        hemiLightRef.current.color.setHex(biomeMeta.hemiSky);
        hemiLightRef.current.groundColor.setHex(biomeMeta.hemiGround);
      }
    }
  }, [biome, biomeMeta, snowCover, envMode]);

  /* ─────────────────────────────────────────────────────────────────────────
     3. HIGH-END PASSIVE SOLAR ARCHITECTURAL SHELTER MODEL
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

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

    const l = length_m;
    const w = width_m;
    const h = height_m;

    // Authentic Procedural Textures
    const adobeTex = getAdobeTexture();
    const stoneTex = getStoneTexture();
    const timberTex = getTimberTexture();
    const epsTex = getEpsTexture();
    const snowTex = getSnowTexture();
    const concreteTex = getConcreteTexture();
    const metalRoofTex = getMetalSeamRoofTexture();
    const solarPvTex = getSolarPanelTexture();

    // Material generator
    const createMat = (type, thermalColor, roughness = 0.85, metalness = 0.05) => {
      if (isThermal && thermalColor) {
        return new THREE.MeshStandardMaterial({
          color: thermalColor,
          roughness: 0.35,
          metalness: 0.1,
        });
      }
      if (isFraming) {
        return new THREE.MeshStandardMaterial({
          color: 0xE2E8F0,
          transparent: true,
          opacity: 0.22,
          wireframe: false,
          roughness: 0.8,
        });
      }

      switch (type) {
        case 'adobe':
          return new THREE.MeshStandardMaterial({ map: adobeTex, roughness: 0.92, metalness: 0.02 });
        case 'stone':
          return new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.88, metalness: 0.08 });
        case 'timber':
          return new THREE.MeshStandardMaterial({ map: timberTex, roughness: 0.65, metalness: 0.04 });
        case 'eps':
          return new THREE.MeshStandardMaterial({ map: epsTex, roughness: 0.55, metalness: 0.0 });
        case 'metal_roof':
          return new THREE.MeshStandardMaterial({ map: metalRoofTex, roughness: 0.52, metalness: 0.25 });
        case 'solar_pv':
          return new THREE.MeshStandardMaterial({ map: solarPvTex, roughness: 0.25, metalness: 0.65 });
        case 'snow':
          return new THREE.MeshStandardMaterial({ map: snowTex, roughness: 0.82, metalness: 0.05 });
        case 'concrete':
        default:
          return new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.8, metalness: 0.1 });
      }
    };

    const wallTexType = outerWallMat === 'stone' ? 'stone' : 'adobe';
    const wallExteriorMat = createMat(wallTexType, 0xF97316);
    const wallInsulationMat = createMat('eps', 0xEAB308);
    const wallInteriorMat = createMat('adobe', 0x22C55E);
    const timberMat = isFraming
      ? new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.6 })
      : createMat('timber', 0xB45309);
    const stonePlinthMat = createMat('stone', 0x475569);
    const concreteFloorMat = createMat('concrete', 0x15803D);
    const metalRoofMat = createMat('metal_roof', 0x38BDF8);
    const solarPvMat = createMat('solar_pv', 0x0EA5E9);

    // ── 1. Chamfered Foundation Plinth ──
    const plinthThick = 0.32;
    const plinthGeo = new THREE.BoxGeometry(l + 0.6, plinthThick, w + 0.6);
    const plinthMesh = new THREE.Mesh(plinthGeo, stonePlinthMat);
    plinthMesh.position.set(0, plinthThick / 2, 0);
    plinthMesh.receiveShadow = true;
    plinthMesh.castShadow = true;
    shelter.add(plinthMesh);

    // ── 2. Thermal Mass Floor Slab & Interior Flooring ──
    const floorSlabThick = 0.22;
    const floorGeo = new THREE.BoxGeometry(l + 0.2, floorSlabThick, w + 0.2);
    const floorMesh = new THREE.Mesh(floorGeo, concreteFloorMat);
    floorMesh.position.set(0, plinthThick + floorSlabThick / 2, 0);
    floorMesh.receiveShadow = true;
    floorMesh.castShadow = true;
    shelter.add(floorMesh);

    // Interior timber finish
    const timberFloorGeo = new THREE.BoxGeometry(l - 0.2, 0.02, w - 0.2);
    const timberFloorMesh = new THREE.Mesh(timberFloorGeo, timberMat);
    timberFloorMesh.position.set(0, plinthThick + floorSlabThick + 0.01, 0);
    timberFloorMesh.receiveShadow = true;
    shelter.add(timberFloorMesh);

    // ── 3. Multi-Layer Wall Assemblies ──
    const totalWallThick = Math.max(0.25, totalWallThickness);
    const extThick = totalWallThick * 0.65;
    const coreThick = totalWallThick * 0.25;
    const intThick = totalWallThick * 0.10;
    const wallBaseY = plinthThick + floorSlabThick + h / 2;

    // Corner Stone Quoins / Posts
    const quoinSize = totalWallThick * 1.12;
    const quoinGeo = new THREE.BoxGeometry(quoinSize, h, quoinSize);
    const corners = [
      { x: -l / 2 + quoinSize / 2, z: -w / 2 + quoinSize / 2 },
      { x:  l / 2 - quoinSize / 2, z: -w / 2 + quoinSize / 2 },
      { x: -l / 2 + quoinSize / 2, z:  w / 2 - quoinSize / 2 },
      { x:  l / 2 - quoinSize / 2, z:  w / 2 - quoinSize / 2 },
    ];
    corners.forEach((c) => {
      const qMesh = new THREE.Mesh(quoinGeo, stonePlinthMat);
      qMesh.position.set(c.x, wallBaseY, c.z);
      qMesh.castShadow = true;
      qMesh.receiveShadow = true;
      shelter.add(qMesh);
    });

    // ── A. North Wall (Cold Shaded Facade) ──
    const northGroup = new THREE.Group();
    northGroup.position.set(0, wallBaseY, -w / 2 + totalWallThick / 2);

    const northExtGeo = new THREE.BoxGeometry(l, h, extThick);
    const northExt = new THREE.Mesh(northExtGeo, wallExteriorMat);
    northExt.position.z = -coreThick / 2 - intThick / 2;
    northExt.castShadow = true;
    northExt.receiveShadow = true;
    northGroup.add(northExt);

    const northCoreGeo = new THREE.BoxGeometry(l, h, coreThick);
    const northCore = new THREE.Mesh(northCoreGeo, wallInsulationMat);
    northCore.position.z = 0;
    northGroup.add(northCore);

    const northIntGeo = new THREE.BoxGeometry(l, h, intThick);
    const northInt = new THREE.Mesh(northIntGeo, wallInteriorMat);
    northInt.position.z = coreThick / 2 + intThick / 2;
    northGroup.add(northInt);

    // Small High-Level Transom Ventilation Lintel on North
    const ventTransomGeo = new THREE.BoxGeometry(0.8, 0.22, extThick * 1.05);
    const ventTransom = new THREE.Mesh(ventTransomGeo, timberMat);
    ventTransom.position.set(0, h * 0.35, -coreThick / 2 - intThick / 2);
    northGroup.add(ventTransom);

    shelter.add(northGroup);

    // ── B. East Facade with Protruding Arctic Airlock Vestibule ──
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

    // Protruding Arctic Airlock Vestibule Mudroom
    const vestibuleDepth = 1.35;
    const vestibuleWidth = 1.45;
    const vestibuleHeight = h * 0.88;
    const vestibuleGroup = new THREE.Group();
    vestibuleGroup.position.set(-extThick / 2 - vestibuleDepth / 2, -h / 2 + vestibuleHeight / 2, 0.3);

    const vestWallGeo = new THREE.BoxGeometry(vestibuleDepth, vestibuleHeight, vestibuleWidth);
    const vestWallMesh = new THREE.Mesh(vestWallGeo, wallExteriorMat);
    vestWallMesh.castShadow = true;
    vestWallMesh.receiveShadow = true;
    vestibuleGroup.add(vestWallMesh);

    // Vestibule Pitched Canopy Hood
    const canopyGeo = new THREE.BoxGeometry(vestibuleDepth + 0.25, 0.08, vestibuleWidth + 0.25);
    const canopyMesh = new THREE.Mesh(canopyGeo, metalRoofMat);
    canopyMesh.position.set(0, vestibuleHeight / 2 + 0.04, 0);
    canopyMesh.rotation.z = -0.12; // Shed water/snow away
    canopyMesh.castShadow = true;
    vestibuleGroup.add(canopyMesh);

    // Heavy Mountain Entry Door
    const doorW = 0.92;
    const doorH = 1.95;
    const doorGeo = new THREE.BoxGeometry(0.08, doorH, doorW);
    const doorMesh = new THREE.Mesh(doorGeo, timberMat);
    doorMesh.position.set(-vestibuleDepth / 2 - 0.04, -vestibuleHeight / 2 + doorH / 2, 0);
    doorMesh.castShadow = true;
    vestibuleGroup.add(doorMesh);

    // Stainless Steel Hardware Handle
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.9, roughness: 0.2 });
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.position.set(-vestibuleDepth / 2 - 0.1, -vestibuleHeight / 2 + doorH / 2, doorW * 0.35);
    vestibuleGroup.add(handleMesh);

    eastGroup.add(vestibuleGroup);
    shelter.add(eastGroup);

    // ── C. West Wall (Heavy Sheltered Wall) ──
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

    // ── D. South Facade with Trombe Mass Wall & Glazed Solar Aperture ──
    const southGroup = new THREE.Group();
    southGroup.position.set(0, wallBaseY, w / 2 - totalWallThick / 2);

    const southOpening = openings.find(o => o.facing === 'south') || { area_m2: 4.0, glazing: 'double_pane', night_shutter: true };
    const winWidth = Math.min(l * 0.78, Math.max(1.8, Math.sqrt(southOpening.area_m2 * 1.45)));
    const winHeight = Math.min(h * 0.76, southOpening.area_m2 / winWidth);
    const winYOffset = -h / 2 + winHeight / 2 + 0.35;

    // Structural Side Piers
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

    // Heavy Timber Lintel
    const lintelHeight = h - (winHeight + 0.35);
    if (lintelHeight > 0.08) {
      const lintelGeo = new THREE.BoxGeometry(winWidth, lintelHeight, totalWallThick * 1.05);
      const lintel = new THREE.Mesh(lintelGeo, timberMat);
      lintel.position.set(0, h / 2 - lintelHeight / 2, 0);
      lintel.castShadow = true;
      southGroup.add(lintel);
    }

    // Trombe Mass Absorber Wall (Set behind glazing cavity)
    const trombeThick = 0.22;
    const trombeGeo = new THREE.BoxGeometry(winWidth * 0.96, winHeight * 0.94, trombeThick);
    const trombeMat = isThermal
      ? new THREE.MeshStandardMaterial({ color: 0xEF4444, roughness: 0.3 }) // Sizzling hot thermal absorber
      : new THREE.MeshStandardMaterial({ color: 0x2A2421, roughness: 0.95 }); // Matte solar black absorber
    const trombeMesh = new THREE.Mesh(trombeGeo, trombeMat);
    trombeMesh.position.set(0, winYOffset, -totalWallThick * 0.25);
    southGroup.add(trombeMesh);

    // Trombe Air Circulation Vents (Upper & Lower registers)
    const ventGeo = new THREE.BoxGeometry(0.35, 0.12, trombeThick * 1.05);
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const topVent1 = new THREE.Mesh(ventGeo, ventMat);
    topVent1.position.set(-winWidth * 0.28, winYOffset + winHeight * 0.38, -totalWallThick * 0.25);
    const topVent2 = new THREE.Mesh(ventGeo, ventMat);
    topVent2.position.set(winWidth * 0.28, winYOffset + winHeight * 0.38, -totalWallThick * 0.25);
    const btmVent1 = new THREE.Mesh(ventGeo, ventMat);
    btmVent1.position.set(-winWidth * 0.28, winYOffset - winHeight * 0.38, -totalWallThick * 0.25);
    const btmVent2 = new THREE.Mesh(ventGeo, ventMat);
    btmVent2.position.set(winWidth * 0.28, winYOffset - winHeight * 0.38, -totalWallThick * 0.25);
    southGroup.add(topVent1);
    southGroup.add(topVent2);
    southGroup.add(btmVent1);
    southGroup.add(btmVent2);

    // Architectural Window Framing with Mullions & Jambs
    const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.12);
    const frameMesh = new THREE.Mesh(frameGeo, timberMat);
    frameMesh.position.set(0, winYOffset, totalWallThick * 0.42);
    southGroup.add(frameMesh);

    // Vertical Central Mullion
    const mullionGeo = new THREE.BoxGeometry(0.08, winHeight, 0.14);
    const mullion = new THREE.Mesh(mullionGeo, timberMat);
    mullion.position.set(0, winYOffset, totalWallThick * 0.42);
    southGroup.add(mullion);

    // Projecting Timber Window Sill
    const sillGeo = new THREE.BoxGeometry(winWidth + 0.2, 0.08, 0.22);
    const sill = new THREE.Mesh(sillGeo, timberMat);
    sill.position.set(0, winYOffset - winHeight / 2 - 0.04, totalWallThick * 0.45);
    sill.castShadow = true;
    southGroup.add(sill);

    // High-Spec Reflective Glazing Panes
    const glassGeo = new THREE.BoxGeometry(winWidth - 0.14, winHeight - 0.14, 0.02);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: isThermal ? 0xF59E0B : 0x8cc4db,
      transparent: true,
      opacity: isThermal ? 0.85 : 0.45,
      roughness: 0.08,
      transmission: isThermal ? 0.0 : 0.86,
      ior: 1.52,
      reflectivity: 0.9,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, winYOffset, totalWallThick * 0.42);
    southGroup.add(glassMesh);

    // Operable Insulated Night Shutter Assembly
    if (southOpening.night_shutter) {
      const shutterLeafGeo = new THREE.BoxGeometry(winWidth * 0.46, winHeight - 0.1, 0.04);
      const shutterLeft = new THREE.Mesh(shutterLeafGeo, timberMat);
      shutterLeft.position.set(-winWidth * 0.24, winYOffset, totalWallThick * 0.32);
      const shutterRight = new THREE.Mesh(shutterLeafGeo, timberMat);
      shutterRight.position.set(winWidth * 0.24, winYOffset, totalWallThick * 0.32);
      southGroup.add(shutterLeft);
      southGroup.add(shutterRight);
    }

    shelter.add(southGroup);

    // ── 4. Pitched Solar Shed Roof (11° Monoslope Angled Roof with South Overhang) ──
    const roofGroup = new THREE.Group();
    const southOverhang = 0.65; // Extended south overhang for solar shading
    const northOverhang = 0.35;
    const sideOverhang = 0.42;

    const roofLen = l + sideOverhang * 2;
    const roofWid = w + southOverhang + northOverhang;
    const roofBaseY = plinthThick + floorSlabThick + h;
    const roofPitchRad = 0.16; // ~9.2 degrees pitch sloping down to North

    roofGroup.position.set(0, roofBaseY, (southOverhang - northOverhang) / 2);

    // Timber Rafters & Purlins
    const rafterCount = Math.max(6, Math.round(l / 0.65));
    const rafterGeo = new THREE.BoxGeometry(0.12, 0.16, roofWid - 0.05);
    for (let i = 0; i < rafterCount; i++) {
      const rx = -l / 2 - sideOverhang * 0.6 + (i / (rafterCount - 1)) * (roofLen - sideOverhang * 0.5);
      const rafter = new THREE.Mesh(rafterGeo, timberMat);
      rafter.position.set(rx, 0.1, 0);
      rafter.rotation.x = roofPitchRad;
      rafter.castShadow = true;
      roofGroup.add(rafter);
    }

    // Structural Decking
    const deckGeo = new THREE.BoxGeometry(roofLen - 0.04, 0.04, roofWid - 0.04);
    const deckMesh = new THREE.Mesh(deckGeo, timberMat);
    deckMesh.position.set(0, 0.2, 0);
    deckMesh.rotation.x = roofPitchRad;
    deckMesh.castShadow = true;
    roofGroup.add(deckMesh);

    // Continuous XPS/EPS Insulation Board
    const roofInsulGeo = new THREE.BoxGeometry(roofLen, 0.14, roofWid);
    const roofInsulMesh = new THREE.Mesh(roofInsulGeo, wallInsulationMat);
    roofInsulMesh.position.set(0, 0.29, 0);
    roofInsulMesh.rotation.x = roofPitchRad;
    roofGroup.add(roofInsulMesh);

    // Weatherproof Standing-Seam Alpine Metal Roof
    const metalRoofGeo = new THREE.BoxGeometry(roofLen + 0.04, 0.06, roofWid + 0.04);
    const metalRoofMesh = new THREE.Mesh(metalRoofGeo, metalRoofMat);
    metalRoofMesh.position.set(0, 0.39, 0);
    metalRoofMesh.rotation.x = roofPitchRad;
    metalRoofMesh.castShadow = true;
    metalRoofMesh.receiveShadow = true;
    roofGroup.add(metalRoofMesh);

    // Snow retention guards along southern lower edge
    const guardBarGeo = new THREE.BoxGeometry(roofLen - 0.2, 0.06, 0.04);
    const guardBar = new THREE.Mesh(guardBarGeo, new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
    guardBar.position.set(0, 0.44, roofWid / 2 - 0.1);
    guardBar.rotation.x = roofPitchRad;
    roofGroup.add(guardBar);

    // Rooftop Photovoltaic (PV) Solar Array (2 heavy solar panels)
    const pvGroup = new THREE.Group();
    const pvPanelGeo = new THREE.BoxGeometry(1.65, 0.05, 1.0);
    const pv1 = new THREE.Mesh(pvPanelGeo, solarPvMat);
    pv1.position.set(-1.0, 0.48, 0.2);
    pv1.rotation.x = roofPitchRad + 0.15; // Tilted toward optimal winter angle
    pv1.castShadow = true;
    pvGroup.add(pv1);

    const pv2 = new THREE.Mesh(pvPanelGeo, solarPvMat);
    pv2.position.set(1.0, 0.48, 0.2);
    pv2.rotation.x = roofPitchRad + 0.15;
    pv2.castShadow = true;
    pvGroup.add(pv2);
    roofGroup.add(pvGroup);

    // Stainless Steel Insulated Stove Chimney Pipe with Cowl
    const chimneyGroup = new THREE.Group();
    chimneyGroup.position.set(l * 0.28, 0.38, -w * 0.25);

    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.92, roughness: 0.15 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.y = 0.7;
    pipe.castShadow = true;
    chimneyGroup.add(pipe);

    // Conical Rain Cowl
    const cowlGeo = new THREE.ConeGeometry(0.24, 0.16, 16);
    const cowl = new THREE.Mesh(cowlGeo, pipeMat);
    cowl.position.y = 1.45;
    cowl.castShadow = true;
    chimneyGroup.add(cowl);
    roofGroup.add(chimneyGroup);

    // Crystalline Snow Blanket on Roof when enabled
    let snowMeshRef = null;
    if (snowCover) {
      const snowGeo = new THREE.BoxGeometry(roofLen, 0.12, roofWid);
      const snowMesh = new THREE.Mesh(snowGeo, createMat('snow', null));
      snowMesh.position.set(0, 0.46, 0);
      snowMesh.rotation.x = roofPitchRad;
      snowMesh.receiveShadow = true;
      snowMesh.castShadow = true;
      roofGroup.add(snowMesh);
      snowMeshRef = snowMesh;
    }

    shelter.add(roofGroup);

    // ── 5. Structural Framing Mode (When viewMode === 'framing') ──
    if (isFraming) {
      const framingGroup = new THREE.Group();
      framingGroup.name = 'structural-framing';

      // Perimeter Timber Studs every 0.6m
      const studCountX = Math.round(l / 0.6);
      const studGeo = new THREE.BoxGeometry(0.08, h, 0.12);

      for (let i = 0; i <= studCountX; i++) {
        const sx = -l / 2 + (i / studCountX) * l;
        // North wall studs
        const studN = new THREE.Mesh(studGeo, timberMat);
        studN.position.set(sx, wallBaseY, -w / 2 + totalWallThick / 2);
        framingGroup.add(studN);

        // South wall studs (avoid window opening)
        if (Math.abs(sx) > winWidth / 2) {
          const studS = new THREE.Mesh(studGeo, timberMat);
          studS.position.set(sx, wallBaseY, w / 2 - totalWallThick / 2);
          framingGroup.add(studS);
        }
      }
      shelter.add(framingGroup);
    }

    // Save exploded parts for GSAP transitions
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
        roofY: roofBaseY + 2.5,
        snowY: 1.3,
        northZ: -w / 2 - 1.5,
        northExtZ: -0.7,
        southZ: w / 2 + 1.5,
        eastX: -l / 2 - 1.5,
        westX: l / 2 + 1.5,
      },
    };

    if (isExploded) {
      roofGroup.position.y = roofBaseY + 2.5;
      if (snowMeshRef) snowMeshRef.position.y = 1.3;
      northGroup.position.z = -w / 2 - 1.5;
      northExt.position.z = -0.7;
      southGroup.position.z = w / 2 + 1.5;
      eastGroup.position.x = -l / 2 - 1.5;
      westGroup.position.x = l / 2 + 1.5;
    }

    scene.add(shelter);
  }, [length_m, width_m, height_m, walls, roof, floor, openings, isThermal, isFraming, snowCover, outerWallMat]);

  /* ─────────────────────────────────────────────────────────────────────────
     3B. EXPLODED VIEW EXPANSION & CLOSING (GSAP)
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const parts = explodedPartsRef.current;
    if (!parts) return;

    if (prevExplodedRef.current === isExploded) return;
    prevExplodedRef.current = isExploded;

    const { roofGroup, snowMeshRef, northGroup, northExt, southGroup, eastGroup, westGroup, base, exploded } = parts;

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
      gsap.to(roofGroup.position, { y: exploded.roofY, duration: 0.9, ease: 'power3.out' });
      if (snowMeshRef) gsap.to(snowMeshRef.position, { y: exploded.snowY, duration: 1.1, ease: 'power3.out' });
      gsap.to(northGroup.position, { z: exploded.northZ, duration: 0.9, ease: 'power3.out' });
      gsap.to(northExt.position, { z: exploded.northExtZ, duration: 1.0, ease: 'power3.out' });
      gsap.to(southGroup.position, { z: exploded.southZ, duration: 0.9, ease: 'power3.out' });
      gsap.to(eastGroup.position, { x: exploded.eastX, duration: 0.9, ease: 'power3.out' });
      gsap.to(westGroup.position, { x:  exploded.westX, duration: 0.9, ease: 'power3.out' });
    } else {
      gsap.to(roofGroup.position, { y: base.roofY, duration: 0.9, ease: 'power3.out' });
      if (snowMeshRef) gsap.to(snowMeshRef.position, { y: base.snowY, duration: 0.9, ease: 'power3.out' });
      gsap.to(northGroup.position, { z: base.northZ, duration: 0.9, ease: 'power3.out' });
      gsap.to(northExt.position, { z: base.northExtZ, duration: 0.9, ease: 'power3.out' });
      gsap.to(southGroup.position, { z: base.southZ, duration: 0.9, ease: 'power3.out' });
      gsap.to(eastGroup.position, { x: base.eastX, duration: 0.9, ease: 'power3.out' });
      gsap.to(westGroup.position, { x:  base.westX, duration: 0.9, ease: 'power3.out' });
    }
  }, [isExploded]);

  /* ─────────────────────────────────────────────────────────────────────────
     4. CELESTIAL SUN PATH & DIURNAL SOLAR POSITIONING
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (solarArcGroupRef.current) {
      scene.remove(solarArcGroupRef.current);
    }

    if (showSolarRays) {
      const arc = createCelestialSolarArc(season, orientation_deg, lat, altitude_m);
      scene.add(arc);
      solarArcGroupRef.current = arc;
    }

    const solarPos = computeSolarPosition(solarHour, season, orientation_deg, lat, altitude_m);
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

    // Volumetric Sun Shaft & Floor Solar Patch
    if (showSolarRays && solarPos.isDay && sceneRef.current) {
      if (solarRayMeshRef.current) sceneRef.current.remove(solarRayMeshRef.current);

      const rayGroup = new THREE.Group();
      rayGroup.name = 'solar-beam-shaft';

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

      // Floor illuminated solar patch
      const patchGeo = new THREE.PlaneGeometry(2.4, 1.8);
      const patchMat = new THREE.MeshBasicMaterial({
        color: 0xFDBA74,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      });
      const patchMesh = new THREE.Mesh(patchGeo, patchMat);
      patchMesh.rotation.x = -Math.PI / 2;
      patchMesh.position.set(0, 0.55, width_m * 0.15);
      rayGroup.add(patchMesh);

      sceneRef.current.add(rayGroup);
      solarRayMeshRef.current = rayGroup;
    } else if (solarRayMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(solarRayMeshRef.current);
      solarRayMeshRef.current = null;
    }
  }, [solarHour, season, orientation_deg, showSolarRays, width_m, length_m, lat, altitude_m]);

  /* ─────────────────────────────────────────────────────────────────────────
     5. 3D MEASUREMENT DIMENSION LINES
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const dimGroup = dimensionGroupRef.current;
    if (!dimGroup) return;

    while (dimGroup.children.length > 0) {
      const child = dimGroup.children[0];
      dimGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    if (!showDimensions) {
      setDimensionBadges([]);
      return;
    }

    const l = length_m;
    const w = width_m;
    const h = height_m;
    const offset = 0.8;

    const lineMat = new THREE.LineBasicMaterial({ color: 0xC2410C, linewidth: 2, transparent: true, opacity: 0.85 });

    // Length dimension (along front south X)
    const lenPoints = [
      new THREE.Vector3(-l / 2, 0.05, w / 2 + offset),
      new THREE.Vector3( l / 2, 0.05, w / 2 + offset),
    ];
    const lenLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lenPoints), lineMat);
    dimGroup.add(lenLine);

    // Width dimension (along east Z)
    const widPoints = [
      new THREE.Vector3(-l / 2 - offset, 0.05, -w / 2),
      new THREE.Vector3(-l / 2 - offset, 0.05,  w / 2),
    ];
    const widLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(widPoints), lineMat);
    dimGroup.add(widLine);

    // Height dimension (vertical corner Y)
    const hPoints = [
      new THREE.Vector3(-l / 2 - offset, 0.05, -w / 2),
      new THREE.Vector3(-l / 2 - offset, 0.05 + h, -w / 2),
    ];
    const hLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hPoints), lineMat);
    dimGroup.add(hLine);
  }, [length_m, width_m, height_m, showDimensions]);

  /* ─────────────────────────────────────────────────────────────────────────
     6. ORBIT CONTROLS & CAMERA PRESETS
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
     7. 3D TO SCREEN HOTSPOT PROJECTION
     ───────────────────────────────────────────────────────────────────────── */
  const updateProjectedPins = useCallback(() => {
    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // 1. Hotspots
    const primaryAperture = openings[0] || { facing: 'south', area_m2: 4.0, glazing: 'double_pane', night_shutter: true };
    const rawHotspots = [
      {
        id: 'trombe-wall',
        label: 'Trombe Mass Wall',
        sub: 'Passive Solar Heat Storage & Air Convection Vents',
        category: 'Solar Heating',
        pos: new THREE.Vector3(0, height_m * 0.5, width_m / 2 + 0.1),
        spec: {
          name: 'South-Facing Trombe Mass Wall',
          description: 'High-density earthen absorber storage wall located behind high-transmission double glazing. Absorbs solar radiation and circulates warm air into living quarters via thermo-siphonic convection.',
          whyUse: 'Delivers 45-60% of winter space heating passively, eliminating fuel combustion dependencies.',
          rVal: '0.85',
          uVal: '1.18',
          thickness_mm: 220,
        },
      },
      {
        id: 'solar-roof',
        label: 'Monoslope Shed Roof (11°)',
        sub: 'Standing-Seam Metal & 140mm Continuous Insulation',
        category: 'Envelope',
        pos: new THREE.Vector3(-length_m / 4, height_m + 0.5, 0),
        spec: {
          name: 'Insulated Alpine Shed Roof',
          description: 'Pitched at 11° to shed heavy snowdrifts and optimize solar PV collector incidence. Extended 650mm south overhang prevents summer overheating while admitting low winter sun.',
          whyUse: 'Sub-zero Himalayan winter design prevents structural snow overloading and thermal bridging.',
          rVal: '4.20',
          uVal: '0.24',
          thickness_mm: 200,
        },
      },
      {
        id: 'airlock-vestibule',
        label: 'Arctic Airlock Vestibule',
        sub: 'Weather-Lock Mudroom Entrance',
        category: 'Infiltration Control',
        pos: new THREE.Vector3(-length_m / 2 - 0.7, 1.2, 0.3),
        spec: {
          name: 'Arctic Entry Airlock Porch',
          description: 'Dual-door airlock foyer that eliminates cold wind gusts and air infiltration when occupants enter or exit during high-wind blizzard conditions.',
          whyUse: 'Reduces building ACH infiltration losses by over 70% in high-altitude gale conditions.',
          rVal: '3.10',
          uVal: '0.32',
          thickness_mm: 120,
        },
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

    // 2. 3D Dimension Badges
    if (showDimensions) {
      const dBadges = [
        {
          id: 'dim-len',
          label: `${length_m.toFixed(1)}m L`,
          pos: new THREE.Vector3(0, 0.05, width_m / 2 + 0.8),
        },
        {
          id: 'dim-wid',
          label: `${width_m.toFixed(1)}m W`,
          pos: new THREE.Vector3(-length_m / 2 - 0.8, 0.05, 0),
        },
        {
          id: 'dim-hgt',
          label: `${height_m.toFixed(1)}m H`,
          pos: new THREE.Vector3(-length_m / 2 - 0.8, height_m / 2, -width_m / 2),
        },
      ];

      const projDim = dBadges.map((b) => {
        const v = b.pos.clone();
        v.project(camera);
        return {
          ...b,
          screenX: ((v.x + 1) / 2) * w,
          screenY: ((-v.y + 1) / 2) * h,
          isVisible: v.z < 1.0,
        };
      });
      setDimensionBadges(projDim);
    } else {
      setDimensionBadges([]);
    }
  }, [length_m, width_m, height_m, openings, showDimensions]);
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
      <div className={`shelter-3d-grid-bg ${envMode === 'studio' ? 'visible' : ''}`} />
      <canvas className="shelter-3d-canvas" ref={canvasRef} />

      {/* Floating Solar Controller Station */}
      {showSolarRays && (
        <SolarController
          solarHour={solarHour}
          onHourChange={setSolarHour}
          season={season}
          onSeasonChange={setSeason}
          orientationDeg={orientation_deg}
          southGlazingArea={openings[0]?.area_m2 || 4.0}
          lat={lat}
          altitude_m={altitude_m}
        />
      )}

      {/* 3D Measurement Dimension Badges */}
      {showDimensions &&
        dimensionBadges.map(
          (b) =>
            b.isVisible && (
              <div
                key={b.id}
                className="dimension-badge-3d"
                style={{
                  position: 'absolute',
                  left: b.screenX,
                  top: b.screenY,
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  padding: '2px 7px',
                  borderRadius: 4,
                  fontSize: 10.5,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 600,
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  zIndex: 15,
                }}
              >
                {b.label}
              </div>
            )
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

                {selectedPin?.id === pin.id && (() => {
                  const isTop = pin.screenY < 280;
                  const containerW = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
                  const isLeft = pin.screenX < 190;
                  const isRight = pin.screenX > containerW - 190;
                  const posClass = `${isTop ? 'open-below' : 'open-above'} ${isLeft ? 'align-left' : isRight ? 'align-right' : 'align-center'}`;

                  return (
                    <div className={`hotspot-popover ${posClass}`} onClick={(e) => e.stopPropagation()}>
                      <div className="popover-header">
                        <div className="popover-title-row">
                          <h4 className="popover-title">{pin.label}</h4>
                          <span className="popover-badge">{pin.category}</span>
                        </div>
                        <button
                          className="popover-close-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPin(null);
                          }}
                          aria-label="Close"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="popover-desc">{pin.spec.description}</p>
                      {pin.spec.whyUse && (
                        <div className="popover-intent-card">
                          <div className="popover-intent-label">
                            Engineering Intent
                          </div>
                          <div className="popover-intent-text">{pin.spec.whyUse}</div>
                        </div>
                      )}
                      <div className="popover-grid">
                        <div className="popover-stat">
                          <span className="popover-stat-label">Thickness</span>
                          <span className="popover-stat-val">{pin.spec.thickness_mm} mm</span>
                        </div>
                        <div className="popover-stat">
                          <span className="popover-stat-label">R-Value</span>
                          <span className="popover-stat-val">{pin.spec.rVal} m²K/W</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )
        )}
      </div>

      {/* Bottom Bar: Turntable Badge + Biome Selector */}
      <div className="shelter-bottom-controls">
        <div className="turntable-badge" title="Turntable Azimuth Angle">
          <Compass className="turntable-badge-icon" />
          <span>360° Orbit · {azimuthDeg}° Azimuth</span>
        </div>

        {/* Dynamic Biome Badge Toggle */}
        <button
          className="env-toggle-chip"
          onClick={() => setEnvMode(envMode === 'himalayas' ? 'studio' : 'himalayas')}
          title={envMode === 'himalayas' ? 'Switch to Studio CAD Grid' : `Biome: ${biomeMeta.label}`}
        >
          {envMode === 'himalayas' ? (
            <>
              <Mountain size={13} style={{ color: 'var(--solar, #C2410C)' }} />
              <span>{biomeMeta.label} ({altitude_m}m)</span>
            </>
          ) : (
            <>
              <Grid size={13} style={{ color: 'var(--text-secondary)' }} />
              <span>Studio CAD Grid</span>
            </>
          )}
        </button>
      </div>

      {/* Thermal Heatmap Gradient Scale */}
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
        </div>
      )}

      {/* Exploded View HUD Legend */}
      {isExploded && (
        <div className="exploded-view-hud">
          <div className="exploded-hud-title">
            <Layers size={13} style={{ color: 'var(--solar, #C2410C)' }} />
            <span>Assembly Exploded View</span>
          </div>
          <div className="exploded-hud-layers">
            <div className="exploded-hud-chip"><span className="dot mass" /> 1. Heavy Mud Brick Mass</div>
            <div className="exploded-hud-chip"><span className="dot eps" /> 2. 100mm Continuous EPS Core</div>
            <div className="exploded-hud-chip"><span className="dot timber" /> 3. Structural Timber Rafters</div>
          </div>
        </div>
      )}

      {/* Camera Presets Bar */}
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
          title="South Solar Aperture & Trombe Wall"
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
