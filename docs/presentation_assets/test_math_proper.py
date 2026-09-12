import matplotlib.mathtext as mathtext
import matplotlib.font_manager as fm

parser = mathtext.MathTextParser('agg')
prop = fm.FontProperties()

test_maths = [
    r"$\delta = 23.45^\circ \sin[(360^\circ / 365) \times (284 + n)]$",
    r"$\omega = 15^\circ(t_{solar} - 12)$",
    r"$\sin\alpha_s = \sin\phi\sin\delta + \cos\phi\cos\delta\cos\omega$",
    r"$\cos\theta = \max(\sin\alpha_s\cos\beta + \cos\alpha_s\sin\beta\cos(\gamma_s - \gamma),\ 0)$",
    r"$I_{tot} = I_{beam}\cos\theta + I_{diff}\frac{1+\cos\beta}{2} + GHI \cdot \rho_{snow}\frac{1-\cos\beta}{2}$",
    r"$\rho c_p \frac{\partial T}{\partial t} = \frac{\partial}{\partial x}(k \frac{\partial T}{\partial x})$",
    r"$C \frac{dT}{dt} = \sum Q_{in} - \sum Q_{out} = \sum K_{ij}(T_j - T) + Q_{source}$",
    r"$R_{tot} = R_{si} + \sum \frac{L_j}{k_j} + R_{se}, \quad U = \frac{1}{R_{tot}}$",
    r"$C_i = \rho c_p \Delta x A, \quad K = \frac{kA}{\Delta x}, \quad \frac{1}{K_{eff}} = \frac{1}{K_a} + \frac{1}{K_b}$",
    r"$Fo = \frac{\alpha \Delta t}{(\Delta x)^2} \leq 0.25 \ \Rightarrow \ \Delta x_{max} = \sqrt{\frac{\alpha \Delta t}{Fo_{target}}}$",
    r"$P(h) = 101325 \cdot (1 - 2.25577 \times 10^{-5}h)^{5.25588}\ \mathrm{Pa}$",
    r"$\rho_{air}(h, T) = \frac{P(h)}{287.058 \cdot T_{air}}\ \mathrm{kg/m^3}$",
    r"$Q_{inf} = \frac{ACH \cdot V \cdot \rho_{air} \cdot c_p \cdot (T_{in} - T_{out})}{3600}\ \mathrm{W}$",
    r"$T_{sky} = 0.0552 \cdot T_{air}^{1.5}\ \mathrm{K}\quad (T_{air}\ \mathrm{in\ Kelvin})$",
    r"$h_r = \varepsilon \sigma (T_s^2 + T_{sky}^2)(T_s + T_{sky}), \quad Q_{sky} = h_r A F_{sky}(T_s - T_{sky})$",
    r"$P_k = \frac{Q_k}{\sum Q_{loss}} \times 100\%, \quad k^* = \mathrm{argmax}_k(P_k)$",
    r"$\min J = w_1 \cdot \mathrm{Cost} + w_2 \cdot \mathrm{Discomfort}$",
    r"$\mathrm{Design\ A\ dominates\ B:\ Cost}_A \leq \mathrm{Cost}_B\ \mathrm{and}\ \mathrm{Discomf}_A \leq \mathrm{Discomf}_B$",
    r"$D_i = \sqrt{(1 - c_i^*)^2 + (k_i^* - 0)^2} \to \min$",
    r"$\mathrm{Combustion\ Heater\ and\ } ACH < 0.35\ \mathrm{h^{-1}} \Rightarrow \mathbf{REFUSED}$"
]

all_passed = True
for m in test_maths:
    try:
        parser.parse(m, 100, prop)
    except Exception as e:
        print('FAILED:', m)
        print('ERROR:', e)
        all_passed = False

if all_passed:
    print('ALL 20 FORMULAS PASSED PARSING PERFECTLY!')
