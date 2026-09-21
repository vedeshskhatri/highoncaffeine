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
import { Compass, Eye, Maximize2, Layers, X, Mountain, Grid, Sun, Flame, Sparkles, Box, Wind, Sliders, ShieldCheck } from 'lucide-react';
import { getMaterialSpec, computeLayerR, computeTotalU, fetchAndCacheMaterials } from './materialsData';
import { getSiteArchetype, ARCHETYPE_CONFIGS } from './siteArchetype';
import {
  getTextureForMaterial,
  getAdobeTexture,
  getStoneTexture,
  getTimberTexture,
  getEpsTexture,
  getSnowTexture,
  getConcreteTexture,
  getMetalSeamRoofTexture,
  getSolarPanelTexture,
  getJaliScreenTexture,
  getKathKuniTexture,
  getJaisalmerStoneTexture,
  getSlateRoofTexture,
} from './threeUtils/proceduralTextures';
import {
  detectBiome,
  getBiomeMeta,
  createSkyDome,
  createDynamicMountains,
  createDynamicGround,
  createCelestialSolarArc,
  createHeatFluxParticles,
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
  const shelterMeshesRef = useRef(null);
  const heatFluxParticlesRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

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

  // Facade Multi-Layer Peel & Material Sync States
  const [peelLevel, setPeelLevel] = useState(0); // 0: Full, 1: Cladding, 2: Insulation, 3: Mass Core
  const [materialsVersion, setMaterialsVersion] = useState(0);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  // Mount effect: Fetch and cache authoritative materials from backend /materials endpoint
  useEffect(() => {
    let active = true;
    setMaterialsLoading(true);
    fetchAndCacheMaterials().then(() => {
      if (active) {
        setMaterialsLoading(false);
        setMaterialsVersion(v => v + 1);
      }
    });
    return () => { active = false; };
  }, []);

  // Location & Biome reactivity
  const lat = request?.location?.lat ?? 34.1526;
  const lon = request?.location?.lon ?? 77.5771;
  const altitude_m = request?.location?.altitude_m ?? 3500;
  const biome = useMemo(
    () => detectBiome(request?.location, activeSiteName),
    [request?.location?.lat, request?.location?.lon, request?.location?.altitude_m, activeSiteName]
  );
  const biomeMeta = useMemo(() => getBiomeMeta(biome), [biome]);

  // Regional Architectural Archetype & Typology reactivity
  const archetype = useMemo(
    () => getSiteArchetype(activeSiteName, request?.location),
    [activeSiteName, request?.location?.lat, request?.location?.lon, request?.location?.altitude_m]
  );
  const archConfig = useMemo(() => ARCHETYPE_CONFIGS[archetype] || ARCHETYPE_CONFIGS.siachen, [archetype]);
  const effectiveSnowCover = snowCover && archetype !== 'jaisalmer' && archetype !== 'delhi';

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
          color: isCardinal ? 0x2563EB : 0x9A8C84,
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
        const dt = clockRef.current.getDelta();
        if (heatFluxParticlesRef.current && heatFluxParticlesRef.current.update) {
          heatFluxParticlesRef.current.update(dt);
        }
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
      if (heatFluxParticlesRef.current) {
        if (heatFluxParticlesRef.current.geometry) heatFluxParticlesRef.current.geometry.dispose();
        if (heatFluxParticlesRef.current.material) heatFluxParticlesRef.current.material.dispose();
        heatFluxParticlesRef.current = null;
      }
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
      const ground = createDynamicGround(biome, effectiveSnowCover);
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
  }, [biome, biomeMeta, effectiveSnowCover, envMode]);

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

    // Dynamic Heat Flux Vector Field Particles
    if (heatFluxParticlesRef.current) {
      scene.remove(heatFluxParticlesRef.current);
      if (heatFluxParticlesRef.current.geometry) heatFluxParticlesRef.current.geometry.dispose();
      if (heatFluxParticlesRef.current.material) heatFluxParticlesRef.current.material.dispose();
      heatFluxParticlesRef.current = null;
    }
    const particles = createHeatFluxParticles(l, w, h);
    scene.add(particles);
    heatFluxParticlesRef.current = particles;

    // Authentic Procedural Textures
    const adobeTex = getAdobeTexture();
    const stoneTex = getStoneTexture();
    const timberTex = getTimberTexture();
    const epsTex = getEpsTexture();
    const snowTex = getSnowTexture();
    const concreteTex = getConcreteTexture();
    const metalRoofTex = getMetalSeamRoofTexture();
    const solarPvTex = getSolarPanelTexture();

    // Material generator using procedural canvas textures mapped to material IDs
    const createMat = (matIdOrType, thermalColor, roughness = 0.85, metalness = 0.05) => {
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

      const tex = getTextureForMaterial(matIdOrType);
      const mid = (matIdOrType || '').toLowerCase();
      let r = roughness;
      let m = metalness;

      if (mid.includes('mud_brick') || mid.includes('adobe') || mid.includes('rammed')) {
        r = 0.92; m = 0.02;
      } else if (mid.includes('stone') || mid.includes('granite')) {
        r = 0.88; m = 0.08;
      } else if (mid.includes('timber') || mid.includes('wood') || mid.includes('plywood')) {
        r = 0.65; m = 0.04;
      } else if (mid.includes('puf') || mid.includes('sandwich') || mid.includes('prefab')) {
        r = 0.45; m = 0.15;
      } else if (mid.includes('eps') || mid.includes('xps') || mid.includes('rockwool')) {
        r = 0.55; m = 0.0;
      } else if (mid.includes('cgi') || mid.includes('metal_roof') || mid.includes('sheet')) {
        r = 0.52; m = 0.25;
      } else if (mid.includes('solar') || mid.includes('pv')) {
        r = 0.25; m = 0.65;
      } else if (mid.includes('snow')) {
        r = 0.82; m = 0.05;
      } else if (mid.includes('tarpaulin') || mid.includes('poly')) {
        r = 0.60; m = 0.05;
      } else if (mid.includes('concrete')) {
        r = 0.80; m = 0.10;
      }

      return new THREE.MeshStandardMaterial({ map: tex, roughness: r, metalness: m });
    };

    // Select authentic regional base materials based on climatic archetype
    let defaultOuterMat = outerWallMat;
    let defaultRoofMat = roofMat;
    if (archetype === 'manali') {
      defaultOuterMat = 'kath_kuni';
      defaultRoofMat = 'slate_roof';
    } else if (archetype === 'jaisalmer') {
      defaultOuterMat = 'jaisalmer_stone';
      defaultRoofMat = 'jaisalmer_stone';
    } else if (archetype === 'leh') {
      defaultOuterMat = 'mud_brick';
      defaultRoofMat = 'mud_brick';
    } else if (archetype === 'delhi') {
      defaultOuterMat = 'brick';
      defaultRoofMat = 'concrete';
    }

    const wallExteriorMat = createMat(
      walls[0]?.material || defaultOuterMat,
      archetype === 'jaisalmer' ? 0xF59E0B : archetype === 'manali' ? 0xB45309 : 0xD4CEBE
    );
    const wallInsulationMat = createMat(innerWallMat || 'eps', 0xEAB308);
    const wallInteriorMat = createMat(
      walls[2]?.material || (outerWallMat.includes('stone') ? 'mud_brick' : outerWallMat),
      0x22C55E
    );
    const timberMat = isFraming
      ? new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.6 })
      : createMat('timber', 0xB45309);
    const stonePlinthMat = createMat(
      archetype === 'jaisalmer' ? 'jaisalmer_stone' : archetype === 'manali' ? 'stone' : 'stone',
      0x475569
    );
    const concreteFloorMat = createMat(floorMat, 0x15803D);
    const metalRoofMat = createMat(defaultRoofMat, 0x38BDF8);
    const solarPvMat = createMat('solar_pv', 0x0EA5E9);

    // ── 1. Chamfered Foundation Plinth ──
    const plinthThick = 0.32;
    const plinthGeo = new THREE.BoxGeometry(l + 0.6, plinthThick, w + 0.6);
    const plinthMesh = new THREE.Mesh(plinthGeo, stonePlinthMat);
    plinthMesh.position.set(0, plinthThick / 2, 0);
    plinthMesh.receiveShadow = true;
    plinthMesh.castShadow = true;
    shelter.add(plinthMesh);

    // Siachen Permafrost Moraine Stilts
    if (archetype === 'siachen') {
      const stiltGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const stiltPositions = [
        { x: -l / 2 + 0.4, z: -w / 2 + 0.4 },
        { x:  l / 2 - 0.4, z: -w / 2 + 0.4 },
        { x: -l / 2 + 0.4, z:  w / 2 - 0.4 },
        { x:  l / 2 - 0.4, z:  w / 2 - 0.4 },
        { x:  0,           z: -w / 2 + 0.4 },
        { x:  0,           z:  w / 2 - 0.4 },
      ];
      stiltPositions.forEach(pos => {
        const stilt = new THREE.Mesh(stiltGeo, stonePlinthMat);
        stilt.position.set(pos.x, -0.15, pos.z);
        stilt.castShadow = true;
        stilt.receiveShadow = true;
        shelter.add(stilt);
      });
    }

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

    // Corner Quoins / Posts
    const quoinSize = totalWallThick * 1.12;
    const quoinGeo = new THREE.BoxGeometry(quoinSize, h, quoinSize);
    const corners = [
      { x: -l / 2 + quoinSize / 2, z: -w / 2 + quoinSize / 2 },
      { x:  l / 2 - quoinSize / 2, z: -w / 2 + quoinSize / 2 },
      { x: -l / 2 + quoinSize / 2, z:  w / 2 - quoinSize / 2 },
      { x:  l / 2 - quoinSize / 2, z:  w / 2 - quoinSize / 2 },
    ];
    const quoinMeshes = [];
    corners.forEach((c) => {
      const qMesh = new THREE.Mesh(quoinGeo, archetype === 'manali' ? timberMat : stonePlinthMat);
      qMesh.position.set(c.x, wallBaseY, c.z);
      qMesh.castShadow = true;
      qMesh.receiveShadow = true;
      shelter.add(qMesh);
      quoinMeshes.push(qMesh);
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

    // North Facade Fenestration by Archetype
    let ventTransom = null;
    if (archetype === 'jaisalmer') {
      // Jali screened north clerestory window
      const jaliNorthGeo = new THREE.BoxGeometry(1.2, 0.45, extThick * 1.05);
      const jaliNorth = new THREE.Mesh(jaliNorthGeo, createMat('jali', null));
      jaliNorth.position.set(0, h * 0.32, -coreThick / 2 - intThick / 2);
      northGroup.add(jaliNorth);
    } else if (archetype === 'delhi') {
      // North window with concrete overhang
      const winGeo = new THREE.BoxGeometry(1.1, 0.8, extThick * 1.05);
      const winMesh = new THREE.Mesh(winGeo, timberMat);
      winMesh.position.set(0, h * 0.1, -coreThick / 2 - intThick / 2);
      northGroup.add(winMesh);

      const chhajjaNGeo = new THREE.BoxGeometry(1.4, 0.08, 0.5);
      const chhajjaN = new THREE.Mesh(chhajjaNGeo, concreteFloorMat);
      chhajjaN.position.set(0, h * 0.1 + 0.45, -coreThick / 2 - intThick / 2 - 0.25);
      northGroup.add(chhajjaN);
    } else {
      // Small High-Level Transom Ventilation Lintel on North
      const ventTransomGeo = new THREE.BoxGeometry(0.8, 0.22, extThick * 1.05);
      ventTransom = new THREE.Mesh(ventTransomGeo, timberMat);
      ventTransom.position.set(0, h * 0.35, -coreThick / 2 - intThick / 2);
      northGroup.add(ventTransom);
    }

    // Kath-Kuni horizontal timber cribbage courses for Manali
    if (archetype === 'manali') {
      const beamCourses = 4;
      for (let i = 1; i <= beamCourses; i++) {
        const by = -h / 2 + (i / (beamCourses + 1)) * h;
        const beamGeo = new THREE.BoxGeometry(l + 0.05, 0.12, extThick * 1.08);
        const beamMesh = new THREE.Mesh(beamGeo, timberMat);
        beamMesh.position.set(0, by, -coreThick / 2 - intThick / 2);
        beamMesh.castShadow = true;
        northGroup.add(beamMesh);
      }
    }

    shelter.add(northGroup);

    // ── B. East Facade & Entrance Portal (Adapted by Archetype) ──
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

    let vestWallMesh = null;
    let canopyMesh = null;
    let doorMesh = null;
    let handleMesh = null;

    if (archetype === 'siachen' || archetype === 'dras') {
      // Protruding Arctic Airlock Vestibule Mudroom
      const vestibuleDepth = 1.35;
      const vestibuleWidth = 1.45;
      const vestibuleHeight = h * 0.88;
      const vestibuleGroup = new THREE.Group();
      vestibuleGroup.position.set(-extThick / 2 - vestibuleDepth / 2, -h / 2 + vestibuleHeight / 2, 0.3);

      const vestWallGeo = new THREE.BoxGeometry(vestibuleDepth, vestibuleHeight, vestibuleWidth);
      vestWallMesh = new THREE.Mesh(vestWallGeo, wallExteriorMat);
      vestWallMesh.castShadow = true;
      vestWallMesh.receiveShadow = true;
      vestibuleGroup.add(vestWallMesh);

      // Vestibule Pitched Canopy Hood
      const canopyGeo = new THREE.BoxGeometry(vestibuleDepth + 0.25, 0.08, vestibuleWidth + 0.25);
      canopyMesh = new THREE.Mesh(canopyGeo, metalRoofMat);
      canopyMesh.position.set(0, vestibuleHeight / 2 + 0.04, 0);
      canopyMesh.rotation.z = -0.12;
      canopyMesh.castShadow = true;
      vestibuleGroup.add(canopyMesh);

      // Heavy Mountain Entry Door
      const doorW = 0.92;
      const doorH = 1.95;
      const doorGeo = new THREE.BoxGeometry(0.08, doorH, doorW);
      doorMesh = new THREE.Mesh(doorGeo, timberMat);
      doorMesh.position.set(-vestibuleDepth / 2 - 0.04, -vestibuleHeight / 2 + doorH / 2, 0);
      doorMesh.castShadow = true;
      vestibuleGroup.add(doorMesh);

      // Stainless Steel Hardware Handle
      const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.9, roughness: 0.2 });
      handleMesh = new THREE.Mesh(handleGeo, handleMat);
      handleMesh.position.set(-vestibuleDepth / 2 - 0.1, -vestibuleHeight / 2 + doorH / 2, doorW * 0.35);
      vestibuleGroup.add(handleMesh);

      eastGroup.add(vestibuleGroup);

    } else if (archetype === 'manali') {
      // Alpine Sheltered Timber Porch Veranda Entry
      const porchDepth = 0.95;
      const porchWidth = 1.55;
      const porchHeight = h * 0.92;
      const porchGroup = new THREE.Group();
      porchGroup.position.set(-extThick / 2 - porchDepth / 2, -h / 2 + porchHeight / 2, 0.2);

      // Timber Porch Columns / Posts
      const postGeo = new THREE.BoxGeometry(0.12, porchHeight, 0.12);
      const post1 = new THREE.Mesh(postGeo, timberMat);
      post1.position.set(-porchDepth / 2 + 0.06, 0, -porchWidth / 2 + 0.06);
      post1.castShadow = true;
      porchGroup.add(post1);

      const post2 = new THREE.Mesh(postGeo, timberMat);
      post2.position.set(-porchDepth / 2 + 0.06, 0, porchWidth / 2 - 0.06);
      post2.castShadow = true;
      porchGroup.add(post2);

      // Timber Lintels & Transom
      const lintelBeamGeo = new THREE.BoxGeometry(0.12, 0.14, porchWidth);
      const lintelBeam = new THREE.Mesh(lintelBeamGeo, timberMat);
      lintelBeam.position.set(-porchDepth / 2 + 0.06, porchHeight / 2 - 0.07, 0);
      lintelBeam.castShadow = true;
      porchGroup.add(lintelBeam);

      // Gabled Timber Canopy Hood over entrance
      const canopyGeo = new THREE.BoxGeometry(porchDepth + 0.35, 0.08, porchWidth + 0.35);
      canopyMesh = new THREE.Mesh(canopyGeo, timberMat);
      canopyMesh.position.set(0, porchHeight / 2 + 0.08, 0);
      canopyMesh.rotation.z = -0.15;
      canopyMesh.castShadow = true;
      porchGroup.add(canopyMesh);

      // Mountain Deodar Wood Door with Carved Panels
      const doorW = 0.95;
      const doorH = 2.0;
      const doorGeo = new THREE.BoxGeometry(0.08, doorH, doorW);
      doorMesh = new THREE.Mesh(doorGeo, timberMat);
      doorMesh.position.set(0, -porchHeight / 2 + doorH / 2, 0);
      doorMesh.castShadow = true;
      porchGroup.add(doorMesh);

      eastGroup.add(porchGroup);

    } else if (archetype === 'jaisalmer') {
      // Arched Yellow Sandstone Portal
      const portalDepth = 0.35;
      const portalWidth = 1.35;
      const portalHeight = 2.2;
      const portalGroup = new THREE.Group();
      portalGroup.position.set(-extThick / 2 - portalDepth / 2, -h / 2 + portalHeight / 2, 0);

      // Projecting Sandstone Bracket Jambs
      const bracketGeo = new THREE.BoxGeometry(portalDepth, 0.22, 0.18);
      const b1 = new THREE.Mesh(bracketGeo, wallExteriorMat);
      b1.position.set(0, portalHeight / 2 - 0.11, -portalWidth / 2 + 0.09);
      b1.castShadow = true;
      portalGroup.add(b1);

      const b2 = new THREE.Mesh(bracketGeo, wallExteriorMat);
      b2.position.set(0, portalHeight / 2 - 0.11, portalWidth / 2 - 0.09);
      b2.castShadow = true;
      portalGroup.add(b2);

      // Heavy Carved Sandstone Lintel Hood
      const hoodGeo = new THREE.BoxGeometry(portalDepth + 0.15, 0.12, portalWidth + 0.25);
      canopyMesh = new THREE.Mesh(hoodGeo, wallExteriorMat);
      canopyMesh.position.set(-0.04, portalHeight / 2 + 0.06, 0);
      canopyMesh.castShadow = true;
      portalGroup.add(canopyMesh);

      // Carved Teak / Rosewood Studded Door
      const doorGeo = new THREE.BoxGeometry(0.06, 1.95, 0.95);
      doorMesh = new THREE.Mesh(doorGeo, timberMat);
      doorMesh.position.set(portalDepth / 2 - 0.03, -portalHeight / 2 + 0.975, 0);
      doorMesh.castShadow = true;
      portalGroup.add(doorMesh);

      eastGroup.add(portalGroup);

    } else if (archetype === 'leh') {
      // Ladakhi Entrance Portal with Shing-tsag Lintel
      const portalWidth = 1.35;
      const portalHeight = 2.1;
      const portalGroup = new THREE.Group();
      portalGroup.position.set(-extThick / 2 - 0.12, -h / 2 + portalHeight / 2, 0);

      // Distinctive carved wooden stepped corbel lintel (shing-tsag)
      const shingTsagGeo = new THREE.BoxGeometry(0.24, 0.18, portalWidth + 0.35);
      canopyMesh = new THREE.Mesh(shingTsagGeo, timberMat);
      canopyMesh.position.set(0, portalHeight / 2 - 0.09, 0);
      canopyMesh.castShadow = true;
      portalGroup.add(canopyMesh);

      // Heavy timber door
      const doorGeo = new THREE.BoxGeometry(0.06, 1.9, 0.92);
      doorMesh = new THREE.Mesh(doorGeo, timberMat);
      doorMesh.position.set(0.06, -portalHeight / 2 + 0.95, 0);
      doorMesh.castShadow = true;
      portalGroup.add(doorMesh);

      eastGroup.add(portalGroup);

    } else {
      // Delhi / Lowland Entrance Door
      const doorGeo = new THREE.BoxGeometry(0.06, 2.05, 0.95);
      doorMesh = new THREE.Mesh(doorGeo, timberMat);
      doorMesh.position.set(-extThick / 2 - 0.02, -h / 2 + 1.025, 0);
      doorMesh.castShadow = true;
      eastGroup.add(doorMesh);
    }

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

    // Kath-Kuni horizontal timber cribbage courses for Manali West Wall
    if (archetype === 'manali') {
      const beamCourses = 4;
      for (let i = 1; i <= beamCourses; i++) {
        const by = -h / 2 + (i / (beamCourses + 1)) * h;
        const beamGeo = new THREE.BoxGeometry(extThick * 1.08, 0.12, sideWallLen + 0.05);
        const beamMesh = new THREE.Mesh(beamGeo, timberMat);
        beamMesh.position.set(coreThick / 2 + intThick / 2, by, 0);
        beamMesh.castShadow = true;
        westGroup.add(beamMesh);
      }
    }

    shelter.add(westGroup);

    // ── D. South Facade (Adapted by Archetype) ──
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

    // Wall section below window (Spandrel)
    const spandrelH = 0.35;
    const spandrelGeo = new THREE.BoxGeometry(winWidth, spandrelH, totalWallThick);
    const spandrel = new THREE.Mesh(spandrelGeo, wallExteriorMat);
    spandrel.position.set(0, -h / 2 + spandrelH / 2, 0);
    spandrel.castShadow = true;
    southGroup.add(spandrel);

    // Heavy Lintel above window
    const lintelHeight = h - (winHeight + spandrelH);
    let lintel = null;
    if (lintelHeight > 0.08) {
      const lintelGeo = new THREE.BoxGeometry(winWidth, lintelHeight, totalWallThick * 1.05);
      lintel = new THREE.Mesh(lintelGeo, archetype === 'delhi' ? concreteFloorMat : timberMat);
      lintel.position.set(0, h / 2 - lintelHeight / 2, 0);
      lintel.castShadow = true;
      southGroup.add(lintel);
    }

    let trombeMesh = null;
    let glassMesh = null;
    let shutterLeft = null;
    let shutterRight = null;
    let topVent1 = null;
    let topVent2 = null;
    let btmVent1 = null;
    let btmVent2 = null;
    let frameMesh = null;
    let mullion = null;
    let sill = null;

    if (archetype === 'siachen' || archetype === 'dras') {
      // ═════════════════════════════════════════════════════════════════
      // SIACHEN / DRAS: TROMBE WALL + SOLAR AIR VENTS
      // ═════════════════════════════════════════════════════════════════
      const trombeThick = 0.22;
      const trombeGeo = new THREE.BoxGeometry(winWidth * 0.96, winHeight * 0.94, trombeThick);
      const trombeMat = isThermal
        ? new THREE.MeshStandardMaterial({ color: 0xEF4444, roughness: 0.3 })
        : new THREE.MeshStandardMaterial({ color: 0x2A2421, roughness: 0.95 });
      trombeMesh = new THREE.Mesh(trombeGeo, trombeMat);
      trombeMesh.position.set(0, winYOffset, -totalWallThick * 0.25);
      southGroup.add(trombeMesh);

      // Vents
      const ventGeo = new THREE.BoxGeometry(0.35, 0.12, trombeThick * 1.05);
      const ventMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
      topVent1 = new THREE.Mesh(ventGeo, ventMat);
      topVent1.position.set(-winWidth * 0.28, winYOffset + winHeight * 0.38, -totalWallThick * 0.25);
      topVent2 = new THREE.Mesh(ventGeo, ventMat);
      topVent2.position.set(winWidth * 0.28, winYOffset + winHeight * 0.38, -totalWallThick * 0.25);
      btmVent1 = new THREE.Mesh(ventGeo, ventMat);
      btmVent1.position.set(-winWidth * 0.28, winYOffset - winHeight * 0.38, -totalWallThick * 0.25);
      btmVent2 = new THREE.Mesh(ventGeo, ventMat);
      btmVent2.position.set(winWidth * 0.28, winYOffset - winHeight * 0.38, -totalWallThick * 0.25);
      southGroup.add(topVent1);
      southGroup.add(topVent2);
      southGroup.add(btmVent1);
      southGroup.add(btmVent2);

      // Window Frame & Mullions
      const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.12);
      frameMesh = new THREE.Mesh(frameGeo, timberMat);
      frameMesh.position.set(0, winYOffset, totalWallThick * 0.42);
      southGroup.add(frameMesh);

      const mullionGeo = new THREE.BoxGeometry(0.08, winHeight, 0.14);
      mullion = new THREE.Mesh(mullionGeo, timberMat);
      mullion.position.set(0, winYOffset, totalWallThick * 0.42);
      southGroup.add(mullion);

      // Sill
      const sillGeo = new THREE.BoxGeometry(winWidth + 0.2, 0.08, 0.22);
      sill = new THREE.Mesh(sillGeo, timberMat);
      sill.position.set(0, winYOffset - winHeight / 2 - 0.04, totalWallThick * 0.45);
      sill.castShadow = true;
      southGroup.add(sill);

      // High-Spec Reflective Glazing
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
      glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(0, winYOffset, totalWallThick * 0.42);
      southGroup.add(glassMesh);

      // Operable Night Shutters
      if (southOpening.night_shutter) {
        const shutterLeafGeo = new THREE.BoxGeometry(winWidth * 0.46, winHeight - 0.1, 0.04);
        shutterLeft = new THREE.Mesh(shutterLeafGeo, timberMat);
        shutterLeft.position.set(-winWidth * 0.24, winYOffset, totalWallThick * 0.32);
        shutterRight = new THREE.Mesh(shutterLeafGeo, timberMat);
        shutterRight.position.set(winWidth * 0.24, winYOffset, totalWallThick * 0.32);
        southGroup.add(shutterLeft);
        southGroup.add(shutterRight);
      }

    } else if (archetype === 'jaisalmer') {
      // ═════════════════════════════════════════════════════════════════
      // JAISALMER: DEEP REVEALS + CARVED STONE JALI LATTICE SCREEN
      // ═════════════════════════════════════════════════════════════════
      const jaliMat = new THREE.MeshStandardMaterial({
        map: getJaliScreenTexture(),
        roughness: 0.9,
        metalness: 0.05,
      });

      // Recessed Window reveal frame
      const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.14);
      frameMesh = new THREE.Mesh(frameGeo, wallExteriorMat);
      frameMesh.position.set(0, winYOffset, totalWallThick * 0.1);
      southGroup.add(frameMesh);

      // Two carved stone jali panels fitted across the window
      const jaliGeo = new THREE.BoxGeometry(winWidth * 0.46, winHeight - 0.1, 0.05);
      const jaliLeft = new THREE.Mesh(jaliGeo, jaliMat);
      jaliLeft.position.set(-winWidth * 0.24, winYOffset, totalWallThick * 0.38);
      jaliLeft.castShadow = true;
      southGroup.add(jaliLeft);

      const jaliRight = new THREE.Mesh(jaliGeo, jaliMat);
      jaliRight.position.set(winWidth * 0.24, winYOffset, totalWallThick * 0.38);
      jaliRight.castShadow = true;
      southGroup.add(jaliRight);

      // Sandstone projecting brackets (Todas) underneath window sill
      const bracketGeo = new THREE.BoxGeometry(0.12, 0.20, 0.22);
      const b1 = new THREE.Mesh(bracketGeo, wallExteriorMat);
      b1.position.set(-winWidth * 0.35, winYOffset - winHeight / 2 - 0.1, totalWallThick * 0.42);
      b1.castShadow = true;
      southGroup.add(b1);

      const b2 = new THREE.Mesh(bracketGeo, wallExteriorMat);
      b2.position.set(winWidth * 0.35, winYOffset - winHeight / 2 - 0.1, totalWallThick * 0.42);
      b2.castShadow = true;
      southGroup.add(b2);

      // Projecting Stone Sill
      const sillGeo = new THREE.BoxGeometry(winWidth + 0.3, 0.08, 0.28);
      sill = new THREE.Mesh(sillGeo, wallExteriorMat);
      sill.position.set(0, winYOffset - winHeight / 2 - 0.04, totalWallThick * 0.45);
      sill.castShadow = true;
      southGroup.add(sill);

      // Interior Glazing set behind Jali Screen
      const glassGeo = new THREE.BoxGeometry(winWidth - 0.14, winHeight - 0.14, 0.02);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: isThermal ? 0xF59E0B : 0x8cc4db,
        transparent: true,
        opacity: isThermal ? 0.85 : 0.4,
        roughness: 0.1,
      });
      glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(0, winYOffset, totalWallThick * 0.1);
      southGroup.add(glassMesh);

    } else if (archetype === 'manali') {
      // ═════════════════════════════════════════════════════════════════
      // MANALI: DIRECT-GAIN TIMBER-FRAMED ALPINE GLAZING + SHUTTERS
      // ═════════════════════════════════════════════════════════════════
      // Deep Timber Window Frame with central mullion & transom
      const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.16);
      frameMesh = new THREE.Mesh(frameGeo, timberMat);
      frameMesh.position.set(0, winYOffset, totalWallThick * 0.38);
      southGroup.add(frameMesh);

      const mullionGeo = new THREE.BoxGeometry(0.10, winHeight, 0.18);
      mullion = new THREE.Mesh(mullionGeo, timberMat);
      mullion.position.set(0, winYOffset, totalWallThick * 0.38);
      southGroup.add(mullion);

      const transomGeo = new THREE.BoxGeometry(winWidth, 0.08, 0.18);
      const transom = new THREE.Mesh(transomGeo, timberMat);
      transom.position.set(0, winYOffset + winHeight * 0.2, totalWallThick * 0.38);
      southGroup.add(transom);

      // Deep Alpine Timber Sill
      const sillGeo = new THREE.BoxGeometry(winWidth + 0.25, 0.10, 0.28);
      sill = new THREE.Mesh(sillGeo, timberMat);
      sill.position.set(0, winYOffset - winHeight / 2 - 0.05, totalWallThick * 0.46);
      sill.castShadow = true;
      southGroup.add(sill);

      // Clear Direct-Gain Double Glazing Panes
      const glassGeo = new THREE.BoxGeometry(winWidth - 0.16, winHeight - 0.16, 0.02);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: isThermal ? 0xF59E0B : 0xA5F3FC,
        transparent: true,
        opacity: isThermal ? 0.85 : 0.45,
        roughness: 0.05,
        transmission: isThermal ? 0.0 : 0.88,
        ior: 1.52,
      });
      glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(0, winYOffset, totalWallThick * 0.38);
      southGroup.add(glassMesh);

      // Operable Exterior Wooden Thermal Shutters
      const shutterLeafGeo = new THREE.BoxGeometry(winWidth * 0.46, winHeight - 0.1, 0.04);
      shutterLeft = new THREE.Mesh(shutterLeafGeo, timberMat);
      shutterLeft.position.set(-winWidth * 0.24, winYOffset, totalWallThick * 0.48);
      shutterRight = new THREE.Mesh(shutterLeafGeo, timberMat);
      shutterRight.position.set(winWidth * 0.24, winYOffset, totalWallThick * 0.48);
      southGroup.add(shutterLeft);
      southGroup.add(shutterRight);

    } else if (archetype === 'leh') {
      // ═════════════════════════════════════════════════════════════════
      // LEH: HIGH-GAIN SOLAR APERTURE WITH SHING-TSAG CORBEL LINTEL
      // ═════════════════════════════════════════════════════════════════
      // Carved Timber Lintel (Shing-tsag) above glazing
      const shingTsagGeo = new THREE.BoxGeometry(winWidth + 0.4, 0.16, totalWallThick * 1.15);
      const shingTsag = new THREE.Mesh(shingTsagGeo, timberMat);
      shingTsag.position.set(0, winYOffset + winHeight / 2 + 0.08, 0);
      shingTsag.castShadow = true;
      southGroup.add(shingTsag);

      // Timber window frame
      const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.14);
      frameMesh = new THREE.Mesh(frameGeo, timberMat);
      frameMesh.position.set(0, winYOffset, totalWallThick * 0.38);
      southGroup.add(frameMesh);

      // Solar Glazing
      const glassGeo = new THREE.BoxGeometry(winWidth - 0.14, winHeight - 0.14, 0.02);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: isThermal ? 0xF59E0B : 0x8cc4db,
        transparent: true,
        opacity: isThermal ? 0.85 : 0.45,
        transmission: isThermal ? 0.0 : 0.86,
      });
      glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(0, winYOffset, totalWallThick * 0.38);
      southGroup.add(glassMesh);

      // Shutters
      const shutterLeafGeo = new THREE.BoxGeometry(winWidth * 0.46, winHeight - 0.1, 0.04);
      shutterLeft = new THREE.Mesh(shutterLeafGeo, timberMat);
      shutterLeft.position.set(-winWidth * 0.24, winYOffset, totalWallThick * 0.46);
      shutterRight = new THREE.Mesh(shutterLeafGeo, timberMat);
      shutterRight.position.set(winWidth * 0.24, winYOffset, totalWallThick * 0.46);
      southGroup.add(shutterLeft);
      southGroup.add(shutterRight);

    } else if (archetype === 'delhi') {
      // ═════════════════════════════════════════════════════════════════
      // DELHI: CANTILEVERED RCC CHHAJJA OVERHANG SUNSHADE
      // ═════════════════════════════════════════════════════════════════
      // Cantilevered Concrete Chhajja (0.60m projection)
      const chhajjaProj = 0.60;
      const chhajjaGeo = new THREE.BoxGeometry(winWidth + 0.4, 0.08, chhajjaProj);
      const chhajja = new THREE.Mesh(chhajjaGeo, concreteFloorMat);
      chhajja.position.set(0, winYOffset + winHeight / 2 + 0.06, totalWallThick / 2 + chhajjaProj / 2 - 0.05);
      chhajja.castShadow = true;
      southGroup.add(chhajja);

      // Window Frame
      const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.10);
      frameMesh = new THREE.Mesh(frameGeo, timberMat);
      frameMesh.position.set(0, winYOffset, totalWallThick * 0.38);
      southGroup.add(frameMesh);

      // Glazing
      const glassGeo = new THREE.BoxGeometry(winWidth - 0.12, winHeight - 0.12, 0.02);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: isThermal ? 0xF59E0B : 0x8cc4db,
        transparent: true,
        opacity: isThermal ? 0.85 : 0.45,
      });
      glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(0, winYOffset, totalWallThick * 0.38);
      southGroup.add(glassMesh);
    }

    shelter.add(southGroup);

    // ── 4. Place-Adaptive Regional Roof Architecture ──
    const roofGroup = new THREE.Group();
    const roofBaseY = plinthThick + floorSlabThick + h;
    let snowMeshRef = null;
    let rafterMeshes = [];
    let deckMesh = null;
    let roofInsulMesh = null;
    let metalRoofMesh = null;
    let guardBar = null;
    let pvPanels = [];
    let pipe = null;
    let cowl = null;

    if (archetype === 'manali') {
      // ═════════════════════════════════════════════════════════════════
      // 4A. MANALI: 30° DOUBLE-PITCHED ALPINE GABLE ROOF (IS 875)
      // ═════════════════════════════════════════════════════════════════
      const eavesOverhang = 0.48; // Overhang beyond wall on N and S
      const gableOverhang = 0.45; // Overhang beyond wall on E and W
      const halfW = w / 2 + eavesOverhang;
      const roofPitchRad = 0.5236; // 30 degrees = PI / 6
      const ridgeHeight = Math.tan(roofPitchRad) * halfW; // ~1.43m peak rise
      const slopeLen = halfW / Math.cos(roofPitchRad); // slope hypotenuse length
      const totalRoofL = l + gableOverhang * 2;

      roofGroup.position.set(0, roofBaseY, 0);

      // Slate / Standing Seam Slate Texture
      const slateMat = createMat('slate_roof', 0x334155, 0.75, 0.15);

      // Heavy Timber Ridge Beam
      const ridgeBeamGeo = new THREE.BoxGeometry(totalRoofL + 0.1, 0.16, 0.16);
      const ridgeBeam = new THREE.Mesh(ridgeBeamGeo, timberMat);
      ridgeBeam.position.set(0, ridgeHeight, 0);
      ridgeBeam.castShadow = true;
      roofGroup.add(ridgeBeam);

      // Triangular Gable End Walls (Attic Enclosure on East & West)
      const createGableWall = (xPos) => {
        const gableShape = new THREE.Shape();
        gableShape.moveTo(-w / 2, 0);
        gableShape.lineTo(0, Math.tan(roofPitchRad) * (w / 2));
        gableShape.lineTo(w / 2, 0);
        gableShape.closePath();

        const extrudeSettings = { depth: extThick, bevelEnabled: false };
        const gableGeo = new THREE.ExtrudeGeometry(gableShape, extrudeSettings);
        const gableMesh = new THREE.Mesh(gableGeo, wallExteriorMat);
        gableMesh.rotation.y = Math.PI / 2;
        gableMesh.position.set(xPos, 0, 0);
        gableMesh.castShadow = true;
        gableMesh.receiveShadow = true;
        return gableMesh;
      };

      const eastGable = createGableWall(-l / 2);
      const westGable = createGableWall(l / 2 - extThick);
      roofGroup.add(eastGable);
      roofGroup.add(westGable);

      // Attic Timber Ventilation Louvres on West Gable
      const louvreGeo = new THREE.BoxGeometry(0.04, 0.35, 0.35);
      const louvreMesh = new THREE.Mesh(louvreGeo, timberMat);
      louvreMesh.position.set(l / 2 + 0.02, ridgeHeight * 0.55, 0);
      roofGroup.add(louvreMesh);

      // Exposed Timber Rafters
      const rafterCount = Math.max(6, Math.round(l / 0.7));
      const rafterGeo = new THREE.BoxGeometry(0.08, 0.12, slopeLen);
      for (let i = 0; i < rafterCount; i++) {
        const rx = -l / 2 - gableOverhang * 0.5 + (i / (rafterCount - 1)) * (totalRoofL - gableOverhang);
        // South rafter
        const rafterS = new THREE.Mesh(rafterGeo, timberMat);
        rafterS.position.set(rx, ridgeHeight / 2 - 0.04, halfW / 2);
        rafterS.rotation.x = roofPitchRad;
        rafterS.castShadow = true;
        roofGroup.add(rafterS);
        rafterMeshes.push(rafterS);

        // North rafter
        const rafterN = new THREE.Mesh(rafterGeo, timberMat);
        rafterN.position.set(rx, ridgeHeight / 2 - 0.04, -halfW / 2);
        rafterN.rotation.x = -roofPitchRad;
        rafterN.castShadow = true;
        roofGroup.add(rafterN);
        rafterMeshes.push(rafterN);
      }

      // Roof Structural Timber Decking (North & South slopes)
      const deckSlopeGeo = new THREE.BoxGeometry(totalRoofL, 0.04, slopeLen);
      const deckS = new THREE.Mesh(deckSlopeGeo, timberMat);
      deckS.position.set(0, ridgeHeight / 2, halfW / 2);
      deckS.rotation.x = roofPitchRad;
      deckS.castShadow = true;
      roofGroup.add(deckS);

      const deckN = new THREE.Mesh(deckSlopeGeo, timberMat);
      deckN.position.set(0, ridgeHeight / 2, -halfW / 2);
      deckN.rotation.x = -roofPitchRad;
      deckN.castShadow = true;
      roofGroup.add(deckN);
      deckMesh = deckS;

      // Continuous Roof Insulation Core
      const insulSlopeGeo = new THREE.BoxGeometry(totalRoofL, 0.10, slopeLen);
      const insulS = new THREE.Mesh(insulSlopeGeo, wallInsulationMat);
      insulS.position.set(0, ridgeHeight / 2 + 0.05, halfW / 2);
      insulS.rotation.x = roofPitchRad;
      roofGroup.add(insulS);

      const insulN = new THREE.Mesh(insulSlopeGeo, wallInsulationMat);
      insulN.position.set(0, ridgeHeight / 2 + 0.05, -halfW / 2);
      insulN.rotation.x = -roofPitchRad;
      roofGroup.add(insulN);
      roofInsulMesh = insulS;

      // Weatherproof Alpine Slate Roof Deck Covering
      const slateSlopeGeo = new THREE.BoxGeometry(totalRoofL + 0.04, 0.04, slopeLen + 0.04);
      const slateS = new THREE.Mesh(slateSlopeGeo, slateMat);
      slateS.position.set(0, ridgeHeight / 2 + 0.10, halfW / 2);
      slateS.rotation.x = roofPitchRad;
      slateS.castShadow = true;
      slateS.receiveShadow = true;
      roofGroup.add(slateS);

      const slateN = new THREE.Mesh(slateSlopeGeo, slateMat);
      slateN.position.set(0, ridgeHeight / 2 + 0.10, -halfW / 2);
      slateN.rotation.x = -roofPitchRad;
      slateN.castShadow = true;
      slateN.receiveShadow = true;
      roofGroup.add(slateN);
      metalRoofMesh = slateS;

      // Timber Bargeboards along Gable Edges
      const bargeboardGeo = new THREE.BoxGeometry(0.04, 0.18, slopeLen + 0.08);
      const addBargeboards = (xPos) => {
        const bS = new THREE.Mesh(bargeboardGeo, timberMat);
        bS.position.set(xPos, ridgeHeight / 2 + 0.08, halfW / 2);
        bS.rotation.x = roofPitchRad;
        roofGroup.add(bS);

        const bN = new THREE.Mesh(bargeboardGeo, timberMat);
        bN.position.set(xPos, ridgeHeight / 2 + 0.08, -halfW / 2);
        bN.rotation.x = -roofPitchRad;
        roofGroup.add(bN);
      };
      addBargeboards(-totalRoofL / 2);
      addBargeboards(totalRoofL / 2);

      // Alpine Snow Retention Guards along eaves
      const guardGeo = new THREE.BoxGeometry(totalRoofL - 0.2, 0.06, 0.04);
      guardBar = new THREE.Mesh(guardGeo, new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
      guardBar.position.set(0, 0.16, halfW - 0.12);
      guardBar.rotation.x = roofPitchRad;
      roofGroup.add(guardBar);

      // Traditional Alpine Stone Chimney
      const chimGroup = new THREE.Group();
      chimGroup.position.set(l * 0.25, ridgeHeight * 0.5, w * 0.15);
      const chimGeo = new THREE.BoxGeometry(0.45, 1.2, 0.45);
      pipe = new THREE.Mesh(chimGeo, stonePlinthMat);
      pipe.castShadow = true;
      chimGroup.add(pipe);

      const capGeo = new THREE.BoxGeometry(0.55, 0.06, 0.55);
      cowl = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0x78350F }));
      cowl.position.y = 0.63;
      chimGroup.add(cowl);
      roofGroup.add(chimGroup);

      // Crystalline Snow Blanket on Pitched Slopes
      if (effectiveSnowCover) {
        const snowSlopeGeo = new THREE.BoxGeometry(totalRoofL, 0.10, slopeLen);
        const snowS = new THREE.Mesh(snowSlopeGeo, createMat('snow', null));
        snowS.position.set(0, ridgeHeight / 2 + 0.15, halfW / 2);
        snowS.rotation.x = roofPitchRad;
        snowS.receiveShadow = true;
        roofGroup.add(snowS);

        const snowN = new THREE.Mesh(snowSlopeGeo, createMat('snow', null));
        snowN.position.set(0, ridgeHeight / 2 + 0.15, -halfW / 2);
        snowN.rotation.x = -roofPitchRad;
        snowN.receiveShadow = true;
        roofGroup.add(snowN);
        snowMeshRef = snowS;
      }

    } else if (archetype === 'jaisalmer') {
      // ═════════════════════════════════════════════════════════════════
      // 4B. JAISALMER: FLAT ROOF TERRACE WITH KANGURA BATTLEMENTS
      // ═════════════════════════════════════════════════════════════════
      const terraceOverhang = 0.25;
      const roofL = l + terraceOverhang * 2;
      const roofW = w + terraceOverhang * 2;
      const parapetHeight = 0.60;
      const parapetThick = 0.18;

      roofGroup.position.set(0, roofBaseY, 0);

      // Sandstone Roof Slab
      const slabGeo = new THREE.BoxGeometry(roofL, 0.22, roofW);
      metalRoofMesh = new THREE.Mesh(slabGeo, wallExteriorMat);
      metalRoofMesh.position.set(0, 0.11, 0);
      metalRoofMesh.castShadow = true;
      metalRoofMesh.receiveShadow = true;
      roofGroup.add(metalRoofMesh);

      // Perimeter Sandstone Parapet Walls
      const pNorthGeo = new THREE.BoxGeometry(roofL, parapetHeight, parapetThick);
      const pNorth = new THREE.Mesh(pNorthGeo, wallExteriorMat);
      pNorth.position.set(0, 0.22 + parapetHeight / 2, -roofW / 2 + parapetThick / 2);
      pNorth.castShadow = true;
      roofGroup.add(pNorth);

      const pSouth = new THREE.Mesh(pNorthGeo, wallExteriorMat);
      pSouth.position.set(0, 0.22 + parapetHeight / 2, roofW / 2 - parapetThick / 2);
      pSouth.castShadow = true;
      roofGroup.add(pSouth);

      const pEastGeo = new THREE.BoxGeometry(parapetThick, parapetHeight, roofW - parapetThick * 2);
      const pEast = new THREE.Mesh(pEastGeo, wallExteriorMat);
      pEast.position.set(-roofL / 2 + parapetThick / 2, 0.22 + parapetHeight / 2, 0);
      pEast.castShadow = true;
      roofGroup.add(pEast);

      const pWest = new THREE.Mesh(pEastGeo, wallExteriorMat);
      pWest.position.set(roofL / 2 - parapetThick / 2, 0.22 + parapetHeight / 2, 0);
      pWest.castShadow = true;
      roofGroup.add(pWest);

      // Traditional Carved Stone Kangura Battlements
      const kanguraCountX = Math.round(roofL / 0.55);
      const kanguraShape = new THREE.Shape();
      kanguraShape.moveTo(-0.12, 0);
      kanguraShape.lineTo(0, 0.16);
      kanguraShape.lineTo(0.12, 0);
      kanguraShape.closePath();
      const kanguraExt = { depth: parapetThick * 1.05, bevelEnabled: false };
      const kanguraGeo = new THREE.ExtrudeGeometry(kanguraShape, kanguraExt);

      const kanguraY = 0.22 + parapetHeight;
      for (let i = 0; i < kanguraCountX; i++) {
        const kx = -roofL / 2 + 0.35 + (i / (kanguraCountX - 1)) * (roofL - 0.7);
        const kNorth = new THREE.Mesh(kanguraGeo, wallExteriorMat);
        kNorth.position.set(kx, kanguraY, -roofW / 2);
        kNorth.castShadow = true;
        roofGroup.add(kNorth);

        const kSouth = new THREE.Mesh(kanguraGeo, wallExteriorMat);
        kSouth.position.set(kx, kanguraY, roofW / 2 - parapetThick);
        kSouth.castShadow = true;
        roofGroup.add(kSouth);
      }

    } else if (archetype === 'leh') {
      // ═════════════════════════════════════════════════════════════════
      // 4C. LEH: FLAT MUD & WILLOW ROOF WITH TARKA PARAPET & PRAYER FLAGS
      // ═════════════════════════════════════════════════════════════════
      const terraceOverhang = 0.22;
      const roofL = l + terraceOverhang * 2;
      const roofW = w + terraceOverhang * 2;
      const tarkaHeight = 0.28;

      roofGroup.position.set(0, roofBaseY, 0);

      // Traditional Ladakhi Burgundy Frieze Band (Mar-po)
      const friezeGeo = new THREE.BoxGeometry(roofL + 0.04, 0.18, roofW + 0.04);
      const friezeMat = new THREE.MeshStandardMaterial({ color: 0x581C1A, roughness: 0.9 });
      const frieze = new THREE.Mesh(friezeGeo, friezeMat);
      frieze.position.set(0, 0.09, 0);
      roofGroup.add(frieze);

      // Earthen Flat Roof Mud Slab (Talu)
      const mudSlabGeo = new THREE.BoxGeometry(roofL, 0.18, roofW);
      metalRoofMesh = new THREE.Mesh(mudSlabGeo, wallExteriorMat);
      metalRoofMesh.position.set(0, 0.18, 0);
      metalRoofMesh.receiveShadow = true;
      roofGroup.add(metalRoofMesh);

      // Authentic Willow Twig Brushwood Parapet (Tarka)
      const tarkaMat = new THREE.MeshStandardMaterial({
        color: 0x451A03,
        roughness: 0.95,
      });

      const tarkaNGeo = new THREE.BoxGeometry(roofL + 0.06, tarkaHeight, 0.24);
      const tarkaN = new THREE.Mesh(tarkaNGeo, tarkaMat);
      tarkaN.position.set(0, 0.27 + tarkaHeight / 2, -roofW / 2 + 0.12);
      tarkaN.castShadow = true;
      roofGroup.add(tarkaN);

      const tarkaS = new THREE.Mesh(tarkaNGeo, tarkaMat);
      tarkaS.position.set(0, 0.27 + tarkaHeight / 2, roofW / 2 - 0.12);
      tarkaS.castShadow = true;
      roofGroup.add(tarkaS);

      const tarkaEGeo = new THREE.BoxGeometry(0.24, tarkaHeight, roofW - 0.24);
      const tarkaE = new THREE.Mesh(tarkaEGeo, tarkaMat);
      tarkaE.position.set(-roofL / 2 + 0.12, 0.27 + tarkaHeight / 2, 0);
      tarkaE.castShadow = true;
      roofGroup.add(tarkaE);

      const tarkaW = new THREE.Mesh(tarkaEGeo, tarkaMat);
      tarkaW.position.set(roofL / 2 - 0.12, 0.27 + tarkaHeight / 2, 0);
      tarkaW.castShadow = true;
      roofGroup.add(tarkaW);

      // Tall Buddhist Prayer Flag Mast (Darchor) on Northeast Corner
      const mastGroup = new THREE.Group();
      mastGroup.position.set(-roofL / 2 + 0.35, 0.27, -roofW / 2 + 0.35);

      const mastPoleGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.8, 8);
      const mastPoleMat = new THREE.MeshStandardMaterial({ color: 0x5C3A21, roughness: 0.8 });
      const mastPole = new THREE.Mesh(mastPoleGeo, mastPoleMat);
      mastPole.position.y = 1.4;
      mastPole.castShadow = true;
      mastGroup.add(mastPole);

      // Five-Color Prayer Flags
      const flagColors = [0x2563EB, 0xF8FAFC, 0xDC2626, 0x16A34A, 0xEAB308];
      const flagGeo = new THREE.PlaneGeometry(0.32, 0.22);
      flagColors.forEach((color, idx) => {
        const flagMat = new THREE.MeshStandardMaterial({
          color,
          side: THREE.DoubleSide,
          roughness: 0.7,
        });
        const flagMesh = new THREE.Mesh(flagGeo, flagMat);
        flagMesh.position.set(0.18, 2.5 - idx * 0.28, 0);
        flagMesh.rotation.y = 0.2 + idx * 0.08;
        flagMesh.castShadow = true;
        mastGroup.add(flagMesh);
      });
      roofGroup.add(mastGroup);

    } else if (archetype === 'delhi') {
      // ═════════════════════════════════════════════════════════════════
      // 4D. DELHI: FLAT CONCRETE TERRACE WITH METAL SAFETY RAILING
      // ═════════════════════════════════════════════════════════════════
      const terraceOverhang = 0.25;
      const roofL = l + terraceOverhang * 2;
      const roofW = w + terraceOverhang * 2;
      const parapetCurbH = 0.20;

      roofGroup.position.set(0, roofBaseY, 0);

      // Reinforced Concrete Slab
      const slabGeo = new THREE.BoxGeometry(roofL, 0.20, roofW);
      metalRoofMesh = new THREE.Mesh(slabGeo, concreteFloorMat);
      metalRoofMesh.position.set(0, 0.10, 0);
      metalRoofMesh.castShadow = true;
      metalRoofMesh.receiveShadow = true;
      roofGroup.add(metalRoofMesh);

      // Perimeter Concrete Curb
      const curbNGeo = new THREE.BoxGeometry(roofL, parapetCurbH, 0.15);
      const curbN = new THREE.Mesh(curbNGeo, concreteFloorMat);
      curbN.position.set(0, 0.20 + parapetCurbH / 2, -roofW / 2 + 0.075);
      roofGroup.add(curbN);

      const curbS = new THREE.Mesh(curbNGeo, concreteFloorMat);
      curbS.position.set(0, 0.20 + parapetCurbH / 2, roofW / 2 - 0.075);
      roofGroup.add(curbS);

      // Steel Safety Handrail & Posts
      const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
      const topRailNGeo = new THREE.BoxGeometry(roofL, 0.04, 0.04);
      const topRailN = new THREE.Mesh(topRailNGeo, railMat);
      topRailN.position.set(0, 0.20 + 0.95, -roofW / 2 + 0.075);
      roofGroup.add(topRailN);

      const topRailS = new THREE.Mesh(topRailNGeo, railMat);
      topRailS.position.set(0, 0.20 + 0.95, roofW / 2 - 0.075);
      roofGroup.add(topRailS);

      // Baluster Posts
      const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.95, 8);
      const postCountX = Math.round(roofL / 0.8);
      for (let i = 0; i < postCountX; i++) {
        const px = -roofL / 2 + 0.2 + (i / (postCountX - 1)) * (roofL - 0.4);
        const postN = new THREE.Mesh(postGeo, railMat);
        postN.position.set(px, 0.20 + 0.475, -roofW / 2 + 0.075);
        roofGroup.add(postN);

        const postS = new THREE.Mesh(postGeo, railMat);
        postS.position.set(px, 0.20 + 0.475, roofW / 2 - 0.075);
        roofGroup.add(postS);
      }

    } else {
      // ═════════════════════════════════════════════════════════════════
      // 4E. SIACHEN / DRAS: 11° MONOSLOPE AERODYNAMIC SHED ROOF + PV
      // ═════════════════════════════════════════════════════════════════
      const southOverhang = 0.65;
      const northOverhang = 0.35;
      const sideOverhang = 0.42;

      const roofLen = l + sideOverhang * 2;
      const roofWid = w + southOverhang + northOverhang;
      const roofPitchRad = 0.16;

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
        rafterMeshes.push(rafter);
      }

      // Structural Decking
      const deckGeo = new THREE.BoxGeometry(roofLen - 0.04, 0.04, roofWid - 0.04);
      deckMesh = new THREE.Mesh(deckGeo, timberMat);
      deckMesh.position.set(0, 0.2, 0);
      deckMesh.rotation.x = roofPitchRad;
      deckMesh.castShadow = true;
      roofGroup.add(deckMesh);

      // Continuous XPS/EPS Insulation Board
      const roofInsulGeo = new THREE.BoxGeometry(roofLen, 0.14, roofWid);
      roofInsulMesh = new THREE.Mesh(roofInsulGeo, wallInsulationMat);
      roofInsulMesh.position.set(0, 0.29, 0);
      roofInsulMesh.rotation.x = roofPitchRad;
      roofGroup.add(roofInsulMesh);

      // Weatherproof Standing-Seam Alpine Metal Roof
      const metalRoofGeo = new THREE.BoxGeometry(roofLen + 0.04, 0.06, roofWid + 0.04);
      metalRoofMesh = new THREE.Mesh(metalRoofGeo, metalRoofMat);
      metalRoofMesh.position.set(0, 0.39, 0);
      metalRoofMesh.rotation.x = roofPitchRad;
      metalRoofMesh.castShadow = true;
      metalRoofMesh.receiveShadow = true;
      roofGroup.add(metalRoofMesh);

      // Snow retention guards along southern lower edge
      const guardBarGeo = new THREE.BoxGeometry(roofLen - 0.2, 0.06, 0.04);
      guardBar = new THREE.Mesh(guardBarGeo, new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
      guardBar.position.set(0, 0.44, roofWid / 2 - 0.1);
      guardBar.rotation.x = roofPitchRad;
      roofGroup.add(guardBar);

      // Rooftop Photovoltaic (PV) Solar Array
      const pvGroup = new THREE.Group();
      const pvPanelGeo = new THREE.BoxGeometry(1.65, 0.05, 1.0);
      const pv1 = new THREE.Mesh(pvPanelGeo, solarPvMat);
      pv1.position.set(-1.0, 0.48, 0.2);
      pv1.rotation.x = roofPitchRad + 0.15;
      pv1.castShadow = true;
      pvGroup.add(pv1);

      const pv2 = new THREE.Mesh(pvPanelGeo, solarPvMat);
      pv2.position.set(1.0, 0.48, 0.2);
      pv2.rotation.x = roofPitchRad + 0.15;
      pv2.castShadow = true;
      pvGroup.add(pv2);
      roofGroup.add(pvGroup);
      pvPanels = [pv1, pv2];

      // Stainless Steel Insulated Stove Chimney Pipe with Cowl
      const chimneyGroup = new THREE.Group();
      chimneyGroup.position.set(l * 0.28, 0.38, -w * 0.25);

      const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.92, roughness: 0.15 });
      pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.y = 0.7;
      pipe.castShadow = true;
      chimneyGroup.add(pipe);

      const cowlGeo = new THREE.ConeGeometry(0.24, 0.16, 16);
      cowl = new THREE.Mesh(cowlGeo, pipeMat);
      cowl.position.y = 1.45;
      cowl.castShadow = true;
      chimneyGroup.add(cowl);
      roofGroup.add(chimneyGroup);

      // Crystalline Snow Blanket on Roof
      if (effectiveSnowCover) {
        const snowGeo = new THREE.BoxGeometry(roofLen, 0.12, roofWid);
        const snowMesh = new THREE.Mesh(snowGeo, createMat('snow', null));
        snowMesh.position.set(0, 0.46, 0);
        snowMesh.rotation.x = roofPitchRad;
        snowMesh.receiveShadow = true;
        snowMesh.castShadow = true;
        roofGroup.add(snowMesh);
        snowMeshRef = snowMesh;
      }
    }

    shelter.add(roofGroup);

    // ── 5. Structural Framing Mode ──
    const framingGroup = new THREE.Group();
    framingGroup.name = 'structural-framing';

    // Perimeter Timber Studs every 0.6m
    const studCountX = Math.round(l / 0.6);
    const studGeo = new THREE.BoxGeometry(0.08, h, 0.12);
    const studMeshes = [];

    for (let i = 0; i <= studCountX; i++) {
      const sx = -l / 2 + (i / studCountX) * l;
      // North wall studs
      const studN = new THREE.Mesh(studGeo, timberMat);
      studN.position.set(sx, wallBaseY, -w / 2 + totalWallThick / 2);
      framingGroup.add(studN);
      studMeshes.push(studN);

      // South wall studs (avoid window opening)
      if (Math.abs(sx) > winWidth / 2) {
        const studS = new THREE.Mesh(studGeo, timberMat);
        studS.position.set(sx, wallBaseY, w / 2 - totalWallThick / 2);
        framingGroup.add(studS);
        studMeshes.push(studS);
      }
    }
    framingGroup.visible = isFraming;
    shelter.add(framingGroup);

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

    shelterMeshesRef.current = {
      plinthMesh,
      floorMesh,
      timberFloorMesh,
      quoinMeshes,
      northExt,
      northCore,
      northInt,
      ventTransom,
      eastExt,
      eastCore,
      vestWallMesh,
      canopyMesh,
      doorMesh,
      handleMesh,
      westExt,
      westCore,
      leftPier,
      rightPier,
      lintel,
      trombeMesh,
      vents: [topVent1, topVent2, btmVent1, btmVent2].filter(Boolean),
      frameMesh,
      mullion,
      sill,
      glassMesh,
      shutters: [shutterLeft, shutterRight].filter(Boolean),
      rafterMeshes,
      deckMesh,
      roofInsulMesh,
      metalRoofMesh,
      guardBar,
      pvPanels,
      chimneyPipe: pipe,
      chimneyCowl: cowl,
      snowMeshRef,
      framingGroup,
      studMeshes,
      basePositions: {
        northExtZ: -coreThick / 2 - intThick / 2,
        northCoreZ: 0,
        northIntZ: coreThick / 2 + intThick / 2,
        eastExtX: -coreThick / 2 - intThick / 2,
        eastCoreX: 0,
        westExtX: coreThick / 2 + intThick / 2,
        westCoreX: 0,
        roofInsulY: 0.29,
        metalRoofY: 0.39,
      },
    };
  }, [archetype, activeSiteName, length_m, width_m, height_m, openings, effectiveSnowCover, isThermal, isFraming, isExploded]);

  /* ─────────────────────────────────────────────────────────────────────────
     3A. IN-PLACE MATERIAL SYNCHRONIZATION & FACADE PEEL CUTAWAY
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const meshes = shelterMeshesRef.current;
    if (!meshes) return;

    if (meshes.framingGroup) {
      meshes.framingGroup.visible = isFraming;
    }

    // Helper: Safely replace material and dispose replaced material without purging shared textures
    const safeReplaceMaterial = (mesh, newMat) => {
      if (!mesh) return;
      const oldMat = mesh.material;
      mesh.material = newMat;
      mesh.material.needsUpdate = true;
      if (oldMat && oldMat !== newMat) {
        if (Array.isArray(oldMat)) oldMat.forEach((m) => m.dispose());
        else oldMat.dispose();
      }
    };

    const extWallMatId = walls[0]?.material || 'mud_brick';
    const insulMatId = walls[1]?.material || 'eps';
    const intWallMatId = walls[2]?.material || walls[0]?.material || 'mud_brick';
    const roofCladMatId = roof[0]?.material || 'metal_roof';
    const roofInsulMatId = roof[1]?.material || 'eps';
    const floorMatId = floor[0]?.material || 'concrete';

    const buildMaterial = (matId, thermalColor, fallbackType = 'adobe', options = {}) => {
      if (isThermal && thermalColor) {
        return new THREE.MeshStandardMaterial({
          color: thermalColor,
          roughness: 0.35,
          metalness: 0.1,
          ...options,
        });
      }
      if (isFraming) {
        return new THREE.MeshStandardMaterial({
          color: 0xE2E8F0,
          transparent: true,
          opacity: 0.22,
          roughness: 0.8,
          ...options,
        });
      }

      const texture = getTextureForMaterial(matId);
      let roughness = 0.85;
      let metalness = 0.05;
      const idLower = (matId || '').toLowerCase();
      if (idLower.includes('metal') || idLower.includes('cgi') || idLower.includes('steel') || idLower.includes('tin')) {
        metalness = 0.65;
        roughness = 0.42;
      } else if (idLower.includes('eps') || idLower.includes('xps') || idLower.includes('puf') || idLower.includes('insul') || idLower.includes('wool')) {
        metalness = 0.0;
        roughness = 0.70;
      } else if (idLower.includes('stone') || idLower.includes('brick') || idLower.includes('earth') || idLower.includes('adobe') || idLower.includes('rammed')) {
        metalness = 0.02;
        roughness = 0.92;
      } else if (idLower.includes('timber') || idLower.includes('wood') || idLower.includes('plywood')) {
        metalness = 0.04;
        roughness = 0.65;
      }

      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: options.roughness ?? roughness,
        metalness: options.metalness ?? metalness,
        ...options,
      });
    };

    // Determine peel opacities & transparency
    // peelLevel: 0 (Full), 1 (Peeled Cladding), 2 (Peeled Insulation), 3 (Exposed Mass Core)
    const extOpacity = peelLevel === 1 ? 0.75 : peelLevel === 2 ? 0.35 : peelLevel === 3 ? 0.15 : 1.0;
    const extTransparent = peelLevel > 0;
    const insulOpacity = peelLevel === 2 ? 0.75 : peelLevel === 3 ? 0.25 : 1.0;
    const insulTransparent = peelLevel >= 2;

    const extWallMat = buildMaterial(extWallMatId, 0xD4CEBE, 'adobe', {
      transparent: extTransparent || isFraming,
      opacity: isFraming ? 0.22 : extOpacity,
    });
    const insulMat = buildMaterial(insulMatId, 0xEAB308, 'eps', {
      transparent: insulTransparent || isFraming,
      opacity: isFraming ? 0.22 : insulOpacity,
    });
    const intWallMat = buildMaterial(intWallMatId, 0x22C55E, 'adobe', {
      transparent: isFraming,
      opacity: isFraming ? 0.22 : 1.0,
    });
    const roofCladMat = buildMaterial(roofCladMatId, 0x38BDF8, 'metal_roof', {
      transparent: extTransparent || isFraming,
      opacity: isFraming ? 0.22 : extOpacity,
    });
    const roofInsulMat = buildMaterial(roofInsulMatId, 0xEAB308, 'eps', {
      transparent: insulTransparent || isFraming,
      opacity: isFraming ? 0.22 : insulOpacity,
    });
    const floorMat = buildMaterial(floorMatId, 0x15803D, 'concrete');
    const plinthMat = buildMaterial('stone_masonry', 0x475569, 'stone');
    const timberMat = isFraming
      ? new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.6 })
      : buildMaterial('timber', 0xB45309, 'timber');
    const trombeMat = isThermal
      ? new THREE.MeshStandardMaterial({ color: 0xEF4444, roughness: 0.3 })
      : new THREE.MeshStandardMaterial({
          map: getTextureForMaterial(extWallMatId),
          color: 0x2A2421,
          roughness: 0.95,
        });

    // Update Wall Meshes in-place
    safeReplaceMaterial(meshes.northExt, extWallMat);
    safeReplaceMaterial(meshes.eastExt, extWallMat);
    safeReplaceMaterial(meshes.westExt, extWallMat);
    safeReplaceMaterial(meshes.vestWallMesh, extWallMat);
    safeReplaceMaterial(meshes.leftPier, extWallMat);
    safeReplaceMaterial(meshes.rightPier, extWallMat);

    // Update Insulation Meshes in-place
    safeReplaceMaterial(meshes.northCore, insulMat);
    safeReplaceMaterial(meshes.eastCore, insulMat);
    safeReplaceMaterial(meshes.westCore, insulMat);
    safeReplaceMaterial(meshes.roofInsulMesh, roofInsulMat);

    // Update Interior Mass, Floor, & Roof in-place
    safeReplaceMaterial(meshes.northInt, intWallMat);
    safeReplaceMaterial(meshes.floorMesh, floorMat);
    safeReplaceMaterial(meshes.timberFloorMesh, timberMat);
    safeReplaceMaterial(meshes.metalRoofMesh, roofCladMat);
    safeReplaceMaterial(meshes.canopyMesh, roofCladMat);
    safeReplaceMaterial(meshes.plinthMesh, plinthMat);
    safeReplaceMaterial(meshes.trombeMesh, trombeMat);
    if (meshes.lintel) safeReplaceMaterial(meshes.lintel, timberMat);

    if (meshes.quoinMeshes) {
      meshes.quoinMeshes.forEach((q) => safeReplaceMaterial(q, plinthMat));
    }
    if (meshes.rafterMeshes) {
      meshes.rafterMeshes.forEach((r) => safeReplaceMaterial(r, timberMat));
    }
    if (meshes.studMeshes) {
      meshes.studMeshes.forEach((s) => safeReplaceMaterial(s, timberMat));
    }

    // Facade Peel Cutaway Positioning (using GSAP for fluid 60 FPS transitions)
    const base = meshes.basePositions;
    if (base && !isExploded) {
      let dExtZ = 0, dExtX = 0, dRoofY = 0;
      let dCoreZ = 0, dCoreX = 0, dRoofInsulY = 0;

      if (peelLevel === 1) {
        dExtZ = -0.65;
        dExtX = 0.65;
        dRoofY = 0.45;
      } else if (peelLevel === 2) {
        dExtZ = -1.2;
        dExtX = 1.2;
        dRoofY = 0.85;
        dCoreZ = -0.55;
        dCoreX = 0.55;
        dRoofInsulY = 0.40;
      } else if (peelLevel === 3) {
        dExtZ = -1.8;
        dExtX = 1.8;
        dRoofY = 1.3;
        dCoreZ = -1.0;
        dCoreX = 1.0;
        dRoofInsulY = 0.75;
      }

      if (meshes.northExt) {
        gsap.to(meshes.northExt.position, { z: base.northExtZ + dExtZ, duration: 0.6, ease: 'power2.out' });
      }
      if (meshes.eastExt) {
        gsap.to(meshes.eastExt.position, { x: base.eastExtX - dExtX, duration: 0.6, ease: 'power2.out' });
      }
      if (meshes.westExt) {
        gsap.to(meshes.westExt.position, { x: base.westExtX + dExtX, duration: 0.6, ease: 'power2.out' });
      }
      if (meshes.metalRoofMesh) {
        gsap.to(meshes.metalRoofMesh.position, { y: base.metalRoofY + dRoofY, duration: 0.6, ease: 'power2.out' });
      }

      if (meshes.northCore) {
        gsap.to(meshes.northCore.position, { z: base.northCoreZ + dCoreZ, duration: 0.6, ease: 'power2.out' });
      }
      if (meshes.eastCore) {
        gsap.to(meshes.eastCore.position, { x: base.eastCoreX - dCoreX, duration: 0.6, ease: 'power2.out' });
      }
      if (meshes.westCore) {
        gsap.to(meshes.westCore.position, { x: base.westCoreX + dCoreX, duration: 0.6, ease: 'power2.out' });
      }
      if (meshes.roofInsulMesh) {
        gsap.to(meshes.roofInsulMesh.position, { y: base.roofInsulY + dRoofInsulY, duration: 0.6, ease: 'power2.out' });
      }
    }

    if (updateProjectedPinsRef.current) {
      updateProjectedPinsRef.current();
    }
  }, [walls, roof, floor, isThermal, isFraming, isExploded, peelLevel, materialsVersion]);

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
        color: 0xF59E0B,
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
        color: 0xFDE68A,
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

    const lineMat = new THREE.LineBasicMaterial({ color: 0x2563EB, linewidth: 2, transparent: true, opacity: 0.85 });

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

    const extWallSpec = getMaterialSpec(walls[0]?.material || 'mud_brick');
    const insulSpec = getMaterialSpec(walls[1]?.material || 'eps');
    const roofCladSpec = getMaterialSpec(roof[0]?.material || 'metal_roof');
    const roofInsulSpec = getMaterialSpec(roof[1]?.material || 'eps');

    const wallThickM = walls[0]?.thickness_m || 0.30;
    const insulThickM = walls[1]?.thickness_m || 0.05;
    const trombeR = (wallThickM / (extWallSpec.conductivity_w_mk || 0.75));
    const trombeU = 1 / (trombeR + 0.17);

    const roofUVal = computeTotalU(roof);
    const roofRVal = 1 / Math.max(0.01, roofUVal);
    const roofThickMm = Math.round(roof.reduce((sum, l) => sum + (Number(l.thickness_m) || 0.05), 0) * 1000);

    // Active cutaway layer spec based on peelLevel
    const activePeelSpec = peelLevel === 1 ? extWallSpec : peelLevel === 2 ? insulSpec : peelLevel === 3 ? extWallSpec : null;
    const activePeelThickness = peelLevel === 1 ? Math.round(wallThickM * 1000) : peelLevel === 2 ? Math.round(insulThickM * 1000) : Math.round(wallThickM * 1000);
    const activePeelR = peelLevel === 1 ? trombeR : peelLevel === 2 ? (insulThickM / (insulSpec.conductivity_w_mk || 0.038)) : trombeR;

    // 1. Regional Adaptive Hotspots
    let rawHotspots = [];
    if (archetype === 'manali') {
      rawHotspots = [
        {
          id: 'kath-kuni',
          label: 'Kath-Kuni Timber Cribbage',
          sub: 'Zone V Seismic Timber Lacing',
          category: 'Seismic & Thermal Mass',
          pos: new THREE.Vector3(-length_m / 2 - 0.2, height_m * 0.55, width_m / 2),
          spec: {
            name: 'Himachal Kath-Kuni Timber-Laced Stone',
            description: 'Indigenous interlocking dry-stone masonry with longitudinal Deodar cedar wooden beams. Yields high ductility, energy dissipation, and seismic damping under IS 13828 Zone V.',
            whyUse: 'Withstands severe Himalayan tectonic faults while providing continuous thermal inertia and preventing brittle shear failure.',
            rVal: '2.45',
            uVal: '0.41',
            thickness_mm: 450,
            conductivity: 0.58,
            density: 1850,
            specificHeat: 1050,
            cost: '₹3,200/m²',
            citation: 'IS 13828 / Himachal PWD Vernacular Directive',
          },
        },
        {
          id: 'pitched-roof',
          label: '30° Pitched Gable Slate Roof',
          sub: 'IS 875 Snow Shedding Roof',
          category: 'Envelope',
          pos: new THREE.Vector3(0, height_m + 1.2, 0),
          spec: {
            name: '30° Alpine Gable Roof (Slate / Seam Metal)',
            description: 'Double-pitched 30° gable roof designed for gravitational snow shedding under IS 875 heavy snow load (2.5 kN/m²). Features deep 600mm eaves overhang protecting walls from driving monsoon rain.',
            whyUse: 'Prevents snow accumulation overload and eliminates winter roof ponding/leakage common with flat roofs in alpine valleys.',
            rVal: roofRVal.toFixed(2),
            uVal: roofUVal.toFixed(2),
            thickness_mm: roofThickMm,
            conductivity: roofInsulSpec.conductivity_w_mk,
            density: roofInsulSpec.density_kg_m3,
            specificHeat: roofInsulSpec.specific_heat_j_kgk,
            citation: 'IS 875 (Part 4) / NBC 2016 Part 6',
          },
        },
        {
          id: 'alpine-entry',
          label: 'Alpine Timber Porch Veranda',
          sub: 'Deodar Storm Draft Buffer',
          category: 'Infiltration Control',
          pos: new THREE.Vector3(-length_m / 2 - 0.7, 1.2, 0.3),
          spec: {
            name: 'Deodar Sheltered Entry Porch',
            description: 'Projecting cedar wood veranda porch with pitched canopy. Protects doorway from heavy snowdrifts and wind-driven precipitation.',
            whyUse: 'Forms a thermal transition air buffer without needing industrial military airlocks, preserving Himalayan vernacular architectural harmony.',
            rVal: '2.80',
            uVal: '0.36',
            thickness_mm: 120,
            conductivity: 0.13,
            density: 560,
            specificHeat: 1600,
            citation: 'NBC 2016 / Himachal Hill Architecture Code',
          },
        },
      ];
    } else if (archetype === 'jaisalmer') {
      rawHotspots = [
        {
          id: 'jali-screen',
          label: 'Carved Stone Jali Screen',
          sub: 'Solar Shading Coefficient ≤ 0.30',
          category: 'Solar Shading & Ventilation',
          pos: new THREE.Vector3(0, height_m * 0.5, width_m / 2 + 0.1),
          spec: {
            name: 'Jaisalmer Dressed Stone Jali Screen',
            description: 'Perforated geometric sandstone lattice screen. Filters direct solar radiation, admitting diffuse daylight while cutting thermal infrared radiation (SHGC ≤ 0.30).',
            whyUse: 'Cuts daytime solar heat gain by 65% while accelerating airflow through the Venturi effect during hot dry desert afternoons.',
            rVal: '1.20',
            uVal: '0.83',
            thickness_mm: 50,
            conductivity: 1.30,
            density: 2200,
            specificHeat: 920,
            cost: '₹2,800/m²',
            citation: 'ECBC 2017 Table 4.2 / NBC 2016',
          },
        },
        {
          id: 'sandstone-envelope',
          label: 'Golden Sandstone Mass Envelope',
          sub: 'Diurnal Thermal Phase Delay (~8 hrs)',
          category: 'Thermal Mass',
          pos: new THREE.Vector3(length_m / 2 + 0.1, height_m * 0.5, 0),
          spec: {
            name: 'Jaisalmer Dressed Yellow Sandstone Wall',
            description: 'Thick (400mm) high-capacitance sandstone masonry with thermal conductivity k = 1.35 W/m·K and volumetric heat capacity 2,050 kJ/m³·K.',
            whyUse: 'Damps 45°C daytime desert heat with an 8-hour thermal phase lag, releasing stored heat during cool desert nights (18°C).',
            rVal: trombeR.toFixed(2),
            uVal: trombeU.toFixed(2),
            thickness_mm: 400,
            conductivity: 1.35,
            density: 2250,
            specificHeat: 910,
            citation: 'NBC 2016 Part 8 / ECBC 2017',
          },
        },
        {
          id: 'roof-terrace',
          label: 'Flat Terraced Roof with Kangura',
          sub: 'Night Radiative Cooling Terrace',
          category: 'Passive Cooling',
          pos: new THREE.Vector3(0, height_m + 0.3, 0),
          spec: {
            name: 'Accessible Flat Stone Terrace with Kangura',
            description: 'Flat sandstone slab roof with 600mm perimeter parapet and carved ornamental kangura battlements.',
            whyUse: 'Enables nocturnal longwave radiative sky cooling and provides traditional outdoor summer night sleeping space in arid climates.',
            rVal: roofRVal.toFixed(2),
            uVal: roofUVal.toFixed(2),
            thickness_mm: roofThickMm,
            conductivity: 1.30,
            density: 2200,
            specificHeat: 920,
            citation: 'Vernacular Architecture of Rajasthan / IS 3792',
          },
        },
      ];
    } else if (archetype === 'leh') {
      rawHotspots = [
        {
          id: 'solar-aperture',
          label: 'Ladakhi Direct-Gain Aperture',
          sub: 'Captures 960 W/m² DNI Solar Peak',
          category: 'Solar Heating',
          pos: new THREE.Vector3(0, height_m * 0.5, width_m / 2 + 0.1),
          spec: {
            name: 'High-Transmittance South Solar Aperture',
            description: 'Expansive double-glazed solar aperture integrated with carved timber lintels (shing-tsag) capturing high-altitude Ladakh DNI (960 W/m²).',
            whyUse: 'Heats the high-mass adobe interior directly during intense sunny high-altitude winter days, storing heat for sub-zero nights.',
            rVal: '3.10',
            uVal: '0.32',
            thickness_mm: 28,
            conductivity: 0.032,
            density: 2500,
            specificHeat: 840,
            citation: 'SECMOL / LEDeG Passive Solar Ladakh Guidelines',
          },
        },
        {
          id: 'tarka-parapet',
          label: 'Willow Twig Parapet (Tarka)',
          sub: 'Traditional Brushwood Roof Insulation',
          category: 'Envelope',
          pos: new THREE.Vector3(0, height_m + 0.25, 0),
          spec: {
            name: 'Traditional Willow Twig Parapet (Tarka)',
            description: 'Bundled local willow and tamarisk twigs (tarka) bound tightly with clay mortar forming an insulating, lightweight parapet edging.',
            whyUse: 'Protects the flat earthen mud roof (talu) from wind erosion while providing edge thermal insulation and distinctive regional identity.',
            rVal: '1.80',
            uVal: '0.55',
            thickness_mm: 200,
            conductivity: 0.11,
            density: 450,
            specificHeat: 1500,
            citation: 'Traditional Himalayan Mud Architecture (Ladakh Heritage)',
          },
        },
        {
          id: 'adobe-envelope',
          label: 'Sun-Dried Adobe Mud Brick',
          sub: 'Low Embodied Energy & High Mass',
          category: 'Thermal Mass',
          pos: new THREE.Vector3(-length_m / 2 - 0.1, height_m * 0.5, 0),
          spec: {
            name: 'Sun-Dried Adobe Mud Brick Wall (380mm)',
            description: 'Locally made mud bricks mixed with straw and animal hair fibers. Density ~1,700 kg/m³, thermal conductivity k = 0.75 W/m·K.',
            whyUse: 'Zero embodied carbon, 100% locally sourced, high thermal storage capacity suited for Ladakh arid climate.',
            rVal: trombeR.toFixed(2),
            uVal: trombeU.toFixed(2),
            thickness_mm: 380,
            conductivity: 0.75,
            density: 1700,
            specificHeat: 1000,
            citation: 'IS 2110 / IS 3792',
          },
        },
      ];
    } else if (archetype === 'delhi') {
      rawHotspots = [
        {
          id: 'chhajja-overhang',
          label: 'Cantilevered RCC Chhajja',
          sub: '0.6m Summer Sunshade Overhang',
          category: 'Solar Shading',
          pos: new THREE.Vector3(0, height_m * 0.8, width_m / 2 + 0.3),
          spec: {
            name: 'Cantilevered Concrete Chhajja (0.60m)',
            description: 'Cast-in-place concrete horizontal projection shading south/west glazing from high-angle summer sun (solar altitude > 65°).',
            whyUse: 'Eliminates peak solar cooling loads in composite hot seasons while allowing lower winter sun penetration.',
            rVal: '0.90',
            uVal: '1.11',
            thickness_mm: 75,
            conductivity: 1.45,
            density: 2400,
            specificHeat: 900,
            citation: 'NBC 2016 Part 8 / ECBC 2017',
          },
        },
        {
          id: 'brick-cavity',
          label: 'Exposed Brick Cavity Wall',
          sub: 'Monsoon Conduction Barrier',
          category: 'Envelope',
          pos: new THREE.Vector3(-length_m / 2 - 0.1, height_m * 0.5, 0),
          spec: {
            name: '230mm Clay Brick Wall with Cavity Air Gap',
            description: 'Double-wythe burnt clay brick masonry separated by an unventilated 50mm air gap.',
            whyUse: 'Breaks continuous thermal bridging and prevents driving monsoon moisture transmission.',
            rVal: trombeR.toFixed(2),
            uVal: trombeU.toFixed(2),
            thickness_mm: 280,
            conductivity: 0.72,
            density: 1800,
            specificHeat: 880,
            citation: 'IS 2212 / NBC 2016',
          },
        },
        {
          id: 'terrace-railing',
          label: 'Accessible Flat Roof Terrace',
          sub: 'Waterproofed Concrete Slab with Railing',
          category: 'Envelope',
          pos: new THREE.Vector3(0, height_m + 0.3, 0),
          spec: {
            name: 'Accessible RCC Terrace Slab with Metal Railing',
            description: 'Reinforced concrete roof slab with waterproofing bitumen membrane, light-reflective screed, and 1.05m perimeter safety railing.',
            whyUse: 'Reflects composite summer solar radiation while providing usable rooftop space.',
            rVal: roofRVal.toFixed(2),
            uVal: roofUVal.toFixed(2),
            thickness_mm: roofThickMm,
            conductivity: 1.40,
            density: 2400,
            specificHeat: 900,
            citation: 'IS 456 / NBC 2016',
          },
        },
      ];
    } else {
      // Default: Siachen / Dras Glacial Cryosphere
      rawHotspots = [
        {
          id: 'trombe-wall',
          label: 'Trombe Mass Wall',
          sub: `Passive Solar Heat Storage (${extWallSpec.name})`,
          category: 'Solar Heating',
          pos: new THREE.Vector3(0, height_m * 0.5, width_m / 2 + 0.1),
          spec: {
            name: `South Trombe ${extWallSpec.name} Wall`,
            description: `High-density ${extWallSpec.name} absorber storage wall (k = ${extWallSpec.conductivity_w_mk} W/m·K, density = ${extWallSpec.density_kg_m3} kg/m³) positioned behind high-transmission glazing. Absorbs incident solar irradiance and transfers heat inward via thermal phase delay.`,
            whyUse: 'Delivers 45-60% of winter space heating passively, eliminating fuel combustion dependencies in sub-zero alpine conditions.',
            rVal: trombeR.toFixed(2),
            uVal: trombeU.toFixed(2),
            thickness_mm: Math.round(wallThickM * 1000),
            conductivity: extWallSpec.conductivity_w_mk,
            density: extWallSpec.density_kg_m3,
            specificHeat: extWallSpec.specific_heat_j_kgk,
            cost: extWallSpec.cost_inr_m2 ? `₹${extWallSpec.cost_inr_m2}/m²` : extWallSpec.cost_inr_m3 ? `₹${extWallSpec.cost_inr_m3}/m³` : null,
            citation: extWallSpec.citation || 'NBC 2016 Table 2 / IS 3792',
          },
        },
        {
          id: 'solar-roof',
          label: 'Monoslope Shed Roof (11°)',
          sub: `${roofCladSpec.name} & ${roofInsulSpec.name} Core`,
          category: 'Envelope',
          pos: new THREE.Vector3(-length_m / 4, height_m + 0.5, 0),
          spec: {
            name: `Insulated Alpine Shed Roof (${roofCladSpec.name})`,
            description: `Pitched at 11° with ${roofCladSpec.name} standing seam exterior and ${roofInsulSpec.name} continuous core (k = ${roofInsulSpec.conductivity_w_mk} W/m·K). Extended 650mm south overhang shades summer solar peak while admitting low winter sun.`,
            whyUse: 'Sheds heavy alpine snowdrifts while optimizing rooftop solar PV collector inclination and eliminating thermal bridges.',
            rVal: roofRVal.toFixed(2),
            uVal: roofUVal.toFixed(2),
            thickness_mm: roofThickMm,
            conductivity: roofInsulSpec.conductivity_w_mk,
            density: roofInsulSpec.density_kg_m3,
            specificHeat: roofInsulSpec.specific_heat_j_kgk,
            cost: roofInsulSpec.cost_inr_m2 ? `₹${roofInsulSpec.cost_inr_m2}/m²` : null,
            citation: roofInsulSpec.citation || roofCladSpec.citation || 'NBC 2016 Part 8 / ASHRAE 90.1',
          },
        },
        {
          id: 'airlock-vestibule',
          label: 'Arctic Airlock Vestibule',
          sub: 'Weather-Lock Mudroom Entrance',
          category: 'Infiltration Control',
          pos: new THREE.Vector3(-length_m / 2 - 0.7, 1.2, 0.3),
          spec: {
            name: 'Arctic Entry Airlock Mudroom',
            description: `Dual-door weather-lock foyer built with ${extWallSpec.name} and timber weather-stripping. Halts sub-zero blizzard drafts upon entry.`,
            whyUse: 'Reduces building ACH infiltration losses by over 70% in high-altitude gale conditions.',
            rVal: '3.10',
            uVal: '0.32',
            thickness_mm: 120,
            conductivity: extWallSpec.conductivity_w_mk,
            density: extWallSpec.density_kg_m3,
            specificHeat: extWallSpec.specific_heat_j_kgk,
            citation: 'IS 3792 / CPWD Himalayan Design Directive',
          },
        },
      ];
    }

    if (peelLevel > 0 && activePeelSpec) {
      rawHotspots.push({
        id: 'facade-peel-layer',
        label: peelLevel === 1 ? 'Exposed Facade Cladding' : peelLevel === 2 ? 'Continuous Insulation Core' : 'Thermal Mass Storage Core',
        sub: `${activePeelSpec.name} Cutaway Layer`,
        category: peelLevel === 2 ? 'Insulation Core' : 'Structural Mass',
        pos: new THREE.Vector3(length_m / 2 + 0.3, height_m * 0.55, 0),
        spec: {
          name: activePeelSpec.name,
          description: `Authoritative material layer in the multi-tier envelope assembly. Thermal conductivity k = ${activePeelSpec.conductivity_w_mk} W/(m·K), density ρ = ${activePeelSpec.density_kg_m3} kg/m³.`,
          whyUse: peelLevel === 2 ? 'Continuous unbroken thermal wrap prevents sub-zero thermal bridging and eliminates permafrost envelope heat drain.' : 'High volumetric heat capacity stores daytime solar gains to maintain comfortable night indoor temperatures.',
          rVal: activePeelR.toFixed(2),
          uVal: (1 / Math.max(0.01, activePeelR)).toFixed(2),
          thickness_mm: activePeelThickness,
          conductivity: activePeelSpec.conductivity_w_mk,
          density: activePeelSpec.density_kg_m3,
          specificHeat: activePeelSpec.specific_heat_j_kgk,
          cost: activePeelSpec.cost_inr_m2 ? `₹${activePeelSpec.cost_inr_m2}/m²` : activePeelSpec.cost_inr_m3 ? `₹${activePeelSpec.cost_inr_m3}/m³` : null,
          citation: activePeelSpec.citation || 'NBC 2016 Table 2 / IS 3792',
        },
      });
    }

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
      const isPitched = archetype === 'manali';
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
      if (isPitched) {
        dBadges.push({
          id: 'dim-pitch',
          label: '30° Snow Slope',
          pos: new THREE.Vector3(0, height_m + 1.1, width_m / 2 + 0.3),
        });
      } else if (archetype === 'jaisalmer') {
        dBadges.push({
          id: 'dim-parapet',
          label: '0.6m Kangura Parapet',
          pos: new THREE.Vector3(0, height_m + 0.4, width_m / 2 + 0.3),
        });
      } else if (archetype === 'leh') {
        dBadges.push({
          id: 'dim-tarka',
          label: 'Tarka Brushwood Parapet',
          pos: new THREE.Vector3(0, height_m + 0.3, width_m / 2 + 0.3),
        });
      }

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
  }, [archetype, activeSiteName, length_m, width_m, height_m, openings, showDimensions, walls, roof, floor, peelLevel, materialsVersion]);
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
                        {pin.spec.conductivity !== undefined && (
                          <div className="popover-stat">
                            <span className="popover-stat-label">Conductivity (k)</span>
                            <span className="popover-stat-val">{pin.spec.conductivity}</span>
                            <span className="popover-stat-sub">W/(m·K)</span>
                          </div>
                        )}
                        {pin.spec.density !== undefined && (
                          <div className="popover-stat">
                            <span className="popover-stat-label">Density (ρ)</span>
                            <span className="popover-stat-val">{pin.spec.density}</span>
                            <span className="popover-stat-sub">kg/m³</span>
                          </div>
                        )}
                        {pin.spec.specificHeat !== undefined && (
                          <div className="popover-stat">
                            <span className="popover-stat-label">Spec Heat (cp)</span>
                            <span className="popover-stat-val">{pin.spec.specificHeat}</span>
                            <span className="popover-stat-sub">J/(kg·K)</span>
                          </div>
                        )}
                        {pin.spec.cost && (
                          <div className="popover-stat">
                            <span className="popover-stat-label">Unit Cost</span>
                            <span className="popover-stat-val" style={{ fontSize: 11.5 }}>{pin.spec.cost}</span>
                          </div>
                        )}
                      </div>
                      {pin.spec.citation && (
                        <div className="popover-citation-badge">
                          <ShieldCheck size={13} style={{ flexShrink: 0 }} />
                          <span>Standard: {pin.spec.citation}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )
        )}
      </div>

      {/* Facade Multi-Layer Peel Cutaway Dock */}
      <div className="facade-peel-dock">
        <div className="peel-dock-header">
          <Sliders size={12} style={{ color: 'var(--brand-blue, #2563EB)', flexShrink: 0 }} />
          <span className="peel-dock-title">Cutaway Peel</span>
        </div>
        <div className="peel-segments-row">
          {[
            { lvl: 0, label: 'Full Envelope' },
            { lvl: 1, label: 'Cladding' },
            { lvl: 2, label: 'Insul Core' },
            { lvl: 3, label: 'Mass Core' },
          ].map((p) => (
            <button
              key={p.lvl}
              type="button"
              className={`peel-pill-btn ${peelLevel === p.lvl ? 'active' : ''}`}
              onClick={() => setPeelLevel(p.lvl)}
            >
              {p.label}
            </button>
          ))}
        </div>
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
              <Mountain size={13} style={{ color: 'var(--brand-blue, #2563EB)' }} />
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
            <Layers size={13} style={{ color: 'var(--brand-blue, #2563EB)' }} />
            <span>Assembly Exploded View</span>
          </div>
          <div className="exploded-hud-layers">
            <div className="exploded-hud-chip">
              <span className="dot mass" /> 1. Cladding: {getMaterialSpec(outerWallMat).name}
            </div>
            <div className="exploded-hud-chip">
              <span className="dot eps" /> 2. Insulation: {getMaterialSpec(innerWallMat).name}
            </div>
            <div className="exploded-hud-chip">
              <span className="dot timber" /> 3. Roof: {getMaterialSpec(roofMat).name}
            </div>
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
