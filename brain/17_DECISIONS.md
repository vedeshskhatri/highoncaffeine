# 17 — DECISIONS

Architectural decision record. Append-only. Each entry states what, why, alternatives, and consequences.

---

### D1 — Simplified RC network, not CFD
**Decision:** EN ISO 52016-1 5R1C thermal network.
**Why:** it is an international standard written for this exact class of problem, and a decision tool must run the model thousands of times. ANSYS is accurate and slow; that trade-off is wrong here.
**Alternatives:** ANSYS Fluent (hours per run, licence-locked, student cell caps), EnergyPlus (needs EPW files that don't exist for these sites, expert-only, forward-simulation only).
**Consequence:** we accept known deviations in load profiles and multi-pane windows, and we state them.
**Precedent:** ShelTherm reached mean error +0.94 °C vs real shelters (CIBSE Admittance: +4.95 °C), ISO 13792 Class 1.

### D2 — SQLite, not Postgres
**Decision:** SQLite, file committed to repo.
**Why:** three tables. Setup friction across four machines exceeds any benefit. Identical data for everyone with zero install.
**Consequence:** if asked about scale — "SQLite for the prototype; the data layer is one module, swapping to Postgres is a config change." That is a better answer than having spent two hours on Postgres.

### D3 — No ORM
**Why:** three tables. Raw `sqlite3` plus a thin `db.py` is ~40 lines. An ORM at hour 4 is how you lose hour 8. Typed models live in Pydantic, so the "data modelling" requirement is still met.

### D4 — Prisma rejected
**Why:** Node/TS ORM; engine must be Python for NumPy vectorisation. Forces either a second service (extra hop, two configs, one more failure point) or `prisma-client-py` (community-maintained, codegen step, lags upstream).

### D5 — Docker dropped
**Why:** it existed solely to host Postgres. No Postgres, no need. Containerising app processes costs hot-reload and time on WSL.

### D6 — Vectorised batch solving with fixed node count
**Decision:** all designs as columns of `(MAX_NODES, N)`; shorter designs padded with inert nodes.
**Why:** a per-design loop makes a 3,000-variant search take minutes instead of seconds, which kills the product's central claim.
**Consequence:** padding must be provably inert. Test 7 exists for this.

### D7 — Glazing has zero capacitance
**Why:** glass time constant would force an impractically small timestep and destabilise the solver before anything else. Standard practice.
**Consequence:** stated openly in Q&A as a modelling simplification.

### D8 — IMAC plus a health threshold, not plain PMV
**Why:** PMV is valid only near 1 atm; at Leh's ~0.65 atm the error exceeds a full sensation unit. PMV also under-predicts Indian adaptivity, which is why IMAC is in the NBC.
**Consequence:** we must state that IMAC was built for hot Indian zones and no adaptive model is validated for the cold high-altitude zone. That gap is a genuine contribution to name.

### D9 — Safety interlock against our own optimizer
**Decision:** refuse designs below the ventilation floor when an unflued combustion heater is present.
**Why:** the optimizer will drive infiltration down because sealing reduces losses. People burn kerosene bukharis inside these shelters. Sealing a shelter containing a combustion heater kills people.
**Consequence:** refusals are a 200 response with a reason, and the refused count is reported, not hidden.

### D10 — Copy-as-text, not PDF
**Why:** a PDF library is build risk for no added value. A clipboard button is ten lines.

### D11 — 3D view and ML surrogate cut
**Why:** headcount dropped to four. The 3D idea was sound — sun path, per-face surface temperature, heat flux arrows — and the sun geometry is already computed for solar gain. It is a roadmap item, not a rejected idea.

### D12 — Nepal application included, but not as the opening
**Why:** the connection is real — a Himalayan winter, temporary shelter, destroyed supply roads is our exact problem. But the event is recent and ongoing, with over 1,300 dead and thousands missing. Using it as an emotional hook reads as exploitative.
**Consequence:** it appears at the end, stated flatly, as evidence the generalisation claim is not hypothetical.

### D13 — DM Sans substituted for Google Sans
**Why:** Google Sans is Google's proprietary brand typeface and is not publicly licensed for web use. DM Sans is the closest open geometric-humanist match.
**Consequence:** one variable in `tokens.css`. Swappable in one edit if a licensed copy is obtained.

### D14 — Provisional colour palette
**Why:** the team palette had not arrived at spec time.
**Consequence:** no component hardcodes a colour. All colours resolve through `tokens.css`, so the swap is one file. Semantic discipline (red = below health threshold, green = comfort, amber = estimate) must survive the swap.

### D15 — Single-branch trunk workflow
**Decision:** one `main` branch, direct pushes, no PRs, no feature branches, push at the end of every phase. Existing branches merged and deleted.
**Why:** four to six people on a compressed timeline. Branch and PR overhead costs more coordination time than the review catches, and reconciling six long-lived branches at hour 20 is a worse failure mode than a briefly broken main. Contribution remains individually attributed because everyone pushes their own commits, which is what the evaluation criteria actually require.
**Alternatives:** feature branches with PR review (rejected: overhead at this team size and timeline); one person merging everything (rejected: explicitly penalised by the evaluation criteria).
**Consequence:** no review gate. Pull-rebase-test-push discipline becomes mandatory and a broken main is everyone's emergency. CI moves from pre-merge to post-push. Branch deletion is a human action, never an agent action.

### D16 — ANSYS reinstated as reference model (partial reversal of D1)
**Decision:** build three canonical cases in ANSYS Transient Thermal as a reference model; keep the Python 5R1C solver as the searchable surrogate, validated against ANSYS.
**Why:** the PS explicitly names ANSYS ("Development of a general model in ANSYS software"). D1's original reasoning conflated "ANSYS cannot search a design space" (true, and still our justification for the surrogate) with "we should not use ANSYS at all" (wrong — the Student edition is free and its caps are generous for a single-room box; the real cost was learning time, which is a scheduling question, not a capability one). Building both gives a second validation axis, and it is the axis the PS author named.
**Consequence:** ~6-10 h of one person's time, scheduled outside V1-V5. The ANSYS piece is three cases, not a general parameterised model, and we say so. Solar is an imposed flux boundary condition, not a computed solar load, and we say that too.
D1 is NOT deleted — it remains the record of why the surrogate exists.

