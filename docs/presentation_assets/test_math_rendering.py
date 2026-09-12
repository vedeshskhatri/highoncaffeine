import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(6, 4))
ax.text(0.1, 0.8, r"$\delta = 23.45^\circ \sin[\frac{360}{365}(284+n)]$", fontsize=12)
ax.text(0.1, 0.6, r"$\rho c_p \frac{\partial T}{\partial t} = \frac{\partial}{\partial x}(k \frac{\partial T}{\partial x})$", fontsize=12)
ax.text(0.1, 0.4, r"$P(h) = 101325 (1 - 2.25577 \times 10^{-5}h)^{5.25588}$", fontsize=12)
ax.text(0.1, 0.2, r"$Q_{inf} = \frac{ACH \cdot V \cdot \rho \cdot c_p \cdot \Delta T}{3600}$", fontsize=12)
fig.savefig("/tmp/test_math.png")
plt.close()
print("Math rendering test successful!")
