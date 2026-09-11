/*
 * himalayanEnvironment.js — Multi-Biome 3D Atmospheric Terrain & Celestial Solar Path
 * Dynamically builds procedural mountain ridges, atmospheric sky domes, ground terrain,
 * and 3D celestial diurnal solar arcs reacting to specific geographic locations:
 *   - Glacial Alpine (Siachen, Dras, Khardung La, Nyoma)
 *   - Cold High Plateau (Leh, Ladakh, Pangong)
 *   - Forested Mountain Valley (Manali, Shimla, Keylong, Auli)
 *   - Arid Desert Dunes (Jaisalmer, Bikaner, Thar)
 *   - Continental Plains (Delhi, Chandigarh, Lowlands)
 */
import * as THREE from 'three';
import { computeSolarPosition, getSeasonSolarParams } from '../SolarController';

/**
 * Classifies geographic location into an architectural environmental biome
 */
export function detectBiome(location = {}, locationName = '') {
  const lat = Number(location?.lat) || 34.15;
  const lon = Number(location?.lon) || 77.58;
  const alt = Number(location?.altitude_m) || 3500;
  const name = (locationName || '').toLowerCase();

  // Explicit keyword checks
  if (name.includes('siachen') || name.includes('dras') || name.includes('khardung') || name.includes('baralacha')) {
    return 'glacial';
  }
  if (name.includes('jaisalmer') || name.includes('bikaner') || name.includes('thar') || name.includes('desert')) {
    return 'desert';
  }
  if (name.includes('manali') || name.includes('shimla') || name.includes('kullu') || name.includes('auli') || name.includes('darjeeling')) {
    return 'valley';
  }
  if (name.includes('delhi') || name.includes('chandigarh') || name.includes('mumbai') || name.includes('plains')) {
    return 'plains';
  }
  if (name.includes('leh') || name.includes('ladakh') || name.includes('nyoma') || name.includes('zanskar')) {
    return 'plateau';
  }

  // Physical heuristic checks based on altitude & latitude
  if (alt >= 3300 && (lat >= 34.0 || location?.snow_cover)) {
    return alt >= 4000 ? 'glacial' : 'plateau';
  }
  if (lat <= 28.5 && lon <= 74.5 && alt < 500) {
    return 'desert';
  }
  if (alt >= 1400 && alt < 3300) {
    return 'valley';
  }
  if (alt < 1200) {
    return 'plains';
  }

  return 'plateau';
}

/**
 * Returns human-readable label and atmospheric parameters for a biome
 */
export function getBiomeMeta(biome = 'plateau') {
  switch (biome) {
    case 'glacial':
      return {
        label: 'Glacial Alpine Zone',
        subLabel: 'Sub-Zero Cryosphere · Deep Snowfields',
        fogColor: 0xD8E4ED,
        fogDensity: 0.012,
        lightColor: 0xF2F7FD,
        hemiSky: 0xE8F2FC,
        hemiGround: 0x5C6D7E,
      };
    case 'valley':
      return {
        label: 'Alpine Valley & Ridge',
        subLabel: 'Montane Slopes · Coniferous Treeline',
        fogColor: 0xE0E6E6,
        fogDensity: 0.010,
        lightColor: 0xFFF7EC,
        hemiSky: 0xE5EFF7,
        hemiGround: 0x475344,
      };
    case 'desert':
      return {
        label: 'Arid Desert Basin',
        subLabel: 'Windblown Sand Dunes · High Diurnal Flux',
        fogColor: 0xF5E4CF,
        fogDensity: 0.008,
        lightColor: 0xFFF2DC,
        hemiSky: 0xFDF4E7,
        hemiGround: 0x946E4A,
      };
    case 'plains':
      return {
        label: 'Continental Lowland',
        subLabel: 'Temperate Alluvial Basin · Flat Horizon',
        fogColor: 0xE3E8EC,
        fogDensity: 0.009,
        lightColor: 0xFFFBF4,
        hemiSky: 0xEEF4F9,
        hemiGround: 0x586455,
      };
    case 'plateau':
    default:
      return {
        label: 'Cold High Plateau',
        subLabel: 'Trans-Himalayan Steppe · 3,500m ASL',
        fogColor: 0xE8EDF2,
        fogDensity: 0.011,
        lightColor: 0xFFF5E6,
        hemiSky: 0xEEF6FB,
        hemiGround: 0x6E5D48,
      };
  }
}

/**
 * Creates atmospheric sky dome dynamically matched to the biome
 */
export function createSkyDome(biome = 'plateau') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);

  if (biome === 'glacial') {
    grad.addColorStop(0.0, '#091A2D'); // Deep arctic dark cobalt zenith
    grad.addColorStop(0.35, '#1B3D63');
    grad.addColorStop(0.70, '#5D85A7');
    grad.addColorStop(0.90, '#CFDFEB'); // Frosty ice haze
    grad.addColorStop(1.0, '#EDF4F9'); // Crystalline white horizon
  } else if (biome === 'valley') {
    grad.addColorStop(0.0, '#15314F');
    grad.addColorStop(0.38, '#32587D');
    grad.addColorStop(0.72, '#7C9EB5');
    grad.addColorStop(0.90, '#CBD9DA'); // Misted valley fog
    grad.addColorStop(1.0, '#F2EEE9'); // Warm morning loam glow
  } else if (biome === 'desert') {
    grad.addColorStop(0.0, '#153A62'); // Bright desert azure
    grad.addColorStop(0.38, '#3A6891');
    grad.addColorStop(0.72, '#AC8E72'); // Amber dust layer
    grad.addColorStop(0.90, '#E8C5A0');
    grad.addColorStop(1.0, '#FDE5CD'); // Golden solar horizon
  } else if (biome === 'plains') {
    grad.addColorStop(0.0, '#1D3D60');
    grad.addColorStop(0.40, '#436B92');
    grad.addColorStop(0.75, '#9DB3C2');
    grad.addColorStop(0.92, '#D7E2E8');
    grad.addColorStop(1.0, '#FAF8F5');
  } else {
    // Cold high plateau (Ladakh)
    grad.addColorStop(0.0, '#12253B');
    grad.addColorStop(0.40, '#2B4C6F');
    grad.addColorStop(0.70, '#6E8EA8');
    grad.addColorStop(0.90, '#D4DCDA');
    grad.addColorStop(1.0, '#F5EDE0');
  }

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
 * Generates low-poly procedural mountain ridges & terrain relief matching the biome
 */
export function createDynamicMountains(biome = 'plateau') {
  const mountainGroup = new THREE.Group();
  mountainGroup.name = 'dynamic-mountains';

  const segments = 64;
  const outerRadius = 76;
  const outerGeo = new THREE.BufferGeometry();
  const outerPositions = [];
  const outerColors = [];

  // Color palettes per biome
  let snowColor = new THREE.Color(0xF8FAFC);
  let rockColor = new THREE.Color(0x47433F);
  let shadowColor = new THREE.Color(0x2E2B28);
  let peakBaseHeight = 26;
  let peakModulation = 12;

  if (biome === 'glacial') {
    // Towering icy glaciers & sharp snowy horns
    snowColor = new THREE.Color(0xFDFFFF);
    rockColor = new THREE.Color(0x3B414B);
    shadowColor = new THREE.Color(0x1F242C);
    peakBaseHeight = 32;
    peakModulation = 16;
  } else if (biome === 'valley') {
    // Fir forested slopes with craggy slate tops
    snowColor = new THREE.Color(0xE2E8F0);
    rockColor = new THREE.Color(0x344238); // Dark pine evergreen slate
    shadowColor = new THREE.Color(0x242D26);
    peakBaseHeight = 22;
    peakModulation = 10;
  } else if (biome === 'desert') {
    // Red sandstone mesas & wind-swept golden ridges
    snowColor = new THREE.Color(0xE6A868); // Sunlit sandstone cap
    rockColor = new THREE.Color(0x9E693B); // Desert ochre canyon rock
    shadowColor = new THREE.Color(0x613E22);
    peakBaseHeight = 14;
    peakModulation = 7;
  } else if (biome === 'plains') {
    // Gentle rolling low horizon hills
    snowColor = new THREE.Color(0x8A9A86); // Soft green grass hill
    rockColor = new THREE.Color(0x5A6857);
    shadowColor = new THREE.Color(0x3A4438);
    peakBaseHeight = 8;
    peakModulation = 4;
  } else {
    // Cold high plateau
    snowColor = new THREE.Color(0xF8FAFC);
    rockColor = new THREE.Color(0x4E4944);
    shadowColor = new THREE.Color(0x2E2B28);
    peakBaseHeight = 26;
    peakModulation = 12;
  }

  // Generate continuous jagged mountain ring
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;

    const seed = Math.sin(angle1 * 3.5) * (peakModulation * 0.5) +
                 Math.cos(angle1 * 7.2) * (peakModulation * 0.3) +
                 Math.sin(angle1 * 2.0) * (peakModulation * 0.6);
    const peakHeight = Math.max(biome === 'plains' ? 4 : 12, peakBaseHeight + seed);

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

    // Face 1: Main peak facet
    outerPositions.push(x1, by1, z1);
    outerColors.push(rockColor.r, rockColor.g, rockColor.b);

    outerPositions.push(px, peakHeight, pz);
    outerColors.push(snowColor.r, snowColor.g, snowColor.b);

    outerPositions.push(x2, by2, z2);
    outerColors.push(shadowColor.r, shadowColor.g, shadowColor.b);

    // Face 2: Flank facet
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

  let footRock = new THREE.Color(0x635E57);
  let footCap = new THREE.Color(0xCBD5E1);

  if (biome === 'glacial') {
    footRock = new THREE.Color(0x4A5260);
    footCap = new THREE.Color(0xF1F5F9);
  } else if (biome === 'valley') {
    footRock = new THREE.Color(0x2E3A2F);
    footCap = new THREE.Color(0x4C5E4E);
  } else if (biome === 'desert') {
    footRock = new THREE.Color(0x8C5628);
    footCap = new THREE.Color(0xC98547);
  } else if (biome === 'plains') {
    footRock = new THREE.Color(0x4F5B4B);
    footCap = new THREE.Color(0x6E7D6A);
  }

  for (let i = 0; i < midSegments; i++) {
    const a1 = (i / midSegments) * Math.PI * 2;
    const a2 = ((i + 1) / midSegments) * Math.PI * 2;
    const hillHeight = Math.max(
      biome === 'plains' ? 2 : 5,
      (peakBaseHeight * 0.45) + Math.sin(a1 * 4) * 3 + Math.cos(a1 * 6) * 2
    );

    const x1 = Math.cos(a1) * midRadius;
    const z1 = Math.sin(a1) * midRadius;
    const x2 = Math.cos(a2) * midRadius;
    const z2 = Math.sin(a2) * midRadius;

    const mx = (x1 + x2) / 2 * 0.96;
    const mz = (z1 + z2) / 2 * 0.96;

    midPositions.push(x1, -1.0, z1);
    midColors.push(footRock.r, footRock.g, footRock.b);

    midPositions.push(mx, hillHeight, mz);
    midColors.push(footCap.r, footCap.g, footCap.b);

    midPositions.push(x2, -1.0, z2);
    midColors.push(footRock.r, footRock.g, footRock.b);
  }

  midGeo.setAttribute('position', new THREE.Float32BufferAttribute(midPositions, 3));
  midGeo.setAttribute('color', new THREE.Float32BufferAttribute(midColors, 3));
  midGeo.computeVertexNormals();

  const midMesh = new THREE.Mesh(midGeo, mountainMat);
  mountainGroup.add(midMesh);

  return mountainGroup;
}

/**
 * Creates dynamic ground platform disc with boulders, snow terraces, or dunes
 */
export function createDynamicGround(biome = 'plateau', snowCover = true) {
  const terrainGroup = new THREE.Group();
  terrainGroup.name = 'dynamic-ground';

  // Base ground disc
  const radius = 22;
  const groundGeo = new THREE.CylinderGeometry(radius, radius + 1.5, 0.4, 48);

  let groundColor = 0xE8DFD0; // Sandy arid loam
  let groundRoughness = 0.92;
  let groundMetalness = 0.05;

  if (biome === 'glacial' || snowCover) {
    groundColor = 0xF1F5F9; // Pure crisp snow crust
    groundRoughness = 0.85;
  } else if (biome === 'valley') {
    groundColor = 0x6E7A64; // Alpine pine meadow & mossy earth
    groundRoughness = 0.88;
  } else if (biome === 'desert') {
    groundColor = 0xD4A36A; // Golden desert sand
    groundRoughness = 0.95;
  } else if (biome === 'plains') {
    groundColor = 0x828D7B; // Soil & turf loam
    groundRoughness = 0.88;
  }

  const groundMat = new THREE.MeshStandardMaterial({
    color: groundColor,
    roughness: groundRoughness,
    metalness: groundMetalness,
  });

  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.y = -0.2;
  groundMesh.receiveShadow = true;
  terrainGroup.add(groundMesh);

  // Secondary snow terrace drift if snow cover is enabled or glacial
  if (snowCover || biome === 'glacial') {
    const snowDriftGeo = new THREE.RingGeometry(8.5, 21.8, 36, 4);
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xFDFFFF,
      roughness: 0.78,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const snowDrift = new THREE.Mesh(snowDriftGeo, snowMat);
    snowDrift.rotation.x = -Math.PI / 2;
    snowDrift.position.y = 0.01;
    snowDrift.receiveShadow = true;
    terrainGroup.add(snowDrift);
  }

  // Scattered rocks / boulders / dune crests
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 1);
  let rockColor = 0x5C5750;
  if (biome === 'glacial') rockColor = 0x47515F;
  if (biome === 'valley') rockColor = 0x3E473D;
  if (biome === 'desert') rockColor = 0x9B6F45;

  const rockMat = new THREE.MeshStandardMaterial({
    color: rockColor,
    roughness: 0.9,
    metalness: 0.05,
  });

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

    // Snow dusting on top of boulder
    if (snowCover || biome === 'glacial') {
      const snowCapGeo = new THREE.SphereGeometry(0.35, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.8 });
      const cap = new THREE.Mesh(snowCapGeo, snowCapMat);
      cap.position.set(rc.x, 0.15 + rc.s * 0.45, rc.z);
      cap.scale.set(rc.s * 0.85, rc.s * 0.4, rc.s * 0.85);
      terrainGroup.add(cap);
    }
  });

  return terrainGroup;
}

/**
 * Creates 3D celestial sun path arc across the sky based on true latitude and altitude
 */
export function createCelestialSolarArc(
  seasonKey = 'winter',
  orientationDeg = 180,
  lat = 34.1526,
  altitude_m = 3500
) {
  const arcGroup = new THREE.Group();
  arcGroup.name = 'celestial-solar-arc';

  const { sunrise, sunset } = getSeasonSolarParams(seasonKey, lat, altitude_m);

  const points = [];

  for (let h = sunrise; h <= sunset; h += 0.25) {
    const pos = computeSolarPosition(h, seasonKey, orientationDeg, lat, altitude_m);
    if (!pos.isDay) continue;

    const sunDist = 13.5;
    const altRad = (pos.altitudeDeg * Math.PI) / 180;
    const azRad = (pos.azimuthDeg * Math.PI) / 180;

    const x = sunDist * Math.cos(altRad) * Math.sin(azRad);
    const y = sunDist * Math.sin(altRad);
    const z = sunDist * Math.cos(altRad) * Math.cos(azRad);

    points.push(new THREE.Vector3(x, y, z));
  }

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

    // Hourly tick nodes
    const tickHours = [8, 10, 12, 14, 16];
    const tickNodeGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const noonNodeGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0xFDE6D6 });
    const noonMat = new THREE.MeshBasicMaterial({ color: 0xF77331 });

    tickHours.forEach((th) => {
      if (th >= sunrise && th <= sunset) {
        const p = computeSolarPosition(th, seasonKey, orientationDeg, lat, altitude_m);
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

        // Radial guideline towards origin
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

// Backward compatibility exports
export const createHimalayanMountains = () => createDynamicMountains('plateau');
export const createPlateauGround = () => createDynamicGround('plateau', true);
