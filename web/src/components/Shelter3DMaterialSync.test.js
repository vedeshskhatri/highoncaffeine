import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMaterialSpec, computeLayerR, computeTotalU, MATERIAL_SPECS } from './materialsData.js';
import { getTextureForMaterial } from './threeUtils/proceduralTextures.js';

describe('THERMA 3D Shelter Inspector Material Synchronization', () => {
  it('MATERIAL_SPECS contains authoritative physical properties for high-altitude materials', () => {
    assert.ok(Object.keys(MATERIAL_SPECS).length >= 25, 'Should have at least 25 authoritative base materials');
    
    // Mud brick check
    const mudBrick = getMaterialSpec('mud_brick');
    assert.strictEqual(mudBrick.conductivity_w_mk, 0.75);
    assert.strictEqual(mudBrick.k, 0.75);
    assert.strictEqual(mudBrick.density_kg_m3, 1700);
    assert.strictEqual(mudBrick.rho, 1700);
    assert.strictEqual(mudBrick.specific_heat_j_kgk, 880);
    assert.strictEqual(mudBrick.cp, 880);
    assert.ok(mudBrick.citation.includes('ASHRAE') || mudBrick.citation.includes('NBC') || mudBrick.citation.includes('IS'));

    // Rammed earth check
    const rammedEarth = getMaterialSpec('rammed_earth');
    assert.strictEqual(rammedEarth.conductivity_w_mk, 1.25);
    assert.strictEqual(rammedEarth.density_kg_m3, 2000);
    assert.strictEqual(rammedEarth.specific_heat_j_kgk, 900);

    // EPS check
    const eps = getMaterialSpec('eps');
    assert.strictEqual(eps.conductivity_w_mk, 0.038);
    assert.strictEqual(eps.density_kg_m3, 25);
    assert.strictEqual(eps.specific_heat_j_kgk, 1400);

    // Rockwool check
    const rockwool = getMaterialSpec('rockwool');
    assert.strictEqual(rockwool.conductivity_w_mk, 0.038);
    assert.strictEqual(rockwool.density_kg_m3, 48);

    // PUF check
    const puf = getMaterialSpec('puf_sandwich');
    assert.strictEqual(puf.conductivity_w_mk, 0.024);
    assert.strictEqual(puf.density_kg_m3, 40);
  });

  it('alias resolution works transparently for common synonyms', () => {
    assert.strictEqual(getMaterialSpec('stone').id, 'stone_masonry');
    assert.strictEqual(getMaterialSpec('adobe').id, 'mud_brick');
    assert.strictEqual(getMaterialSpec('wood').id, 'timber');
    assert.strictEqual(getMaterialSpec('puf').id, 'puf_sandwich');
    assert.strictEqual(getMaterialSpec('cgi').id, 'cgi_sheet');
    assert.strictEqual(getMaterialSpec('metal_roof').id, 'cgi_sheet');
  });

  it('computeLayerR calculates thermal resistance strictly according to Fourier law R = d / k', () => {
    // 0.30m mud brick (k = 0.75) -> R = 0.30 / 0.75 = 0.40 m²K/W
    const rVal = computeLayerR('mud_brick', 0.30);
    assert.ok(Math.abs(rVal - 0.4) < 1e-6);

    // Also supports (thickness, k) numbers
    const rDirect = computeLayerR(0.30, 0.75);
    assert.ok(Math.abs(rDirect - 0.4) < 1e-6);

    // 0.05m EPS (k = 0.038) -> R = 0.05 / 0.038 = 1.3157... m²K/W
    const rEps = computeLayerR('eps', 0.05);
    assert.ok(Math.abs(rEps - 1.315789) < 0.001);
  });

  it('computeTotalU calculates overall heat transfer coefficient with surface resistances', () => {
    // Wall assembly: 300mm mud brick + 50mm EPS
    // R_mud = 0.30 / 0.75 = 0.40
    // R_eps = 0.05 / 0.038 = 1.3158
    // R_total = 0.40 + 1.3158 + 0.17 = 1.8858
    // U = 1 / 1.8858 = 0.5303 W/m²K
    const wallLayers = [
      { material: 'mud_brick', thickness_m: 0.30 },
      { material: 'eps', thickness_m: 0.05 },
    ];
    const uVal = computeTotalU(wallLayers);
    assert.ok(Math.abs(uVal - 0.5303) < 0.01, `Expected ~0.53, got ${uVal}`);
  });

  it('texture resolver handles all architectural materials without error', () => {
    const materials = ['mud_brick', 'rammed_earth', 'stone_masonry', 'rockwool', 'eps', 'xps', 'puf_sandwich', 'timber', 'concrete', 'cgi_sheet'];
    for (const mat of materials) {
      const tex = getTextureForMaterial(mat);
      assert.ok(tex !== null && tex !== undefined, `Texture for ${mat} should be defined`);
    }
  });
});
