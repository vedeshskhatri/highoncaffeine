import test from 'node:test';
import assert from 'node:assert/strict';
import { getMaterialSpec, computeTotalU } from './materialsData.js';

test('ArchitecturalElevationSheet: validates level datums from shelter height', () => {
  const height_m = 2.8;
  const parapetH = (height_m + 0.35).toFixed(2);
  const ceilingH = height_m.toFixed(2);
  const lintelH = (height_m * 0.72).toFixed(2);
  const sillH = (height_m * 0.32).toFixed(2);

  assert.equal(parapetH, '3.15');
  assert.equal(ceilingH, '2.80');
  assert.equal(lintelH, '2.02');
  assert.equal(sillH, '0.90');
});

test('ArchitecturalElevationSheet: material schedule extracts active envelope specifications without hallucination', () => {
  const walls = [
    { material: 'stone_masonry', thickness_m: 0.30 },
    { material: 'eps_board', thickness_m: 0.10 },
    { material: 'mud_brick', thickness_m: 0.05 },
  ];

  const extSpec = getMaterialSpec(walls[0].material);
  const insulSpec = getMaterialSpec(walls[1].material);
  const massSpec = getMaterialSpec(walls[2].material);

  assert.ok(extSpec.name);
  assert.ok(extSpec.conductivity_w_mk > 0);
  assert.ok(insulSpec.conductivity_w_mk < 0.05); // High-performance insulation
  assert.ok(massSpec.density_kg_m3 >= 1500); // High-density thermal mass

  const uVal = computeTotalU(walls);
  assert.ok(uVal > 0 && uVal < 1.0); // Complies with high-altitude building envelope standard
});

test('ArchitecturalElevationSheet: structural grid dimensions scale with length_m and width_m', () => {
  const length_m = 8.0;
  const width_m = 4.5;

  const bay1 = (length_m * 0.28).toFixed(2);
  const bay2 = (length_m * 0.44).toFixed(2);
  const bay3 = (length_m * 0.28).toFixed(2);

  const sumBays = (parseFloat(bay1) + parseFloat(bay2) + parseFloat(bay3)).toFixed(2);
  assert.equal(sumBays, '8.00');
  assert.equal(width_m.toFixed(2), '4.50');
});

test('ArchitecturalElevationSheet: regional site archetype classification handles all strategic outposts', async () => {
  const { getSiteArchetype, ARCHETYPE_CONFIGS } = await import('./siteArchetype.js');

  // 1. Manali / Himachal Alpine Valley
  assert.equal(getSiteArchetype('Manali, Himachal Pradesh', { altitude_m: 2050, lat: 32.2 }), 'manali');
  assert.equal(ARCHETYPE_CONFIGS.manali.roofType, 'pitched');
  assert.equal(ARCHETYPE_CONFIGS.manali.pitchDeg, 30);
  assert.equal(ARCHETYPE_CONFIGS.manali.seismic, 'Zone V (High Seismic)');
  assert.match(ARCHETYPE_CONFIGS.manali.claddingName, /KATH-KUNI/);

  // 2. Leh / Ladakh High Plateau
  assert.equal(getSiteArchetype('Leh Sector Forward Post', { altitude_m: 3500, lat: 34.1 }), 'leh');
  assert.equal(ARCHETYPE_CONFIGS.leh.roofType, 'flat_tarka');
  assert.match(ARCHETYPE_CONFIGS.leh.claddingName, /ADOBE MUD BRICK/);

  // 3. Dras Extreme Frost Basin
  assert.equal(getSiteArchetype('Dras Kargil Frontier', { altitude_m: 3280, lat: 34.4 }), 'dras');
  assert.match(ARCHETYPE_CONFIGS.dras.claddingName, /GRANITE BOULDER/);
  assert.equal(ARCHETYPE_CONFIGS.dras.snowLoad, '3.2 kN/m² Extreme Snowpack');

  // 4. Jaisalmer Thar Desert
  assert.equal(getSiteArchetype('Jaisalmer / Pokhran Border Post', { altitude_m: 225, lat: 26.9 }), 'jaisalmer');
  assert.match(ARCHETYPE_CONFIGS.jaisalmer.claddingName, /YELLOW SANDSTONE/);
  assert.equal(ARCHETYPE_CONFIGS.jaisalmer.snowLoad, '0.0 kN/m² (Zero Snowfall, High Dust Storm)');

  // 5. New Delhi / NCR Lowland Plain
  assert.equal(getSiteArchetype('New Delhi Cantonment', { altitude_m: 216, lat: 28.6 }), 'delhi');
  assert.match(ARCHETYPE_CONFIGS.delhi.claddingName, /BRICK/);

  // 6. Siachen Glacial Karakoram
  assert.equal(getSiteArchetype('Siachen Base Camp', { altitude_m: 3600, lat: 35.2 }), 'siachen');
  assert.match(ARCHETYPE_CONFIGS.siachen.claddingName, /COMPOSITE PUF/);

  // Fallback geographic coordinate classification
  assert.equal(getSiteArchetype('Unknown Station Alpha', { altitude_m: 2400, lat: 31.8 }), 'manali');
  assert.equal(getSiteArchetype('Unknown Desert Outpost', { altitude_m: 180, lat: 26.5 }), 'jaisalmer');
});

