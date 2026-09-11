import React, { useState, useEffect, useMemo } from 'react';
import {
  REPORT_SECTIONS,
  ORIGIN_BADGES,
  compileReportMarkdown,
} from '../reportUtils';

export default function EngineeringReportModal({
  isOpen,
  onClose,
  request,
  result,
  context,
}) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(1);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetch('/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: request || {},
        result: result || {},
        context: context || {},
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (isMounted) setReportData(data);
      })
      .catch(err => {
        console.warn('Backend /report failed or unavailable, using client fallback:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, request, result, context]);

  const sections = reportData?.sections || [];
  const audit = reportData?.audit_trail || {};
  const markdownContent = useMemo(() => compileReportMarkdown(reportData), [reportData]);

  if (!isOpen) return null;

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch (e) {
      console.error('Copy markdown error', e);
    }
  };

  const handleCopyChecksum = async () => {
    try {
      await navigator.clipboard.writeText(audit.result_checksum_sha256 || '');
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    } catch (e) {
      console.error('Copy checksum error', e);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `THERMA_REPORT_${audit.simulation_id || 'sim'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAuditJson = () => {
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `THERMA_AUDIT_TRAIL_${audit.simulation_id || 'sim'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        className="w-full max-w-6xl h-[92vh] flex flex-col rounded-lg border shadow-2xl overflow-hidden bg-surface-1"
        style={{
          borderColor: 'var(--border, #334155)',
          backgroundColor: 'var(--surface-1, #0f172a)',
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{
            borderColor: 'var(--border, #334155)',
            backgroundColor: 'var(--surface-2, #1e293b)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-base"
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                color: 'var(--color-primary, #3b82f6)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
              }}
            >
              §
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="report-modal-title"
                  className="font-heading text-lg font-bold text-text-primary tracking-tight"
                >
                  THERMA Engineering Specification &amp; Reproducibility Audit Report
                </h2>
                <span
                  className="px-2 py-0.5 rounded font-mono text-caption text-xs font-semibold"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: 'var(--color-success, #10b981)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                  }}
                >
                  18 SECTIONS AUDITED
                </span>
              </div>
              <p className="font-mono text-caption text-text-muted text-xs mt-0.5">
                Simulation ID: <span className="text-text-secondary">{audit.simulation_id || 'sim_loading'}</span> | SHA-256 Digest: <span className="text-text-secondary">{audit.result_checksum_sha256?.slice(0, 16) || 'pending'}...</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded border text-caption font-medium transition-all"
              style={{
                backgroundColor: copiedMd ? 'var(--color-success, #10b981)' : 'var(--surface-1, #0f172a)',
                color: copiedMd ? '#ffffff' : 'var(--text-secondary, #cbd5e1)',
                borderColor: 'var(--border, #334155)',
              }}
            >
              {copiedMd ? '✓ Copied Markdown' : '📋 Copy .MD'}
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 rounded border text-caption font-medium transition-all"
              style={{
                backgroundColor: 'var(--surface-1, #0f172a)',
                color: 'var(--text-secondary, #cbd5e1)',
                borderColor: 'var(--border, #334155)',
              }}
            >
              📥 Download .MD
            </button>
            <button
              type="button"
              onClick={handleDownloadAuditJson}
              className="px-3 py-1.5 rounded border text-caption font-medium transition-all"
              style={{
                backgroundColor: 'var(--surface-1, #0f172a)',
                color: 'var(--text-secondary, #cbd5e1)',
                borderColor: 'var(--border, #334155)',
              }}
            >
              📥 Audit JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border text-caption font-medium hover:bg-surface-2 transition-all ml-2"
              style={{
                borderColor: 'var(--border, #334155)',
                color: 'var(--text-muted, #94a3b8)',
              }}
              aria-label="Close report modal"
            >
              ✖ Close
            </button>
          </div>
        </div>

        {/* Origin Legend Bar */}
        <div
          className="flex flex-wrap items-center justify-between px-6 py-2 border-b text-caption font-body text-xs"
          style={{
            borderColor: 'var(--border, #334155)',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="font-semibold text-text-primary">Rule R1 Origin Classification:</span>
            {Object.entries(ORIGIN_BADGES).map(([key, b]) => (
              <span key={key} className="flex items-center gap-1.5" title={b.desc}>
                <span
                  className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px]"
                  style={{
                    backgroundColor: b.bg,
                    color: b.color,
                    border: `1px solid ${b.border}`,
                  }}
                >
                  {b.label}
                </span>
                <span className="text-text-muted hidden md:inline">{b.desc.split('.')[0]}</span>
              </span>
            ))}
          </div>
          <div className="text-text-muted italic">
            Model outputs strictly separated from measurements.
          </div>
        </div>

        {/* Modal Body: Two-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Table of Contents Sidebar */}
          <div
            className="w-72 border-r overflow-y-auto shrink-0 p-3 space-y-1"
            style={{
              borderColor: 'var(--border, #334155)',
              backgroundColor: 'var(--surface-2, #1e293b)',
            }}
          >
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted px-2 py-1 mb-1">
              Table of Contents
            </div>
            {REPORT_SECTIONS.map(sec => {
              const isActive = activeSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setActiveSectionId(sec.id);
                    document.getElementById(`sec-${sec.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-left px-2.5 py-2 rounded text-caption font-medium transition-all flex items-start gap-2"
                  style={{
                    backgroundColor: isActive ? 'var(--color-primary, #2563eb)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary, #cbd5e1)',
                  }}
                >
                  <span className="font-mono text-xs opacity-75 shrink-0 w-5">
                    {String(sec.id).padStart(2, '0')}.
                  </span>
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content Pane */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-surface-1">
            {sections.map(sec => (
              <div
                key={sec.section_id}
                id={`sec-${sec.section_id}`}
                className="p-5 rounded-lg border transition-all"
                style={{
                  borderColor: activeSectionId === sec.section_id ? 'var(--color-primary, #2563eb)' : 'var(--border, #334155)',
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-caption px-2 py-0.5 rounded font-bold"
                      style={{
                        backgroundColor: 'var(--surface-2, #1e293b)',
                        color: 'var(--color-primary, #3b82f6)',
                        border: '1px solid var(--border, #334155)',
                      }}
                    >
                      Section {sec.section_id}
                    </span>
                    <h3 className="font-heading text-title font-bold text-text-primary">
                      {sec.title}
                    </h3>
                  </div>
                </div>

                <p className="font-body text-caption text-text-muted mb-4">
                  {sec.description}
                </p>

                {/* Metrics Table */}
                <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--border, #334155)' }}>
                  <table className="w-full text-left font-body text-caption border-collapse">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--surface-2, #0f172a)',
                          borderBottom: '1px solid var(--border, #334155)',
                        }}
                      >
                        <th className="py-2 px-3 font-semibold text-text-primary w-1/4">Parameter / Metric</th>
                        <th className="py-2 px-3 font-semibold text-text-primary w-1/4">Quantified Value</th>
                        <th className="py-2 px-3 font-semibold text-text-primary w-1/8">Unit</th>
                        <th className="py-2 px-3 font-semibold text-text-primary w-1/8">Origin</th>
                        <th className="py-2 px-3 font-semibold text-text-primary w-1/4">Source Citation / Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sec.metrics || {}).map(([key, m], mIdx) => {
                        const badge = ORIGIN_BADGES[m.origin] || ORIGIN_BADGES.SOURCED;
                        return (
                          <tr
                            key={key}
                            className="border-b transition-colors hover:bg-surface-2"
                            style={{
                              borderColor: 'var(--border, #334155)',
                              backgroundColor: mIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                            }}
                          >
                            <td className="py-2 px-3 font-medium text-text-primary font-mono text-xs">
                              {key}
                            </td>
                            <td className="py-2 px-3 font-mono text-text-secondary">
                              {typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value)}
                            </td>
                            <td className="py-2 px-3 font-mono text-text-muted text-xs">
                              {m.unit}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className="px-2 py-0.5 rounded font-mono text-[10px] font-bold inline-block"
                                style={{
                                  backgroundColor: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                }}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-text-muted italic text-xs">
                              {m.citation || m.note || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Special Section 18 Audit Card */}
                {sec.section_id === 18 && (
                  <div
                    className="mt-4 p-4 rounded border font-mono text-caption"
                    style={{
                      backgroundColor: 'var(--surface-2, #0f172a)',
                      borderColor: 'var(--border, #334155)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-text-primary">
                        Cryptographic Result Digest (SHA-256):
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyChecksum}
                        className="px-2 py-0.5 rounded border text-xs text-text-secondary hover:text-text-primary"
                        style={{ borderColor: 'var(--border, #334155)' }}
                      >
                        {copiedSha ? '✓ Copied Hash' : '🔒 Copy Checksum'}
                      </button>
                    </div>
                    <code
                      className="block p-2 rounded break-all select-all text-xs"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: 'var(--color-primary, #3b82f6)',
                      }}
                    >
                      {audit.result_checksum_sha256 || 'checksum_pending'}
                    </code>
                    <p className="mt-3 text-text-secondary font-body text-xs leading-relaxed">
                      <strong>Deterministic Replay Guarantee:</strong> {audit.reproducibility_statement}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
