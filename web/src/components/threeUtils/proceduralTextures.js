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
    // Left highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x, 0, 2, 512);

    // Dark seam rib
    ctx.fillStyle = '#23282F';
    ctx.fillRect(x + 2, 0, 4, 512);

    // Cast seam shadow
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
