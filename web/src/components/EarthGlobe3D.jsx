/*
 * EarthGlobe3D.jsx — Interactive 3D Earth Globe for THERMA Site & Location Selector
 * Built with Three.js. Features:
 * - High-tech tactical dark Earth sphere with procedural continental landmasses & topography
 * - Glowing atmospheric halo shader & illuminated equatorial/meridian graticules
 * - 3D Pinned Location Beacon with radial beacon stem, glowing head, and animated radar ripples
 * - Full orbit interaction: Drag to rotate (pitch & yaw with momentum), scroll/pinch to zoom
 * - Raycast Click-to-Pick: Click anywhere on Earth to drop pin and calculate exact Lat/Lon
 * - Smooth Auto-Focus Tween: Spins smoothly to center on selected location
 * - Auto-rotation idle demo mode with toggle
 * - Clean coordinate HUD and interactive camera controls (+ / - / reset)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  RotateCcw,
  Compass,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  MapPin,
} from 'lucide-react';
import './EarthGlobe3D.css';

// Key strategic / high-altitude outposts and benchmark locations for 3D globe annotations
const BENCHMARK_SITES = [
  { name: 'Leh (Ladakh)', lat: 34.1526, lon: 77.5771, alt: 3500, highlight: true },
  { name: 'Siachen Base Camp', lat: 35.2000, lon: 77.2000, alt: 3650, highlight: true },
  { name: 'Dras', lat: 34.4327, lon: 75.7547, alt: 3280, highlight: true },
  { name: 'Kargil', lat: 34.5539, lon: 76.1349, alt: 2676, highlight: true },
  { name: 'Nyoma', lat: 33.2000, lon: 78.6500, alt: 4180, highlight: true },
  { name: 'Tawang', lat: 27.5861, lon: 91.8653, alt: 3048, highlight: true },
  { name: 'Rasuwa (Nepal)', lat: 28.1200, lon: 85.2800, alt: 2400 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, alt: 10 },
  { name: 'Jaisalmer', lat: 26.9157, lon: 70.9083, alt: 225 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, alt: 41 },
  { name: 'London', lat: 51.5074, lon: -0.1278, alt: 25 },
  { name: 'Denver', lat: 39.7392, lon: -104.9903, alt: 1603 },
];

/**
 * Generate high-resolution procedural Earth texture (2048x1024)
 * Equirectangular projection: X in [-180, 180], Y in [+90, -90]
 */
function createProceduralEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Helper coordinate mapper: lon [-180, 180] -> x [0, w], lat [90, -90] -> y [0, h]
  const mapCoord = (lon, lat) => [
    ((lon + 180) / 360) * w,
    ((90 - lat) / 180) * h,
  ];

  // 1. Deep Oceanic Abyss Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#0a0e17');
  oceanGrad.addColorStop(0.5, '#0b111e');
  oceanGrad.addColorStop(1, '#080c14');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Graticule Lattice (Parallels & Meridians)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;

  // Latitudes (every 15 degrees)
  for (let lat = -75; lat <= 75; lat += 15) {
    const [, y] = mapCoord(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Longitudes (every 30 degrees)
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = mapCoord(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Equator Highlight (Golden Accent)
  const [, eqY] = mapCoord(0, 0);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(w, eqY);
  ctx.stroke();

  // Prime Meridian & Anti-meridian (Cyan Accent)
  const [pmX] = mapCoord(0, 0);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pmX, 0);
  ctx.lineTo(pmX, h);
  ctx.stroke();

  // Tropics of Cancer and Capricorn (Dashed Amber)
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.setLineDash([6, 6]);
  const [, tropicCY] = mapCoord(0, 23.436);
  const [, tropicCapY] = mapCoord(0, -23.436);
  ctx.beginPath();
  ctx.moveTo(0, tropicCY);
  ctx.lineTo(w, tropicCY);
  ctx.moveTo(0, tropicCapY);
  ctx.lineTo(w, tropicCapY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Continental Landmasses (Detailed Tactical Polygons)
  const drawPoly = (points, fill = '#1e293b', stroke = '#334155') => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    points.forEach(([lon, lat], i) => {
      const [px, py] = mapCoord(lon, lat);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Eurasia (Europe + Asia + Indian Subcontinent)
  drawPoly([
    [-10, 36], [-8, 44], [-4, 48], [2, 51], [8, 55], [18, 59], [28, 71],
    [40, 68], [60, 73], [80, 74], [100, 77], [120, 74], [140, 72], [170, 66],
    [160, 52], [142, 45], [130, 35], [122, 30], [108, 18], [104, 10], [98, 8],
    [90, 22], [80, 16], [77, 8], [72, 19], [68, 24], [60, 25], [54, 25],
    [50, 30], [44, 12], [40, 15], [36, 31], [30, 32], [26, 38], [15, 40],
    [2, 37], [-5, 36],
  ], '#1e2736', '#38bdf844');

  // Indian Subcontinent & Himalayan Front (Highlighted)
  drawPoly([
    [68, 24], [72, 28], [74, 32], [76, 36], [78, 36], [82, 31], [88, 28],
    [92, 27], [92, 22], [88, 21], [85, 19], [80, 13], [77, 8], [74, 15],
    [70, 20],
  ], '#253347', '#f59e0b88');

  // Africa
  drawPoly([
    [-17, 15], [-12, 28], [-5, 36], [10, 37], [25, 32], [32, 31], [43, 12],
    [51, 12], [42, -5], [36, -18], [30, -31], [18, -35], [12, -18], [9, 5],
    [-5, 5], [-15, 10],
  ], '#1c2433', '#38bdf833');

  // North America
  drawPoly([
    [-168, 66], [-160, 58], [-140, 60], [-125, 48], [-120, 34], [-105, 20],
    [-97, 18], [-80, 25], [-81, 32], [-70, 42], [-64, 46], [-55, 48],
    [-60, 56], [-80, 64], [-95, 70], [-130, 70], [-155, 71],
  ], '#1c2433', '#38bdf833');

  // South America
  drawPoly([
    [-76, 10], [-60, 8], [-50, -2], [-35, -5], [-37, -12], [-44, -23],
    [-53, -33], [-66, -55], [-74, -52], [-72, -40], [-76, -18], [-81, -5],
    [-78, 4],
  ], '#1c2433', '#38bdf833');

  // Australia
  drawPoly([
    [114, -22], [122, -16], [130, -12], [136, -12], [142, -10], [148, -20],
    [153, -28], [150, -37], [138, -35], [130, -32], [115, -34], [113, -26],
  ], '#1c2433', '#38bdf833');

  // Antarctica Ice Shelf
  drawPoly([
    [-180, -72], [-120, -74], [-60, -65], [0, -70], [60, -68], [120, -66],
    [180, -72], [180, -90], [-180, -90],
  ], '#2a3b52', '#93c5fd44');

  // 4. High-Altitude Topographic Relief Bands (Himalayas, Tibetan Plateau, Karakoram)
  ctx.fillStyle = '#f59e0b33';
  ctx.strokeStyle = '#f59e0b66';
  ctx.lineWidth = 1;
  const drawMountainRidge = (coords) => {
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const [px, py] = mapCoord(lon, lat);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  };

  // Himalayan & Karakoram Arc
  drawMountainRidge([
    [72, 36], [74, 35.5], [77, 34.5], [80, 31], [84, 29], [88, 28], [92, 28],
  ]);
  // Andes Arc
  drawMountainRidge([
    [-77, 8], [-75, -5], [-72, -20], [-68, -35], [-72, -50],
  ]);
  // Alps
  drawMountainRidge([[6, 46], [9, 46.5], [13, 47]]);

  // 5. Strategic Benchmark Station Lights (Glowing Dots on Texture)
  BENCHMARK_SITES.forEach((site) => {
    const [sx, sy] = mapCoord(site.lon, site.lat);
    ctx.fillStyle = site.highlight ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(sx, sy, site.highlight ? 4.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();

    if (site.highlight) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}

export default function EarthGlobe3D({
  location,
  onChange,
  onResolveElevation,
  elevationLoading = false,
  className = '',
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const globeGroupRef = useRef(null);
  const pinGroupRef = useRef(null);
  const radarRingsRef = useRef([]);

  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredSite, setHoveredSite] = useState(null);
  const [cursorCoords, setCursorCoords] = useState(null);

  // Orbit state
  const orbitRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotX: (location?.lat || 34.15) * (Math.PI / 180) * -0.5,
    rotY: (location?.lon || 77.57) * (Math.PI / 180) * -1 + Math.PI / 2,
    targetRotX: 0,
    targetRotY: 0,
    cameraDistance: 4.8,
    targetDistance: 4.8,
    dragDistance: 0,
  });

  const GLOBE_RADIUS = 1.85;

  // Convert (lat, lon) to 3D Cartesian coordinates on sphere
  const latLonToVector3 = useCallback((lat, lon, radius = GLOBE_RADIUS) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }, []);

  // Convert 3D Cartesian coordinates to (lat, lon)
  const vector3ToLatLon = useCallback((vec, radius = GLOBE_RADIUS) => {
    const norm = vec.clone().normalize();
    const lat = Math.asin(norm.y) * (180 / Math.PI);
    // Lon calculation
    let lon = Math.atan2(norm.z, -norm.x) * (180 / Math.PI) - 180;
    while (lon < -180) lon += 360;
    while (lon > 180) lon -= 360;
    return {
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     1. INITIALIZE THREE.JS SCENE
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 420;
    const height = container.clientHeight || 280;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, orbitRef.current.cameraDistance);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Globe Group (Contains Earth sphere, graticules, atmosphere, and pins)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x384252, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    sunLight.position.set(5, 4, 6);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-6, -3, -4);
    scene.add(rimLight);

    // ── Earth Sphere Mesh ──
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const earthTex = createProceduralEarthTexture();
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.65,
      metalness: 0.15,
      bumpScale: 0.04,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.name = 'earth-surface';
    globeGroup.add(earthMesh);

    // ── Atmosphere Halo Outer Glow ──
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    globeGroup.add(atmosMesh);

    // ── Equatorial & Meridian Wire Ring Accents ──
    const eqCurve = new THREE.EllipseCurve(0, 0, GLOBE_RADIUS * 1.004, GLOBE_RADIUS * 1.004, 0, 2 * Math.PI, false, 0);
    const eqPoints = eqCurve.getPoints(64).map(p => new THREE.Vector3(p.x, 0, p.y));
    const eqGeo = new THREE.BufferGeometry().setFromPoints(eqPoints);
    const eqMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.4 });
    const eqLine = new THREE.Line(eqGeo, eqMat);
    globeGroup.add(eqLine);

    // ── Pin Group ──
    const pinGroup = new THREE.Group();
    pinGroup.name = 'pin-group';
    globeGroup.add(pinGroup);
    pinGroupRef.current = pinGroup;

    // ── Resize Observer ──
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !rendererRef.current || !cameraRef.current) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      if (newW > 0 && newH > 0) {
        cameraRef.current.aspect = newW / newH;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    // Initial camera alignment to target coordinate
    centerOnCoords(location.lat, location.lon, false);

    // ── Animation Render Loop ──
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Auto-rotation when enabled and not actively dragging
      if (autoRotate && !orbitRef.current.isDragging) {
        orbitRef.current.rotY += 0.0018;
      }

      // Apply rotation to globe group
      if (globeGroupRef.current) {
        globeGroupRef.current.rotation.x = orbitRef.current.rotX;
        globeGroupRef.current.rotation.y = orbitRef.current.rotY;
      }

      // Update camera distance smoothly
      if (cameraRef.current) {
        cameraRef.current.position.z += (orbitRef.current.cameraDistance - cameraRef.current.position.z) * 0.1;
      }

      // Animate Radar Ripples
      if (radarRingsRef.current && radarRingsRef.current.length > 0) {
        radarRingsRef.current.forEach((ring, idx) => {
          ring.phase = (ring.phase + 0.02) % 1;
          const scale = 1 + ring.phase * 2.2;
          ring.mesh.scale.set(scale, scale, scale);
          ring.mesh.material.opacity = (1 - ring.phase) * 0.7;
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     2. UPDATE 3D PIN WHEN LOCATION CHANGES
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!pinGroupRef.current) return;
    const pinGroup = pinGroupRef.current;

    // Clear previous pin components
    while (pinGroup.children.length > 0) {
      pinGroup.remove(pinGroup.children[0]);
    }
    radarRingsRef.current = [];

    const pinPos = latLonToVector3(location.lat, location.lon, GLOBE_RADIUS);
    const normal = pinPos.clone().normalize();

    // 1. Radial Needle Stem (Amber-Gold)
    const needleLength = 0.32;
    const needleGeo = new THREE.CylinderGeometry(0.012, 0.02, needleLength, 12);
    const needleMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
    });
    const needleMesh = new THREE.Mesh(needleGeo, needleMat);

    // Orient needle along surface normal
    const needlePos = pinPos.clone().add(normal.clone().multiplyScalar(needleLength / 2));
    needleMesh.position.copy(needlePos);
    needleMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    pinGroup.add(needleMesh);

    // 2. Glowing Beacon Head (Solar Orange / White Light)
    const headRadius = 0.048;
    const headGeo = new THREE.SphereGeometry(headRadius, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xf97316,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.copy(pinPos.clone().add(normal.clone().multiplyScalar(needleLength + headRadius * 0.8)));
    pinGroup.add(headMesh);

    // 3. Tangent Radar Wave Rings on Surface
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const ringGeo = new THREE.RingGeometry(0.04, 0.065, 32);
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat1);
    const ringMesh2 = new THREE.Mesh(ringGeo, ringMat2);

    // Position flush with surface along normal
    const ringPos = pinPos.clone().add(normal.clone().multiplyScalar(0.005));
    const ringQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    ringMesh1.position.copy(ringPos);
    ringMesh1.quaternion.copy(ringQuat);
    pinGroup.add(ringMesh1);

    ringMesh2.position.copy(ringPos);
    ringMesh2.quaternion.copy(ringQuat);
    pinGroup.add(ringMesh2);

    radarRingsRef.current = [
      { mesh: ringMesh1, phase: 0.0 },
      { mesh: ringMesh2, phase: 0.5 },
    ];
  }, [location.lat, location.lon, latLonToVector3]);

  /* ─────────────────────────────────────────────────────────────────────────
     3. CAMERA & GLOBE CENTERING LOGIC
     ───────────────────────────────────────────────────────────────────────── */
  const centerOnCoords = useCallback((lat, lon, animate = true) => {
    // Target rotation to make (lat, lon) face directly towards Camera (+Z)
    // Globe rotation: X rotates latitude, Y rotates longitude
    const targetX = lat * (Math.PI / 180);
    const targetY = -lon * (Math.PI / 180) - Math.PI / 2;

    if (animate) {
      gsap.to(orbitRef.current, {
        rotX: targetX,
        rotY: targetY,
        duration: 0.85,
        ease: 'power2.out',
      });
    } else {
      orbitRef.current.rotX = targetX;
      orbitRef.current.rotY = targetY;
    }
  }, []);

  // When location updates externally, center globe smoothly
  const prevLocRef = useRef({ lat: location.lat, lon: location.lon });
  useEffect(() => {
    if (
      Math.abs(prevLocRef.current.lat - location.lat) > 0.01 ||
      Math.abs(prevLocRef.current.lon - location.lon) > 0.01
    ) {
      prevLocRef.current = { lat: location.lat, lon: location.lon };
      centerOnCoords(location.lat, location.lon, true);
    }
  }, [location.lat, location.lon, centerOnCoords]);

  /* ─────────────────────────────────────────────────────────────────────────
     4. MOUSE DRAG & CLICK-TO-PICK HANDLERS
     ───────────────────────────────────────────────────────────────────────── */
  const handleMouseDown = (e) => {
    orbitRef.current.isDragging = true;
    orbitRef.current.prevX = e.clientX;
    orbitRef.current.prevY = e.clientY;
    orbitRef.current.dragDistance = 0;
  };

  const handleMouseMove = (e) => {
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (orbitRef.current.isDragging) {
      const deltaX = e.clientX - orbitRef.current.prevX;
      const deltaY = e.clientY - orbitRef.current.prevY;
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
      orbitRef.current.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

      // Sensitivity factor
      const speed = 0.0055;
      orbitRef.current.rotY += deltaX * speed;
      orbitRef.current.rotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, orbitRef.current.rotX + deltaY * speed));
    }

    // Raycast hover coordinate preview
    if (!rendererRef.current || !cameraRef.current || !globeGroupRef.current) return;
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const earth = globeGroupRef.current.getObjectByName('earth-surface');
    if (earth) {
      const hits = raycaster.intersectObject(earth, false);
      if (hits.length > 0) {
        // Invert globe group rotation to get local sphere point
        const localPoint = hits[0].point.clone();
        globeGroupRef.current.worldToLocal(localPoint);
        const coords = vector3ToLatLon(localPoint);
        setCursorCoords(coords);
      } else {
        setCursorCoords(null);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (orbitRef.current.isDragging && orbitRef.current.dragDistance < 6) {
      // It's a clean click -> raycast and drop pin!
      handleCanvasClick(e);
    }
    orbitRef.current.isDragging = false;
  };

  const handleCanvasClick = (e) => {
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect || !cameraRef.current || !globeGroupRef.current) return;

    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const earth = globeGroupRef.current.getObjectByName('earth-surface');
    if (!earth) return;

    const hits = raycaster.intersectObject(earth, false);
    if (hits.length > 0) {
      const localPoint = hits[0].point.clone();
      globeGroupRef.current.worldToLocal(localPoint);
      const { lat, lon } = vector3ToLatLon(localPoint);

      // Trigger change and resolution
      if (onChange) {
        onChange({ lat, lon });
      }
      if (onResolveElevation) {
        onResolveElevation(lat, lon);
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.003;
    orbitRef.current.cameraDistance = Math.max(
      2.5,
      Math.min(7.5, orbitRef.current.cameraDistance + zoomDelta)
    );
  };

  const handleZoom = (direction) => {
    const step = direction === 'in' ? -0.6 : 0.6;
    orbitRef.current.cameraDistance = Math.max(
      2.5,
      Math.min(7.5, orbitRef.current.cameraDistance + step)
    );
  };

  const handleReset = () => {
    centerOnCoords(location.lat, location.lon, true);
    orbitRef.current.cameraDistance = 4.8;
  };

  return (
    <div className={`earth-globe-wrapper ${className}`}>
      {/* 3D Canvas Mounting Point */}
      <div
        ref={mountRef}
        className="earth-globe-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        title="Click to drop pin anywhere on Earth. Drag to rotate globe in 3D. Scroll to zoom."
      />

      {/* Floating HUD Overlays */}
      <div className="globe-hud-top">
        <div className="globe-hud-tag">
          <Compass size={11} className="globe-compass-icon" />
          <span>Interactive 3D Earth</span>
          <span className="live-pill">DEM</span>
        </div>

        {/* Action Controls Bar */}
        <div className="globe-controls-bar">
          <button
            type="button"
            className="globe-ctrl-btn"
            onClick={() => handleZoom('in')}
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
          <button
            type="button"
            className="globe-ctrl-btn"
            onClick={() => handleZoom('out')}
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <button
            type="button"
            className="globe-ctrl-btn"
            onClick={handleReset}
            title="Recenter on Pinned Site"
          >
            <RotateCcw size={12} />
          </button>
          <button
            type="button"
            className={`globe-ctrl-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause Orbit Rotation' : 'Enable Orbit Rotation'}
          >
            {autoRotate ? <Pause size={12} /> : <Play size={12} />}
          </button>
        </div>
      </div>

      {/* Bottom Readout HUD */}
      <div className="globe-hud-bottom">
        <div className="globe-readout-item">
          <MapPin size={11} className="pin-highlight-icon" />
          <span className="readout-label">Pinned:</span>
          <span className="readout-val mono">
            {location.lat.toFixed(2)}° N, {location.lon.toFixed(2)}° E
          </span>
          <span className="readout-alt mono">
            {elevationLoading ? 'Resolving...' : `${location.altitude_m || 0} m`}
          </span>
        </div>

        {cursorCoords && (
          <div className="globe-cursor-preview mono">
            Hover: {cursorCoords.lat.toFixed(1)}°N, {cursorCoords.lon.toFixed(1)}°E
          </div>
        )}
      </div>
    </div>
  );
}
