import React from 'react';
import './MethodModal.css';

export default function MethodModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="method-modal-overlay" onClick={onClose}>
      <div className="method-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-tag mono">ENGINEERING METHODOLOGY & FORMULATION</span>
            <h2 className="modal-title">Governing Physics & Standards Formulation</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Section 1: Standard Formulation */}
          <div className="method-block">
            <h3 className="block-title">1. Standard Foundation: EN ISO 52016-1:2017</h3>
            <p>
              THERMA implements the internationally standardized 5R1C lumped-capacitance transient energy balance method (EN ISO 52016-1:2017). Each building zone is represented by an internal air node dynamically coupled to multiple 1D multilayer surface nodes (walls, roof, floor, glazing) and ventilation streams:
            </p>
            <div className="equation-box mono">
              C_air · (dT_in/dt) = Σ K_int,i · (T_s,int,i - T_in) + H_ve · (T_out - T_in) + Q_int + Q_sol,conv
            </div>
            <p>
              Conduction across multilayer constructions is resolved via implicit finite-difference discretization with sub-hourly time integration (Δt = 60 s) to guarantee unconditional numerical stability.
            </p>
          </div>

          {/* Section 2: Sky Radiation Coupling */}
          <div className="method-block">
            <h3 className="block-title">2. Nocturnal Longwave Sky Radiation (Coupled Boundary Condition)</h3>
            <p>
              Under clear Himalayan high-altitude skies, exterior envelope surfaces radiate into deep atmospheric space. The effective sky temperature is modeled via the Swinbank clear-sky relation:
            </p>
            <div className="equation-box mono">
              T_sky = 0.0552 · (T_out)^1.5  [Kelvin]
            </div>
            <p>
              Radiative heat loss to the sky is applied as an exact boundary condition directly at the <strong>outermost surface node</strong> (not as a fictitious path from indoor air):
            </p>
            <div className="equation-box mono">
              q_sky = ε_ext · σ · F_sky · (T_s,ext^4 - T_sky^4)
            </div>
            <p>
              where F_sky = 1.0 for horizontal roofs and 0.5 for vertical walls. This boundary depression drives inward conduction gradients through the insulation, correctly matching empirical observations in Leh.
            </p>
          </div>

          {/* Section 3: High Altitude Corrections */}
          <div className="method-block">
            <h3 className="block-title">3. High Altitude Barometric & Thermophysical Corrections</h3>
            <p>
              At Leh (3,500 m) and Nyoma (4,180 m), atmospheric pressure drops to ~65 kPa. Standard sea-level ventilation coefficients introduce severe calculation errors. THERMA applies barometric density scaling:
            </p>
            <div className="equation-box mono">
              ρ_air(z) = ρ_0 · (1 - 0.0065·z / T_0)^(4.255)  ≈ 0.825 kg/m³ at 3,500 m
            </div>
            <p>
              Convective heat transfer coefficients (h_c,ext and h_c,int) and volumetric infiltration capacitance (H_ve = ρ_air · c_p · V · ACH / 3600) are re-evaluated per timestep.
            </p>
          </div>

          {/* Section 4: Known Limitations */}
          <div className="method-block">
            <h3 className="block-title">4. Stated Engineering Assumptions & Limitations</h3>
            <ul className="method-list">
              <li>
                <strong>Single Well-Mixed Air Node:</strong> Stratification within tall spaces (&gt;3.5 m) is not resolved.
              </li>
              <li>
                <strong>Massless Glazing:</strong> Window glass is modeled with zero thermal capacitance to prevent numerical stiffness at small time constants (standard ISO 52016 convention).
              </li>
              <li>
                <strong>1D Envelope Conduction:</strong> Thermal bridging at structural corners is approximated using linear thermal transmittance (Ψ-values) rather than full 3D transient meshes.
              </li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <span className="footer-citation mono">
            Standards Reference: ISO 52016-1:2017 · ASHRAE Handbook of Fundamentals 2021 · NBC 2016
          </span>
          <button type="button" className="footer-close-btn" onClick={onClose}>
            Close Method Reference
          </button>
        </div>
      </div>
    </div>
  );
}
