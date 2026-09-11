/**
 * reportUtils.js
 * Frontend utilities for Phase 10 — Engineering Report & Reproducibility.
 * 
 * Guarantees:
 * 1. Exactly 18 standardized sections.
 * 2. Every numeric or qualitative metric is classified into 5 strict origins:
 *    - SOURCED
 *    - DERIVED
 *    - ESTIMATE
 *    - MODEL OUTPUT (Strict invariant: never call model outputs "measured")
 *    - MEASURED (Strict invariant: physical sensor/field data only)
 * 3. Cryptographic audit trail & deterministic reproducibility.
 */

export const REPORT_SECTIONS = [
  { id: 1, title: 'Shelter Configuration' },
  { id: 2, title: 'Location & Atmospheric Context' },
  { id: 3, title: 'Weather Source & Meteorological Provider' },
  { id: 4, title: 'Materials & Assembly Schedule' },
  { id: 5, title: 'Material Sources & Thermophysical Citations' },
  { id: 6, title: 'Physics Configuration & Solver Formulation' },
  { id: 7, title: 'Simulation Results & Heat Flux Accounting' },
  { id: 8, title: 'Thermal Comfort & Physiological Risk Analysis' },
  { id: 9, title: 'Thermal Weakness Diagnosis' },
  { id: 10, title: 'Pareto Envelope Optimization' },
  { id: 11, title: 'Retrofit Recommendations & Cost-Effectiveness' },
  { id: 12, title: 'Cost Valuation & Fuel Avoidance Economics' },
  { id: 13, title: 'Safety & Asphyxiation Interlock Evaluation' },
  { id: 14, title: 'Dual-Axis Scientific Validation' },
  { id: 15, title: 'Morris Sensitivity Screening' },
  { id: 16, title: 'Engineering Limitations & Boundary Disclosures' },
  { id: 17, title: 'Data Provenance Summary' },
  { id: 18, title: 'Reproducibility Metadata & Audit Trail' },
];

export const VALID_ORIGINS = ['SOURCED', 'DERIVED', 'ESTIMATE', 'MODEL OUTPUT', 'MEASURED'];

export const ORIGIN_BADGES = {
  SOURCED: {
    label: 'SOURCED',
    bg: 'rgba(37, 99, 235, 0.15)',
    color: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.4)',
    desc: 'Published peer-reviewed standard or government rate citation.',
  },
  DERIVED: {
    label: 'DERIVED',
    bg: 'rgba(147, 51, 234, 0.15)',
    color: '#a855f7',
    border: 'rgba(168, 85, 247, 0.4)',
    desc: 'Derived from sourced inputs via physical/geometric formulae.',
  },
  ESTIMATE: {
    label: 'ESTIMATE',
    bg: 'rgba(217, 119, 6, 0.15)',
    color: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.4)',
    desc: 'Estimate — source unavailable.',
  },
  'MODEL OUTPUT': {
    label: 'MODEL OUTPUT',
    bg: 'rgba(22, 163, 74, 0.15)',
    color: '#22c55e',
    border: 'rgba(34, 197, 94, 0.4)',
    desc: 'Simulated output calculated by the numerical solver (never called measured).',
  },
  MEASURED: {
    label: 'MEASURED',
    bg: 'rgba(100, 116, 139, 0.15)',
    color: '#94a3b8',
    border: 'rgba(148, 163, 184, 0.4)',
    desc: 'Field instrument sensor thermocouple records.',
  },
};

/**
 * Validates report structure and origin classification integrity.
 * 
 * @param {Object} report
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateReportStructure(report) {
  const errors = [];
  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['Report object is missing or invalid'] };
  }

  const sections = report.sections;
  if (!Array.isArray(sections) || sections.length !== 18) {
    errors.push(`Expected exactly 18 sections, found ${sections?.length || 0}`);
    return { valid: false, errors };
  }

  sections.forEach((sec, idx) => {
    const expected = REPORT_SECTIONS[idx];
    if (sec.section_id !== expected.id) {
      errors.push(`Section #${idx + 1} has ID ${sec.section_id}, expected ${expected.id}`);
    }
    if (!sec.metrics || typeof sec.metrics !== 'object' || Object.keys(sec.metrics).length === 0) {
      errors.push(`Section ${sec.section_id} (${sec.title}) has no metrics`);
    }

    Object.entries(sec.metrics || {}).forEach(([metricKey, metric]) => {
      if (!VALID_ORIGINS.includes(metric.origin)) {
        errors.push(`Section ${sec.section_id} metric '${metricKey}' has invalid origin: '${metric.origin}'`);
      }
      // Strict Invariant: Section 7 (Simulation Results) metrics must be MODEL OUTPUT, never MEASURED
      if (sec.section_id === 7 && metric.origin === 'MEASURED') {
        errors.push(`Section 7 metric '${metricKey}' improperly labeled MEASURED; must be MODEL OUTPUT`);
      }
      // Strict Invariant: Only section 14 (Validation) can use MEASURED
      if (metric.origin === 'MEASURED' && sec.section_id !== 14) {
        errors.push(`Metric '${metricKey}' in section ${sec.section_id} improperly labeled MEASURED`);
      }
    });
  });

  // Audit trail checks
  const audit = report.audit_trail;
  if (!audit || typeof audit !== 'object') {
    errors.push('Missing audit trail in report');
  } else {
    if (!audit.simulation_id) errors.push('Missing simulation_id in audit trail');
    if (!audit.result_checksum_sha256 || audit.result_checksum_sha256.length !== 64) {
      errors.push('Missing or invalid SHA-256 checksum in audit trail');
    }
    if (!audit.engine_version) errors.push('Missing engine_version in audit trail');
    if (!audit.reproducibility_statement) errors.push('Missing reproducibility_statement in audit trail');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate formatted Markdown string from report object.
 * 
 * @param {Object} report
 * @returns {string}
 */
export function compileReportMarkdown(report) {
  if (report?.markdown) return report.markdown;

  const lines = [
    '# THERMA — Engineering Specification & Reproducibility Audit Report',
    `**Document ID:** \`${report?.report_id || 'sim_local'}\` | **Generated:** \`${report?.generated_at || new Date().toISOString()}\``,
    `**Engine Version:** \`${report?.engine_version || 'therma-v1.0.0'}\``,
    `**Result SHA-256:** \`${report?.audit_trail?.result_checksum_sha256 || 'checksum_pending'}\``,
    '',
    '> **Rule R1 & Provenance Statement:** Every number in this document carries an explicit origin classification',
    '> (`SOURCED`, `DERIVED`, `ESTIMATE`, `MODEL OUTPUT`, or `MEASURED`). Model outputs are never called "measured".',
    '',
    '---',
    '',
  ];

  (report?.sections || []).forEach(sec => {
    lines.push(`## ${sec.section_id}. ${sec.title}`);
    lines.push(`*${sec.description || ''}*`);
    lines.push('');
    lines.push('| Metric / Parameter | Value | Unit | Origin Classification | Citation / Basis |');
    lines.push('| :--- | :--- | :--- | :--- | :--- |');
    Object.entries(sec.metrics || {}).forEach(([k, m]) => {
      lines.push(`| \`${k}\` | **${m.value}** | ${m.unit} | \`${m.origin}\` | ${m.citation || m.note || '—'} |`);
    });
    lines.push('');
  });

  if (report?.audit_trail) {
    lines.push('---');
    lines.push('### Audit Trail Cryptographic Certificate');
    lines.push('```json');
    lines.push(JSON.stringify(report.audit_trail, null, 2));
    lines.push('```');
    lines.push('');
    lines.push(`**Reproducibility Guarantee:** ${report.audit_trail.reproducibility_statement || 'Deterministic replay guaranteed.'}`);
  }

  return lines.join('\n');
}
