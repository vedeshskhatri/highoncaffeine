import test from 'node:test';
import assert from 'node:assert/strict';

// Test geometry & scaling logic for CrossSectionSVG
function computeWallProportions(layers, maxWallPx = 40) {
  const totalM = layers.reduce((s, l) => s + (Math.max(0, Number(l.thickness_m)) || 0), 0);
  if (totalM <= 0) return { totalM: 0, wallPxTotal: 0, widths: [] };

  const wallPxTotal = Math.min(maxWallPx, Math.max(12, totalM * 50));
  const widths = layers.map(l => {
    const thickM = Math.max(0, Number(l.thickness_m)) || 0;
    return (thickM / totalM) * wallPxTotal;
  });
  return { totalM, wallPxTotal, widths };
}

test('three-layer wall thickness proportions match entered ratios exactly', () => {
  const layers = [
    { material: 'mud_brick', thickness_m: 0.30 },
    { material: 'eps',       thickness_m: 0.05 },
    { material: 'plywood',   thickness_m: 0.015 },
  ];
  const { totalM, widths } = computeWallProportions(layers);
  assert.equal(totalM, 0.365);

  // Ratio check: width_i / total_width must equal thickness_i / total_thickness
  const totalWidthPx = widths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < layers.length; i++) {
    const enteredRatio = layers[i].thickness_m / totalM;
    const pixelRatio   = widths[i] / totalWidthPx;
    assert.ok(Math.abs(enteredRatio - pixelRatio) < 1e-9, `Layer ${i} ratio mismatch`);
  }
});

test('graceful degradation with zero layers does not crash or overflow', () => {
  const { totalM, wallPxTotal, widths } = computeWallProportions([]);
  assert.equal(totalM, 0);
  assert.equal(wallPxTotal, 0);
  assert.equal(widths.length, 0);
});

test('graceful degradation with ten layers stays within bounded pixel width', () => {
  const tenLayers = Array.from({ length: 10 }, (_, i) => ({
    material: 'mud_brick',
    thickness_m: 0.10,
  }));
  const { totalM, wallPxTotal, widths } = computeWallProportions(tenLayers, 40);
  assert.ok(Math.abs(totalM - 1.0) < 1e-9);
  assert.equal(wallPxTotal, 40); // Capped at MAX_WALL_PX
  const sumPx = widths.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumPx - 40) < 1e-9);
  assert.ok(sumPx <= 40 + 1e-9, 'Must not exceed max wall budget');
});

test('sun position coordinates move as orientation changes', () => {
  const getSunPos = (deg) => {
    const X_CENTER = 220;
    const Y_BASE = 80;
    const norm = (deg - 180) * (Math.PI / 180);
    return {
      x: X_CENTER + 150 * Math.cos(norm),
      y: Y_BASE - 35 * Math.abs(Math.sin(norm)),
    };
  };

  const southPos = getSunPos(180); // directly south
  const northPos = getSunPos(0);   // north
  const eastPos  = getSunPos(90);  // east

  assert.equal(Math.round(southPos.x), 370); // on right side (South)
  assert.equal(Math.round(northPos.x), 70);  // on left side (North)
  assert.notEqual(southPos.x, northPos.x);
  assert.notEqual(southPos.x, eastPos.x);
});
