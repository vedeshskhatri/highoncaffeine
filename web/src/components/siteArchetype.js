/*
 * siteArchetype.js — Regional Architectural Archetype Resolver
 *
 * Classifies sites into authentic regional architectural & climatic archetypes:
 *   - 'manali': Alpine Valley & Ridge (Himachal Pradesh) — Pitched gable roof (30° snow pitch), Kath-Kuni timber & slate masonry, Deodar pine trees.
 *   - 'leh': Cold Arid High Plateau (Ladakh) — High-mass adobe mud brick, willow twig parapet (tarka), carved timber lintels (shing-tsag), Buddhist prayer flag mast.
 *   - 'siachen': Glacial Cryosphere (Karakoram) — Aerodynamic modular pod, PUF sandwich panels, elevated moraine permafrost stilts, arctic blizzard deflectors.
 *   - 'dras': Extreme Frost Basin (-35°C Dras Sector) — Heavy granite boulder masonry, double airlock buffer vestibule, sub-zero Trombe wall matrix.
 *   - 'jaisalmer': Hot Arid Desert (Thar Region) — Golden yellow sandstone, intricately carved stone jali shading screens, desert acacia, sand dunes.
 *   - 'delhi': Composite Lowland Plain (NCR) — Exposed brick masonry, cantilevered concrete chhajja sunshades, flat accessible terrace railing.
 */

/**
 * Classify site into a regional architectural & climatic archetype
 * @param {string} activeSiteName - Name or label of the outpost/site
 * @param {Object} location - Object containing altitude_m, lat, lon
 * @returns {'manali' | 'leh' | 'siachen' | 'dras' | 'jaisalmer' | 'delhi'}
 */
export function getSiteArchetype(activeSiteName = '', location = {}) {
  const name = (activeSiteName || '').toLowerCase();
  const alt = Number(location?.altitude_m) || 0;
  const lat = Number(location?.lat) || 0;

  if (
    name.includes('manali') ||
    name.includes('himachal') ||
    name.includes('kullu') ||
    name.includes('shimla') ||
    (alt >= 1800 && alt < 2800 && lat < 33.5 && lat > 30)
  ) {
    return 'manali';
  }

  if (
    name.includes('leh') ||
    (name.includes('ladakh') && !name.includes('dras') && !name.includes('siachen'))
  ) {
    return 'leh';
  }

  if (name.includes('dras') || name.includes('kargil')) {
    return 'dras';
  }

  if (
    name.includes('jaisalmer') ||
    name.includes('rajasthan') ||
    name.includes('thar') ||
    name.includes('pokhran') ||
    name.includes('desert') ||
    (alt < 600 && lat >= 24 && lat <= 28.5 && ((Number(location?.lon) || 0) < 75 || name.includes('desert') || name.includes('arid') || (location?.lon === undefined && lat <= 27.5)))
  ) {
    return 'jaisalmer';
  }

  if (
    name.includes('delhi') ||
    name.includes('ncr') ||
    (alt < 500 && lat >= 27 && !name.includes('jaisalmer') && !name.includes('rajasthan'))
  ) {
    return 'delhi';
  }

  return 'siachen'; // Glacial default
}

/**
 * Architectural, structural, and climatic specifications for each regional archetype
 */
export const ARCHETYPE_CONFIGS = {
  manali: {
    regionTag: 'Alpine Valley & Ridge (Himachal)',
    typology: 'Gabled Alpine Timber-Laced Stone Shelter',
    roofType: 'pitched',
    pitchDeg: 30,
    roofName: 'PITCHED SLATE / METAL GABLE ROOF',
    claddingName: 'KATH-KUNI TIMBER & SLATE MASONRY',
    subGradeDesc: 'HIMACHAL BEDROCK & ALPINE BOULDER FOOTINGS',
    seismic: 'Zone V (High Seismic)',
    snowLoad: '2.5 kN/m² Heavy Snow Load',
    notes: [
      '1. PITCHED GABLE ROOF (SLOPE >= 30°) FOR CONTINUOUS SNOW SHEDDING PER IS 875.',
      '2. TRADITIONAL KATH-KUNI TIMBER CRIBBAGE SYSTEM FOR SEISMIC ZONE V DAMPING.',
      '3. DEEP EAVES OVERHANG (CHHAJJA) PROTECTS ENVELOPE FROM MONSOON DRIVEN RAIN.',
      '4. LOCAL HIMACHAL SLATE & CEDAR DEODAR WOOD INTEGRATED SPECIFICATIONS.',
    ],
  },
  leh: {
    regionTag: 'Cold Arid Desert (Ladakh Plateau)',
    typology: 'Ladakhi High-Mass Passive Solar Enclosure',
    roofType: 'flat_tarka',
    pitchDeg: 0,
    roofName: 'TRADITIONAL MUD & WILLOW CEILING (TALU)',
    claddingName: 'SUN-DRIED ADOBE MUD BRICK COURSING',
    subGradeDesc: 'LADAKH HIGH-PLATEAU GLACIO-FLUVIAL ALLUVIUM',
    seismic: 'Zone IV (Ladakh Rift)',
    snowLoad: '0.8 kN/m² Low Snowfall, High Wind',
    notes: [
      '1. HIGH VOLUMETRIC THERMAL MASS ADOBE FABRIC FOR DIURNAL HEAT RETENTION.',
      '2. TRADITIONAL WILLOW-TWIG BRUSHWOOD PARAPET (TARKA) EDGE DETAILING.',
      '3. CARVED LADAKHI TIMBER LINTELS (SHING-TSAG) DISTRIBUTE LINTEL POINT LOADS.',
      '4. EXPANDED SOUTH-FACING SOLAR GREENHOUSE / TROMBE WALL ABSORBER (IS 3792).',
    ],
  },
  dras: {
    regionTag: 'Extreme Frost Basin (-35°C Dras Sector)',
    typology: 'Sub-Zero Heavy Granite Fortress Shelter',
    roofType: 'composite_insulated',
    pitchDeg: 0,
    roofName: 'INSULATED COMPOSITE HEATED ROOF DECK',
    claddingName: 'DRESSED GRANITE BOULDER MASONRY',
    subGradeDesc: 'PERMAFROST FROZEN SUB-GRADE (FROST DEPTH > 1.8m)',
    seismic: 'Zone IV',
    snowLoad: '3.2 kN/m² Extreme Snowpack',
    notes: [
      '1. DOUBLE AIRLOCK BUFFER ENTRANCE ELIMINATES SUB-ZERO CHILL INGRESS.',
      '2. HEAVY GRANITE BOULDER MASONRY WITH CONTINUOUS 120mm EXTERIOR FOAM WRAP.',
      '3. INTEGRATED HIGH-EFFICIENCY TROMBE SOLAR AIR HEATING MATRIX.',
      '4. STRUCTURAL ANCHORS ACCOMMODATE SEVERE GLACIAL WIND BUFFETING (50 m/s).',
    ],
  },
  jaisalmer: {
    regionTag: 'Hot & Arid Desert (Thar Region)',
    typology: 'Jaisalmer Yellow Sandstone Courtyard Shelter',
    roofType: 'flat_stone_battlement',
    pitchDeg: 0,
    roofName: 'YELLOW SANDSTONE SLAB ROOF',
    claddingName: 'JAISALMER DRESSED YELLOW SANDSTONE',
    subGradeDesc: 'THAR ARID COMPACTED SAND & DUNE SUB-BASE',
    seismic: 'Zone II (Low Seismic)',
    snowLoad: '0.0 kN/m² (Zero Snowfall, High Dust Storm)',
    notes: [
      '1. INTRICATE CARVED STONE JALI SCREENS RESTRICT DIRECT SOLAR GAIN (SHGC <= 0.30).',
      '2. HIGH-CAPACITANCE GOLDEN YELLOW SANDSTONE WALLS BUFFER 45°C AMBIENT HEAT.',
      '3. COMPACT VOLUMETRIC FORM WITH MINIMAL WEST FACING APERTURES PER ECBC 2017.',
      '4. FLAT ROOF TERRACE WITH DECORATIVE STONE COPING BATTLEMENTS.',
    ],
  },
  delhi: {
    regionTag: 'Composite Lowland Plain (NCR)',
    typology: 'Brick-Concrete Frame with Shading Overhangs',
    roofType: 'flat_terrace_railing',
    pitchDeg: 0,
    roofName: 'REINFORCED CONCRETE SLAB & SCREED',
    claddingName: 'EXPOSED CLAY BRICK & PLASTER FRAME',
    subGradeDesc: 'ALLUVIAL PLAIN ENGINEERED RAFT FOOTING',
    seismic: 'Zone IV (NCR Plain)',
    snowLoad: '0.0 kN/m² (Composite Summer/Winter)',
    notes: [
      '1. CANTILEVERED RCC CHHAJJAS (0.60m) SHADE GLAZING FROM HIGH SUMMER SUN.',
      '2. CAVITY BRICK WALL ASSEMBLY REDUCES MONSOON CONDUCTION GAIN.',
      '3. CROSS-VENTILATION OPERABLE OPENINGS SATISFY NBC 2016 AIR EXCHANGE.',
      '4. WATERPROOFED FLAT TERRACE SLAB WITH ACCESSIBLE PARAPET RAILING.',
    ],
  },
  siachen: {
    regionTag: 'Glacial Cryosphere (Karakoram Frontier)',
    typology: 'Aerodynamic High-Altitude Defence Pod',
    roofType: 'aerodynamic_pod',
    pitchDeg: 0,
    roofName: 'CORRUGATED METAL DECK WITH HEAT TRACE',
    claddingName: 'COMPOSITE PUF SANDWICH CAMO ENVELOPE',
    subGradeDesc: 'PERMAFROST FROZEN SUB-GRADE (FROST DEPTH > 1.5m)',
    seismic: 'Zone IV (Karakoram Fault)',
    snowLoad: '3.5 kN/m² Heavy Moraine Drift',
    notes: [
      '1. MODULAR COMPOSITE SANDWICH PANELS ELIMINATE COLD THERMAL BRIDGING.',
      '2. ELEVATED MORAINE STILTS PREVENT SUB-GRADE PERMAFROST MELT-SETTLEMENT.',
      '3. AERODYNAMIC BLIZZARD DEFLECTION COWL WITHSTANDS 120 KM/H WINDS.',
      '4. NOCTURNAL INSULATED THERMAL SHUTTERS MANDATORY AT SUB-ZERO NIGHTS.',
    ],
  },
};
