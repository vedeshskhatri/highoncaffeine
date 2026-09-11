import React from 'react';
import { BookOpen, ShieldAlert, Award } from 'lucide-react';
import './StaticPages.css';

export default function MethodPage() {
  return (
    <div className="static-page-container">
      <div className="static-header">
        <h1 className="static-title">Physics Formulation & Standards Reference</h1>
        <p className="static-subtitle">
          Governing equations, international standard citations, altitude corrections, and stated limitations.
        </p>
      </div>

      <div className="static-card">
        <h2 className="section-title">1. Governing Framework: EN ISO 52016-1:2017</h2>
        <p>
          THERMA models shelters as a 5-resistance 1-capacitance (5R1C) transient network compliant with <strong>EN ISO 52016-1:2017</strong> (Energy performance of buildings — Calculation of the energy needs for heating and cooling, internal temperatures and sensible and latent heat loads).
        </p>
        <p>
          The continuous differential equation governing internal air temperature node T_in is:
        </p>
        <div className="math-block mono">
          C_air · (dT_in / dt) = Σ Q_envelope + Q_glazing + Q_ventilation + Q_internal - Q_sky
        </div>
      </div>

      <div className="static-card">
        <h2 className="section-title">2. Swinbank Longwave Nocturnal Sky Radiation</h2>
        <p>
          High-altitude cold plateaus exhibit severe clear-sky radiative cooling. Radiative exchange with the celestial dome is linearised per timestep using the previous outer surface node temperature:
        </p>
        <div className="math-block mono">
          T_sky = 0.0552 · (T_air)^1.5  [K]  (Swinbank 1963)
          h_r = ε · σ · (T_s² + T_sky²) · (T_s + T_sky)
          Q_sky = h_r · A · (T_s - T_sky)
        </div>
        <p className="cite-sub">
          Coupled strictly to external opaque nodes via thermal conduction (Gate A verified), preventing artificial unphysical cooling.
        </p>
      </div>

      <div className="static-card">
        <h2 className="section-title">3. High-Altitude Atmospheric Pressure & Density Correction</h2>
        <p>
          Standard sea-level air density (1.225 kg/m³) overpredicts ventilation heat loss by ~35% at 3,500 m and ~45% at 5,000 m. THERMA recalculates atmospheric pressure via the barometric lapse formula:
        </p>
        <div className="math-block mono">
          P(z) = 101325 · (1 - 0.0000225577 · z)^5.25588  [Pa]
          ρ(z, T) = P(z) / (287.05 · T)  [kg/m³]
        </div>
        <p>
          At Leh (3,500 m), ρ ≈ 0.78 kg/m³. At Daulat Beg Oldie (5,065 m), ρ ≈ 0.66 kg/m³.
        </p>
      </div>

      <div className="static-card">
        <h2 className="section-title">4. Stated Engineering Limitations</h2>
        <ul>
          <li><strong>Zero Glazing Capacitance:</strong> Windows are modelled as pure thermal resistances to maintain numerical stability at 60 s timesteps.</li>
          <li><strong>Single-Zone Lumped Node:</strong> Shelters are treated as single well-mixed air volumes; internal stratification is not resolved.</li>
          <li><strong>IMAC vs High-Altitude:</strong> The Indian Model for Adaptive Comfort (IMAC) is derived for temperate and warm Indian plains; high-altitude empirical adaptation data remains an active research frontier.</li>
        </ul>
      </div>
    </div>
  );
}
