#!/usr/bin/env python3
"""
THERMA — DRDO SIH 2026 PS 26051
Generates the complete, high-fidelity TECHNICAL APPROACH master slide
combining:
1. The 8-stage end-to-end engineering methodology & prototype building pipeline
2. All 9 governing physics & mathematical formulations
3. The worked numerical calculations (Ladakh extreme cold conditions)
4. The complete prototype implementation tech stack & architecture
5. Official SIH presentation headers, team badges, and deterministic safety interlock.
"""

from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import pypdf

OUT_DIR = Path("/Users/cooldude69/Desktop/SIH/highoncaffeine/docs/presentation_assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TEMPLATE_PDF = Path("/Users/cooldude69/.gemini/antigravity-ide/brain/d067ea34-8df3-447b-b28d-ae9e951a39d1/.user_uploaded/media_1789184967658.pdf")
OUTPUT_PDF = OUT_DIR / "SIH_2026_Idea_Presentation_THERMA.pdf"
STANDALONE_PDF = OUT_DIR / "technical_approach_slide_3.pdf"
OUTPUT_PNG = OUT_DIR / "02_technical_approach_complete_board.png"

def build_master_figure():
    # 16:9 ratio, 960x540 points (13.333 x 7.5 inches at 72 pt/in), rendered at 300 DPI
    fig = plt.figure(figsize=(19.2, 10.8), dpi=250, facecolor="#FFFFFF")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")

    # Background canvas
    bg = patches.Rectangle((0, 0), 100, 100, fc="#FFFFFF")
    ax.add_patch(bg)

    # =========================================================================
    # 1. HEADER ZONE (Y: 92.0 - 99.5)
    # =========================================================================
    # Top Left: Team Name Badge (matching SIH template oval)
    team_badge = patches.FancyBboxPatch((1.5, 93.6), 18.0, 5.2, boxstyle="round,pad=0.3",
                                       fc="#EFF6FF", ec="#2563EB", lw=1.5)
    ax.add_patch(team_badge)
    ax.text(10.5, 96.8, "TEAM: HIGH ON CAFFEINE", fontsize=9.5, fontweight="bold",
            color="#1E3A8A", ha="center", va="center", fontfamily="sans-serif")
    ax.text(10.5, 94.8, "Team ID: SIH2026-HC · PS: 26051", fontsize=8.0,
            color="#3B82F6", ha="center", va="center", fontfamily="sans-serif")

    # Center: Slide Title & Strategy
    ax.text(50.0, 97.4, "TECHNICAL APPROACH", fontsize=20, fontweight="bold",
            color="#0F172A", ha="center", va="center", fontfamily="serif")
    ax.text(50.0, 94.8, "FROM CLIMATE DATA TO OPTIMIZED SHELTER DESIGN & PROTOTYPE DEPLOYMENT",
            fontsize=10.5, fontweight="bold", color="#1E3A8A", ha="center", va="center", fontfamily="sans-serif")
    ax.text(50.0, 93.0, "Model  →  Simulate  →  Diagnose  →  Optimize  →  Deploy  |  Physics at the Core · Scientific AI as Enabler",
            fontsize=8.5, color="#64748B", ha="center", va="center", fontfamily="sans-serif")

    # Top Right: DRDO & SIH Badges
    drdo_badge = patches.FancyBboxPatch((80.5, 93.6), 18.0, 5.2, boxstyle="round,pad=0.3",
                                        fc="#F8FAFC", ec="#0D9488", lw=1.4)
    ax.add_patch(drdo_badge)
    ax.text(89.5, 96.8, "DRDO PS 26051 · SIH 2026", fontsize=9.2, fontweight="bold",
            color="#0F766E", ha="center", va="center", fontfamily="sans-serif")
    ax.text(89.5, 94.8, "HIGH ALTITUDES · EXTREME CLIMATES", fontsize=7.5, fontweight="bold",
            color="#64748B", ha="center", va="center", fontfamily="sans-serif")

    # Thin divider under header
    ax.plot([1.2, 98.8], [92.2, 92.2], color="#CBD5E1", lw=1.2)

    # Template Guidance Strip (Answering the two prompt bullets directly)
    guide_bar = patches.FancyBboxPatch((1.2, 89.6), 97.6, 2.2, boxstyle="round,pad=0.15",
                                       fc="#F1F5F9", ec="#E2E8F0", lw=1.0)
    ax.add_patch(guide_bar)
    ax.text(2.2, 90.7, "• Technologies Used: Python 3.12, FastAPI, React 19, Three.js 3D Engine, HistGBDT & RF ML Ensemble, Ollama/Llama 3.2, NASA POWER",
            fontsize=7.8, fontweight="bold", color="#1E293B", va="center", fontfamily="sans-serif")
    ax.text(62.0, 90.7, "• Methodology: 8-Stage Physics-Grounded Pipeline, 1D RC Finite Difference, Pareto MCDA & Field Trials",
            fontsize=7.8, fontweight="bold", color="#0369A1", va="center", fontfamily="sans-serif")

    # =========================================================================
    # 2. SECTION 1: 8-STAGE END-TO-END METHODOLOGY PIPELINE (Y: 66.8 - 89.0)
    # =========================================================================
    stages_data = [
        {
            "num": "1", "title": "SITE & CLIMATE", "sub": "Boundary & Constraints",
            "color": "#0F3D6E", "bg": "#F8FAFC",
            "items": [
                "• Lat, Long & Altitude (h)",
                "• Tout (down to -40°C)",
                "• Solar (GHI, DNI, DHI)",
                "• Wind Speed & Direction",
                "• Snow Albedo (rho=0.75)",
                "• Infiltration ACH & Geo"
            ],
            "note": "IMD, NASA & 39 Outposts"
        },
        {
            "num": "2", "title": "SOLAR MODEL", "sub": "Geometry & Irradiance",
            "color": "#C2410C", "bg": "#FFF7ED",
            "items": [
                "• Declination angle (delta)",
                "• Hour angle (omega = 15°dt)",
                "• Solar altitude (alpha_s)",
                "• Surface incidence (theta)",
                "• Perez Anisotropic Sky",
                "• Direct + Diffuse + Ground"
            ],
            "note": "ISO 52010 / Duffie-Beckman"
        },
        {
            "num": "3", "title": "BUILDING PHYSICS", "sub": "Envelope Assembly",
            "color": "#1D4ED8", "bg": "#EFF6FF",
            "items": [
                "• Layered Wall/Roof/Floor",
                "• R-value, U-value, mass",
                "• Fourier 1D Conduction",
                "• Convection film (Rsi, Rse)",
                "• Long-wave Sky Radiation",
                "• Infiltration air density"
            ],
            "note": "CPWD DSR 2023 DB (102 mat)"
        },
        {
            "num": "4", "title": "TRANSIENT RC", "sub": "Time-Step Solver",
            "color": "#0F766E", "bg": "#F0FDFA",
            "items": [
                "• C dT/dt = ΣQin - ΣQout",
                "• Multi-node RC network",
                "• Fo <= 0.25 stability",
                "• Diurnal 24h & annual",
                "• Outputs: Tin, Top, MRT",
                "• Sub-hourly resolution"
            ],
            "note": "EN ISO 52016-1 Standard"
        },
        {
            "num": "5", "title": "DIAGNOSIS", "sub": "Heat Loss Pathways",
            "color": "#B45309", "bg": "#FFFBEB",
            "items": [
                "• Qloss = Σ Q_components",
                "• Pk = (Qk / ΣQ) * 100%",
                "• Identify dominant vector",
                "• Roof 34% | Walls 22%",
                "• Floor 18% | Glazing 12%",
                "• Infiltration 9% | Sky 5%"
            ],
            "note": "Dominant Bottleneck Ranker"
        },
        {
            "num": "6", "title": "OPTIMIZATION", "sub": "Multi-Objective ML",
            "color": "#4338CA", "bg": "#EEF2FF",
            "items": [
                "• Latin Hypercube (LHS)",
                "• 5 ML Surrogates (<10ms)",
                "• 40,000x vs EnergyPlus",
                "• Pareto Frontier (Cost-T)",
                "• Morris Sensitivity Screening",
                "• Normalized Utopia Knee Di"
            ],
            "note": "Ensemble R² = 0.968"
        },
        {
            "num": "7", "title": "RECOMMENDATION", "sub": "Modular Shelter Kit",
            "color": "#BE185D", "bg": "#FDF2F8",
            "items": [
                "• Wall, Roof, Floor Panels",
                "• VIP / Aerogel / PIR Core",
                "• Triple Low-E Glazing",
                "• Thermal Breaks & Anchors",
                "• Snow Load >= 2.5 kN/m²",
                "• Displace ₹2400/L Kerosene"
            ],
            "note": "Area-Specific Retrofits"
        },
        {
            "num": "8", "title": "VALIDATION & C2", "sub": "Field Trials & Prototype",
            "color": "#047857", "bg": "#ECFDF5",
            "items": [
                "• Predicted vs Measured",
                "• MAE < 1.2°C, RMSE < 1.8°C",
                "• Three.js 3D Peel Cutaway",
                "• Voice Diagnostic Orb",
                "• Llama 3.2 Offline AI",
                "• Region-ready Drawings"
            ],
            "note": "Tactical Field Deployment"
        }
    ]

    col_w = 11.45
    col_gap = 0.8
    start_x = 1.2
    top_y = 67.0
    col_h = 22.0

    for idx, st in enumerate(stages_data):
        cx = start_x + idx * (col_w + col_gap)
        # Main stage card
        c_patch = patches.FancyBboxPatch((cx, top_y), col_w, col_h, boxstyle="round,pad=0.25",
                                         fc=st["bg"], ec=st["color"], lw=1.2)
        ax.add_patch(c_patch)

        # Header badge pill
        h_patch = patches.FancyBboxPatch((cx + 0.4, top_y + col_h - 2.8), col_w - 0.8, 2.4,
                                         boxstyle="round,pad=0.15", fc=st["color"], ec=st["color"])
        ax.add_patch(h_patch)
        ax.text(cx + col_w / 2.0, top_y + col_h - 1.6, f"{st['num']}. {st['title']}",
                fontsize=7.8, fontweight="bold", color="#FFFFFF", ha="center", va="center", fontfamily="sans-serif")

        # Subtitle
        ax.text(cx + col_w / 2.0, top_y + col_h - 3.7, st["sub"],
                fontsize=6.7, fontweight="bold", color=st["color"], ha="center", fontfamily="sans-serif")

        # Bullets
        for b_idx, item in enumerate(st["items"]):
            by = top_y + col_h - 5.3 - b_idx * 1.72
            ax.text(cx + 0.6, by, item, fontsize=6.3, color="#1E293B", fontfamily="sans-serif")

        # Bottom note pill
        n_patch = patches.FancyBboxPatch((cx + 0.5, top_y + 0.6), col_w - 1.0, 1.6,
                                         boxstyle="round,pad=0.1", fc="#FFFFFF", ec="#CBD5E1", lw=0.8)
        ax.add_patch(n_patch)
        ax.text(cx + col_w / 2.0, top_y + 1.4, st["note"],
                fontsize=5.8, fontweight="bold", color="#475569", ha="center", va="center", fontfamily="sans-serif")

    # =========================================================================
    # 3. SECTION 2: GOVERNING MATHEMATICS & PHYSICS CORE (Y: 28.5 - 65.5)
    # 4 Thematic Columns covering ALL 9 Formulas from Image 2
    # =========================================================================
    math_cards = [
        {
            "x": 1.2, "w": 23.8, "y": 28.5, "h": 37.0,
            "title": "1. SOLAR GEOMETRY & IRRADIANCE",
            "tag": "ISO 52010 / Perez Model", "color": "#0369A1",
            "items": [
                ("Solar Declination Angle (delta):",
                 r"$\delta = 23.45^\circ \sin\left[\frac{360^\circ}{365}(284 + n)\right]$",
                 "n = day of year [1..365]; orbital obliquity tilt calculation"),
                ("Solar Hour Angle (omega):",
                 r"$\omega = 15^\circ(t_{solar} - 12)$",
                 r"Earth rotation rate: $15^\circ/\mathrm{hr}$; solar noon reference"),
                ("Solar Altitude Angle (alpha_s):",
                 r"$\sin\alpha_s = \sin\phi\sin\delta + \cos\phi\cos\delta\cos\omega$",
                 r"$\phi$ = latitude, elevation angle of sun above local horizon"),
                ("Surface Incidence Angle Clamp (cos theta):",
                 r"$\cos\theta = \max(\sin\alpha_s\cos\beta + \cos\alpha_s\sin\beta\cos(\gamma_s - \gamma),\ 0)$",
                 "Clamped at zero: prevents non-physical negative solar cooling"),
                ("Total Absorbed Incident Irradiance:",
                 r"$I_{tot} = I_{beam}\cos\theta + I_{diff}\frac{1+\cos\beta}{2} + GHI \cdot \rho_{snow}\frac{1-\cos\beta}{2}$",
                 r"Direct beam + Perez anisotropic diffuse + ground albedo ($\rho_{snow} = 0.75$)")
            ]
        },
        {
            "x": 25.8, "w": 23.8, "y": 28.5, "h": 37.0,
            "title": "2. ENVELOPE TRANSIENT RC SOLVER",
            "tag": "EN ISO 52016-1 Multi-Node", "color": "#047857",
            "items": [
                ("1D Transient Heat Diffusion PDE:",
                 r"$\rho c_p \frac{\partial T}{\partial t} = \frac{\partial}{\partial x}\left(k \frac{\partial T}{\partial x}\right)$",
                 "Dynamic heat conduction through composite multi-layer envelope"),
                ("Lumped Node Dynamic Thermal Balance:",
                 r"$C \frac{dT}{dt} = \sum Q_{in} - \sum Q_{out} = \sum K_{ij}(T_j - T) + Q_{source}$",
                 "Matrix RC formulation solved at hourly / sub-hourly timesteps"),
                ("Thermal Resistance & Overall U-Value:",
                 r"$R_{tot} = R_{si} + \sum \frac{L_j}{k_j} + R_{se}, \quad U = \frac{1}{R_{tot}}$",
                 r"ISO 6946 boundary films: $R_{si}=0.13,\ R_{se}=0.04\ \mathrm{m^2K/W}$"),
                ("Nodal Capacitance & Interface Conductance:",
                 r"$C_i = \rho c_p \Delta x A, \quad K = \frac{kA}{\Delta x}, \quad \frac{1}{K_{eff}} = \frac{1}{K_a} + \frac{1}{K_b}$",
                 "Discretized heat capacity (J/K) and interfacial conductance"),
                ("Explicit Euler Stability Ceiling (Fourier Number):",
                 r"$Fo = \frac{\alpha \Delta t}{(\Delta x)^2} \leq 0.25 \ \implies \ \Delta x_{max} = \sqrt{\frac{\alpha \Delta t}{Fo_{target}}}$",
                 r"$\alpha = k/(\rho c_p)$; dynamic mesh ceiling prevents divergence")
            ]
        },
        {
            "x": 50.4, "w": 23.8, "y": 28.5, "h": 37.0,
            "title": "3. HIGH-ALTITUDE SINK & INFILTRATION",
            "tag": "ISA Barometric / Swinbank Sink", "color": "#B45309",
            "items": [
                ("High-Altitude Barometric Pressure:",
                 r"$P(h) = 101325 \cdot (1 - 2.25577 \times 10^{-5}h)^{5.25588}\ \mathrm{Pa}$",
                 "Barometric pressure formula at elevation h metres above sea level"),
                ("Temperature-Corrected Air Density:",
                 r"$\rho_{air}(h, T) = \frac{P(h)}{287.058 \cdot T_{air}}\ \mathrm{kg/m^3}$",
                 r"At Leh (3500m): $\rho \approx 0.81\ \mathrm{kg/m^3}$ (35% drop in convective loss)"),
                ("Sensible Infiltration Heat Dissipation:",
                 r"$Q_{inf} = \frac{ACH \cdot V \cdot \rho_{air} \cdot c_p \cdot (T_{in} - T_{out})}{3600}\ \mathrm{W}$",
                 r"$c_p = 1005\ \mathrm{J/(kg\cdot K)}$; ventilation load scaled by rarefied $\rho_{air}$"),
                ("Swinbank Clear-Sky Nocturnal Sink Temperature:",
                 r"$T_{sky} = 0.0552 \cdot T_{air}^{1.5}\ \mathrm{K}\quad (T_{air}\ \mathrm{in\ Kelvin})$",
                 "Severe nocturnal radiation depression to high-altitude cold sky"),
                ("Net Long-Wave Radiative Heat Exchange:",
                 r"$h_r = \varepsilon \sigma (T_s^2 + T_{sky}^2)(T_s + T_{sky}), \quad Q_{sky} = h_r A F_{sky}(T_s - T_{sky})$",
                 r"$\sigma = 5.67\times 10^{-8}\ \mathrm{W/m^2K^4}$; $F_{sky}=1.0$ (roof), 0.5 (walls)")
            ]
        },
        {
            "x": 75.0, "w": 23.8, "y": 28.5, "h": 37.0,
            "title": "4. DIAGNOSIS, PARETO MCDA & SAFETY",
            "tag": "DRDO Framework / ASHRAE 62.2", "color": "#BE185D",
            "items": [
                ("100% Component Heat Loss Flux Attribution:",
                 r"$P_k = \frac{Q_k}{\sum Q_{loss}} \times 100\%, \quad k^* = \mathrm{argmax}_k(P_k)$",
                 "Identifies primary thermodynamic bottleneck (Roof vs Wall vs Infiltration)"),
                ("Multi-Objective Optimization Loss Function:",
                 r"$\min J = w_1 \cdot \mathrm{Cost} + w_2 \cdot \mathrm{Discomfort}$",
                 "Subject to: $18^\circ\mathrm{C} \leq T_{op} \leq 27^\circ\mathrm{C}$, structural & logistic bounds"),
                ("Pareto Dominance Criterion:",
                 r"$\mathrm{A} \prec \mathrm{B} \iff \mathrm{Cost}_A \leq \mathrm{Cost}_B \ \land \ \mathrm{Discomf}_A \leq \mathrm{Discomf}_B$",
                 "Strict mathematical dominance frontier without arbitrary weights"),
                ("Normalized Utopia Knee Point Distance:",
                 r"$D_i = \sqrt{(1 - c_i^*)^2 + (k_i^* - 0)^2} \to \min$",
                 "Euclidean distance to ideal point selects the optimal balanced design"),
                ("Deterministic Combustion Safety Interlock:",
                 r"$\mathrm{Combustion\ Heater}\ \land \ ACH < 0.35\ \mathrm{h^{-1}} \implies \mathbf{REFUSED}$",
                 "Zero-hallucination life safety interlock prevents fatal CO asphyxiation")
            ]
        }
    ]

    for c in math_cards:
        x, y, w, h = c["x"], c["y"], c["w"], c["h"]
        card_bg = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.3",
                                         fc="#FFFFFF", ec=c["color"], lw=1.3)
        ax.add_patch(card_bg)

        # Header banner inside card
        ch_patch = patches.FancyBboxPatch((x + 0.3, y + h - 2.5), w - 0.6, 2.2,
                                          boxstyle="round,pad=0.15", fc=c["color"], ec=c["color"])
        ax.add_patch(ch_patch)
        ax.text(x + 1.0, y + h - 1.4, c["title"], fontsize=8.0, fontweight="bold",
                color="#FFFFFF", va="center", fontfamily="sans-serif")
        ax.text(x + w - 1.0, y + h - 1.4, c["tag"], fontsize=6.8, fontweight="bold",
                color="#E0F2FE", ha="right", va="center", fontfamily="sans-serif")

        # Divider line
        ax.plot([x + 0.8, x + w - 0.8], [y + h - 2.8, y + h - 2.8], color="#E2E8F0", lw=0.8)

        # Formula items
        start_fy = y + h - 4.4
        f_gap = 6.6
        for f_idx, (label, eq, note) in enumerate(c["items"]):
            fy = start_fy - f_idx * f_gap
            ax.text(x + 0.8, fy, label, fontsize=7.2, fontweight="bold", color="#0F172A", fontfamily="sans-serif")
            ax.text(x + 1.2, fy - 2.2, eq, fontsize=8.2, color="#0284C7", fontfamily="serif")
            ax.text(x + 1.2, fy - 4.0, f"↳ {note}", fontsize=5.8, color="#64748B", fontfamily="sans-serif")

    # =========================================================================
    # 4. SECTION 3: WORKED NUMERICAL EXAMPLE & PROTOTYPE TECH STACK (Y: 4.2 - 27.2)
    # =========================================================================
    # 3A. Left Side: WORKED NUMERICAL EXAMPLE (Ladakh 3,500m Extreme Subzero Conditions)
    we_x, we_y, we_w, we_h = 1.2, 4.2, 48.0, 23.0
    we_bg = patches.FancyBboxPatch((we_x, we_y), we_w, we_h, boxstyle="round,pad=0.3",
                                  fc="#F8FAFC", ec="#0284C7", lw=1.3)
    ax.add_patch(we_bg)

    # Header
    we_h_patch = patches.FancyBboxPatch((we_x + 0.3, we_y + we_h - 2.5), we_w - 0.6, 2.2,
                                        boxstyle="round,pad=0.15", fc="#0284C7", ec="#0284C7")
    ax.add_patch(we_h_patch)
    ax.text(we_x + 1.0, we_y + we_h - 1.4, "WORKED NUMERICAL EXAMPLE — FIELD DESIGN CONDITIONS (LADAKH, 3500m)",
            fontsize=8.5, fontweight="bold", color="#FFFFFF", va="center", fontfamily="sans-serif")
    ax.text(we_x + we_w - 1.0, we_y + we_h - 1.4, "Tout = -19°C | Tin = 18°C | ΔT = 37 K | ρ = 0.90 kg/m³",
            fontsize=7.0, fontweight="bold", color="#BAE6FD", ha="right", va="center", fontfamily="monospace")

    # 3 Sub-Cards for calculations
    calc_cards = [
        {
            "title": "1. Wall Heat Loss Calculation",
            "color": "#0369A1", "bg": "#FFFFFF",
            "lines": [
                r"$\bullet\ \mathrm{Parameters}:\ A = 10\ \mathrm{m^2},\ U = 0.30\ \mathrm{W/m^2K},\ \Delta T = 18 - (-19) = 37\ \mathrm{K}$",
                r"$\bullet\ \mathrm{Governing\ Eq}:\ Q_{wall} = U \cdot A \cdot \Delta T$",
                r"$\bullet\ \mathrm{Substitution}:\ Q_{wall} = 0.30 \times 10 \times 37 = \mathbf{111\ \mathrm{W}}\ (0.111\ \mathrm{kW})$"
            ],
            "result": "Q_wall = 111 W"
        },
        {
            "title": "2. Infiltration Heat Loss Calculation",
            "color": "#C2410C", "bg": "#FFFFFF",
            "lines": [
                r"$\bullet\ \mathrm{Parameters}:\ ACH = 0.5\ \mathrm{h^{-1}},\ V = 60\ \mathrm{m^3},\ \rho_{air} = 0.90\ \mathrm{kg/m^3},\ c_p = 1005\ \mathrm{J/kgK}$",
                r"$\bullet\ \mathrm{Governing\ Eq}:\ Q_{inf} = \frac{ACH \cdot V \cdot \rho_{air} \cdot c_p \cdot \Delta T}{3600}$",
                r"$\bullet\ \mathrm{Substitution}:\ Q_{inf} = \frac{0.5 \times 60 \times 0.90 \times 1005 \times 37}{3600} = \mathbf{279\ \mathrm{W}}\ (0.279\ \mathrm{kW})$"
            ],
            "result": "Q_inf = 279 W"
        },
        {
            "title": "3. Thermal Resistance & Insulation Sizing",
            "color": "#047857", "bg": "#FFFFFF",
            "lines": [
                r"$\bullet\ \mathrm{Parameters}:\ L = 100\ \mathrm{mm} = 0.10\ \mathrm{m},\ k = 0.024\ \mathrm{W/mK}\ (\mathrm{Aerogel/PIR\ Core})$",
                r"$\bullet\ \mathrm{Governing\ Eq}:\ R = \frac{L}{k}, \quad U_{assembly} = \frac{1}{R_{si} + R + R_{se}}$",
                r"$\bullet\ \mathrm{Substitution}:\ R = \frac{0.10}{0.024} = \mathbf{4.17\ \mathrm{m^2K/W}} \implies U_{assembly} \approx 0.23\ \mathrm{W/m^2K}$"
            ],
            "result": "R = 4.17 m²K/W"
        }
    ]

    calc_w = 46.4
    calc_h = 6.0
    for c_idx, cc in enumerate(calc_cards):
        cy = we_y + we_h - 3.4 - (c_idx + 1) * 6.2 + 0.2
        c_patch = patches.FancyBboxPatch((we_x + 0.8, cy), calc_w, calc_h, boxstyle="round,pad=0.2",
                                         fc=cc["bg"], ec=cc["color"], lw=1.0)
        ax.add_patch(c_patch)

        ax.text(we_x + 1.6, cy + calc_h - 1.4, cc["title"], fontsize=7.8, fontweight="bold",
                color=cc["color"], fontfamily="sans-serif")

        # Result badge
        res_patch = patches.FancyBboxPatch((we_x + calc_w - 7.5, cy + calc_h - 1.8), 7.8, 1.4,
                                           boxstyle="round,pad=0.1", fc=cc["color"], ec=cc["color"])
        ax.add_patch(res_patch)
        ax.text(we_x + calc_w - 3.6, cy + calc_h - 1.1, cc["result"], fontsize=7.2, fontweight="bold",
                color="#FFFFFF", ha="center", va="center", fontfamily="monospace")

        for l_idx, line in enumerate(cc["lines"]):
            ax.text(we_x + 1.8, cy + calc_h - 2.8 - l_idx * 1.45, line, fontsize=6.8,
                    color="#0F172A", fontfamily="sans-serif")

    # 3B. Right Side: PROTOTYPE IMPLEMENTATION & SYSTEM ARCHITECTURE (What We Built)
    proto_x, proto_y, proto_w, proto_h = 50.4, 4.2, 48.4, 23.0
    proto_bg = patches.FancyBboxPatch((proto_x, proto_y), proto_w, proto_h, boxstyle="round,pad=0.3",
                                      fc="#F8FAFC", ec="#4F46E5", lw=1.3)
    ax.add_patch(proto_bg)

    # Header
    proto_h_patch = patches.FancyBboxPatch((proto_x + 0.3, proto_y + proto_h - 2.5), proto_w - 0.6, 2.2,
                                           boxstyle="round,pad=0.15", fc="#4F46E5", ec="#4F46E5")
    ax.add_patch(proto_h_patch)
    ax.text(proto_x + 1.0, proto_y + proto_h - 1.4, "PROTOTYPE ENGINEERING & SYSTEM ARCHITECTURE (BUILT & TESTED)",
            fontsize=8.5, fontweight="bold", color="#FFFFFF", va="center", fontfamily="sans-serif")
    ax.text(proto_x + proto_w - 1.0, proto_y + proto_h - 1.4, "5-Tier High-Performance Architecture",
            fontsize=7.0, fontweight="bold", color="#C7D2FE", ha="right", va="center", fontfamily="monospace")

    # 4 Architecture Pillars
    pillars = [
        ("Deterministic Physics Engine (Authoritative Core)", "#0284C7", [
            "• Python 3.12, NumPy, SciPy, FastAPI REST contract",
            "• 1D RC multi-layer transient finite-difference solver (EN ISO 52016-1)",
            "• NASA POWER & ISHRAE automated diurnal weather ingestion (39 Himalayan outposts)",
            "• CPWD DSR 2023 Materials DB: 102 envelope materials with cost & thermal properties"
        ]),
        ("Scientific ML Surrogate Ensemble (<10ms Inference)", "#059669", [
            "• 5-Model Surrogate Ensemble: HistGradientBoosting, Random Forest, MLP, CatBoost",
            "• Master dataset: 120,000 timesteps of physics-grounded thermal simulation runs",
            "• Performance: 40,000x faster than EnergyPlus (<10ms vs 6 min) with test R² = 0.968",
            "• Multi-target surrogate predicts: Tin, Top, MRT, wall flux, roof flux, sky sink watts"
        ]),
        ("Interactive 3D Tactical HUD & Voice Orb", "#7C3AED", [
            "• React 19 + Vite 6 + Tailwind CSS zero-latency military command dashboard",
            "• Three.js Interactive 3D Shelter Cutaway Viewer: layer-by-layer envelope peel",
            "• Web Audio API Voice Diagnostic Orb: hands-free field inquiry in -40°C glove ops",
            "• Real-time heat loss Sankey flux visualization and dominant bottleneck badge"
        ]),
        ("Multi-Objective Optimization & Edge AI", "#DB2777", [
            "• Vectorized Pareto Frontier: evaluates candidate envelope configurations",
            "• Normalized Utopia Distance Di Knee Selector finds optimal cost vs comfort trade-off",
            "• Local Ollama / Llama 3.2 edge reasoning layer for tactical field recommendations",
            "• Deterministic Safety Interlock: Combustion + ACH < 0.35 h⁻¹ strictly REFUSED"
        ])
    ]

    pill_w = 46.8
    pill_h = 4.5
    for p_idx, (p_title, p_color, p_items) in enumerate(pillars):
        py = proto_y + proto_h - 3.4 - (p_idx + 1) * 4.75 + 0.3
        p_card = patches.FancyBboxPatch((proto_x + 0.8, py), pill_w, pill_h, boxstyle="round,pad=0.2",
                                        fc="#FFFFFF", ec=p_color, lw=1.0)
        ax.add_patch(p_card)

        # Header tag
        ax.text(proto_x + 1.6, py + pill_h - 1.2, p_title, fontsize=7.4, fontweight="bold",
                color=p_color, fontfamily="sans-serif")

        for it_idx, item in enumerate(p_items):
            # 2x2 compact layout
            col_offset = 0 if it_idx < 2 else (pill_w / 2.0 - 0.5)
            row_offset = (it_idx % 2) * 1.35
            ax.text(proto_x + 1.6 + col_offset, py + pill_h - 2.4 - row_offset,
                    item, fontsize=6.0, color="#1E293B", fontfamily="sans-serif")

    # =========================================================================
    # 5. FOOTER ZONE (Y: 0.5 - 3.5)
    # =========================================================================
    ft_bg = patches.Rectangle((0, 0), 100, 3.6, fc="#0284C7")
    ax.add_patch(ft_bg)

    ax.text(1.5, 1.8, "@SIH Idea submission- Template | Slide 3: TECHNICAL APPROACH | Team: High on Caffeine",
            fontsize=7.8, fontweight="bold", color="#FFFFFF", va="center", fontfamily="sans-serif")

    # Center Safety Interlock Warning Pill
    s_pill = patches.FancyBboxPatch((34.0, 0.6), 38.0, 2.4, boxstyle="round,pad=0.2",
                                    fc="#DC2626", ec="#FEF2F2", lw=1.0)
    ax.add_patch(s_pill)
    ax.text(53.0, 1.8, "CRITICAL SAFETY INTERLOCK: Combustion Heater + ACH < 0.35 h⁻¹ → REFUSED (Zero CO Risk)",
            fontsize=7.4, fontweight="bold", color="#FFFFFF", ha="center", va="center", fontfamily="sans-serif")

    ax.text(98.5, 1.8, "Safer Shelters. Stronger Frontiers. A Warmer Tomorrow.",
            fontsize=7.8, fontweight="bold", color="#E0F2FE", ha="right", va="center", fontfamily="sans-serif")

    # Save PNG at 250 DPI
    plt.savefig(OUTPUT_PNG, dpi=250, facecolor=fig.get_facecolor(), edgecolor="none", bbox_inches="tight")
    print(f"Generated master graphic: {OUTPUT_PNG}")

    # Also save as exact 960x540 point PDF slide
    fig.set_size_inches(960 / 72.0, 540 / 72.0)
    plt.savefig(STANDALONE_PDF, format="pdf", facecolor=fig.get_facecolor(), edgecolor="none", bbox_inches="tight")
    plt.close()
    print(f"Generated standalone vector PDF: {STANDALONE_PDF}")

def merge_into_presentation():
    if not TEMPLATE_PDF.exists():
        print(f"Template PDF not found at {TEMPLATE_PDF}")
        return

    print("Merging generated master slide into template presentation PDF...")
    template_reader = pypdf.PdfReader(str(TEMPLATE_PDF))
    slide3_reader = pypdf.PdfReader(str(STANDALONE_PDF))

    writer = pypdf.PdfWriter()

    for idx, page in enumerate(template_reader.pages):
        if idx == 2:  # Page 3 is slide 3
            # Replace Page 3 with our comprehensive master technical approach slide
            new_page = slide3_reader.pages[0]
            # Ensure mediabox matches
            new_page.mediabox = page.mediabox
            writer.add_page(new_page)
            print(f"Replaced Page 3 with comprehensive Technical Approach board.")
        else:
            writer.add_page(page)

    with open(OUTPUT_PDF, "wb") as f:
        writer.write(f)

    print(f"Final presentation PDF successfully created at: {OUTPUT_PDF}")

if __name__ == "__main__":
    build_master_figure()
    merge_into_presentation()
