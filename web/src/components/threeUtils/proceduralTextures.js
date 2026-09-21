/*
 * proceduralTextures.js — Lightweight Offline Procedural Textures for Three.js
 * Generates canvas-backed textures for high-altitude architectural materials.
 * 100% offline, zero network dependencies.
 */
import * as THREE from 'three';

// Cache generated textures so we don't recreate them on every render
const textureCache = new Map();

/**
 * Procedural Mud Brick (Adobe) Texture
 * Generates staggered earthen masonry courses with clay speckles and mortar recesses.
 */
export function getAdobeTexture() {
  if (textureCache.has('adobe')) return textureCache.get('adobe');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base earth tone
  ctx.fillStyle = '#9C623C';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const rowHeight = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    const isOdd = r % 2 === 1;
    const cols = 6;
    const colWidth = 512 / cols;
    const xOffset = isOdd ? colWidth / 2 : 0;

    for (let c = -1; c <= cols; c++) {
      const x = c * colWidth + xOffset;

      // Subtle earth hue variation per brick
      const hueShift = (Math.random() - 0.5) * 16;
      const lightShift = (Math.random() - 0.5) * 12;
      ctx.fillStyle = `hsl(${24 + hueShift}, ${48}%, ${46 + lightShift}%)`;
      ctx.fillRect(x + 2, y + 2, colWidth - 4, rowHeight - 4);

      // Fine stippling / earthen grain
      ctx.fillStyle = 'rgba(40, 20, 10, 0.12)';
      for (let i = 0; i < 35; i++) {
        const sx = x + 2 + Math.random() * (colWidth - 4);
        const sy = y + 2 + Math.random() * (rowHeight - 4);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      // Straw / fiber flecks
      ctx.fillStyle = 'rgba(230, 200, 140, 0.2)';
      for (let i = 0; i < 15; i++) {
        const sx = x + 2 + Math.random() * (colWidth - 4);
        const sy = y + 2 + Math.random() * (rowHeight - 4);
        ctx.fillRect(sx, sy, 4, 1);
      }
    }

    // Mortar horizontal joint
    ctx.fillStyle = 'rgba(50, 30, 15, 0.4)';
    ctx.fillRect(0, y + rowHeight - 2, 512, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('adobe', texture);
  return texture;
}

/**
 * Procedural Compacted Rammed Earth Texture
 * Stratified earth layers formed by pneumatic compaction with subtle sand/clay strata.
 */
export function getRammedEarthTexture() {
  if (textureCache.has('rammed_earth')) return textureCache.get('rammed_earth');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base compacted clay tone
  ctx.fillStyle = '#B88863';
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal compaction strata
  let curY = 0;
  while (curY < 512) {
    const layerH = 14 + Math.random() * 26;
    const tone = Math.random();
    const layerColor = tone > 0.65
      ? 'rgba(150, 95, 60, 0.45)'
      : tone > 0.35
      ? 'rgba(195, 150, 110, 0.4)'
      : 'rgba(125, 75, 45, 0.35)';

    ctx.fillStyle = layerColor;
    ctx.fillRect(0, curY, 512, layerH);

    // Fine compaction wave
    ctx.strokeStyle = 'rgba(70, 40, 20, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, curY);
    for (let x = 0; x <= 512; x += 32) {
      ctx.lineTo(x, curY + (Math.random() - 0.5) * 3);
    }
    ctx.stroke();

    // Sand and small gravel aggregate specks
    ctx.fillStyle = 'rgba(235, 220, 195, 0.3)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * 512, curY + Math.random() * layerH, 2, 2);
    }
    ctx.fillStyle = 'rgba(40, 25, 15, 0.25)';
    for (let i = 0; i < 25; i++) {
      ctx.fillRect(Math.random() * 512, curY + Math.random() * layerH, 1.5, 1.5);
    }

    curY += layerH;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('rammed_earth', texture);
  return texture;
}

/**
 * Procedural Dressed Himalayan Granite / Fieldstone Texture
 */
export function getStoneTexture() {
  if (textureCache.has('stone')) return textureCache.get('stone');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6E6A66';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 12;
  const rowHeight = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    const cols = 5 + (r % 3);
    const colWidth = 512 / cols;

    for (let c = 0; c < cols; c++) {
      const x = c * colWidth;
      const shade = 110 + Math.floor(Math.random() * 45);
      ctx.fillStyle = `rgb(${shade + 4}, ${shade}, ${shade - 4})`;
      ctx.fillRect(x + 3, y + 3, colWidth - 6, rowHeight - 6);

      // Mineral quartz stipples
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(x + Math.random() * colWidth, y + Math.random() * rowHeight, 1.5, 1.5);
      }
      ctx.fillStyle = 'rgba(20, 20, 20, 0.2)';
      for (let i = 0; i < 30; i++) {
        ctx.fillRect(x + Math.random() * colWidth, y + Math.random() * rowHeight, 1.5, 1.5);
      }
    }
    // Mortar lines
    ctx.fillStyle = 'rgba(30, 25, 20, 0.5)';
    ctx.fillRect(0, y + rowHeight - 3, 512, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('stone', texture);
  return texture;
}

/**
 * Procedural Himalayan Pine / Cedar Timber Texture (Wood Grain)
 */
export function getTimberTexture() {
  if (textureCache.has('timber')) return textureCache.get('timber');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Warm cedar base
  ctx.fillStyle = '#6E4426';
  ctx.fillRect(0, 0, 512, 128);

  // Longitudinal wood grain rings
  for (let y = 0; y < 128; y += 3) {
    const darkness = 0.08 + Math.sin(y * 0.15) * 0.06;
    ctx.fillStyle = `rgba(35, 15, 5, ${darkness})`;
    ctx.fillRect(0, y, 512, 2);
  }

  // Wavy grain lines
  ctx.strokeStyle = 'rgba(30, 12, 4, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let y = 10 + i * 15;
    ctx.moveTo(0, y);
    for (let x = 0; x < 512; x += 32) {
      y += (Math.random() - 0.5) * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  textureCache.set('timber', texture);
  return texture;
}

/**
 * Procedural Structural Plywood Texture
 */
export function getPlywoodTexture() {
  if (textureCache.has('plywood')) return textureCache.get('plywood');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#D4AF7A';
  ctx.fillRect(0, 0, 512, 256);

  // Soft subtle veneer growth grain
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = 'rgba(160, 115, 65, 0.12)';
    ctx.fillRect(0, y, 512, 2);
  }

  ctx.strokeStyle = 'rgba(130, 90, 50, 0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let y = 20 + i * 40;
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 64) {
      y += (Math.random() - 0.5) * 6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('plywood', texture);
  return texture;
}

/**
 * Procedural EPS Foam Insulation Bead Texture
 */
export function getEpsTexture() {
  if (textureCache.has('eps')) return textureCache.get('eps');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Crisp technical insulation foam color
  ctx.fillStyle = '#F5EDAA';
  ctx.fillRect(0, 0, 256, 256);

  // Polystyrene beads pattern
  ctx.strokeStyle = 'rgba(180, 170, 100, 0.4)';
  ctx.lineWidth = 1;
  const beadSize = 8;

  for (let y = 0; y < 256; y += beadSize) {
    for (let x = 0; x < 256; x += beadSize) {
      const offsetX = (y % (beadSize * 2) === 0) ? beadSize / 2 : 0;
      ctx.beginPath();
      ctx.arc(x + offsetX, y, beadSize * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = (Math.random() > 0.5) ? '#FAF5C8' : '#ECE29A';
      ctx.fill();
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set('eps', texture);
  return texture;
}

/**
 * Procedural XPS Foam Insulation Texture (Fine Closed-Cell Cyan Foam)
 */
export function getXpsTexture() {
  if (textureCache.has('xps')) return textureCache.get('xps');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Characteristic pale arctic cyan/blue of XPS
  ctx.fillStyle = '#94D2F2';
  ctx.fillRect(0, 0, 256, 256);

  // Micro-cellular smooth surface grid
  ctx.strokeStyle = 'rgba(90, 160, 210, 0.3)';
  ctx.lineWidth = 0.8;
  const cellSize = 6;

  for (let y = 0; y < 256; y += cellSize) {
    for (let x = 0; x < 256; x += cellSize) {
      const offX = (y % (cellSize * 2) === 0) ? cellSize / 2 : 0;
      ctx.beginPath();
      ctx.arc(x + offX, y, cellSize * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = (Math.random() > 0.5) ? '#A8DCF7' : '#82C7EC';
      ctx.fill();
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set('xps', texture);
  return texture;
}

/**
 * Procedural Mineral Wool (Rockwool) Batt Texture
 */
export function getRockwoolTexture() {
  if (textureCache.has('rockwool')) return textureCache.get('rockwool');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Muted earthy gold/tan base
  ctx.fillStyle = '#C6AC80';
  ctx.fillRect(0, 0, 256, 256);

  // Multidirectional interlocked fine mineral fibers
  for (let i = 0; i < 450; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 8 + Math.random() * 16;
    const angle = Math.random() * Math.PI;

    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(90, 70, 45, 0.28)' : 'rgba(235, 220, 185, 0.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set('rockwool', texture);
  return texture;
}

/**
 * Procedural Agricultural Straw Bale Insulation Texture
 */
export function getStrawBaleTexture() {
  if (textureCache.has('straw_bale')) return textureCache.get('straw_bale');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Golden wheat straw base
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, 0, 256, 256);

  // Compressed horizontal straw fibers
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(160, 120, 25, 0.35)' : 'rgba(255, 230, 130, 0.35)';
    ctx.fillRect(0, y, 256, 2);
  }

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 12 + Math.random() * 24;
    ctx.strokeStyle = 'rgba(100, 70, 15, 0.3)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set('straw_bale', texture);
  return texture;
}

/**
 * Procedural Prefab Polyurethane (PUF) Sandwich Panel Texture
 */
export function getPufTexture() {
  if (textureCache.has('puf_sandwich')) return textureCache.get('puf_sandwich');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Pre-coated architectural grey/white steel skin
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(0, 0, 256, 256);

  // Modular micro-ribbed steel profile (vertical ribs every 32px)
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(x, 0, 2, 256);
    ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
    ctx.fillRect(x + 2, 0, 3, 256);
  }

  // Subtle clean powder-coat stipple
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(148, 163, 184, 0.15)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set('puf_sandwich', texture);
  return texture;
}

/**
 * Procedural Polyethylene Vapor Barrier Membrane Texture
 */
export function getPolytheneTexture() {
  if (textureCache.has('polythene')) return textureCache.get('polythene');

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Translucent vapor sheet base
  ctx.fillStyle = '#D8E5ED';
  ctx.fillRect(0, 0, 128, 128);

  // Embedded scrim reinforcement grid
  ctx.strokeStyle = 'rgba(160, 185, 200, 0.4)';
  ctx.lineWidth = 1;
  for (let p = 0; p < 128; p += 16) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(128, p);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set('polythene', texture);
  return texture;
}

/**
 * Procedural Crystalline Snow Texture
 */
export function getSnowTexture() {
  if (textureCache.has('snow')) return textureCache.get('snow');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Crisp Himalayan snow with cool cyan-tinted ambient
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 256, 256);

  // Micro crystalline sparkles
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const radius = 0.6 + Math.random() * 0.8;
    ctx.fillStyle = Math.random() > 0.7 ? 'rgba(215, 235, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set('snow', texture);
  return texture;
}

/**
 * Procedural Concrete / Plinth Texture with aggregate stipples
 */
export function getConcreteTexture() {
  if (textureCache.has('concrete')) return textureCache.get('concrete');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8F8E8A';
  ctx.fillRect(0, 0, 256, 256);

  // Formwork joints
  ctx.strokeStyle = 'rgba(50, 48, 45, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  // Aggregate specks
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const color = Math.random() > 0.5 ? 'rgba(230, 230, 230, 0.18)' : 'rgba(30, 30, 30, 0.18)';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set('concrete', texture);
  return texture;
}

/**
 * Procedural Standing-Seam Alpine Metal Roof Texture
 */
export function getMetalSeamRoofTexture() {
  if (textureCache.has('metal_roof')) return textureCache.get('metal_roof');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Alpine charcoal coated galvanized sheet
  ctx.fillStyle = '#3E4651';
  ctx.fillRect(0, 0, 512, 512);

  // Vertical standing seams every 64px
  for (let x = 0; x < 512; x += 64) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x, 0, 2, 512);

    ctx.fillStyle = '#23282F';
    ctx.fillRect(x + 2, 0, 4, 512);

    ctx.fillStyle = 'rgba(15, 18, 22, 0.4)';
    ctx.fillRect(x + 6, 0, 6, 512);
  }

  // Subtle metallic stipple
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(rx, ry, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('metal_roof', texture);
  return texture;
}

/**
 * Procedural Photovoltaic Solar Panel Texture
 */
export function getSolarPanelTexture() {
  if (textureCache.has('solar_pv')) return textureCache.get('solar_pv');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Deep monocrystalline navy
  ctx.fillStyle = '#10223B';
  ctx.fillRect(0, 0, 256, 256);

  // Solar cell grid (4x4 cells)
  const cellSize = 64;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = c * cellSize + 2;
      const y = r * cellSize + 2;
      const w = cellSize - 4;
      const h = cellSize - 4;

      ctx.fillStyle = '#163152';
      ctx.fillRect(x, y, w, h);

      // Silver busbars
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.33, y);
      ctx.lineTo(x + w * 0.33, y + h);
      ctx.moveTo(x + w * 0.66, y);
      ctx.lineTo(x + w * 0.66, y + h);
      ctx.stroke();

      // Fine grid fingers
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      for (let fy = y + 8; fy < y + h; fy += 10) {
        ctx.beginPath();
        ctx.moveTo(x, fy);
        ctx.lineTo(x + w, fy);
        ctx.stroke();
      }
    }
  }

  // Outer panel border
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('solar_pv', texture);
  return texture;
}

/**
 * Procedural Kath-Kuni Interlocked Timber & Slate Texture (Himachal / Manali)
 * Alternating courses of Deodar cedar wood beams and grey slate stone courses.
 */
export function getKathKuniTexture() {
  if (textureCache.has('kath_kuni')) return textureCache.get('kath_kuni');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const courses = 8;
  const courseH = 512 / courses;

  for (let c = 0; c < courses; c++) {
    const y = c * courseH;
    const isTimber = c % 2 === 0;

    if (isTimber) {
      // Deodar cedar wood course
      ctx.fillStyle = '#7C4A27';
      ctx.fillRect(0, y, 512, courseH);

      // Longitudinal grain
      for (let gy = 2; gy < courseH - 2; gy += 4) {
        ctx.fillStyle = 'rgba(55, 25, 8, 0.25)';
        ctx.fillRect(0, y + gy, 512, 1.5);
      }
      // Timber joints / pegs
      ctx.fillStyle = 'rgba(35, 15, 5, 0.6)';
      ctx.fillRect(128, y, 3, courseH);
      ctx.fillRect(384, y, 3, courseH);
    } else {
      // Local grey slate / stone course
      ctx.fillStyle = '#65676B';
      ctx.fillRect(0, y, 512, courseH);

      const stoneCount = 6;
      const stoneW = 512 / stoneCount;
      for (let s = 0; s < stoneCount; s++) {
        const sx = s * stoneW;
        const shade = 95 + Math.floor(Math.random() * 30);
        ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 4})`;
        ctx.fillRect(sx + 2, y + 2, stoneW - 4, courseH - 4);

        // Stone texture stipple
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let i = 0; i < 20; i++) {
          ctx.fillRect(sx + Math.random() * stoneW, y + Math.random() * courseH, 1.5, 1.5);
        }
      }
      // Mortar groove
      ctx.fillStyle = 'rgba(30, 30, 30, 0.4)';
      ctx.fillRect(0, y + courseH - 2, 512, 2);
    }

    // Shadow between timber and stone
    ctx.fillStyle = 'rgba(20, 10, 5, 0.4)';
    ctx.fillRect(0, y, 512, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('kath_kuni', texture);
  return texture;
}

/**
 * Procedural Jaisalmer Yellow Sandstone Texture (Rajasthan / Thar)
 */
export function getJaisalmerStoneTexture() {
  if (textureCache.has('jaisalmer_stone')) return textureCache.get('jaisalmer_stone');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Honey golden sandstone base
  ctx.fillStyle = '#E5BE7A';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 10;
  const rowH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const cols = 4 + (r % 2);
    const colW = 512 / cols;

    for (let c = 0; c < cols; c++) {
      const x = c * colW;
      const hueShift = (Math.random() - 0.5) * 6;
      const lightShift = (Math.random() - 0.5) * 8;
      ctx.fillStyle = `hsl(${38 + hueShift}, ${68}%, ${68 + lightShift}%)`;
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      // Fine golden sand grain stippling
      ctx.fillStyle = 'rgba(160, 110, 40, 0.18)';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(x + Math.random() * colW, y + Math.random() * rowH, 1.5, 1.5);
      }
      ctx.fillStyle = 'rgba(255, 245, 210, 0.25)';
      for (let i = 0; i < 25; i++) {
        ctx.fillRect(x + Math.random() * colW, y + Math.random() * rowH, 1.5, 1.5);
      }
    }

    // Chiselled mortar joints
    ctx.fillStyle = 'rgba(180, 130, 60, 0.5)';
    ctx.fillRect(0, y + rowH - 2, 512, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('jaisalmer_stone', texture);
  return texture;
}

/**
 * Procedural Carved Stone Jali Lattice Texture (Thar / Arid Shading)
 */
export function getJaliScreenTexture() {
  if (textureCache.has('jali_screen')) return textureCache.get('jali_screen');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#D4AA64';
  ctx.fillRect(0, 0, 256, 256);

  const cells = 8;
  const cellS = 256 / cells;

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const cx = c * cellS + cellS / 2;
      const cy = r * cellS + cellS / 2;

      // Dark shadow aperture representing open perforation
      ctx.fillStyle = '#2A1808';
      ctx.beginPath();
      ctx.arc(cx, cy, cellS * 0.32, 0, Math.PI * 2);
      ctx.fill();

      // Stone filigree cross
      ctx.strokeStyle = '#D4AA64';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - cellS * 0.35, cy);
      ctx.lineTo(cx + cellS * 0.35, cy);
      ctx.moveTo(cx, cy - cellS * 0.35);
      ctx.lineTo(cx, cy + cellS * 0.35);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set('jali_screen', texture);
  return texture;
}

/**
 * Procedural Pitched Alpine Slate Roof Texture
 */
export function getSlateRoofTexture() {
  if (textureCache.has('slate_roof')) return textureCache.get('slate_roof');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark slate base
  ctx.fillStyle = '#2B333E';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const rowH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const cols = 8;
    const colW = 512 / cols;
    const isOdd = r % 2 === 1;
    const offset = isOdd ? colW / 2 : 0;

    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const val = 38 + Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${val - 2}, ${val + 2}, ${val + 8})`;
      ctx.fillRect(x + 1, y + 1, colW - 2, rowH - 2);

      // Slate cleavage line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x + 2, y + 2, colW - 4, 1.5);

      ctx.fillStyle = 'rgba(10, 15, 20, 0.35)';
      ctx.fillRect(x + 1, y + rowH - 2, colW - 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('slate_roof', texture);
  return texture;
}

/**
 * Master texture resolver that maps any material ID to its authentic procedural texture.
 */
export function getTextureForMaterial(materialId) {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const mid = (materialId || '').toLowerCase();

  if (mid.includes('kath_kuni')) {
    return getKathKuniTexture();
  }
  if (mid.includes('jaisalmer') || mid.includes('sandstone')) {
    return getJaisalmerStoneTexture();
  }
  if (mid.includes('jali')) {
    return getJaliScreenTexture();
  }
  if (mid.includes('slate')) {
    return getSlateRoofTexture();
  }
  if (mid.includes('mud_brick') || mid.includes('adobe')) {
    return getAdobeTexture();
  }
  if (mid.includes('rammed')) {
    return getRammedEarthTexture();
  }
  if (mid.includes('stone') || mid.includes('granite')) {
    return getStoneTexture();
  }
  if (mid.includes('cgi') || mid.includes('metal_roof') || mid.includes('corrugated')) {
    return getMetalSeamRoofTexture();
  }
  if (mid.includes('puf') || mid.includes('pu_') || mid.includes('sandwich') || mid.includes('prefab')) {
    return getPufTexture();
  }
  if (mid.includes('xps')) {
    return getXpsTexture();
  }
  if (mid.includes('eps')) {
    return getEpsTexture();
  }
  if (mid.includes('rockwool') || mid.includes('wool') || mid.includes('mineral')) {
    return getRockwoolTexture();
  }
  if (mid.includes('straw')) {
    return getStrawBaleTexture();
  }
  if (mid.includes('timber') || mid.includes('wood') || mid.includes('rafter')) {
    return getTimberTexture();
  }
  if (mid.includes('plywood')) {
    return getPlywoodTexture();
  }
  if (mid.includes('poly') || mid.includes('plastic') || mid.includes('sheeting') || mid.includes('retarder') || mid.includes('membrane')) {
    return getPolytheneTexture();
  }
  if (mid.includes('concrete')) {
    return getConcreteTexture();
  }
  if (mid.includes('snow')) {
    return getSnowTexture();
  }
  if (mid.includes('solar') || mid.includes('pv')) {
    return getSolarPanelTexture();
  }

  return getConcreteTexture();
}

