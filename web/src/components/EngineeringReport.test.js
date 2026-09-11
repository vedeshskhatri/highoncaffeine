import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORT_SECTIONS,
  ORIGIN_BADGES,
  VALID_ORIGINS,
  validateReportStructure,
  compileReportMarkdown,
} from './reportUtils.js';

function createValid18SectionReport() {
  const sections = REPORT_SECTIONS.map((sec) => ({
    section_id: sec.id,
    title: sec.title,
    description: `Description for ${sec.title}`,
    metrics: {
      sample_metric: {
        value: 42.0,
        unit: 'SI',
        origin: sec.id === 7 ? 'MODEL OUTPUT' : (sec.id === 14 ? 'MEASURED' : 'SOURCED'),
        citation: 'Standard reference citation',
      },
    },
  }));

  return {
    report_id: 'rep_2026_test',
    generated_at: '2026-09-11T12:00:00Z',
    engine_version: 'therma-physics-v1.0.0 (EN ISO 52016-1)',
    optimizer_version: 'therma-opt-v1.0.0',
    sections,
    audit_trail: {
      simulation_id: 'sim_test_001',
      timestamp_utc: '2026-09-11T12:00:00Z',
      engine_version: 'therma-physics-v1.0.0',
      optimizer_version: 'therma-opt-v1.0.0',
      materials_database_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      weather_dataset_identifier: 'open-meteo:hourly:2026-01-15',
      validation_status: 'PASS',
      result_checksum_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      reproducibility_statement: 'Deterministic replay verified with fixed timestep.',
    },
  };
}

// ============================================================================
// 1. Report Structure & Section Counts
// ============================================================================

test('EngineeringReport: confirms exactly 18 standardized sections in specification order', () => {
  assert.equal(REPORT_SECTIONS.length, 18);
  assert.equal(REPORT_SECTIONS[0].title, 'Shelter Configuration');
  assert.equal(REPORT_SECTIONS[6].title, 'Simulation Results & Heat Flux Accounting');
  assert.equal(REPORT_SECTIONS[13].title, 'Dual-Axis Scientific Validation');
  assert.equal(REPORT_SECTIONS[17].title, 'Reproducibility Metadata & Audit Trail');

  const report = createValid18SectionReport();
  const res = validateReportStructure(report);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
});

test('EngineeringReport: rejects report with missing sections', () => {
  const incompleteReport = createValid18SectionReport();
  incompleteReport.sections.pop(); // Remove 18th section

  const res = validateReportStructure(incompleteReport);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('Expected exactly 18 sections')));
});

// ============================================================================
// 2. Strict Origin Classification Integrity
// ============================================================================

test('EngineeringReport: strict origin classifications (SOURCED, DERIVED, ESTIMATE, MODEL OUTPUT, MEASURED)', () => {
  assert.deepEqual(VALID_ORIGINS, ['SOURCED', 'DERIVED', 'ESTIMATE', 'MODEL OUTPUT', 'MEASURED']);
  VALID_ORIGINS.forEach(origin => {
    assert.ok(ORIGIN_BADGES[origin], `Missing origin badge definition for: ${origin}`);
    assert.ok(ORIGIN_BADGES[origin].color);
  });
});

test('EngineeringReport: STRICT INVARIANT — model outputs must NEVER be called "measured"', () => {
  const violatedReport = createValid18SectionReport();
  // Corrupt Section 7 (Simulation Results) by falsely labeling model output as MEASURED
  violatedReport.sections[6].metrics['t_in_min'] = {
    value: 12.5,
    unit: '°C',
    origin: 'MEASURED', // VIOLATION!
    citation: 'False attribution',
  };

  const res = validateReportStructure(violatedReport);
  assert.equal(res.valid, false);
  assert.ok(
    res.errors.some(e => e.includes('improperly labeled MEASURED; must be MODEL OUTPUT')),
    'Expected validator to catch model output falsely labeled as measured'
  );
});

test('EngineeringReport: MEASURED origin is reserved exclusively for validation/field datasets', () => {
  const misclassifiedReport = createValid18SectionReport();
  // Label a shelter geometry parameter as MEASURED
  violatedReport: misclassifiedReport.sections[0].metrics['wall_thickness'] = {
    value: 0.30,
    unit: 'm',
    origin: 'MEASURED', // VIOLATION! (should be SOURCED or DERIVED)
    citation: 'Construction drawing',
  };

  const res = validateReportStructure(misclassifiedReport);
  assert.equal(res.valid, false);
  assert.ok(
    res.errors.some(e => e.includes('improperly labeled MEASURED')),
    'Expected validator to restrict MEASURED exclusively to Section 14 Validation'
  );
});

// ============================================================================
// 3. Cryptographic Audit Trail & Checksum Verification
// ============================================================================

test('EngineeringReport: audit trail requires 64-char SHA-256 and engine provenance', () => {
  const report = createValid18SectionReport();
  const res = validateReportStructure(report);
  assert.equal(res.valid, true);

  // Missing checksum
  const missingChecksumReport = createValid18SectionReport();
  delete missingChecksumReport.audit_trail.result_checksum_sha256;
  const res2 = validateReportStructure(missingChecksumReport);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => e.includes('SHA-256 checksum')));

  // Truncated/corrupted checksum
  const badChecksumReport = createValid18SectionReport();
  badChecksumReport.audit_trail.result_checksum_sha256 = 'abc123short';
  const res3 = validateReportStructure(badChecksumReport);
  assert.equal(res3.valid, false);
  assert.ok(res3.errors.some(e => e.includes('SHA-256 checksum')));
});

// ============================================================================
// 4. Markdown Report Compilation
// ============================================================================

test('EngineeringReport: compiles complete markdown document containing all 18 sections and audit trail', () => {
  const report = createValid18SectionReport();
  const md = compileReportMarkdown(report);

  assert.ok(md.includes('# THERMA — Engineering Specification & Reproducibility Audit Report'));
  assert.ok(md.includes('Model outputs are never called "measured"'));

  REPORT_SECTIONS.forEach(sec => {
    assert.ok(
      md.includes(`## ${sec.id}. ${sec.title}`),
      `Markdown missing section heading: ${sec.id}. ${sec.title}`
    );
  });

  assert.ok(md.includes('### Audit Trail Cryptographic Certificate'));
  assert.ok(md.includes(report.audit_trail.result_checksum_sha256));
});
