# 14 — DEMO CHECKLIST

## 1. Pre-flight — 30 minutes before

- [ ] `git pull`, clean install, both servers start from the two documented commands
- [ ] **Network disconnected** — full simulation still runs from cache
- [ ] Validation panel loads from committed results
- [ ] Optimizer completes in under 10 s on the demo machine
- [ ] Browser zoom 100%, dev tools closed, no console errors
- [ ] Notifications off, screen sleep off
- [ ] Baseline and optimal designs pre-loaded and verified
- [ ] Fallback: screenshots of every beat, in case the machine fails

## 2. The eight beats — 90 seconds

**Beat 0 — the cost of staying warm (10 s, before the tool loads)**
One screen, three numbers, no chart:
> ₹2,400 to deliver one litre of kerosene to Siachen.
> A 15-man post burns ~112 litres a month.
> **₹3.2 lakh a month, per post, to not freeze.**

The room now understands *why* before a single chart appears. Every number that follows lands as a logistics answer.

**Beat 1 — the failure (15 s)**
Standard prefab hut, Leh, 15 January. Flip to **design winter night**. Simulate. Indoor collapses to −18 °C by 04:00.
> *"This is what soldiers actually sleep in. And this isn't a typical night — it's the 1-percentile night, because that's what you design for."*

**Beat 2 — the constraint (10 s)**
Toggle **locally available materials only**. Pareto front visibly shifts.
> *"We constrain to what's physically available in Leh. No point recommending aerogel if it can't get up the road."*

**Beat 3 — the search (15 s) — the theatrical moment, narrate it**
Hit Optimize. During the pause:
> *"Three thousand two hundred designs. Twenty-four hours of weather simulated for each. Five seconds."*

**Beat 4 — the fix (10 s)**
Best design holds +17 °C till sunrise. Zero fuel.

**Beat 5 — the reasoning (15 s)**
> *"Night shutters gave you 6 °C — five hundred rupees a window, one day of a local craftsman's time. Another hundred millimetres of stone wall gave you 0.4 °C and twelve tonnes of material at altitude."*
Then the ΔT chart: *"and this is heat flow across the temperature difference, hour by hour — requirement three in the problem statement."*

**Beat 6 — the proof (10 s)**
Validation panel. Our curve through three measured points.
> *"We didn't validate against a simulation. We validated against DIHAR's published measurements."*

**Beat 7 — the leave-behind (5 s)**
Copy spec sheet, paste it visibly.
> *"1,180 litres a year. Payback 2.4 years."*

## 3. Name the PS requirements out loud

As each appears on screen, say it. Make it effortless for an evaluator to tick boxes.
- Beat 1 → requirement 1, predicted indoor temperature
- Beat 4/5 → requirement 2, solar thermal gain
- Beat 5 → requirement 3, heat flow across ΔT

## 4. Also show, if asked

- Rejected input → inline validation
- 0.3 ACH + unflued heater → RefusalCard
- Retrofit mode → degrees per rupee
- Relief shelter mode → the Nepal application

## 5. Nepal — handle with care

Over 1,300 killed, ~5,500 missing, 84,270 affected, roads and bridges destroyed. It happened weeks ago and recovery is ongoing.

**Do not open with it. Do not use photos or death tolls for emotional effect.** That reads as exploitative and a sharp judge will feel it.

Use it at the end, flat and factual, as evidence the generalisation claim is not hypothetical:
> *"Same engine, different crisis. The problem statement asks for other climatic regions — those are people facing a Himalayan winter in temporary shelter with the supply roads gone. Change the material library and the tool answers that too."*

## 6. Cut rules if behind

| Situation | Action |
|---|---|
| Behind at H8 | cut Trombe, relief mode, portfolio mode |
| Validation failing at H15 | **everyone debugs.** Nothing else matters |
| Optimizer slow | drop to 500 samples, state it honestly |
| Only one thing works | make it the collapse-then-hold contrast |

**Never cut:** the overnight curve, the Optimize button, the kerosene number, the validation panel.
