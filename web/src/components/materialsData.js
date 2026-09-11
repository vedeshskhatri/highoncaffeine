/*
 * materialsData.js — Physical and Thermal Properties for THERMA 3D Studio
 * Aligned with ASHRAE HoF 2021, NBC 2016, and CPWD DSR 2023.
 */

export const MATERIAL_SPECS = {
  mud_brick: {
    id: 'mud_brick',
    name: 'Mud brick (adobe)',
    category: 'structural',
    k: 0.75, // W/m·K
    rho: 1700, // kg/m³
    cp: 880, // J/kg·K
    color: '#BA7A55',
    roughness: 0.95,
    metalness: 0.05,
    description: 'Traditional sun-dried earth blocks with high thermal capacitance for diurnal buffering.',
    source: 'ASHRAE HoF 2021 Ch.26',
    local: true,
  },
  rammed_earth: {
    id: 'rammed_earth',
    name: 'Rammed earth',
    category: 'structural',
    k: 1.25,
    rho: 2000,
    cp: 900,
    color: '#B88863',
    roughness: 0.9,
    metalness: 0.05,
    description: 'Compacted monolithic earth walling with stratified sand, silt and clay binding.',
    source: 'NBC 2016 Part 8',
    local: true,
  },
  stone: {
    id: 'stone',
    name: 'Stone masonry (local)',
    category: 'structural',
    k: 2.20,
    rho: 2400,
    cp: 840,
    color: '#827E7B',
    roughness: 0.85,
    metalness: 0.1,
    description: 'Local Himalayan dressed granite field stone offering robust structural envelope.',
    source: 'CPWD DSR 2023',
    local: true,
  },
  concrete: {
    id: 'concrete',
    name: 'Dense reinforced concrete',
    category: 'mass',
    k: 1.75,
    rho: 2300,
    cp: 1000,
    color: '#9C9B98',
    roughness: 0.7,
    metalness: 0.1,
    description: 'Structural mass slab for absorbing solar direct gain and releasing heat during winter dawn.',
    source: 'ASHRAE HoF 2021',
    local: true,
  },
  eps: {
    id: 'eps',
    name: 'EPS foam insulation',
    category: 'insulation',
    k: 0.038,
    rho: 25,
    cp: 1400,
    color: '#F4ECA6',
    roughness: 0.6,
    metalness: 0.0,
    description: 'Expanded polystyrene boards delivering critical thermal resistance against -25°C exterior air.',
    source: 'ISO 6946:2017',
    local: true,
  },
  xps: {
    id: 'xps',
    name: 'XPS foam insulation',
    category: 'insulation',
    k: 0.034,
    rho: 35,
    cp: 1400,
    color: '#94D2F2',
    roughness: 0.5,
    metalness: 0.0,
    description: 'Extruded moisture-resistant polystyrene ideal for sub-slab ground contact and perimeter.',
    source: 'ISO 6946:2017',
    local: false,
  },
  rockwool: {
    id: 'rockwool',
    name: 'Rockwool mineral batt',
    category: 'insulation',
    k: 0.038,
    rho: 48,
    cp: 840,
    color: '#C6AC80',
    roughness: 0.9,
    metalness: 0.0,
    description: 'Non-combustible stone wool slab for roof rafter cavity insulation.',
    source: 'CPWD DSR 2023',
    local: true,
  },
  timber: {
    id: 'timber',
    name: 'Timber softwood (Deodar)',
    category: 'structural',
    k: 0.13,
    rho: 500,
    cp: 1600,
    color: '#C8965E',
    roughness: 0.65,
    metalness: 0.05,
    description: 'Local softwood framing, joists, and lintels reducing thermal bridging.',
    source: 'NBC 2016',
    local: true,
  },
  plywood: {
    id: 'plywood',
    name: 'Structural plywood',
    category: 'structural',
    k: 0.13,
    rho: 600,
    cp: 1500,
    color: '#D4AF7A',
    roughness: 0.6,
    metalness: 0.05,
    description: 'Interior finish and ceiling diaphragm lining.',
    source: 'ASHRAE HoF 2021',
    local: true,
  },
  polythene: {
    id: 'polythene',
    name: 'Vapor retarder membrane',
    category: 'membrane',
    k: 0.33,
    rho: 920,
    cp: 2100,
    color: '#D8E5ED',
    roughness: 0.3,
    metalness: 0.1,
    description: 'Continuous 200μm membrane preventing interstitial condensation and wind-driven infiltration.',
    source: 'UNHCR Relief Specs',
    local: true,
  },
};

export function getMaterialSpec(id) {
  return (
    MATERIAL_SPECS[id] || {
      id: id || 'unknown',
      name: id ? id.replace(/_/g, ' ') : 'Unknown Material',
      category: 'structural',
      k: 0.8,
      rho: 1800,
      cp: 900,
      color: '#A09485',
      roughness: 0.8,
      metalness: 0.05,
      description: 'Standard building material layer.',
      local: true,
    }
  );
}

/**
 * Computes layer thermal resistance R = thickness / k (m²·K/W)
 */
export function computeLayerR(materialId, thickness_m) {
  const spec = getMaterialSpec(materialId);
  if (!spec || !spec.k || !thickness_m || thickness_m <= 0) return 0;
  return thickness_m / spec.k;
}

/**
 * Computes total U-value for a series of layers: U = 1 / (R_si + sum(R_i) + R_se)
 */
export function computeTotalU(layers, rSi = 0.13, rSe = 0.04) {
  if (!Array.isArray(layers) || layers.length === 0) return 0;
  const sumR = layers.reduce((acc, l) => acc + computeLayerR(l.material, l.thickness_m), 0);
  const totalR = sumR + rSi + rSe;
  return totalR > 0 ? 1 / totalR : 0;
}
