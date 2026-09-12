import matplotlib.mathtext as mathtext
import matplotlib.font_manager as fm

parser = mathtext.MathTextParser('agg')
prop = fm.FontProperties()

test_calc = [
    r"$\mathrm{Parameters:\ } A = 10\ \mathrm{m^2},\ U = 0.30\ \mathrm{W/m^2K},\ \Delta T = 18 - (-19) = 37\ \mathrm{K}$",
    r"$\mathrm{Governing\ Eq:\ } Q_{wall} = U \cdot A \cdot \Delta T$",
    r"$\mathrm{Substitution:\ } Q_{wall} = 0.30 \times 10 \times 37 = \mathbf{111\ W}\ (0.111\ \mathrm{kW})$",
    r"$\mathrm{Parameters:\ } ACH = 0.5\ \mathrm{h^{-1}},\ V = 60\ \mathrm{m^3},\ \rho_{air} = 0.90\ \mathrm{kg/m^3},\ c_p = 1005\ \mathrm{J/kgK}$",
    r"$\mathrm{Governing\ Eq:\ } Q_{inf} = \frac{ACH \cdot V \cdot \rho_{air} \cdot c_p \cdot \Delta T}{3600}$",
    r"$\mathrm{Substitution:\ } Q_{inf} = \frac{0.5 \times 60 \times 0.90 \times 1005 \times 37}{3600} = \mathbf{279\ W}\ (0.279\ \mathrm{kW})$",
    r"$\mathrm{Parameters:\ } L = 100\ \mathrm{mm} = 0.10\ \mathrm{m},\ k = 0.024\ \mathrm{W/mK}\ (\mathrm{Aerogel/PIR\ Core})$",
    r"$\mathrm{Governing\ Eq:\ } R = \frac{L}{k}, \quad U_{assembly} = \frac{1}{R_{si} + R + R_{se}}$",
    r"$\mathrm{Substitution:\ } R = \frac{0.10}{0.024} = \mathbf{4.17\ \mathrm{m^2K/W}} \to U_{assembly} \approx 0.23\ \mathrm{W/m^2K}$"
]

for m in test_calc:
    try:
        parser.parse(m, 100, prop)
    except Exception as e:
        print('FAILED:', m)
        print('ERROR:', e)
print('Done testing calc lines!')
