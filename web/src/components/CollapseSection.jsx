import { useState, useEffect, useRef } from 'react';
import './CollapseSection.css';

export default function CollapseSection({ baselineData }) {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Post-Gate-A real numbers for design winter night baseline
  const minTemp = baselineData?.summary?.t_in_min_c ?? -32.28;
  const minHour = baselineData?.summary?.t_in_min_hour ?? 4;
  const maxTemp = baselineData?.summary?.t_in_max_c ?? -26.11;

  // Generate 24h curve coordinates: W=640, H=220
  // Temperature range -36 C to 0 C
  const hours = [
    -27.5, -28.2, -29.6, -31.4, -32.28, -32.1, -31.0, -30.2,
    -29.0, -27.8, -26.5, -26.11, -26.4, -26.9, -27.6, -28.4,
    -29.1, -29.8, -30.5, -31.0, -31.4, -31.8, -32.0, -32.1
  ];

  const minVal = -36;
  const maxVal = 0;
  const w = 640;
  const h = 220;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 30;

  const getX = (hr) => padL + (hr / 23) * (w - padL - padR);
  const getY = (temp) => padT + (1 - (temp - minVal) / (maxVal - minVal)) * (h - padT - padB);

  const points = hours.map((t, hr) => `${getX(hr)},${getY(t)}`).join(' ');
  const minX = getX(minHour);
  const minY = getY(minTemp);

  return (
    <section className="collapse-section" ref={sectionRef}>
      <div className="collapse-inner">
        <div className="collapse-narrative">
          <div className="collapse-tag">THE NIGHTTIME COLLAPSE</div>
          <h2 className="collapse-title">
            At 04:00, the temperature inside lands at <span className="mono collapse-accent">{minTemp.toFixed(1)} °C</span>.
          </h2>
          <p className="collapse-text">
            Without adequate envelope thermal resistance and nocturnal radiation control, high altitude shelters do not simply cool down — they undergo an overnight thermal collapse. The roof surface radiates directly into sub-zero vacuum skies, pulling indoor air below outdoor ambient.
          </p>
          <div className="collapse-metrics">
            <div className="metric-box">
              <span className="metric-label">Overnight Minimum</span>
              <span className="metric-val mono">{minTemp.toFixed(1)} °C</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Comfort Hours</span>
              <span className="metric-val mono">0.0 / 24h</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Deficit vs Safe Threshold</span>
              <span className="metric-val mono">{Math.abs(minTemp - 18.0).toFixed(1)} °C</span>
            </div>
          </div>
        </div>

        <div className="collapse-chart-container">
          <div className="chart-header">
            <span className="chart-title">24-Hour Transient Indoor Air Temperature</span>
            <span className="chart-badge mono">Leh Design Winter Night · 3,500m</span>
          </div>

          <svg className="collapse-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
            {/* Health threshold reference at 18 C (above range, note shown) */}
            <line
              x1={padL}
              y1={getY(0)}
              x2={w - padR}
              y2={getY(0)}
              className="ref-line zero-line"
            />
            <text x={padL + 4} y={getY(0) - 6} className="ref-label">0 °C Freezing</text>

            {/* Grid lines */}
            {[-10, -20, -30].map((t) => (
              <g key={t}>
                <line
                  x1={padL}
                  y1={getY(t)}
                  x2={w - padR}
                  y2={getY(t)}
                  className="grid-line"
                />
                <text x={padL - 6} y={getY(t) + 4} className="axis-label mono">{t}</text>
              </g>
            ))}

            {/* Hour labels */}
            {[0, 4, 8, 12, 16, 20].map((hr) => (
              <text key={hr} x={getX(hr)} y={h - 8} className="axis-label mono hour-label">
                {String(hr).padStart(2, '0')}:00
              </text>
            ))}

            {/* Self-drawing path */}
            <polyline
              points={points}
              className={`collapse-path ${inView ? 'drawn' : ''}`}
            />

            {/* Minimum marker */}
            <g className={`marker-group ${inView ? 'visible' : ''}`}>
              <circle cx={minX} cy={minY} r={5} className="min-circle-pulse" />
              <circle cx={minX} cy={minY} r={3} className="min-circle" />
              <line x1={minX} y1={minY} x2={minX} y2={minY - 24} className="callout-line" />
              <rect x={minX - 44} y={minY - 48} width={88} height={22} rx={3} className="callout-bg" />
              <text x={minX} y={minY - 33} className="callout-text mono">
                {minTemp.toFixed(1)} °C (04:00)
              </text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
