#!/usr/bin/env python3
"""
THERMA — DRDO SIH 2026 PS 26051
Generates the official SIH 2026 Slide 3 (Technical Approach)
combining both prototype engineering technologies and complete physics/math formulations
on a single 960x540 pt slide matching the SIH official presentation template,
and compiles the final presentation PDF.
"""

from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import pypdf

ASSETS_DIR = Path("/Users/cooldude69/Desktop/SIH/highoncaffeine/docs/presentation_assets")
TEMPLATE_PDF = Path("/Users/cooldude69/.gemini/antigravity-ide/brain/d067ea34-8df3-447b-b28d-ae9e951a39d1/.user_uploaded/media_1789184967658.pdf")
STANDALONE_PDF = ASSETS_DIR / "technical_approach_slide_3.pdf"
FINAL_PRESENTATION_PDF = ASSETS_DIR / "SIH_2026_Idea_Presentation_THERMA.pdf"
STANDALONE_PNG = ASSETS_DIR / "technical_approach_slide_3.png"

def generate_slide_3():
    # 960 pt x 540 pt at 72 pt/inch = 13.333 x 7.5 inches
    fig = plt.figure(figsize=(13.3333, 7.5), dpi=300, facecolor="#080E1E")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 960)
    ax.set_ylim(0, 540)
    ax.axis("off")

    # -------------------------------------------------------------------------
    # 1. SIH TEMPLATE HEADER (Y: 480 to 535)
    # -------------------------------------------------------------------------
    # Team Oval (Top Left)
    team_oval = patches.FancyBboxPatch((18, 488), 110, 42, boxstyle="round,pad=0.3",
                                       fc="#0D1730", ec="#38BDF8", lw=1.2)
    ax.add_patch(team_oval)
    ax.text(73, 513, "HighOnCaffeine", fontsize=8.5, fontweight="bold", color="#FFFFFF",
            ha="center", va="center", fontfamily="sans-serif")
    ax.text(73, 498, "Team ID · SIH 2026", fontsize=6.8, color="#94A3B8",
            ha="center", va="center", fontfamily="sans-serif")

    # Title (Top Center)
    ax.text(480, 514, "TECHNICAL APPROACH", fontsize=18, fontweight="bold",
            color="#FFFFFF", ha="center", va="center", fontfamily="sans-serif")
    ax.text(480, 495, "PROTOTYPE ARCHITECTURE & FIRST-PRINCIPLES MATHEMATICS · DRDO PS 26051",
            fontsize=8.5, color="#60A5FA", ha="center", va="center", fontfamily="sans-serif", fontweight="semibold")

    # SIH 2026 Badge (Top Right)
    sih_badge = patches.FancyBboxPatch((820, 488), 122, 42, boxstyle="round,pad=0.3",
                                       fc="#0D1730", ec="#F59E0B", lw=1.2)
    ax.add_patch(sih_badge)
    ax.text(881, 513, "SMART INDIA", fontsize=8.2, fontweight="bold", color="#F59E0B",
            ha="center", va="center", fontfamily="sans-serif")
    ax.text(881, 498, "HACKATHON 2026", fontsize=7.2, fontweight="bold", color="#FFFFFF",
            ha="center", va="center", fontfamily="sans-serif")

    # Thin Header Separator
    ax.plot([15, 945], [482, 482], color="#1E293B", lw=1.0)

    # -------------------------------------------------------------------------
    # 2. PROTOTYPE ENGINEERING & TECHNOLOGY STACK (Y: 388 to 478)
    # -------------------------------------------------------------------------
    proto_box = patches.FancyBboxPatch((15, 388), 930, 90, boxstyle="round,pad=0.3",
                                       fc="#0D152A", ec="#3B82F6", lw=1.3)
    ax.add_patch(proto_box)

    ax.text(28, 467, "1. PROTOTYPE TECHNOLOGIES & OPERATIONAL METHODOLOGY",
            fontsize=9.2, fontweight="bold", color="#38BDF8", fontfamily="sans-serif")
    ax.text(540, 467, "5-TIER END-TO-END PIPELINE · SUB-10MS INFERENCE · ZERO-HALLUCINATION",
            fontsize=7.2, color="#94A3B8", fontfamily="monospace")

    stages = [
        ("01. SOURCING", "#0284C7", [
            ("39 Defense Outposts", "Siachen, DBO, Dras, Galwan"),
            ("NASA POWER & ISHRAE", "Diurnal subzero climate (-40°C)"),
            ("CPWD DSR 2023 DB", "102 envelope materials (k, rho)")
        ]),
        ("02. DETERMINISTIC CORE", "#0D9488", [
            ("1D RC Heat Solver", "EN ISO 52016-1 multi-node"),
            ("Barometric Scaling", "Altitude density (0.81 kg/m³)"),
            ("Swinbank Sky Sink", "Clear-sky nocturnal longwave")
        ]),
        ("03. SCIENTIFIC ML", "#D97706", [
            ("120k Dataset", "Physics-grounded master rows"),
            ("5 ML Surrogates", "HistGBDT, RF, MLP (R²=0.968)"),
            ("Sub-10ms Inference", "40,000x faster than EnergyPlus")
        ]),
        ("04. MULTI-OBJECTIVE MCDA", "#DB2777", [
            ("Pareto Frontier", "Strict cost vs discomfort trade-off"),
            ("Utopia Knee Point", "Normalized Euclidean distance Di"),
            ("Safety Interlock", "Combustion + ACH < 0.35 => REFUSED")
        ]),
        ("05. OPERATIONAL C2", "#7C3AED", [
            ("FastAPI + React 18/Vite", "Frozen REST JSON contract"),
            ("Three.js 3D WebGL", "Interactive shelter peel cutaway"),
            ("Voice Diagnostic Orb", "Hands-free verbal field inquiry")
        ])
    ]

    col_w = 176
    gap = 9.5
    start_x = 24
    for idx, (stitle, color, items) in enumerate(stages):
        cx = start_x + idx * (col_w + gap)
        s_patch = patches.FancyBboxPatch((cx, 394), col_w, 64, boxstyle="round,pad=0.2",
                                         fc="#141E38", ec=color, lw=1.0)
        ax.add_patch(s_patch)
        ax.text(cx + col_w / 2.0, 449, stitle, fontsize=7.2, fontweight="bold",
                color=color, ha="center", va="center", fontfamily="sans-serif")
        for i_idx, (k, v) in enumerate(items):
            iy = 436 - i_idx * 13.5
            ax.text(cx + 6, iy, f"• {k}:", fontsize=6.2, fontweight="bold", color="#E2E8F0", fontfamily="sans-serif")
            ax.text(cx + 10, iy - 5.5, v, fontsize=5.6, color="#94A3B8", fontfamily="sans-serif")

    # -------------------------------------------------------------------------
    # 3. MATHEMATICAL OPERATIONS & CALCULATIONS (Y: 34 to 382)
    # -------------------------------------------------------------------------
    math_cards = [
        {
            "x": 15, "y": 210, "w": 460, "h": 172,
            "title": "A. SOLAR GEOMETRY & HIGH-ALTITUDE IRRADIANCE",
            "tag": "Duffie & Beckman / Perez Solar Model",
            "border": "#38BDF8",
            "formulas": [
                ("Solar Declination Angle (delta):",
                 r"$\delta = 23.45^\circ \times \sin[(360^\circ / 365) \times (284 + n)]$",
                 "n = day of year [1..365]; orbital obliquity tilt calculation"),
                ("Solar Altitude Angle (alpha_s):",
                 r"$\sin\alpha_s = \sin\phi\sin\delta + \cos\phi\cos\delta\cos\omega$",
                 r"$\phi$ = latitude, $\omega = 15^\circ(t_{solar} - 12)$ hour angle"),
                ("Surface Incidence Angle Clamp (cos theta):",
                 r"$\cos\theta = \max(\sin\alpha_s\cos\beta + \cos\alpha_s\sin\beta\cos(\gamma_s - \gamma_{surf}),\ 0.0)$",
                 "Clamped at zero: prevents non-physical negative solar cooling"),
                ("Total Absorbed Surface Solar Irradiance:",
                 r"$I_{tot} = I_{beam}\cos\theta + I_{diff}\frac{1+\cos\beta}{2} + GHI \cdot \rho_{snow}\frac{1-\cos\beta}{2}$",
                 r"Direct beam + isotropic diffuse + snow reflected ($\rho_{snow} = 0.75$)")
            ]
        },
        {
            "x": 485, "y": 210, "w": 460, "h": 172,
            "title": "B. TRANSIENT RC FOURIER SOLVER & STABILITY",
            "tag": "EN ISO 52016-1 / 1D Multi-Layer RC Discretization",
            "border": "#10B981",
            "formulas": [
                ("1D Heat Diffusion Equation:",
                 r"$\rho c_p \frac{\partial T}{\partial t} = \frac{\partial}{\partial x}(k \frac{\partial T}{\partial x})$",
                 "Dynamic transient heat transfer through multi-layer envelope"),
                ("Nodal Capacitance & Conductance:",
                 r"$C_i = \rho c_p \Delta x A, \quad K_{i,i+1} = \frac{k A}{\Delta x}$",
                 "Discretised nodal thermal mass (J/K) and conductances (W/K)"),
                ("Explicit Euler Stability Ceiling (Fourier Number):",
                 r"$Fo = \frac{\alpha \Delta t}{(\Delta x)^2} \leq 0.25 \ \Rightarrow \ \Delta x_{max} = \sqrt{\frac{\alpha \Delta t}{Fo_{target}}}$",
                 r"$\alpha = k/(\rho c_p)$ diffusivity; dynamically prevents numerical divergence"),
                ("Assembly Thermal Resistance & Overall U-Value:",
                 r"$R_{tot} = R_{si} + \sum \frac{L_j}{k_j} + R_{se}, \quad U = \frac{1}{R_{tot}}$",
                 r"ISO 6946 film resistances: $R_{si}=0.13, R_{se}=0.04\ \mathrm{m^2K/W}$")
            ]
        },
        {
            "x": 15, "y": 34, "w": 460, "h": 170,
            "title": "C. RAREFIED ATMOSPHERE, SKY SINK & INFILTRATION",
            "tag": "ISA Barometric Model / Swinbank Radiant Sink",
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
                 r"$\sigma = 5.67\times 10^{-8}$, $F_{sky}=1.0$ (roof), 0.5 (walls); severe subzero sink")
            ]
        },
        {
            "x": 485, "y": 34, "w": 460, "h": 170,
            "title": "D. THERMAL ATTRIBUTION, PARETO MCDA & SAFETY",
            "tag": "DRDO Decision Framework / ASHRAE 62.2 Safety",
            "border": "#EC4899",
            "formulas": [
                ("100% Component Heat Loss Attribution & Bottleneck:",
                 r"$P_k = \frac{Q_k}{\sum Q_{loss}} \times 100\%, \quad k^* = \mathrm{argmax}_k(P_k)$",
                 "Identifies primary thermodynamic loss vector (Sky vs Wall vs Infiltration)"),
                ("Pareto Dominance Principle (Cost vs Discomfort):",
                 r"$\mathrm{A\ dominates\ B:\ Cost}_A \leq \mathrm{Cost}_B\ \mathrm{and}\ \mathrm{Discomf}_A \leq \mathrm{Discomf}_B$",
                 "Strict multi-objective minimization without arbitrary subjective weighting"),
                ("Normalized Utopia Distance (Balanced Pareto Knee):",
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
        c_patch = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.3",
                                         fc="#0D152A", ec=card["border"], lw=1.1)
        ax.add_patch(c_patch)

        # Header of card
        ax.text(x + 10, y + h - 14, card["title"], fontsize=8.0, fontweight="bold",
                color="#FFFFFF", fontfamily="sans-serif")
        ax.text(x + w - 10, y + h - 14, card["tag"], fontsize=6.4,
                color=card["border"], ha="right", fontfamily="sans-serif")

        # Divider line
        ax.plot([x + 8, x + w - 8], [y + h - 19, y + h - 19], color="#1E293B", lw=0.8)

        # Formulas
        f_start_y = y + h - 29
        f_gap = 36.5
        for f_idx, (label, eq, note) in enumerate(card["formulas"]):
            fy = f_start_y - f_idx * f_gap
            ax.text(x + 10, fy, label, fontsize=6.8, fontweight="bold", color="#CBD5E1", fontfamily="sans-serif")
            ax.text(x + 16, fy - 12.5, eq, fontsize=7.8, color="#38BDF8", fontfamily="serif")
            ax.text(x + 16, fy - 22.0, f"↳ {note}", fontsize=5.8, color="#94A3B8", fontfamily="sans-serif")

    # -------------------------------------------------------------------------
    # 4. SIH TEMPLATE FOOTER (Y: 0 to 26)
    # -------------------------------------------------------------------------
    footer_bar = patches.Rectangle((0, 0), 960, 26, fc="#0284C7")
    ax.add_patch(footer_bar)
    ax.text(480, 13, "@SIH Idea submission- Template  3", fontsize=8.2, color="#FFFFFF",
            ha="center", va="center", fontfamily="sans-serif")

    # Save outputs
    plt.savefig(STANDALONE_PDF, format="pdf", dpi=300)
    plt.savefig(STANDALONE_PNG, format="png", dpi=250)
    plt.close()
    print(f"Standalone Slide 3 PDF generated: {STANDALONE_PDF}")
    print(f"Standalone Slide 3 PNG generated: {STANDALONE_PNG}")

def compile_full_presentation():
    # Load the original 7-page template
    reader = pypdf.PdfReader(TEMPLATE_PDF)
    writer = pypdf.PdfWriter()

    # Load our newly generated slide 3 PDF
    slide3_reader = pypdf.PdfReader(STANDALONE_PDF)
    new_slide3_page = slide3_reader.pages[0]

    # Reconstruct presentation
    for page_idx in range(len(reader.pages)):
        if page_idx == 2:  # Page 3 (0-indexed 2)
            writer.add_page(new_slide3_page)
            print("Replaced Slide 3 with generated Technical Approach board.")
        else:
            writer.add_page(reader.pages[page_idx])

    with open(FINAL_PRESENTATION_PDF, "wb") as f:
        writer.write(f)

    print(f"Complete Presentation PDF saved: {FINAL_PRESENTATION_PDF} ({len(writer.pages)} pages)")

if __name__ == "__main__":
    generate_slide_3()
    compile_full_presentation()
