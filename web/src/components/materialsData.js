/*
 * materialsData.js — Physical and Thermal Properties for THERMA 3D Studio
 * Aligned with ASHRAE HoF 2021, NBC 2016, and CPWD DSR 2023.
 */

export const MATERIAL_SPECS = {
  mud_brick: {
    id: 'mud_brick',
    name: 'Mud brick (adobe)',
    category: 'mass',
    role: 'Thermal Mass & Diurnal Buffering',
    k: 0.75, // W/m·K
    rho: 1700, // kg/m³
    cp: 880, // J/kg·K
    color: '#BA7A55',
    roughness: 0.95,
    metalness: 0.05,
    description: 'Traditional sun-dried earth blocks providing high thermal capacitance to store passive daytime solar gains and discharge heat during sub-zero nights.',
    whyUse: 'High volumetric heat capacity (1.50 MJ/m³·K) acts as a passive thermal flywheel. Placing it on the inside of insulation prevents rapid midnight freeze.',
    standardsRef: 'NBC 2016 Part 8 / ASHRAE HoF Ch.26',
    local: true,
    logistics: 'Zero airlift required (100% locally quarried in Leh/Ladakh)',
  },
  rammed_earth: {
    id: 'rammed_earth',
    name: 'Rammed earth (compacted)',
    category: 'mass',
    role: 'Monolithic Heavy Mass',
    k: 1.25,
    rho: 2000,
    cp: 900,
    color: '#B88863',
    roughness: 0.9,
    metalness: 0.05,
    description: 'Compacted monolithic earth walling with stratified sand, silt, and clay binding for heavy-duty structural thermal mass.',
    whyUse: 'Extreme structural durability with high thermal damping factor (0.12). Dampens 30°C outdoor diurnal temperature fluctuations into steady indoor warmth.',
    standardsRef: 'NBC 2016 Part 8 Section 2',
    local: true,
    logistics: 'On-site formwork compaction (minimal logistics footprint)',
  },
  stone: {
    id: 'stone',
    name: 'Stone masonry (local granite)',
    category: 'structural',
    role: 'Structural Envelope & Wind Shield',
    k: 2.20,
    rho: 2400,
    cp: 840,
    color: '#827E7B',
    roughness: 0.85,
    metalness: 0.1,
    description: 'Dressed Himalayan field stone delivering high structural resistance against severe alpine winds and blizzard erosion.',
    whyUse: 'Robust outer protective barrier against 120 km/h katabatic winds and snow abrasion. Must be backed by continuous insulation due to high conductivity.',
    standardsRef: 'CPWD DSR 2023 Item 7.1',
    local: true,
    logistics: 'Locally available from glacial moraines and river valleys',
  },
  concrete: {
    id: 'concrete',
    name: 'Dense reinforced concrete',
    category: 'mass',
    role: 'Structural Slab & Plinth Mass',
    k: 1.75,
    rho: 2300,
    cp: 1000,
    color: '#9C9B98',
    roughness: 0.7,
    metalness: 0.1,
    description: 'High-density structural concrete used for ground contact floor slabs, retaining plinths, and solar thermal floor absorption.',
    whyUse: 'Absorbs direct winter solar radiation through south-facing windows and radiates warmth upward during sleeping hours. Requires perimeter XPS insulation.',
    standardsRef: 'IS 456:2000 / ASHRAE HoF 2021',
    local: true,
    logistics: 'Aggregate local; cement transported via Manali/Srinagar highway',
  },
  eps: {
    id: 'eps',
    name: 'EPS insulation (Type II High-Density)',
    category: 'insulation',
    role: 'Primary Thermal Resistance Barrier',
    k: 0.038,
    rho: 25,
    cp: 1400,
    color: '#F4ECA6',
    roughness: 0.6,
    metalness: 0.0,
    description: 'Expanded polystyrene closed-cell insulation boards providing continuous thermal break against -30°C exterior ambient air.',
    whyUse: 'High thermal resistance (R=2.63 per 100mm) prevents building envelope heat loss. Lightweight transport profile allows efficient military helicopter transport.',
    standardsRef: 'IS 4671:1984 / ISO 6946:2017',
    local: false,
    logistics: 'Lightweight volume cargo (airlifted or trucked via pass openings)',
  },
  xps: {
    id: 'xps',
    name: 'XPS insulation (Moisture Resistant)',
    category: 'insulation',
    role: 'Sub-Slab & Perimeter Ground Insulation',
    k: 0.034,
    rho: 35,
    cp: 1400,
    color: '#94D2F2',
    roughness: 0.5,
    metalness: 0.0,
    description: 'Extruded polystyrene insulation with high compressive strength and near-zero water absorption under frozen subgrade conditions.',
    whyUse: 'Impervious to permafrost moisture absorption and sub-grade freeze-thaw cycles. Essential under floor slabs to prevent conductive heat bleed into frozen soil.',
    standardsRef: 'ASTM C578 / CPWD Specifications 2019',
    local: false,
    logistics: 'Specialist thermal material for ground contact perimeters',
  },
  rockwool: {
    id: 'rockwool',
    name: 'Rockwool mineral wool batt',
    category: 'insulation',
    role: 'Non-Combustible Cavity Insulation',
    k: 0.038,
    rho: 48,
    cp: 840,
    color: '#C6AC80',
    roughness: 0.9,
    metalness: 0.0,
    description: 'Non-combustible stone wool slab for roof rafter cavity infill, acoustic absorption, and Class A1 fire protection.',
    whyUse: 'Class A1 fire resistance eliminates hazard when heating with bukharis or wood stoves. Breathable open-fiber structure allows trapped interior moisture to diffuse.',
    standardsRef: 'CPWD DSR 2023 / IS 8183',
    local: true,
    logistics: 'Standard defense engineering procurement item',
  },
  timber: {
    id: 'timber',
    name: 'Timber softwood (Deodar / Poplar)',
    category: 'structural',
    role: 'Structural Framing & Thermal Bridge Break',
    k: 0.13,
    rho: 500,
    cp: 1600,
    color: '#C8965E',
    roughness: 0.65,
    metalness: 0.05,
    description: 'Indigenous Himalayan softwood framing and joists providing low thermal conductivity (k=0.13) compared to steel (k=50).',
    whyUse: 'Prevents thermal bridging along wall corners and ceiling perimeters while providing traditional Himalayan seismic flexibility.',
    standardsRef: 'NBC 2016 Group B Timber Code',
    local: true,
    logistics: 'Locally sustainably harvested poplar/willow in Indus valleys',
  },
  plywood: {
    id: 'plywood',
    name: 'Structural plywood (BWP Marine)',
    category: 'structural',
    role: 'Interior Diaphragm & Air Seal Layer',
    k: 0.13,
    rho: 600,
    cp: 1500,
    color: '#D4AF7A',
    roughness: 0.6,
    metalness: 0.05,
    description: 'Cross-laminated boiling waterproof wood panels for interior ceiling lining and wall diaphragms.',
    whyUse: 'Provides continuous structural bracing, warm tactile interior finish, and an additional air-tight boundary against draft infiltration.',
    standardsRef: 'IS 710 / CPWD DSR 2023',
    local: true,
    logistics: 'Procured through standard regional supply channels',
  },
  polythene: {
    id: 'polythene',
    name: 'Vapor retarder membrane (200μm)',
    category: 'membrane',
    role: 'Air Infiltration & Condensation Barrier',
    k: 0.33,
    rho: 920,
    cp: 2100,
    color: '#D8E5ED',
    roughness: 0.3,
    metalness: 0.1,
    description: 'Continuous heavy-duty 200 micron polyethylene sheet taped and sealed at all joints on the warm side of insulation.',
    whyUse: 'Stops indoor respiratory water vapor from migrating into cold insulation layers where it would freeze into ice, destroying R-value.',
    standardsRef: 'UNHCR Alpine Shelter Specs / ISO 13788',
    local: true,
    logistics: 'High coverage-to-weight ratio (easily transportable)',
  },
};

export const ENVELOPE_PRESETS = {
  walls: [
    {
      id: 'ladakh_classic',
      name: 'Ladakh Passive Trombe (Adobe + Exterior EPS)',
      tag: 'Recommended · High Mass',
      description: 'Exterior 100mm EPS insulation protects 300mm internal mud brick thermal mass from freeze.',
      layers: [
        { material: 'eps', thickness_m: 0.10 },
        { material: 'mud_brick', thickness_m: 0.30 },
      ],
    },
    {
      id: 'cpwd_composite',
      name: 'CPWD Military Standard (Stone + Rockwool Cavity)',
      tag: 'CPWD DSR 2023 · Fire-Safe',
      description: 'External 250mm local granite stone masonry with 100mm non-combustible rockwool core.',
      layers: [
        { material: 'stone', thickness_m: 0.25 },
        { material: 'rockwool', thickness_m: 0.10 },
        { material: 'plywood', thickness_m: 0.015 },
      ],
    },
    {
      id: 'rammed_monolith',
      name: 'Himalayan Rammed Earth Monolith',
      tag: 'Indigenous · Low Carbon',
      description: 'Continuous 400mm compacted earth with 75mm EPS thermal shield.',
      layers: [
        { material: 'eps', thickness_m: 0.075 },
        { material: 'rammed_earth', thickness_m: 0.40 },
      ],
    },
    {
      id: 'rapid_prefab',
      name: 'High-Altitude Rapid Pre-Fab (SIP Sandwich)',
      tag: 'Lightweight · High R',
      description: 'Airlift-optimized sandwich panel with 150mm EPS core between structural plywood faces.',
      layers: [
        { material: 'plywood', thickness_m: 0.018 },
        { material: 'eps', thickness_m: 0.15 },
        { material: 'plywood', thickness_m: 0.018 },
      ],
    },
  ],
  roof: [
    {
      id: 'talashing_insulated',
      name: 'Insulated Talashing Rafters (150mm Rockwool)',
      tag: 'Standard Defense Spec',
      description: 'Poplar rafters with 150mm rockwool cavity infill, vapor retarder, and wood deck.',
      layers: [
        { material: 'rockwool', thickness_m: 0.15 },
        { material: 'polythene', thickness_m: 0.002 },
        { material: 'timber', thickness_m: 0.05 },
      ],
    },
    {
      id: 'concrete_slab_eps',
      name: 'Heavy Concrete Deck with Top EPS',
      tag: 'Snow Load Resistant',
      description: 'Reinforced concrete slab with 120mm high-density exterior EPS insulation.',
      layers: [
        { material: 'eps', thickness_m: 0.12 },
        { material: 'concrete', thickness_m: 0.15 },
      ],
    },
  ],
  floor: [
    {
      id: 'perimeter_xps_slab',
      name: 'Insulated Slab on Grade (100mm XPS)',
      tag: 'Ground Freeze Protected',
      description: 'Dense concrete mass slab poured over 100mm high-compressive XPS insulation.',
      layers: [
        { material: 'concrete', thickness_m: 0.12 },
        { material: 'xps', thickness_m: 0.10 },
      ],
    },
    {
      id: 'raised_timber_joist',
      name: 'Raised Air-Gapped Timber Floor',
      tag: 'Permafrost Isolating',
      description: 'Suspended timber floor with 120mm mineral wool cavity over frozen ground.',
      layers: [
        { material: 'plywood', thickness_m: 0.02 },
        { material: 'rockwool', thickness_m: 0.12 },
        { material: 'polythene', thickness_m: 0.002 },
      ],
    },
  ],
};

export function getMaterialSpec(id) {
  return (
    MATERIAL_SPECS[id] || {
      id: id || 'unknown',
      name: id ? id.replace(/_/g, ' ') : 'Unknown Material',
      category: 'structural',
      role: 'Building Envelope Layer',
      k: 0.8,
      rho: 1800,
      cp: 900,
      color: '#A09485',
      roughness: 0.8,
      metalness: 0.05,
      description: 'Standard building material layer.',
      whyUse: 'Enclosure layer providing basic separation.',
      standardsRef: 'General Building Practice',
      local: true,
      logistics: 'Standard regional sourcing',
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

/**
 * Computes total thermal capacitance (kJ/m²·K) for a series of layers
 */
export function computeTotalHeatCapacity(layers) {
  if (!Array.isArray(layers) || layers.length === 0) return 0;
  return layers.reduce((acc, l) => {
    const spec = getMaterialSpec(l.material);
    const th = Number(l.thickness_m) || 0;
    return acc + (spec.rho * spec.cp * th) / 1000;
  }, 0);
}

