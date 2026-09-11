import React from 'react';

/**
 * WeatherProvenanceBanner.jsx — Transparent meteorological source indicator.
 * Displays provider, live/archive status, and the regional grid note.
 * When provider is 'fallback', prominently indicates offline operation.
 * Zero hardcoded colors.
 */
export default function WeatherProvenanceBanner({ provenance }) {
  if (!provenance) return null;

  const { provider, is_live, grid_note, fetched_at } = provenance;
  const isFallback = provider === 'fallback';

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div
      className="w-full rounded-md border p-2.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      style={{
        backgroundColor: isFallback ? 'var(--surface-2)' : 'var(--surface-1)',
        borderColor: isFallback ? 'var(--estimate)' : 'var(--border)',
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* Provider badge */}
        <span
          className="font-mono text-[11px] uppercase px-2 py-0.5 rounded font-medium"
          style={{
            backgroundColor: is_live ? 'var(--comfort)' : 'var(--surface-2)',
            color: is_live ? 'var(--bg-base)' : 'var(--text-secondary)',
            border: is_live ? 'none' : '1px solid var(--border)',
          }}
        >
          {provider === 'open-meteo'
            ? 'Open-Meteo (Live)'
            : provider === 'nasa-power'
            ? 'NASA POWER (Archive)'
            : provider === 'user-csv'
            ? 'User CSV Data'
            : 'Offline Fallback'}
        </span>

        {/* Live indicator dot */}
        {is_live && (
          <span className="flex items-center gap-1 font-body text-caption text-text-secondary">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: 'var(--comfort)' }}
            />
            Live satellite / model stream
          </span>
        )}

        {/* Fallback Notice */}
        {isFallback && (
          <span
            className="font-body text-caption font-medium"
            style={{ color: 'var(--estimate)' }}
          >
            [OFFLINE] Running on local Leh winter dataset — network disconnected
          </span>
        )}
      </div>

      {/* Grid note or timestamp */}
      <div className="flex items-center gap-3 font-body text-caption text-text-muted">
        {grid_note && (
          <span className="truncate max-w-[340px]" title={grid_note}>
            ℹ️ {grid_note}
          </span>
        )}
        {fetched_at && (
          <span className="font-mono text-[11px] shrink-0">
            Fetched: {formatTimestamp(fetched_at)}
          </span>
        )}
      </div>
    </div>
  );
}
