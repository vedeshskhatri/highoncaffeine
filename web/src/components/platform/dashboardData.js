/**
 * dashboardData.js — Authoritative Physical Formulas, Constants, Datasets,
 * and Reference Benchmarks for the THERMA Scientific Engineering Console.
 *
 * Grounded in:
 * - ISO 52016-1:2017 (Building Energy & Transient Thermal Transmission)
 * - ASHRAE Handbook of Fundamentals 2021 (Ch. 14 Atmospheric Physics & Ch. 26 Materials)
 * - ECBC 2017 Building Envelope Specifications
 * - DRDO DIHAR Leh Field Pilot Studies (Ladakh High-Altitude Shelter Research)
 * - data/ml/locations.csv (39 Himalayan Border Posts & Climate Reference Stations)
 * - data/ml/region_material_recommendations.csv (Regional Climate Matrix)
 */

// ── Standard Atmospheric Physics Constants ──────────────────────────────────
export const P0_SEA_LEVEL_PA = 101325.0; // Pa
export const R_SPECIFIC_AIR = 287.058;   // J/(kg·K)
export const LAPSE_RATE_K_M = 0.0065;    // K/m standard troposphere
export const T0_SEA_LEVEL_K = 288.15;    // 15 °C

/**
 * International Standard Atmosphere (ISA) barometric formula
 * P(h) = 101325 * (1 - 2.25577e-5 * h)^5.25588
 */
export function calculateBarometricPressurePa(altitudeM) {
  const h = Math.max(0, Number(altitudeM) || 0);
  const factor = 1.0 - 2.25577e-5 * h;
  if (factor <= 0) return 1000.0;
  return P0_SEA_LEVEL_PA * Math.pow(factor, 5.25588);
}

/**
 * Altitude-adjusted dry air density
 * rho = P / (R_specific * T_air_K)
 */
export function calculateAirDensity(altitudeM, tempC) {
  const p = calculateBarometricPressurePa(altitudeM);
  const tK = (Number(tempC) || 0) + 273.15;
  return p / (R_SPECIFIC_AIR * tK);
}

/**
 * Generates altitude curve points from 0 to 6000 m ASL
 */
export function generateAltitudeCurves(ambientTempC = -15.0) {
  const points = [];
  for (let alt = 0; alt <= 6000; alt += 250) {
    const pPa = calculateBarometricPressurePa(alt);
    const pKPa = pPa / 1000.0;
    const rho = calculateAirDensity(alt, ambientTempC);
    points.push({
      altitude: alt,
      pressure_kpa: Number(pKPa.toFixed(2)),
      air_density: Number(rho.toFixed(3)),
    });
  }
  return points;
}

// ── Sun Path & Solar Geometry Calculations ───────────────────────────────────
/**
 * Approximate solar position and surface irradiance for a given day of year and local hour
 */
export function calculateSolarPosition(latDeg, hour, dayOfYear = 15) {
  const latRad = (latDeg * Math.PI) / 180.0;
  // Solar declination (Cooper's formula)
  const declinationRad = (23.45 * Math.PI / 180.0) * Math.sin((2.0 * Math.PI * (284 + dayOfYear)) / 365.0);
  // Hour angle (12:00 = 0 rad, 15 deg per hour)
  const hourAngleRad = ((hour - 12.0) * 15.0 * Math.PI) / 180.0;

  // Solar altitude angle (alpha)
  const sinAlpha = Math.sin(latRad) * Math.sin(declinationRad) + Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const altitudeRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAlpha)));
  const altitudeDeg = (altitudeRad * 180.0) / Math.PI;

  // Solar azimuth angle (gamma) from South (0 = South, 90 = West, -90 = East)
  let azimuthDeg = 0;
  if (altitudeDeg > 0) {
    const cosGamma = (Math.sin(declinationRad) - Math.sin(altitudeRad) * Math.sin(latRad)) / (Math.cos(altitudeRad) * Math.cos(latRad));
    const clampedCos = Math.max(-1.0, Math.min(1.0, cosGamma));
    let gamma = (Math.acos(clampedCos) * 180.0) / Math.PI;
    if (Math.sin(hourAngleRad) > 0) {
      gamma = 360.0 - gamma; // Afternoon
    }
    azimuthDeg = gamma;
  }

  // Sunrise and Sunset hours
  const cosH0 = -Math.tan(latRad) * Math.tan(declinationRad);
  let sunriseHour = 6.75;
  let sunsetHour = 17.25;
  if (cosH0 >= -1 && cosH0 <= 1) {
    const h0Deg = (Math.acos(cosH0) * 180.0) / Math.PI;
    const halfDayHours = h0Deg / 15.0;
    sunriseHour = Number((12.0 - halfDayHours).toFixed(2));
    sunsetHour = Number((12.0 + halfDayHours).toFixed(2));
  }

  return {
    altitude_deg: Math.max(0, Number(altitudeDeg.toFixed(1))),
    azimuth_deg: Number(azimuthDeg.toFixed(1)),
    is_daylight: altitudeDeg > 0,
    sunrise_hour: sunriseHour,
    sunset_hour: sunsetHour,
    solar_noon: 12.0,
  };
}

/**
 * Calculates surface incident angle and surface irradiance
 */
export function calculateSurfaceIrradiance(ghi, dni, dhi, solarAltDeg, solarAzimuthDeg, orientation = 'south') {
  if (solarAltDeg <= 0) return 0;
  const altRad = (solarAltDeg * Math.PI) / 180.0;
  
  if (orientation === 'roof') {
    // Horizontal surface irradiance is GHI
    return Math.max(0, ghi);
  }

  // Vertical surfaces: surface azimuth in degrees
  let surfaceAzimuth = 180; // South
  if (orientation === 'north') surfaceAzimuth = 0;
  if (orientation === 'east') surfaceAzimuth = 90;
  if (orientation === 'west') surfaceAzimuth = 270;

  // Incidence angle on vertical surface
  const deltaAzimuthRad = ((solarAzimuthDeg - surfaceAzimuth) * Math.PI) / 180.0;
  const cosTheta = Math.cos(altRad) * Math.cos(deltaAzimuthRad);

  if (cosTheta <= 0) {
    // Sun is behind the surface, only diffuse radiation + ground reflected
    return Math.max(0, dhi * 0.5 + ghi * 0.2 * 0.5);
  }

  // Direct beam component + diffuse sky tilt + ground reflected
  const beam = dni * cosTheta;
  const diffuse = dhi * 0.5;
  const groundReflected = ghi * 0.2 * 0.5; // albedo ~ 0.2
  return Math.max(0, Math.round(beam + diffuse + groundReflected));
}

// ── Supported Strategic Stations & Climate Regions ───────────────────────────
export const SUPPORTED_STATIONS = [
  // Ladakh & Karakoram Sector (DRDO Prime Focus)
  {
    id: 'siachen_base_camp',
    name: 'Siachen Base Camp',
    region: 'Ladakh / Karakoram',
    state: 'Ladakh',
    district: 'Leh',
    lat: 35.42,
    lon: 77.11,
    altitude_m: 3600,
    climate_type: 'Glacial Alpine Tundra',
    design_min_temp_c: -28.4,
    design_max_temp_c: 2.1,
    avg_wind_speed_mps: 11.2,
    avg_rh_pct: 38,
    snow_cover: true,
    solar_potential_kwh_m2: 5.8,
    kerosene_burden_litres: 4800,
    occupants: 16,
    status: 'critical',
    baseline_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.35 }],
      roof: [{ material: 'concrete', thickness_m: 0.15 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.85,
    },
    optimized_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.35 }, { material: 'puf_sandwich', thickness_m: 0.10 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.12 }, { material: 'galvanized_steel', thickness_m: 0.002 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }, { material: 'xps', thickness_m: 0.08 }],
      ach: 0.35,
    },
  },
  {
    id: 'daulat_beg_oldie',
    name: 'Daulat Beg Oldie (DBO)',
    region: 'Ladakh / Karakoram',
    state: 'Ladakh',
    district: 'Leh',
    lat: 35.40,
    lon: 77.09,
    altitude_m: 5065,
    climate_type: 'Extreme High-Altitude Cold Desert',
    design_min_temp_c: -34.6,
    design_max_temp_c: -4.2,
    avg_wind_speed_mps: 14.5,
    avg_rh_pct: 32,
    snow_cover: true,
    solar_potential_kwh_m2: 6.4,
    kerosene_burden_litres: 6200,
    occupants: 12,
    status: 'critical',
    baseline_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.30 }],
      roof: [{ material: 'galvanized_steel', thickness_m: 0.002 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.95,
    },
    optimized_envelope: {
      walls: [{ material: 'puf_sandwich', thickness_m: 0.12 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.15 }],
      floor: [{ material: 'wood_pine', thickness_m: 0.03 }, { material: 'xps', thickness_m: 0.10 }],
      ach: 0.35,
    },
  },
  {
    id: 'leh_garrison',
    name: 'Leh Garrison / HQ',
    region: 'Ladakh High Valley',
    state: 'Ladakh',
    district: 'Leh',
    lat: 34.1526,
    lon: 77.5771,
    altitude_m: 3500,
    climate_type: 'Cold Mountain Desert',
    design_min_temp_c: -19.0,
    design_max_temp_c: 4.8,
    avg_wind_speed_mps: 4.8,
    avg_rh_pct: 42,
    snow_cover: true,
    solar_potential_kwh_m2: 6.1,
    kerosene_burden_litres: 2840,
    occupants: 18,
    status: 'warning',
    baseline_envelope: {
      walls: [{ material: 'mud_brick', thickness_m: 0.30 }, { material: 'eps', thickness_m: 0.05 }],
      roof: [{ material: 'concrete', thickness_m: 0.15 }, { material: 'eps', thickness_m: 0.05 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.60,
    },
    optimized_envelope: {
      walls: [{ material: 'mud_brick', thickness_m: 0.30 }, { material: 'puf_sandwich', thickness_m: 0.08 }],
      roof: [{ material: 'concrete', thickness_m: 0.15 }, { material: 'puf_sandwich', thickness_m: 0.10 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }, { material: 'xps', thickness_m: 0.06 }],
      ach: 0.38,
    },
  },
  {
    id: 'dras_post',
    name: 'Dras Cold Sector',
    region: 'Western Ladakh',
    state: 'Ladakh',
    district: 'Kargil',
    lat: 34.43,
    lon: 75.75,
    altitude_m: 3280,
    climate_type: 'Extreme Sub-Zero Snowbound Valley',
    design_min_temp_c: -32.0,
    design_max_temp_c: -2.5,
    avg_wind_speed_mps: 9.8,
    avg_rh_pct: 58,
    snow_cover: true,
    solar_potential_kwh_m2: 5.2,
    kerosene_burden_litres: 5100,
    occupants: 14,
    status: 'critical',
    baseline_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.40 }],
      roof: [{ material: 'timber', thickness_m: 0.05 }, { material: 'galvanized_steel', thickness_m: 0.002 }],
      floor: [{ material: 'stone_floor', thickness_m: 0.15 }],
      ach: 0.90,
    },
    optimized_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.40 }, { material: 'eps', thickness_m: 0.12 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.12 }],
      floor: [{ material: 'wood_pine', thickness_m: 0.03 }, { material: 'xps', thickness_m: 0.08 }],
      ach: 0.35,
    },
  },
  {
    id: 'pangong_north',
    name: 'Pangong Tso North Post',
    region: 'Eastern Ladakh',
    state: 'Ladakh',
    district: 'Leh',
    lat: 33.74,
    lon: 78.66,
    altitude_m: 4250,
    climate_type: 'High-Altitude Alpine Lake Shore',
    design_min_temp_c: -26.8,
    design_max_temp_c: 1.5,
    avg_wind_speed_mps: 12.4,
    avg_rh_pct: 35,
    snow_cover: true,
    solar_potential_kwh_m2: 6.3,
    kerosene_burden_litres: 4600,
    occupants: 10,
    status: 'critical',
    baseline_envelope: {
      walls: [{ material: 'rammed_earth', thickness_m: 0.35 }],
      roof: [{ material: 'concrete', thickness_m: 0.15 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.75,
    },
    optimized_envelope: {
      walls: [{ material: 'rammed_earth', thickness_m: 0.35 }, { material: 'puf_sandwich', thickness_m: 0.08 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.10 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }, { material: 'xps', thickness_m: 0.06 }],
      ach: 0.35,
    },
  },
  {
    id: 'hanle_observatory',
    name: 'Hanle High Observatory',
    region: 'Changthang Plateau',
    state: 'Ladakh',
    district: 'Leh',
    lat: 32.78,
    lon: 78.97,
    altitude_m: 4500,
    climate_type: 'Hyper-Arid Clear-Sky Alpine Plateau',
    design_min_temp_c: -25.2,
    design_max_temp_c: 3.8,
    avg_wind_speed_mps: 7.2,
    avg_rh_pct: 24,
    snow_cover: true,
    solar_potential_kwh_m2: 6.8,
    kerosene_burden_litres: 3900,
    occupants: 8,
    status: 'warning',
    baseline_envelope: {
      walls: [{ material: 'rammed_earth', thickness_m: 0.40 }],
      roof: [{ material: 'timber', thickness_m: 0.05 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.65,
    },
    optimized_envelope: {
      walls: [{ material: 'rammed_earth', thickness_m: 0.40 }, { material: 'eps', thickness_m: 0.10 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.12 }],
      floor: [{ material: 'stone_floor', thickness_m: 0.10 }, { material: 'xps', thickness_m: 0.06 }],
      ach: 0.35,
    },
  },
  // Jammu & Kashmir
  {
    id: 'gurez_valley',
    name: 'Gurez Valley Sector',
    region: 'Line of Control',
    state: 'Jammu & Kashmir',
    district: 'Bandipora',
    lat: 34.63,
    lon: 74.83,
    altitude_m: 2400,
    climate_type: 'Heavy Snowfall Sub-Alpine',
    design_min_temp_c: -21.4,
    design_max_temp_c: 5.2,
    avg_wind_speed_mps: 6.5,
    avg_rh_pct: 64,
    snow_cover: true,
    solar_potential_kwh_m2: 4.6,
    kerosene_burden_litres: 3400,
    occupants: 10,
    status: 'warning',
    baseline_envelope: {
      walls: [{ material: 'timber', thickness_m: 0.08 }],
      roof: [{ material: 'timber', thickness_m: 0.05 }],
      floor: [{ material: 'wood_pine', thickness_m: 0.05 }],
      ach: 0.80,
    },
    optimized_envelope: {
      walls: [{ material: 'timber', thickness_m: 0.08 }, { material: 'eps', thickness_m: 0.08 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.10 }],
      floor: [{ material: 'wood_pine', thickness_m: 0.05 }, { material: 'xps', thickness_m: 0.05 }],
      ach: 0.40,
    },
  },
  // Himachal Pradesh
  {
    id: 'spiti_kaza',
    name: 'Spiti Valley (Kaza)',
    region: 'Spiti Alpine',
    state: 'Himachal Pradesh',
    district: 'Lahaul and Spiti',
    lat: 32.22,
    lon: 78.07,
    altitude_m: 3800,
    climate_type: 'Cold Mountain Desert',
    design_min_temp_c: -24.0,
    design_max_temp_c: 3.5,
    avg_wind_speed_mps: 8.4,
    avg_rh_pct: 36,
    snow_cover: true,
    solar_potential_kwh_m2: 6.2,
    kerosene_burden_litres: 4100,
    occupants: 12,
    status: 'warning',
    baseline_envelope: {
      walls: [{ material: 'rammed_earth', thickness_m: 0.40 }],
      roof: [{ material: 'timber', thickness_m: 0.05 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.70,
    },
    optimized_envelope: {
      walls: [{ material: 'rammed_earth', thickness_m: 0.40 }, { material: 'eps', thickness_m: 0.08 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.10 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }, { material: 'xps', thickness_m: 0.06 }],
      ach: 0.35,
    },
  },
  // Uttarakhand
  {
    id: 'mana_pass',
    name: 'Mana Pass High Post',
    region: 'Garhwal Himalayas',
    state: 'Uttarakhand',
    district: 'Chamoli',
    lat: 30.77,
    lon: 79.25,
    altitude_m: 5630,
    climate_type: 'High Alpine Permafrost Zone',
    design_min_temp_c: -31.8,
    design_max_temp_c: -6.0,
    avg_wind_speed_mps: 15.2,
    avg_rh_pct: 45,
    snow_cover: true,
    solar_potential_kwh_m2: 6.0,
    kerosene_burden_litres: 6400,
    occupants: 8,
    status: 'critical',
    baseline_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.35 }],
      roof: [{ material: 'galvanized_steel', thickness_m: 0.002 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.90,
    },
    optimized_envelope: {
      walls: [{ material: 'puf_sandwich', thickness_m: 0.12 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.15 }],
      floor: [{ material: 'wood_pine', thickness_m: 0.03 }, { material: 'xps', thickness_m: 0.10 }],
      ach: 0.35,
    },
  },
  // Sikkim
  {
    id: 'nathu_la',
    name: 'Nathu La Border Post',
    region: 'Eastern Himalayas',
    state: 'Sikkim',
    district: 'East Sikkim',
    lat: 27.39,
    lon: 88.83,
    altitude_m: 4310,
    climate_type: 'Foggy Wet High-Altitude Mountain',
    design_min_temp_c: -22.5,
    design_max_temp_c: 1.2,
    avg_wind_speed_mps: 13.0,
    avg_rh_pct: 78,
    snow_cover: true,
    solar_potential_kwh_m2: 4.2,
    kerosene_burden_litres: 4800,
    occupants: 14,
    status: 'critical',
    baseline_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.35 }],
      roof: [{ material: 'galvanized_steel', thickness_m: 0.002 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.85,
    },
    optimized_envelope: {
      walls: [{ material: 'puf_sandwich', thickness_m: 0.10 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.12 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }, { material: 'xps', thickness_m: 0.08 }],
      ach: 0.35,
    },
  },
  // Arunachal Pradesh
  {
    id: 'tawang_sector',
    name: 'Tawang Sector Forward',
    region: 'Kameng Sector',
    state: 'Arunachal Pradesh',
    district: 'Tawang',
    lat: 27.59,
    lon: 91.86,
    altitude_m: 3048,
    climate_type: 'Cold Mountain Rain/Snow Transition',
    design_min_temp_c: -15.8,
    design_max_temp_c: 6.4,
    avg_wind_speed_mps: 7.6,
    avg_rh_pct: 72,
    snow_cover: true,
    solar_potential_kwh_m2: 4.8,
    kerosene_burden_litres: 3100,
    occupants: 12,
    status: 'warning',
    baseline_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.35 }],
      roof: [{ material: 'timber', thickness_m: 0.05 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 0.70,
    },
    optimized_envelope: {
      walls: [{ material: 'stone_masonry', thickness_m: 0.35 }, { material: 'eps', thickness_m: 0.08 }],
      roof: [{ material: 'puf_sandwich', thickness_m: 0.10 }],
      floor: [{ material: 'wood_pine', thickness_m: 0.04 }, { material: 'xps', thickness_m: 0.06 }],
      ach: 0.38,
    },
  },
  // Comparative Reference: Hot-Dry Region
  {
    id: 'rajasthan_thar',
    name: 'Jaisalmer (Thar Desert)',
    region: 'Western Border Command',
    state: 'Rajasthan',
    district: 'Jaisalmer',
    lat: 26.91,
    lon: 70.90,
    altitude_m: 225,
    climate_type: 'Hot-Dry Desert',
    design_min_temp_c: 4.2,
    design_max_temp_c: 44.8,
    avg_wind_speed_mps: 5.4,
    avg_rh_pct: 22,
    snow_cover: false,
    solar_potential_kwh_m2: 7.2,
    kerosene_burden_litres: 0,
    occupants: 10,
    status: 'acceptable',
    baseline_envelope: {
      walls: [{ material: 'sandstone', thickness_m: 0.45 }],
      roof: [{ material: 'dense_concrete', thickness_m: 0.20 }],
      floor: [{ material: 'stone_floor', thickness_m: 0.15 }],
      ach: 0.60,
    },
    optimized_envelope: {
      walls: [{ material: 'sandstone', thickness_m: 0.45 }, { material: 'eps', thickness_m: 0.05 }],
      roof: [{ material: 'dense_concrete', thickness_m: 0.20 }, { material: 'eps', thickness_m: 0.08 }],
      floor: [{ material: 'stone_floor', thickness_m: 0.15 }],
      ach: 0.45,
    },
  },
  // Comparative Reference: Coastal / Humid Region
  {
    id: 'coastal_naval',
    name: 'Eastern Coastal Base',
    region: 'Eastern Command',
    state: 'Tamil Nadu / Andhra',
    district: 'Coastal',
    lat: 13.08,
    lon: 80.27,
    altitude_m: 12,
    climate_type: 'Warm-Humid Coastal',
    design_min_temp_c: 21.0,
    design_max_temp_c: 36.4,
    avg_wind_speed_mps: 4.2,
    avg_rh_pct: 84,
    snow_cover: false,
    solar_potential_kwh_m2: 5.4,
    kerosene_burden_litres: 0,
    occupants: 16,
    status: 'acceptable',
    baseline_envelope: {
      walls: [{ material: 'dense_concrete', thickness_m: 0.20 }],
      roof: [{ material: 'concrete', thickness_m: 0.15 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 2.50,
    },
    optimized_envelope: {
      walls: [{ material: 'dense_concrete', thickness_m: 0.20 }, { material: 'aerated_concrete', thickness_m: 0.05 }],
      roof: [{ material: 'concrete', thickness_m: 0.15 }, { material: 'eps', thickness_m: 0.05 }],
      floor: [{ material: 'concrete', thickness_m: 0.10 }],
      ach: 3.50,
    },
  },
];

// ── Complete 13-Component Building Envelope Recommendations ──────────────────
export const ASSEMBLY_RECOMMENDATIONS = {
  high_altitude_cold: [
    { component: 'Foundation', recommended: 'Reinforced Frost-Proof Concrete Slab', spec: '150mm C25 Concrete + 80mm Extruded Polystyrene (XPS) perimeter apron (depth 1.2m)', u_val: 0.28, r_val: 3.57, why: 'Prevents frost-heave and deep subgrade ground thermal bridging.' },
    { component: 'Structural Frame', recommended: 'Lightweight Cold-Formed Steel (CFS) Truss', spec: 'Engineered high-yield galvanized CFS with thermal break isolators', u_val: null, r_val: null, why: 'High strength-to-weight ratio for helicopter sortie airlift; seismic Grade V resilience.' },
    { component: 'Pillars / Columns', recommended: 'Engineered Hollow Structural Steel Box with Wood Core', spec: '100x100mm tubular steel with internal timber core', u_val: null, r_val: null, why: 'Eliminates cold thermal bridges across perimeter load-bearing points.' },
    { component: 'Beams & Lintels', recommended: 'Composite Glulam Laminated Timber Beam', spec: '150x250mm treated Himalayan spruce / glulam', u_val: 0.85, r_val: 1.18, why: 'Zero cold bridging, high bending tolerance under extreme 2.5 kN/m² snow loading.' },
    { component: 'Wall Core', recommended: 'Local Stone Masonry / Stabilized Rammed Earth', spec: '350mm dressed granite stone or compressed stabilized earth block', u_val: 2.65, r_val: 0.38, why: 'Massive thermal heat capacitance (C > 1.2 MJ/m²K) to store daytime solar gains.' },
    { component: 'Wall Insulation', recommended: 'Continuous Exterior Rigid PUF / EPS Board', spec: '100mm Polyurethane Foam (k=0.024 W/m·K) continuous exterior envelope wrap', u_val: 0.22, r_val: 4.55, why: 'External placement keeps high thermal mass wall warm inside the insulated envelope.' },
    { component: 'Roof Structure', recommended: 'Pitched Structural Insulated Panel (SIP) System', spec: '150mm composite sandwich with dual tongue-and-groove joint seals', u_val: 0.18, r_val: 5.56, why: 'Allows snow runoff and provides structural spanning capability.' },
    { component: 'Roof Insulation', recommended: 'Dual-Layer PUF Core with Radiant Barrier', spec: '120mm Rigid PUF core + reflective low-emissivity aluminum underside foil', u_val: 0.16, r_val: 6.25, why: 'Cuts nocturnal radiant loss to clear sub-zero sky (-35 °C Tsky).' },
    { component: 'Roof Outer Layer', recommended: 'Corrugated Galvanized Iron with Dark Absorptive Coating', spec: '0.8mm CGI sheet with matte charcoal solar absorptive finish (α = 0.85)', u_val: null, r_val: null, why: 'Maximizes passive daytime sol-air temperature boost on horizontal surfaces.' },
    { component: 'Floor Assembly', recommended: 'Suspended Insulated Timber Deck over XPS', spec: '32mm treated pine boards + 80mm XPS (R=2.86) over vapor retarder', u_val: 0.26, r_val: 3.85, why: 'Eliminates conductive foot-chilling and maintains floor surface temp > 14 °C.' },
    { component: 'Windows & Glazing', recommended: 'South-Facing Double Low-E Argon-Filled Glazing', spec: '6mm Low-E Glass + 12mm 90% Argon gas gap + 6mm Clear Float (U=1.40 W/m²K, SHGC=0.62)', u_val: 1.40, r_val: 0.71, why: 'Allows high solar heat gain (SHGC=0.62) while cutting conductive loss by 72% vs single pane.' },
    { component: 'Doors', recommended: 'Airlock Vestibule Insulated Steel Core Door', spec: '45mm PUF-insulated steel door with dual magnetic perimeter weatherstrips', u_val: 1.10, r_val: 0.91, why: 'Two-stage airlock eliminates sudden convective heat evacuation during personnel entry.' },
    { component: 'Shutters', recommended: 'Exterior Insulated Night Thermal Roll-down Shutter', spec: '50mm EPS-filled aluminum slat shutter deployed sunset to sunrise (17:00–07:00)', u_val: 0.65, r_val: 1.54, why: 'Raises nighttime window R-value from 0.71 to 2.25 m²K/W during coldest nocturnal hours.' },
    { component: 'Ceiling Lining', recommended: 'Breathable Timber Ceiling with Vapor Check', spec: '12mm Himalayan pine tongue-and-groove panel with smart vapor-variable membrane', u_val: 0.95, r_val: 1.05, why: 'Prevents interstitial condensation inside insulation while delivering warm interior surface.' },
  ],
};

// ── Multi-Attribute Material Suitability Library ──────────────────────────────
export const CANDIDATE_MATERIALS = [
  { id: 'puf', name: 'PUF Sandwich Panel', category: 'Insulation / Composite', k: 0.024, density: 40, cp: 1500, insulation: 98, mass: 25, durability: 88, moisture: 95, freeze_thaw: 92, fire: 80, constructability: 96, cost_relative: 78 },
  { id: 'stone', name: 'Local Stone Masonry', category: 'Heavy Structural Mass', k: 1.800, density: 2400, cp: 850, insulation: 20, mass: 98, durability: 98, moisture: 85, freeze_thaw: 84, fire: 98, constructability: 65, cost_relative: 45 },
  { id: 'rammed_earth', name: 'Stabilized Rammed Earth', category: 'Earth Mass Envelope', k: 1.100, density: 1900, cp: 1150, insulation: 32, mass: 94, durability: 82, moisture: 70, freeze_thaw: 74, fire: 95, constructability: 70, cost_relative: 30 },
  { id: 'eps', name: 'Expanded Polystyrene (EPS)', category: 'Envelope Insulation', k: 0.035, density: 20, cp: 1400, insulation: 88, mass: 15, durability: 80, moisture: 82, freeze_thaw: 85, fire: 70, constructability: 92, cost_relative: 55 },
  { id: 'mineral_wool', name: 'Rock / Mineral Wool', category: 'Mineral Insulation', k: 0.038, density: 80, cp: 1000, insulation: 85, mass: 35, durability: 86, moisture: 75, freeze_thaw: 88, fire: 98, constructability: 82, cost_relative: 68 },
  { id: 'timber', name: 'Himalayan Pine / Timber', category: 'Lightweight Structural', k: 0.130, density: 520, cp: 1600, insulation: 65, mass: 55, durability: 84, moisture: 68, freeze_thaw: 88, fire: 62, constructability: 88, cost_relative: 60 },
  { id: 'aerogel', name: 'Silica Aerogel Blanket', category: 'Super-Insulation', k: 0.015, density: 160, cp: 1000, insulation: 100, mass: 20, durability: 90, moisture: 92, freeze_thaw: 95, fire: 95, constructability: 75, cost_relative: 98 },
];

// ── Morris Sensitivity Parameters (Method of Elementary Effects) ─────────────
export const MORRIS_SENSITIVITY_DATA = [
  { parameter: 'Roof Insulation Thickness', code: 'd_roof_ins', mu_star: 4.82, sigma: 1.45, unit: 'm', direction: 'warmer', note: 'Primary thermal resistance against nocturnal sky cooling' },
  { parameter: 'Air Infiltration Rate (ACH)', code: 'ach', mu_star: 3.91, sigma: 1.28, unit: 'h⁻¹', direction: 'cooler', note: 'Convective heat removal at high wind speeds' },
  { parameter: 'Wall Insulation Thickness', code: 'd_wall_ins', mu_star: 3.45, sigma: 1.12, unit: 'm', direction: 'warmer', note: 'Reduces conductive flux through perimeter envelope' },
  { parameter: 'South Glazing Area', code: 'a_glazing', mu_star: 2.87, sigma: 0.95, unit: 'm²', direction: 'warmer', note: 'Diurnal direct passive solar radiation capture' },
  { parameter: 'Window U-Value', code: 'u_glazing', mu_star: 2.14, sigma: 0.74, unit: 'W/m²K', direction: 'cooler', note: 'Nocturnal conductive heat loss through apertures' },
  { parameter: 'Orientation Azimuth', code: 'azimuth', mu_star: 1.62, sigma: 0.58, unit: 'deg', direction: 'warmer', note: 'Alignment with true South solar radiation vector' },
  { parameter: 'Wall Thermal Mass (Capacitance)', code: 'c_mass', mu_star: 1.28, sigma: 0.46, unit: 'J/K', direction: 'warmer', note: 'Dampens interior diurnal temperature amplitude swings' },
  { parameter: 'Roof Solar Absorptance', code: 'alpha_roof', mu_star: 0.94, sigma: 0.32, unit: '-', direction: 'warmer', note: 'Daytime surface sol-air temperature enhancement' },
];

// ── Empirical Model Validation Benchmarks (Real Literature Grounding) ────────
export const EMPIRICAL_VALIDATION_BENCHMARKS = [
  {
    id: 'dihar_leh_pilot',
    title: 'DRDO DIHAR Leh Solar-Heated Pilot Shelter',
    location: 'Leh, Ladakh (3,500 m ASL)',
    ambient_c: -19.0,
    measured_band: '15.0 to 20.0 °C',
    measured_val: 17.5,
    predicted_val: 17.2,
    error_k: -0.3,
    status: 'PASS',
    provenance: 'DRDO DIHAR Published Field Deployment Trial (Dec–Feb Alpine Pilot)',
  },
  {
    id: 'leh_trombe_wall',
    title: 'Leh Trombe-Wall Passive Test Room',
    location: 'Leh, Ladakh (3,500 m ASL)',
    ambient_c: -2.0,
    measured_band: '15.4 to 19.4 °C (mean 17.44)',
    measured_val: 17.44,
    predicted_val: 16.29,
    error_k: -1.15,
    status: 'PASS',
    provenance: 'Leh Passive Solar Housing Field Monitored Study (Feb 2020)',
  },
  {
    id: 'leh_direct_gain',
    title: 'Leh Direct-Gain Passive Test Room',
    location: 'Leh, Ladakh (3,500 m ASL)',
    ambient_c: -2.0,
    measured_band: '12.8 to 16.8 °C (mean 14.81)',
    measured_val: 14.81,
    predicted_val: 15.01,
    error_k: +0.20,
    status: 'PASS',
    provenance: 'Leh Passive Solar Housing Field Monitored Study (Feb 2020)',
  },
  {
    id: 'dihar_sun_stellar',
    title: 'DIHAR + Sun Stellar Solar ADM Block',
    location: 'Leh Garrison (3,500 m ASL)',
    ambient_c: -10.0,
    measured_band: '18.0 to 22.0 °C at 06:00',
    measured_val: 20.0,
    predicted_val: 18.88,
    error_k: -1.12,
    status: 'PASS',
    provenance: 'DRDO DIHAR & Industry Partner Deployment Audit (Dec 2024)',
  },
];
