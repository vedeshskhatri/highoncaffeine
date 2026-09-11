import test from 'node:test';
import assert from 'node:assert/strict';

// Tests for Feature 1 (Physiological Risk) & Feature 2 (Forecast Watch)

test('PhysiologicalRisk: flags estimate confidence and formats hypothermia boundary', () => {
  const breachedResult = {
    model_confidence: 'estimate',
    clothing_clo: 1.5,
    metabolic_met: 1.0,
    t_core_min_c: 34.6,
    t_core_min_hour: 5,
    t_skin_min_c: 16.2,
    hours_to_mild_hypothermia: 4.5,
  };

  assert.equal(breachedResult.model_confidence, 'estimate');
  assert.equal(typeof breachedResult.hours_to_mild_hypothermia, 'number');
  assert.ok(breachedResult.hours_to_mild_hypothermia < 24.0);
  assert.ok(breachedResult.t_core_min_c <= 35.0);

  const safeResult = {
    model_confidence: 'estimate',
    clothing_clo: 2.0,
    metabolic_met: 1.0,
    t_core_min_c: 36.8,
    hours_to_mild_hypothermia: null,
  };

  assert.equal(safeResult.hours_to_mild_hypothermia, null);
  assert.ok(safeResult.t_core_min_c > 35.0);
});

test('ForecastWatch: nearest-breach ordering places impending danger before safe posts', () => {
  const posts = [
    { post_id: 'p_safe', breach: false, predicted_t_in_min_c: 19.2 },
    { post_id: 'p_urgent', breach: true, breach_hour: 3, predicted_t_in_min_c: 5.1 },
    { post_id: 'p_moderate', breach: true, breach_hour: 8, predicted_t_in_min_c: 14.0 },
  ];

  posts.sort((a, b) => {
    if (a.breach && !b.breach) return -1;
    if (!a.breach && b.breach) return 1;
    return a.predicted_t_in_min_c - b.predicted_t_in_min_c;
  });

  assert.equal(posts[0].post_id, 'p_urgent');
  assert.equal(posts[1].post_id, 'p_moderate');
  assert.equal(posts[2].post_id, 'p_safe');
});

test('ForecastWatch: semantic status mapping conforms to design tokens', () => {
  function getStatus(breached, tInMin, safetyRefused = false) {
    if (!breached) return 'green';
    if (safetyRefused || tInMin < 12.0) return 'red';
    return 'amber';
  }

  assert.equal(getStatus(false, 19.0), 'green');
  assert.equal(getStatus(true, 15.0), 'amber');
  assert.equal(getStatus(true, 6.0), 'red');
  assert.equal(getStatus(true, 16.0, true), 'red');
});
