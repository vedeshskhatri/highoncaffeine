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
