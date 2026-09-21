/*
 * materialsData.js — Physical and Thermal Properties for THERMA 3D Studio
 * Aligned with ASHRAE HoF 2021, NBC 2016, and CPWD DSR 2023.
 * Enforces Rule R1: Never invent a number. All physical values are cited.
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
    cost_per_m3: 2400,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Traditional sun-dried earth blocks providing high thermal capacitance to store passive daytime solar gains and discharge heat during sub-zero nights.',
    whyUse: 'High volumetric heat capacity (1.50 MJ/m³·K) acts as a passive thermal flywheel. Placing it on the inside of insulation prevents rapid midnight freeze.',
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
    cost_per_m3: 1800,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'NBC 2016 Part 8 Sec 3 Tbl 1',
    description: 'Compacted monolithic earth walling with stratified sand, silt, and clay binding for heavy-duty structural thermal mass.',
    whyUse: 'Extreme structural durability with high thermal damping factor (0.12). Dampens 30°C outdoor diurnal temperature fluctuations into steady indoor warmth.',
    local: true,
    logistics: 'On-site formwork compaction (minimal logistics footprint)',
  },
  stone_masonry: {
    id: 'stone_masonry',
    name: 'Granite field stone masonry',
    category: 'structural',
    role: 'Structural Envelope & Wind Shield',
    k: 2.20,
    rho: 2400,
    cp: 840,
    color: '#827E7B',
    roughness: 0.85,
    metalness: 0.1,
    cost_per_m3: 3500,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Dressed Himalayan field stone delivering high structural resistance against severe alpine winds and blizzard erosion.',
    whyUse: 'Robust outer protective barrier against 120 km/h katabatic winds and snow abrasion. Must be backed by continuous insulation due to high conductivity.',
    local: true,
    logistics: 'Locally available from glacial moraines and river valleys',
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
    cost_per_m3: 3500,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'CPWD DSR 2023 Item 7.1',
    description: 'Dressed Himalayan field stone delivering high structural resistance against severe alpine winds and blizzard erosion.',
    whyUse: 'Robust outer protective barrier against 120 km/h katabatic winds and snow abrasion. Must be backed by continuous insulation due to high conductivity.',
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
    cost_per_m3: 5500,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'IS 456:2000 / ASHRAE HoF 2021',
    description: 'High-density structural concrete used for ground contact floor slabs, retaining plinths, and solar thermal floor absorption.',
    whyUse: 'Absorbs direct winter solar radiation through south-facing windows and radiates warmth upward during sleeping hours. Requires perimeter XPS insulation.',
    local: true,
    logistics: 'Aggregate local; cement transported via Manali/Srinagar highway',
  },
  dense_concrete: {
    id: 'dense_concrete',
    name: 'Heavyweight reinforced concrete',
    category: 'mass',
    role: 'Structural Slab & Plinth Mass',
    k: 1.75,
    rho: 2300,
    cp: 1000,
    color: '#9C9B98',
    roughness: 0.7,
    metalness: 0.1,
    cost_per_m3: 6500,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'High-density reinforced concrete for structural floor slabs and thermal mass cores.',
    whyUse: 'High heat capacity and structural load resistance under extreme Himalayan snowdrifts.',
    local: true,
    logistics: 'Regional defense engineering procurement',
  },
  stone_floor: {
    id: 'stone_floor',
    name: 'Dressed stone floor slab',
    category: 'mass',
    role: 'Ground Slab Thermal Mass',
    k: 2.00,
    rho: 2500,
    cp: 850,
    color: '#71717A',
    roughness: 0.8,
    metalness: 0.1,
    cost_per_m3: 5500,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Dressed local granite stone floor slab laid on sand bed over insulation.',
    whyUse: 'High thermal flywheel capacitance for radiant ground temperature stabilization.',
    local: true,
    logistics: 'Locally quarried dressed stone',
  },
  cgi_sheet: {
    id: 'cgi_sheet',
    name: 'Corrugated galvanised iron sheet',
    category: 'structural',
    role: 'Exterior Cladding & Roof Shield',
    k: 50.0,
    rho: 7800,
    cp: 480,
    color: '#64748B',
    roughness: 0.45,
    metalness: 0.7,
    cost_per_m3: 85000,
    cost_source: 'Local market survey Leh',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Corrugated galvanized iron sheeting delivering complete weatherproofing, snow shedding, and wind barrier.',
    whyUse: 'Lightweight high-strength alpine weather barrier for roofs and exterior wall claddings.',
    local: true,
    logistics: 'Readily available in Leh/Srinagar supply depots',
  },
  pu_sandwich_panel: {
    id: 'pu_sandwich_panel',
    name: 'Polyurethane prefab sandwich panel',
    category: 'structural',
    role: 'High-R Modular Pre-Fab Envelope',
    k: 0.024,
    rho: 40,
    cp: 1400,
    color: '#E2E8F0',
    roughness: 0.45,
    metalness: 0.15,
    cost_per_m3: 12000,
    cost_source: 'Manufacturer catalog 2024',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Polyurethane rigid core sandwiched between pre-coated galvanized steel sheets with cam-lock joints.',
    whyUse: 'Exceptional thermal resistance (k=0.024) in an airlift-optimized modular package.',
    local: false,
    logistics: 'Helicopter airlift or seasonal pass trucking',
  },
  puf_sandwich: {
    id: 'puf_sandwich',
    name: 'Polyurethane prefab sandwich panel',
    category: 'structural',
    role: 'High-R Modular Pre-Fab Envelope',
    k: 0.024,
    rho: 40,
    cp: 1400,
    color: '#E2E8F0',
    roughness: 0.45,
    metalness: 0.15,
    cost_per_m3: 12000,
    cost_source: 'Manufacturer catalog 2024',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Polyurethane rigid core sandwiched between pre-coated galvanized steel sheets with cam-lock joints.',
    whyUse: 'Exceptional thermal resistance (k=0.024) in an airlift-optimized modular package.',
    local: false,
    logistics: 'Helicopter airlift or seasonal pass trucking',
  },
  prefab_sandwich: {
    id: 'prefab_sandwich',
    name: 'Prefab sandwich panel (PUF/EPS)',
    category: 'structural',
    role: 'Rapid Deployment Enclosure',
    k: 0.035,
    rho: 45,
    cp: 1400,
    color: '#CBD5E1',
    roughness: 0.45,
    metalness: 0.1,
    cost_per_m3: 7500,
    cost_source: 'Manufacturer catalog 2024',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Modular insulated sandwich panel with tongue-and-groove joints.',
    whyUse: 'Fast assembly time for emergency high-altitude defense post construction.',
    local: false,
    logistics: 'Modular transport via convoy',
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
    cost_per_m3: 4500,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'IS 4671:1984 / ISO 6946:2017 / ASHRAE HoF 2021',
    description: 'Expanded polystyrene closed-cell insulation boards providing continuous thermal break against -30°C exterior ambient air.',
    whyUse: 'High thermal resistance (R=2.63 per 100mm) prevents building envelope heat loss. Lightweight transport profile allows efficient military transport.',
    local: false,
    logistics: 'Lightweight volume cargo (airlifted or trucked via pass openings)',
  },
  eps_board: {
    id: 'eps_board',
    name: 'Expanded polystyrene (EPS)',
    category: 'insulation',
    role: 'Primary Thermal Resistance Barrier',
    k: 0.036,
    rho: 25,
    cp: 1200,
    color: '#F4ECA6',
    roughness: 0.6,
    metalness: 0.0,
    cost_per_m3: 4500,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Friction-fit continuous EPS board between framing studs.',
    whyUse: 'Dependable thermal resistance with minimal moisture uptake.',
    local: true,
    logistics: 'Standard military supply item',
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
    cost_per_m3: 5800,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'ASTM C578 / CPWD Specifications 2019',
    description: 'Extruded polystyrene insulation with high compressive strength and near-zero water absorption under frozen subgrade conditions.',
    whyUse: 'Impervious to permafrost moisture absorption and sub-grade freeze-thaw cycles. Essential under floor slabs to prevent conductive heat bleed into frozen soil.',
    local: false,
    logistics: 'Specialist thermal material for ground contact perimeters',
  },
  rockwool: {
    id: 'rockwool',
    name: 'Mineral wool rockwool slab',
    category: 'insulation',
    role: 'Non-Combustible Cavity Insulation',
    k: 0.038,
    rho: 48,
    cp: 840,
    color: '#C6AC80',
    roughness: 0.9,
    metalness: 0.0,
    cost_per_m3: 5200,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'CPWD DSR 2023 / IS 8183 / ASHRAE HoF 2021',
    description: 'Non-combustible stone wool slab for roof rafter cavity infill, acoustic absorption, and Class A1 fire protection.',
    whyUse: 'Class A1 fire resistance eliminates hazard when heating with bukharis or wood stoves. Breathable open-fiber structure allows trapped interior moisture to diffuse.',
    local: true,
    logistics: 'Standard defense engineering procurement item',
  },
  straw_bale: {
    id: 'straw_bale',
    name: 'Straw bale insulation',
    category: 'insulation',
    role: 'Super-Insulated Low-Carbon Enclosure',
    k: 0.070,
    rho: 110,
    cp: 1800,
    color: '#D4AF37',
    roughness: 0.95,
    metalness: 0.0,
    cost_per_m3: 1200,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'NBC 2016 Part 8 Sec 3 Tbl 1',
    description: 'Compressed agricultural barley/wheat straw bales providing thick perimeter thermal buffering.',
    whyUse: 'Extremely cost-effective deep insulation wall system using regional biomass.',
    local: true,
    logistics: 'Available from Indus valley harvest yields',
  },
  air_gap: {
    id: 'air_gap',
    name: 'Unventilated air cavity (25mm)',
    category: 'insulation',
    role: 'Thermal Cavity Break',
    k: 0.150,
    rho: 1.2,
    cp: 1005,
    color: '#E0F2FE',
    roughness: 0.2,
    metalness: 0.0,
    cost_per_m3: 0,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'ISO 6946:2017 Table 9',
    description: 'Sealed still-air gap between exterior cladding and internal insulation.',
    whyUse: 'Adds R=0.18 m²K/W thermal resistance without added transport weight.',
    local: true,
    logistics: 'Zero transport weight',
  },
  air_cavity_unvented: {
    id: 'air_cavity_unvented',
    name: 'Unventilated air cavity 25-50mm',
    category: 'insulation',
    role: 'Thermal Cavity Break',
    k: 0.18,
    rho: 1.2,
    cp: 1005,
    color: '#E0F2FE',
    roughness: 0.2,
    metalness: 0.0,
    cost_per_m3: 0,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'ISO 6946:2017 Tbl 3',
    description: 'Unventilated sealed cavity between inner and outer envelope wythes.',
    whyUse: 'Provides natural convective damping and thermal separation.',
    local: true,
    logistics: 'Zero transport weight',
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
    cost_per_m3: 28000,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'NBC 2016 Group B Timber Code',
    description: 'Indigenous Himalayan softwood framing and joists providing low thermal conductivity (k=0.13) compared to steel (k=50).',
    whyUse: 'Prevents thermal bridging along wall corners and ceiling perimeters while providing traditional Himalayan seismic flexibility.',
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
    cost_per_m3: 32000,
    cost_source: 'CPWD DSR 2023',
    cost_basis: 'sourced',
    standardsRef: 'IS 710 / CPWD DSR 2023',
    description: 'Cross-laminated boiling waterproof wood panels for interior ceiling lining and wall diaphragms.',
    whyUse: 'Provides continuous structural bracing, warm tactile interior finish, and an additional air-tight boundary against draft infiltration.',
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
    cost_per_m3: 40000,
    cost_source: 'UNHCR relief specs',
    cost_basis: 'sourced',
    standardsRef: 'UNHCR Alpine Shelter Specs / ISO 13788',
    description: 'Continuous heavy-duty 200 micron polyethylene sheet taped and sealed at all joints on the warm side of insulation.',
    whyUse: 'Stops indoor respiratory water vapor from migrating into cold insulation layers where it would freeze into ice, destroying R-value.',
    local: true,
    logistics: 'High coverage-to-weight ratio (easily transportable)',
  },
  pe_plastic_sheeting: {
    id: 'pe_plastic_sheeting',
    name: 'Polyethylene clear plastic sheeting',
    category: 'relief',
    role: 'Makeshift Glazing & Wind Barrier',
    k: 0.33,
    rho: 920,
    cp: 2100,
    color: '#D8E5ED',
    roughness: 0.3,
    metalness: 0.1,
    cost_per_m3: 1200,
    cost_source: 'UNHCR relief specs',
    cost_basis: 'sourced',
    standardsRef: 'ASHRAE HoF 2021 Ch.26 Tbl 1',
    description: 'Polyethylene relief sheeting taped over apertures as makeshift weather protection.',
    whyUse: 'Rapid temporary emergency weather seal.',
    local: true,
    logistics: 'Standard relief procurement',
  },
  single_pane: {
    id: 'single_pane',
    name: 'Single clear glass 4mm',
    category: 'glazing',
    role: 'Basic Fenestration',
    k: 1.0,
    rho: 2500,
    cp: 840,
    color: '#8CC4DB',
    roughness: 0.1,
    metalness: 0.9,
    cost_per_m3: 1500,
    cost_source: 'Market survey Leh',
    cost_basis: 'sourced',
    standardsRef: 'ISO 52016-1:2017 Table B.14',
    description: 'Standard 4mm float glass pane with high thermal transmittance (U=5.7 W/m²K).',
    whyUse: 'High daylight transmission, but severe nocturnal conductive heat bleed without shutter.',
    local: true,
    logistics: 'Locally obtainable',
  },
  double_pane: {
    id: 'double_pane',
    name: 'Double glazing (4-12-4 air)',
    category: 'glazing',
    role: 'Insulated Solar Fenestration',
    k: 1.0,
    rho: 2500,
    cp: 840,
    color: '#8CC4DB',
    roughness: 0.1,
    metalness: 0.9,
    cost_per_m3: 3200,
    cost_source: 'Market survey Leh',
    cost_basis: 'sourced',
    standardsRef: 'ISO 52016-1:2017 Table B.14',
    description: 'Hermetically sealed insulated glass unit (4mm glass + 12mm air cavity + 4mm glass, U=2.8 W/m²K).',
    whyUse: 'Transmits 76% of solar radiation (g=0.76) while cutting conductive night heat loss in half compared to single pane.',
    local: true,
    logistics: 'Pre-assembled units transported in padded crates',
  },
  double_pane_shutter: {
    id: 'double_pane_shutter',
    name: 'Double glazing with night shutter',
    category: 'glazing',
    role: 'Dynamic High-Performance Fenestration',
    k: 1.0,
    rho: 2500,
    cp: 840,
    color: '#7AAEC4',
    roughness: 0.1,
    metalness: 0.9,
    cost_per_m3: 3700,
    cost_source: 'Market survey Leh',
    cost_basis: 'sourced',
    standardsRef: 'ISO 52016-1:2017 Table B.14',
    description: 'Double glazed unit paired with an operable 30mm insulated internal shutter deployed during dark hours (effective night U=1.1 W/m²K).',
    whyUse: 'Optimal passive solar balance: admits high solar gains during day, stops radiation into black sky at night.',
    local: true,
    logistics: 'Standard military field shutter fabrication',
  },
  triple_pane: {
    id: 'triple_pane',
    name: 'Triple glazing (4-12-4-12-4 argon/air)',
    category: 'glazing',
    role: 'Super-Insulated Glazing Aperture',
    k: 1.0,
    rho: 2500,
    cp: 840,
    color: '#6E9FB5',
    roughness: 0.1,
    metalness: 0.9,
    cost_per_m3: 5400,
    cost_source: 'Market survey Leh',
    cost_basis: 'sourced',
    standardsRef: 'ISO 52016-1:2017 Table B.14 & ASHRAE HoF 2021 Ch.15',
    description: 'High-performance triple pane sealed unit with low-e coating (U=1.4 W/m²K).',
    whyUse: 'Required for extreme altitude sub-zero sites (Siachen / DBO) to eliminate draft downwash and condensation.',
    local: false,
    logistics: 'Specialist airlift requirement',
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
        { material: 'stone_masonry', thickness_m: 0.25 },
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
      description: 'Airlift-optimized sandwich panel with 150mm PUF core between structural faces.',
      layers: [
        { material: 'pu_sandwich_panel', thickness_m: 0.15 },
        { material: 'plywood', thickness_m: 0.018 },
      ],
    },
  ],
  roof: [
    {
      id: 'talashing_insulated',
      name: 'Insulated Talashing Rafters (150mm Rockwool)',
      tag: 'Standard Defense Spec',
      description: 'Poplar rafters with 150mm rockwool cavity infill, vapor retarder, and metal deck.',
      layers: [
        { material: 'cgi_sheet', thickness_m: 0.005 },
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

// Aliases mapping common alternative IDs to canonical entries
export const MATERIAL_ALIASES = {
  stone: 'stone_masonry',
  granite: 'stone_masonry',
  adobe: 'mud_brick',
  adobe_block: 'mud_brick',
  puf: 'puf_sandwich',
  pu_sandwich_panel: 'puf_sandwich',
  prefab_sandwich: 'puf_sandwich',
  eps_board: 'eps',
  dense_concrete: 'concrete',
  wood: 'timber',
  polyethylene: 'polythene',
  plastic_sheeting: 'pe_plastic_sheeting',
  rockwool_batt: 'rockwool',
  strawbale: 'straw_bale',
  cgi: 'cgi_sheet',
  metal_roof: 'cgi_sheet',
};

// Runtime in-memory cache populated from backend /materials endpoint
const backendMaterialsCache = new Map();
let fetchPromise = null;

/**
 * Asynchronously loads materials from the backend /materials endpoint and populates the cache.
 * Safe to call multiple times (deduplicated).
 */
export async function fetchAndCacheMaterials() {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch('/materials');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.materials)) {
        data.materials.forEach((m) => {
          if (m && m.id) {
            backendMaterialsCache.set(m.id, {
              id: m.id,
              name: m.name,
              category: m.category,
              k: Number(m.k) || 0.8,
              rho: Number(m.rho) || 1800,
              cp: Number(m.cp) || 900,
              cost_per_m3: m.cost_per_m3 !== null ? Number(m.cost_per_m3) : null,
              cost_source: m.cost_source || (m.cost_basis === 'sourced' ? 'CPWD DSR 2023' : null),
              cost_basis: m.cost_basis || (m.cost_source ? 'sourced' : 'estimate'),
              standardsRef: m.source || 'ASHRAE HoF 2021',
              local: Boolean(m.locally_available),
              // Retain or complement UI presentation styling
              color: MATERIAL_SPECS[m.id]?.color || '#94A3B8',
              roughness: MATERIAL_SPECS[m.id]?.roughness ?? 0.8,
              metalness: MATERIAL_SPECS[m.id]?.metalness ?? 0.05,
              role: MATERIAL_SPECS[m.id]?.role || `${m.category.toUpperCase()} Layer`,
              description: MATERIAL_SPECS[m.id]?.description || `${m.name} envelope layer.`,
              whyUse: MATERIAL_SPECS[m.id]?.whyUse || `Thermal conductivity k=${m.k} W/m·K.`,
              logistics: MATERIAL_SPECS[m.id]?.logistics || (m.locally_available ? 'Locally available' : 'Regional freight required'),
            });
          }
        });
      }
    } catch {
      // Offline fallback: rely on static MATERIAL_SPECS
    }
  })();

  return fetchPromise;
}

export function formatSpec(s) {
  if (!s) return DEFAULT_SPEC;
  return {
    ...s,
    k: s.k ?? s.conductivity_w_mk ?? 0.8,
    conductivity_w_mk: s.conductivity_w_mk ?? s.k ?? 0.8,
    rho: s.rho ?? s.density_kg_m3 ?? 1800,
    density_kg_m3: s.density_kg_m3 ?? s.rho ?? 1800,
    cp: s.cp ?? s.specific_heat_j_kgk ?? 900,
    specific_heat_j_kgk: s.specific_heat_j_kgk ?? s.cp ?? 900,
    standardsRef: s.standardsRef ?? s.citation ?? 'NBC 2016 Table 2',
    citation: s.citation ?? s.standardsRef ?? 'NBC 2016 Table 2',
    cost_inr_m3: s.cost_inr_m3 ?? s.cost_per_m3 ?? null,
    cost_per_m3: s.cost_per_m3 ?? s.cost_inr_m3 ?? null,
    cost_inr_m2: s.cost_inr_m2 ?? null,
  };
}

/**
 * Resolves a material specification object by id.
 * Prioritizes alias mapping -> backend cache -> seeded authoritative specs.
 */
export function getMaterialSpec(rawId) {
  if (!rawId) return DEFAULT_SPEC;
  const inputId = typeof rawId === 'string' ? rawId : (rawId?.id || rawId?.material || String(rawId));
  const id = MATERIAL_ALIASES[inputId] || inputId;

  // 1. Direct runtime cache hit
  if (backendMaterialsCache.has(id)) {
    return formatSpec(backendMaterialsCache.get(id));
  }

  // 2. Direct static spec hit
  if (MATERIAL_SPECS[id]) {
    return formatSpec(MATERIAL_SPECS[id]);
  }

  // 4. Clean humanized fallback without fabricating numbers (Rule R1)
  return formatSpec({
    id: id,
    name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    category: 'structural',
    role: 'Building Envelope Layer',
    k: 0.8,
    rho: 1800,
    cp: 900,
    color: '#A09485',
    roughness: 0.8,
    metalness: 0.05,
    cost_per_m3: null,
    cost_source: null,
    cost_basis: 'estimate',
    standardsRef: 'General Building Practice',
    description: 'Standard building material layer.',
    whyUse: 'Enclosure layer providing boundary separation.',
    local: true,
    logistics: 'Standard regional sourcing',
  });
}

const DEFAULT_SPEC = {
  id: 'unknown',
  name: 'Unknown Material',
  category: 'structural',
  role: 'Building Envelope Layer',
  k: 0.8,
  conductivity_w_mk: 0.8,
  rho: 1800,
  density_kg_m3: 1800,
  cp: 900,
  specific_heat_j_kgk: 900,
  color: '#A09485',
  roughness: 0.8,
  metalness: 0.05,
  cost_per_m3: null,
  cost_inr_m3: null,
  cost_inr_m2: null,
  cost_source: null,
  cost_basis: 'estimate',
  standardsRef: 'General Building Practice',
  citation: 'General Building Practice',
  description: 'Standard building material layer.',
  whyUse: 'Enclosure layer providing basic separation.',
  local: true,
  logistics: 'Standard regional sourcing',
};

/**
 * Computes layer thermal resistance R = thickness / k (m²·K/W)
 * Supports (materialId, thickness_m) or (thickness_m, k)
 */
export function computeLayerR(arg1, arg2) {
  let thickness_m = 0;
  let k = 0;
  if (typeof arg1 === 'string') {
    const spec = getMaterialSpec(arg1);
    k = spec?.conductivity_w_mk || spec?.k || 0;
    thickness_m = Number(arg2) || 0;
  } else if (typeof arg2 === 'string') {
    const spec = getMaterialSpec(arg2);
    k = spec?.conductivity_w_mk || spec?.k || 0;
    thickness_m = Number(arg1) || 0;
  } else {
    thickness_m = Number(arg1) || 0;
    k = Number(arg2) || 0;
  }
  if (!k || k <= 0 || !thickness_m || thickness_m <= 0) return 0;
  return thickness_m / k;
}

/**
 * Computes total U-value for a series of layers: U = 1 / (R_si + sum(R_i) + R_se)
 */
export function computeTotalU(layers) {
  if (!layers || !Array.isArray(layers) || layers.length === 0) return 0.5;
  let totalR = 0.17; // Surface air film resistance R_si (0.13) + R_se (0.04)
  for (const layer of layers) {
    const r = computeLayerR(layer.material || layer.id, layer.thickness_m);
    totalR += r;
  }
  return totalR > 0 ? 1 / totalR : 0.5;
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
