import React from 'react';
import { formatSafetyRefusal } from '../safetyUtils';

/**
 * RefusalCard.jsx — Authoritative Engineering Safety Refusal Card.
 * Rendered when simulation or optimization detects an unsafe condition
 * evaluated by backend engine/safety.py.
 *
 * SPECIFICATION REQUIREMENTS:
 * - Title: strictly "DESIGN REJECTED FOR SAFETY"
 * - Reason: actual backend reason preserved verbatim
 * - Actionable constraint: actionable engineering constraint provided
 * - Factual & proportional tone: no sensationalism ("will kill people")
 * - Status: Status 200 Refusal (valid simulation decision, not an application crash)
 */
export default function RefusalCard({ refusal_reason, actionable_constraint, onDismiss }) {
  const safety = formatSafetyRefusal({
    refused: true,
    refusal_reason,
    actionable_constraint,
  });

  return (
    <div
      className="w-full rounded-md border p-4 my-3 bg-surface-1 shadow-none transition-all"
      style={{
        borderColor: 'var(--danger, #ef4444)',
        backgroundColor: 'var(--surface-1, #1e293b)',
      }}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Warning Badge Icon */}
        <div
          className="w-9 h-9 rounded shrink-0 flex items-center justify-center font-mono font-bold text-base"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger, #ef4444)',
            border: '1px solid var(--danger, #ef4444)',
          }}
          aria-hidden="true"
        >
          !
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3
              className="font-heading text-title font-bold tracking-tight uppercase"
              style={{ color: 'var(--danger, #ef4444)', letterSpacing: '0.05em' }}
            >
              {safety.title}
            </h3>
            <span
              className="font-mono text-caption px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--surface-2, #334155)',
                color: 'var(--text-muted, #94a3b8)',
                border: '1px solid var(--border, #475569)',
              }}
            >
              Status 200 Refusal
            </span>
          </div>

          {/* Actual Backend Reason */}
          <div className="mb-3">
            <div
              className="font-mono text-caption font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-muted, #94a3b8)' }}
            >
              Reason:
            </div>
            <p
              className="font-body text-body leading-relaxed p-2.5 rounded border"
              style={{
                backgroundColor: 'var(--surface-2, #334155)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              {safety.reason}
            </p>
          </div>

          {/* Actionable Engineering Constraint */}
          <div
            className="p-3 rounded border font-body text-caption"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border, #475569)',
            }}
          >
            <div
              className="font-mono text-caption font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-warning, #eab308)' }}
            >
              Actionable Constraint:
            </div>
            <p className="text-text-primary leading-relaxed">
              {safety.actionableConstraint}
            </p>
          </div>

          {onDismiss && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1 text-caption font-medium rounded border hover:bg-surface-2 transition-colors"
                style={{
                  borderColor: 'var(--border, #475569)',
                  color: 'var(--text-secondary, #cbd5e1)',
                }}
              >
                Acknowledge
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
