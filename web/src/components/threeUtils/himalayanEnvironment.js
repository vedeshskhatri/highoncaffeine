/*
 * himalayanEnvironment.js — 3D Atmospheric Himalayan Panorama & Celestial Solar Path
 * Builds snow-capped Ladakh mountain ridges, high-altitude sky dome, and 3D diurnal sun arc.
 */
import * as THREE from 'three';
import { SEASONS, computeSolarPosition } from '../SolarController';

/**
 * Creates high-altitude Himalayan atmospheric sky dome
 */
export function createSkyDome() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Ladakh high-altitude winter atmosphere (3,500m):
  // Zenith is deep, crisp cold azure; horizon is luminous warm cream/gold
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#12253B'); // Deep cold zenith
  grad.addColorStop(0.4, '#2B4C6F');
  grad.addColorStop(0.7, '#6E8EA8');
  grad.addColorStop(0.9, '#D4DCDA'); // Hazy cold valley layer
  grad.addColorStop(1.0, '#F5EDE0'); // Warm horizon glow
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 512);

  const texture = new THREE.CanvasTexture(canvas);

  const domeGeo = new THREE.SphereGeometry(95, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const domeMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skyDome = new THREE.Mesh(domeGeo, domeMat);
  skyDome.position.y = -4;
  return skyDome;
}

/**
 * Creates low-poly snow-capped mountain ridges inspired by Ladakh / Zanskar range
 */
export function createHimalayanMountains() {
  const mountainGroup = new THREE.Group();
  mountainGroup.name = 'himalayan-mountains';

  // Outer distant snow peaks ring (grand towering Himalayas)
  const segments = 64;
  const outerRadius = 76;
  const outerGeo = new THREE.BufferGeometry();
  const outerPositions = [];
  const outerColors = [];

  const snowColor = new THREE.Color(0xF8FAFC);
  const rockColor = new THREE.Color(0x47433F);
  const shadowColor = new THREE.Color(0x2E2B28);

  // Generate continuous jagged mountain ring
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;

    // Peak height modulation (dramatic Stok Kangri style peaks)
    const seed = Math.sin(angle1 * 3.5) * 8 + Math.cos(angle1 * 7.2) * 5 + Math.sin(angle1 * 2.0) * 10;
    const peakHeight = Math.max(16, 26 + seed);

    const x1 = Math.cos(angle1) * outerRadius;
    const z1 = Math.sin(angle1) * outerRadius;
    const x2 = Math.cos(angle2) * outerRadius;
    const z2 = Math.sin(angle2) * outerRadius;

    const midAngle = (angle1 + angle2) / 2;
    const peakR = outerRadius * (0.93 + Math.sin(i * 2.1) * 0.07);
    const px = Math.cos(midAngle) * peakR;
    const pz = Math.sin(midAngle) * peakR;

    const by1 = -2;
    const by2 = -2;

    // Triangle 1: Base1, Peak, Base2
    outerPositions.push(x1, by1, z1);
    outerColors.push(rockColor.r, rockColor.g, rockColor.b);

    outerPositions.push(px, peakHeight, pz);
    outerColors.push(snowColor.r, snowColor.g, snowColor.b);

    outerPositions.push(x2, by2, z2);
    outerColors.push(shadowColor.r, shadowColor.g, shadowColor.b);

    // Secondary flank triangle for multi-facet mountain depth
    const subHeight = peakHeight * 0.72;
    const subX = Math.cos(angle2) * (outerRadius * 0.94);
    const subZ = Math.sin(angle2) * (outerRadius * 0.94);

    outerPositions.push(px, peakHeight, pz);
    outerColors.push(snowColor.r, snowColor.g, snowColor.b);

    outerPositions.push(subX, subHeight, subZ);
    outerColors.push(snowColor.r * 0.92, snowColor.g * 0.92, snowColor.b * 0.92);

    outerPositions.push(x2, by2, z2);
    outerColors.push(rockColor.r, rockColor.g, rockColor.b);
  }

  outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(outerPositions, 3));
  outerGeo.setAttribute('color', new THREE.Float32BufferAttribute(outerColors, 3));
  outerGeo.computeVertexNormals();

  const mountainMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  const mountainMesh = new THREE.Mesh(outerGeo, mountainMat);
  mountainGroup.add(mountainMesh);

  // Mid-ground rocky foothills
  const midGeo = new THREE.BufferGeometry();
  const midPositions = [];
  const midColors = [];
  const midRadius = 48;
  const midSegments = 48;
  const foothillRock = new THREE.Color(0x635E57);
  const foothillSnow = new THREE.Color(0xCBD5E1);

  for (let i = 0; i < midSegments; i++) {
    const a1 = (i / midSegments) * Math.PI * 2;
    const a2 = ((i + 1) / midSegments) * Math.PI * 2;
    const hillHeight = Math.max(6, 12 + Math.sin(a1 * 4) * 4 + Math.cos(a1 * 6) * 3);

    const x1 = Math.cos(a1) * midRadius;
    const z1 = Math.sin(a1) * midRadius;
    const x2 = Math.cos(a2) * midRadius;
    const z2 = Math.sin(a2) * midRadius;

    const mx = (x1 + x2) / 2 * 0.96;
    const mz = (z1 + z2) / 2 * 0.96;

    midPositions.push(x1, -1.0, z1);
    midColors.push(foothillRock.r, foothillRock.g, foothillRock.b);

    midPositions.push(mx, hillHeight, mz);
    midColors.push(foothillSnow.r, foothillSnow.g, foothillSnow.b);

    midPositions.push(x2, -1.0, z2);
    midColors.push(foothillRock.r, foothillRock.g, foothillRock.b);
  }

  midGeo.setAttribute('position', new THREE.Float32BufferAttribute(midPositions, 3));
  midGeo.setAttribute('color', new THREE.Float32BufferAttribute(midColors, 3));
  midGeo.computeVertexNormals();

  const midMesh = new THREE.Mesh(midGeo, mountainMat);
  mountainGroup.add(midMesh);

  return mountainGroup;
}

/**
 * Creates high-altitude contoured plateau terrain with snow terraces
 */
export function createPlateauGround() {
  const terrainGroup = new THREE.Group();
  terrainGroup.name = 'plateau-ground';

  // High-altitude Plateau Disc (Radius 22m)
  const plateauGeo = new THREE.CylinderGeometry(20, 21.5, 0.4, 48);
  const plateauMat = new THREE.MeshStandardMaterial({
    color: 0xE8DFD0, // High-altitude cold sandy earth with snow patches
    roughness: 0.92,
    metalness: 0.05,
  });
  const plateauMesh = new THREE.Mesh(plateauGeo, plateauMat);
  plateauMesh.position.y = -0.2;
  plateauMesh.receiveShadow = true;
  terrainGroup.add(plateauMesh);

  // Scattered Himalayan granite boulders
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5C5750, roughness: 0.9 });

  const rockCoords = [
    { x: -7.5, z: 6.2, s: 0.8, r: 0.4 },
    { x: 8.2, z: 5.5, s: 1.1, r: 1.2 },
    { x: -8.8, z: -7.1, s: 1.3, r: 2.1 },
    { x: 9.4, z: -6.4, s: 0.7, r: 0.8 },
    { x: -5.2, z: 9.5, s: 0.9, r: 1.7 },
  ];

  rockCoords.forEach((rc) => {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(rc.x, 0.15, rc.z);
    rock.scale.set(rc.s, rc.s * 0.65, rc.s);
    rock.rotation.y = rc.r;
    rock.castShadow = true;
    rock.receiveShadow = true;
    terrainGroup.add(rock);
  });

  return terrainGroup;
}

/**
 * Creates the 3D celestial sun path arc across the sky
 */
export function createCelestialSolarArc(seasonKey = 'winter', orientationDeg = 180) {
  const arcGroup = new THREE.Group();
  arcGroup.name = 'celestial-solar-arc';

  const season = SEASONS[seasonKey] || SEASONS.winter;
  const { sunrise, sunset } = season;

  const points = [];
  const hours = [];

  // Generate arc coordinates from sunrise to sunset
  for (let h = sunrise; h <= sunset; h += 0.25) {
    const pos = computeSolarPosition(h, seasonKey, orientationDeg);
    if (!pos.isDay) continue;

    const sunDist = 13.5;
    const altRad = (pos.altitudeDeg * Math.PI) / 180;
    const azRad = (pos.azimuthDeg * Math.PI) / 180;

    const x = sunDist * Math.cos(altRad) * Math.sin(azRad);
    const y = sunDist * Math.sin(altRad);
    const z = sunDist * Math.cos(altRad) * Math.cos(azRad);

    points.push(new THREE.Vector3(x, y, z));
  }

  // Draw continuous golden celestial arc
  if (points.length > 2) {
    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(64);
    const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const arcMat = new THREE.LineBasicMaterial({
      color: 0xF77331,
      transparent: true,
      opacity: 0.75,
      linewidth: 2,
    });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    arcGroup.add(arcLine);

    // Hourly tick nodes along the arc (8h, 10h, 12h, 14h, 16h)
    const tickHours = [8, 10, 12, 14, 16];
    const tickNodeGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const noonNodeGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0xFDE6D6 });
    const noonMat = new THREE.MeshBasicMaterial({ color: 0xF77331 });

    tickHours.forEach((th) => {
      if (th >= sunrise && th <= sunset) {
        const p = computeSolarPosition(th, seasonKey, orientationDeg);
        const altRad = (p.altitudeDeg * Math.PI) / 180;
        const azRad = (p.azimuthDeg * Math.PI) / 180;
        const sunDist = 13.5;

        const tx = sunDist * Math.cos(altRad) * Math.sin(azRad);
        const ty = sunDist * Math.sin(altRad);
        const tz = sunDist * Math.cos(altRad) * Math.cos(azRad);

        const isNoon = th === 12;
        const node = new THREE.Mesh(isNoon ? noonNodeGeo : tickNodeGeo, isNoon ? noonMat : tickMat);
        node.position.set(tx, ty, tz);
        arcGroup.add(node);

        // Radial guideline from tick to shelter origin
        const guideGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(tx, ty, tz),
          new THREE.Vector3(tx * 0.82, ty * 0.82, tz * 0.82),
        ]);
        const guideLine = new THREE.Line(
          guideGeo,
          new THREE.LineBasicMaterial({ color: 0xF77331, transparent: true, opacity: 0.35 })
        );
        arcGroup.add(guideLine);
      }
    });
  }

  return arcGroup;
}
