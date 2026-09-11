import React from 'react';

/**
 * RefusalCard.jsx — Engineering safety interlock refusal card.
 * Rendered when simulation or optimization detects an unsafe condition
 * (e.g. ACH < safe threshold with unflued combustion heater).
 *
 * CRITICAL DESIGN RULE (brain/08_UI_SPEC.md section 5):
 * THIS IS A VALID SIMULATION RESULT, NOT AN APPLICATION CRASH.
 * Style it with an authoritative field-instrument tone with --danger border
 * and clear actionable recommendations.
 */
export default function RefusalCard({ refusal_reason, onDismiss }) {
  const reasonText =
    refusal_reason ||
    'Ventilation 0.30 ACH is below the safe minimum for an unflued combustion heater. Carbon monoxide risk.';

  return (
    <div
      className="w-full rounded-md border p-4 my-3 bg-surface-1 shadow-none transition-all"
      style={{
        borderColor: 'var(--danger)',
        backgroundColor: 'var(--surface-1)',
      }}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Shield / Alert Icon */}
        <div
          className="w-8 h-8 rounded shrink-0 flex items-center justify-center font-mono font-bold text-label"
          style={{
            backgroundColor: 'var(--surface-2)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
          }}
        >
          !
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3
              className="font-heading text-title font-semibold tracking-tight"
              style={{ color: 'var(--danger)' }}
            >
              Safety Interlock Refusal — Hazardous Configuration
            </h3>
            <span className="font-mono text-caption text-text-muted px-2 py-0.5 rounded bg-surface-2">
              Status 200 Refusal
            </span>
          </div>

          <p className="font-body text-body text-text-primary mb-3 leading-relaxed">
            {reasonText}
          </p>

          <div
            className="p-3 rounded border font-body text-caption"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="font-medium text-text-primary uppercase tracking-wider mb-1">
              Recommended Engineering Remediation:
            </div>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>Increase shelter infiltration to at least <strong className="font-mono text-text-primary">0.6 ACH</strong> in the ventilation panel.</li>
              <li>Or switch internal heater to a <strong className="text-text-primary">flued stove (chimney exhaust)</strong> or <strong className="text-text-primary">electric heater</strong>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
