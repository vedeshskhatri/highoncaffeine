#!/usr/bin/env python3
"""
THERMA — DRDO SIH 2026 PS 26051
Generates the comprehensive single-page TECHNICAL APPROACH pictorial
combining all physics & mathematical formulations and prototype engineering technologies.
"""

from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as patches

OUT_DIR = Path("/Users/cooldude69/Desktop/SIH/highoncaffeine/docs/presentation_assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_technical_approach_board():
    # 16:9 ratio, ultra-high-definition canvas
    fig = plt.figure(figsize=(19.2, 10.8), dpi=250, facecolor="#080E1E")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")

    # =========================================================================
    # 1. HEADER ZONE (Y: 92 - 99)
    # =========================================================================
    ax.text(2.5, 96.2, "TECHNICAL APPROACH · PROTOTYPE ARCHITECTURE & GOVERNING MATHEMATICS",
            fontsize=17, fontweight="bold", color="#FFFFFF", fontfamily="sans-serif")
    ax.text(2.5, 93.6, "DRDO PS 26051: Area-Specific Shelter Design for Thermal Comfort Maintenance in High-Altitude Himalayan Theatres",
            fontsize=10.5, color="#94A3B8", fontfamily="sans-serif")

    # Benchmarks badge
    badge_bg = patches.FancyBboxPatch((78.5, 92.8), 19.0, 5.2, boxstyle="round,pad=0.3",
                                      fc="#111C35", ec="#38BDF8", lw=1.2)
    ax.add_patch(badge_bg)
    ax.text(88.0, 95.4, "5 SURROGATES · R²: 0.968",
            fontsize=9.5, fontweight="bold", color="#38BDF8", ha="center", va="center", fontfamily="monospace")
    ax.text(88.0, 93.9, "120,000 TIMESTEPS · 39 OUTPOSTS",
            fontsize=7.8, color="#94A3B8", ha="center", va="center", fontfamily="monospace")

    # =========================================================================
    # 2. PROTOTYPE ENGINEERING & TECHNOLOGY STACK (Y: 76.5 - 91.5)
    # =========================================================================
    proto_box = patches.FancyBboxPatch((2.5, 77.0), 95.0, 14.5, boxstyle="round,pad=0.4",
                                       fc="#0D152A", ec="#3B82F6", lw=1.4)
    ax.add_patch(proto_box)

    ax.text(4.0, 89.2, "SYSTEM ARCHITECTURE & PROTOTYPE TECHNOLOGIES (METHODOLOGY & IMPLEMENTATION)",
            fontsize=11.5, fontweight="bold", color="#60A5FA", fontfamily="sans-serif")

    # 5 Technology Columns / Stages
    stages = [
        ("01. BOUNDARY SOURCING", "#0284C7", [
            ("39 Defense Outposts", "Siachen, DBO, Dras, Galwan"),
            ("NASA POWER & ISHRAE", "Diurnal subzero climate (-40°C)"),
            ("CPWD DSR 2023 DB", "102 envelope materials & k, rho"),
            ("Defense Logistics", "DELIVERED KEROSENE ₹2400/L")
        ]),
        ("02. DETERMINISTIC PHYSICS", "#0D9488", [
            ("1D RC Heat Solver", "EN ISO 52016-1 multi-node"),
            ("Barometric Formula", "Altitude density scaling (0.81kg/m³)"),
            ("Swinbank Sky Sink", "Clear-sky longwave radiant loss"),
            ("Explicit Stability", "Fo <= 0.25 dynamic mesh ceiling")
        ]),
        ("03. SCIENTIFIC ML SURROGATES", "#D97706", [
            ("120k Row Dataset", "Physics-grounded master timeseries"),
            ("5 ML Model Ensemble", "HistGBDT, RF, MLP, CatBoost"),
            ("Sub-10ms Inference", "40,000x faster than EnergyPlus"),
            ("Multi-Target Flux", "Predicts wall, roof, sky, inf watts")
        ]),
        ("04. MULTI-OBJECTIVE MCDA", "#DB2777", [
            ("Pareto Frontier", "Strict cost vs discomfort tradeoff"),
            ("Utopia Knee Point", "Normalized Euclidean distance Di"),
            ("Morris Screening", "Global parameter sensitivity mu*"),
            ("Safety Interlock", "Combustion + ACH < 0.35 => REFUSED")
        ]),
        ("05. OPERATIONAL C2 PROTOTYPE", "#7C3AED", [
            ("FastAPI + React 19", "Frozen contract REST architecture"),
            ("Three.js 3D Viewer", "Interactive shelter peel cutaway"),
            ("Voice Diagnostic Orb", "Hands-free verbal field inquiry"),
            ("Grounded AI Assistant", "Ollama/Llama 3.2 physics synthesis")
        ])
    ]

    col_w = 18.2
    gap = 0.8
    start_x = 3.6
    for idx, (stitle, color, items) in enumerate(stages):
        cx = start_x + idx * (col_w + gap)
        s_patch = patches.FancyBboxPatch((cx, 78.0), col_w, 9.8, boxstyle="round,pad=0.3",
                                         fc="#141E38", ec=color, lw=1.1)
        ax.add_patch(s_patch)
        ax.text(cx + col_w / 2.0, 86.4, stitle, fontsize=8.2, fontweight="bold",
                color=color, ha="center", va="center", fontfamily="sans-serif")
        for i_idx, (k, v) in enumerate(items):
            iy = 84.4 - i_idx * 1.85
            ax.text(cx + 0.8, iy, f"• {k}:", fontsize=7.2, fontweight="bold", color="#E2E8F0", fontfamily="sans-serif")
            ax.text(cx + 1.2, iy - 0.7, v, fontsize=6.3, color="#94A3B8", fontfamily="sans-serif")

    # =========================================================================
    # 3. MATHEMATICAL OPERATIONS & GOVERNING FORMULAS (Y: 3.5 - 75.0)
    # =========================================================================
    math_cards = [
        {
            "x": 2.5, "y": 40.0, "w": 46.8, "h": 35.5,
            "title": "1. SOLAR GEOMETRY & HIGH-ALTITUDE IRRADIANCE",
            "tag": "Duffie & Beckman / Perez Solar Model",
            "border": "#38BDF8",
            "formulas": [
                ("Solar Declination Angle (delta):",
                 r"$\delta = 23.45^\circ \times \sin[(360^\circ / 365) \times (284 + n)]$",
                 "n = day of year [1..365]; orbital obliquity tilt calculation"),
                ("Solar Altitude Angle (alpha_s):",
                 r"$\sin\alpha_s = \sin\phi\sin\delta + \cos\phi\cos\delta\cos\omega$",
                 r"$\phi$ = latitude, $\omega$ = $15^\circ(t_{solar} - 12)$ hour angle"),
                ("Surface Incidence Angle Clamp (cos theta):",
                 r"$\cos\theta = \max(\sin\alpha_s\cos\beta + \cos\alpha_s\sin\beta\cos(\gamma_s - \gamma_{surf}),\ 0.0)$",
                 r"Clamped at zero: prevents non-physical negative solar cooling"),
                ("Total Absorbed Surface Solar Irradiance:",
                 r"$I_{tot} = I_{beam}\cos\theta + I_{diff}\frac{1+\cos\beta}{2} + GHI \cdot \rho_{snow}\frac{1-\cos\beta}{2}$",
                 r"Direct beam + isotropic diffuse + ground reflected ($\rho_{snow} = 0.75$)")
            ]
        },
        {
            "x": 50.7, "y": 40.0, "w": 46.8, "h": 35.5,
            "title": "2. TRANSIENT RC FOURIER SOLVER & NUMERICAL STABILITY",
            "tag": "EN ISO 52016-1 / 1D Multi-Layer RC Discretization",
            "border": "#10B981",
            "formulas": [
                ("1D Heat Diffusion Equation:",
                 r"$\rho c_p \frac{\partial T}{\partial t} = \frac{\partial}{\partial x}(k \frac{\partial T}{\partial x})$",
                 "Dynamic transient heat transfer through composite multi-layer envelope"),
                ("Nodal Capacitance & Conductance:",
                 r"$C_i = \rho c_p \Delta x A, \quad K_{i,i+1} = \frac{k A}{\Delta x}$",
                 "Discretised nodal thermal mass (J/K) and boundary conductances (W/K)"),
                ("Explicit Euler Stability Ceiling (Fourier Number):",
                 r"$Fo = \frac{\alpha \Delta t}{(\Delta x)^2} \leq 0.25 \ \Rightarrow \ \Delta x_{max} = \sqrt{\frac{\alpha \Delta t}{Fo_{target}}}$",
                 r"$\alpha = k/(\rho c_p)$ thermal diffusivity; dynamically prevents numerical divergence"),
                ("Assembly Thermal Resistance & Overall U-Value:",
                 r"$R_{tot} = R_{si} + \sum \frac{L_j}{k_j} + R_{se}, \quad U = \frac{1}{R_{tot}}$",
                 r"ISO 6946 boundary film resistances: $R_{si}=0.13, R_{se}=0.04\ \mathrm{m^2K/W}$")
            ]
        },
        {
            "x": 2.5, "y": 3.5, "w": 46.8, "h": 35.0,
            "title": "3. RAREFIED ATMOSPHERE, SKY COOLING & INFILTRATION",
            "tag": "ISA Barometric Model / Swinbank Longwave Radiative Sink",
            "border": "#F59E0B",
            "formulas": [
                ("High-Altitude Atmospheric Pressure:",
                 r"$P(h) = 101325 \cdot (1 - 2.25577 \times 10^{-5}h)^{5.25588}\ \mathrm{Pa}$",
                 "Barometric pressure formula at elevation h metres above sea level"),
                ("Temperature-Corrected Air Density:",
                 r"$\rho_{air}(h, T) = \frac{P(h)}{287.058 \cdot T_{air}}\ \mathrm{kg/m^3}$",
                 r"At Leh (3,500m), air density drops to $\approx 0.81\ \mathrm{kg/m^3}$ (35% lower convective loss)"),
                ("Sensible Infiltration Heat Dissipation:",
                 r"$Q_{inf} = \frac{ACH \times V \times \rho_{air} \times 1005 \times (T_{in} - T_{out})}{3600}\ \mathrm{W}$",
                 r"$c_{p,air} = 1005\ \mathrm{J/(kg\cdot K)}$; scales with altitude-reduced density $\rho_{air}$"),
                ("Swinbank Nocturnal Clear-Sky Radiation Sink:",
                 r"$T_{sky} = 0.0552 \cdot T_{air}^{1.5}\ \mathrm{K}, \quad Q_{sky} = h_r A F_{sky}(T_s - T_{sky})$",
                 r"$\sigma = 5.670374\times 10^{-8}$, $F_{sky}=1.0$ (roof), 0.5 (walls); severe subzero sink")
            ]
        },
        {
            "x": 50.7, "y": 3.5, "w": 46.8, "h": 35.0,
            "title": "4. THERMAL DIAGNOSIS, PARETO MCDA & DETERMINISTIC SAFETY",
            "tag": "DRDO PS 26051 Decision Framework / ASHRAE 62.2 Safety",
            "border": "#EC4899",
            "formulas": [
                ("100% Component Heat Loss Attribution & Dominant Bottleneck:",
                 r"$P_k = \frac{Q_k}{\sum Q_{loss}} \times 100\%, \quad k^* = \mathrm{argmax}_k(P_k)$",
                 "Identifies primary thermodynamic loss vector (Sky vs Wall vs Infiltration)"),
                ("Pareto Dominance Principle (Cost vs Discomfort):",
                 r"$\mathrm{A\ dominates\ B:\ Cost}_A \leq \mathrm{Cost}_B\ \mathrm{and}\ \mathrm{Discomf}_A \leq \mathrm{Discomf}_B$",
                 "Strict multi-objective minimization without arbitrary subjective weighting"),
                ("Normalized Utopia Distance (Balanced Pareto Knee Point):",
                 r"$D_i = \sqrt{(1 - c_i^*)^2 + (k_i^* - 0)^2} \to \min$",
                 "Euclidean distance to ideal point (Comfort=1.0, Cost=0.0) selects balanced retrofit"),
                ("Deterministic Combustion Safety Interlock:",
                 r"$\mathrm{Combustion\ Heater}\ \mathrm{and}\ ACH < 0.35 \to \mathbf{REFUSED}$",
                 "Zero-hallucination life safety interlock prevents fatal Carbon Monoxide asphyxiation")
            ]
        }
    ]

    for card in math_cards:
        x, y, w, h = card["x"], card["y"], card["w"], card["h"]
        c_patch = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4",
                                         fc="#0D152A", ec=card["border"], lw=1.3)
        ax.add_patch(c_patch)

        # Header of card
        ax.text(x + 1.5, y + h - 2.8, card["title"], fontsize=9.5, fontweight="bold",
                color="#FFFFFF", fontfamily="sans-serif")
        ax.text(x + w - 1.5, y + h - 2.8, card["tag"], fontsize=7.4,
                color=card["border"], ha="right", fontfamily="sans-serif")

        # Divider line
        ax.plot([x + 1.2, x + w - 1.2], [y + h - 3.8, y + h - 3.8], color="#1E293B", lw=1.0)

        # Formulas
        f_start_y = y + h - 5.8
        f_gap = 7.6
        for f_idx, (label, eq, note) in enumerate(card["formulas"]):
            fy = f_start_y - f_idx * f_gap
            ax.text(x + 1.8, fy, label, fontsize=8.0, fontweight="bold", color="#CBD5E1", fontfamily="sans-serif")
            ax.text(x + 2.8, fy - 2.6, eq, fontsize=9.2, color="#38BDF8", fontfamily="serif")
            ax.text(x + 2.8, fy - 4.6, f"↳ {note}", fontsize=6.8, color="#94A3B8", fontfamily="sans-serif")

    # Save high-res master board
    out_png = OUT_DIR / "02_technical_approach_complete_board.png"
    plt.savefig(out_png, dpi=250, facecolor=fig.get_facecolor(), edgecolor="none", bbox_inches="tight")
    plt.close()
    print(f"Master technical approach graphic generated: {out_png}")

if __name__ == "__main__":
    generate_technical_approach_board()
