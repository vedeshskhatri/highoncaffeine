import { useState, useEffect, useRef, useCallback } from 'react';
import MaterialsTray from './MaterialsTray';
import ElevationCrossSection from './ElevationCrossSection';
import LiveTempCurve from './LiveTempCurve';
import DayScrubber from './DayScrubber';
import './ShelterBuilder.css';

export default function ShelterBuilder({ activeScenario, initialEnvelope }) {
  const [envelope, setEnvelope] = useState(initialEnvelope);
  const [simulateResult, setSimulateResult] = useState(null);
  const [prevMinTemp, setPrevMinTemp] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [inlineError, setInlineError] = useState(null);
  const [scrubHour, setScrubHour] = useState(4); // Default to 04:00 (coldest hour)

  const debounceTimerRef = useRef(null);
  const requestIdRef = useRef(0);
  const lastGoodResultRef = useRef(null);

  // Sync with activeScenario changes
  useEffect(() => {
    if (activeScenario?.envelope) {
      setEnvelope(activeScenario.envelope);
    }
  }, [activeScenario]);

  // Debounced API simulation call
  const triggerSimulation = useCallback((newEnvelope) => {
    // Validate envelope has at least 1 layer per zone
    if (!newEnvelope.walls?.length) {
      setInlineError('Wall zone has 0 layers. Building envelope must enclose living space.');
      return;
    }
    if (!newEnvelope.roof?.length) {
      setInlineError('Roof zone has 0 layers. Thermal radiation to sky requires an exterior surface.');
      return;
    }
    if (!newEnvelope.floor?.length) {
      setInlineError('Floor zone has 0 layers. Ground contact requires a floor assembly.');
      return;
    }

    setInlineError(null);
    setIsPending(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current;
      const tStart = performance.now();

      const payload = {
        location: activeScenario.location,
        weather: activeScenario.weather,
        geometry: activeScenario.geometry,
        envelope: newEnvelope,
        openings: activeScenario.openings,
        ventilation: activeScenario.ventilation,
        occupancy: activeScenario.occupancy,
        ground: { snow_cover: true, albedo: null },
        comfort: { model: 'imac', health_threshold_c: 18.0 },
        simulation: { timestep_s: 60, spinup_days: 3 },
      };

      try {
        const res = await fetch('http://127.0.0.1:8000/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server returned ${res.status}`);
        }

        const data = await res.json();

        // Stale response guard: ignore if a newer request was dispatched
        if (currentRequestId === requestIdRef.current) {
          const elapsed = Math.round(performance.now() - tStart);
          console.log(`[THERMA] Simulate completed in ${elapsed}ms`);

          setSimulateResult((prev) => {
            if (prev?.summary?.t_in_min_c !== undefined) {
              setPrevMinTemp(prev.summary.t_in_min_c);
            }
            return data;
          });
          lastGoodResultRef.current = data;
          setIsPending(false);
          setInlineError(null);
        }
      } catch (err) {
        if (currentRequestId === requestIdRef.current) {
          console.warn('[THERMA] Solver error:', err.message);
          setInlineError(`Solver error: ${err.message}. Retaining last valid thermal curve.`);
          setIsPending(false);
          // Keep last good curve per spec: never blank the chart
          if (lastGoodResultRef.current) {
            setSimulateResult(lastGoodResultRef.current);
          }
        }
      }
    }, 150); // 150ms debounce per spec
  }, [activeScenario]);

  // Initial simulation on mount
  useEffect(() => {
    triggerSimulation(envelope);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [triggerSimulation, envelope]);

  // Envelope manipulation handlers (Optimistic UI)
  const handleAddLayer = (zone, material) => {
    setEnvelope((prev) => {
      const currentList = prev[zone] || [];
      const updated = {
        ...prev,
        [zone]: [...currentList, { material: material.id, thickness_m: material.default_thickness || 0.05 }],
      };
      triggerSimulation(updated);
      return updated;
    });
  };

  const handleDropLayer = (zone, material) => {
    handleAddLayer(zone, material);
  };

  const handleRemoveLayer = (zone, index) => {
    setEnvelope((prev) => {
      const currentList = prev[zone] || [];
      const updatedList = currentList.filter((_, idx) => idx !== index);
      const updated = {
        ...prev,
        [zone]: updatedList,
      };
      triggerSimulation(updated);
      return updated;
    });
  };

  const handleReorderLayer = (zone, fromIdx, toIdx) => {
    setEnvelope((prev) => {
      const currentList = [...(prev[zone] || [])];
      const [moved] = currentList.splice(fromIdx, 1);
      currentList.splice(toIdx, 0, moved);
      const updated = {
        ...prev,
        [zone]: currentList,
      };
      triggerSimulation(updated);
      return updated;
    });
  };

  const handleUpdateThickness = (zone, index, newThicknessM) => {
    setEnvelope((prev) => {
      const currentList = [...(prev[zone] || [])];
      currentList[index] = { ...currentList[index], thickness_m: newThicknessM };
      const updated = {
        ...prev,
        [zone]: currentList,
      };
      triggerSimulation(updated);
      return updated;
    });
  };

  return (
    <section className="shelter-builder-section" id="shelter-builder">
      <div className="builder-header-bar">
        <div>
          <span className="builder-tag">INTERACTIVE FIELD WORKBENCH</span>
          <h2 className="builder-title">The Shelter Thermal Builder</h2>
          <p className="builder-desc">
            Stack and reorder structural and insulating layers. Every modification updates the cross-section instantly and re-computes the 24-hour transient temperature curve in under 200 ms.
          </p>
        </div>
        <div className="active-preset-badge">
          <span className="preset-label">Active Scenario:</span>
          <span className="preset-name mono">{activeScenario.title}</span>
        </div>
      </div>

      {/* Three Column Grid */}
      <div className="builder-three-columns">
        {/* LEFT COLUMN: Materials Tray */}
        <div className="builder-col col-materials">
          <MaterialsTray
            onAddLayer={handleAddLayer}
            allowedMaterialIds={activeScenario.allowedMaterialIds}
          />
        </div>

        {/* CENTRE COLUMN: 2D Section & Drop Zones */}
        <div className="builder-col col-elevation">
          <ElevationCrossSection
            envelope={envelope}
            onDropLayer={handleDropLayer}
            onReorderLayer={handleReorderLayer}
            onRemoveLayer={handleRemoveLayer}
            onUpdateThickness={handleUpdateThickness}
            scrubHour={scrubHour}
            simulateResult={simulateResult}
          />
          {/* Day Scrubber directly beneath Section */}
          <DayScrubber
            scrubHour={scrubHour}
            onChangeScrubHour={setScrubHour}
            simulateResult={simulateResult}
          />
        </div>

        {/* RIGHT COLUMN: Live Temperature Curve */}
        <div className="builder-col col-curve">
          <LiveTempCurve
            simulateResult={simulateResult}
            prevMinTemp={prevMinTemp}
            isPending={isPending}
            inlineError={inlineError}
            scrubHour={scrubHour}
          />
        </div>
      </div>
    </section>
  );
}
