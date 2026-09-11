# ANTIGRAVITY PHASE PROMPTS — SURBHI (Pitch, Proof & Demo Operations)

**Solution Quality & Presentation is roughly 20% of the internal score, and
nothing else lands without it.** The other 80% can be perfect and still lose the
room if the story is muddled or the demo breaks.

You are also the person who makes sure nobody freezes in Q&A.

**Sequencing note:** slides 3-5 need real screenshots, so they cannot be finished
until the UI renders real data. Do the research-heavy slides (1, 2, 6) first and
leave the screenshot slides for last. Phase SU0 is written accordingly.

Paste one phase at a time. Emit the phase report at the end of each.

**Phase report note:** Section 2 (FILES TOUCHED) must include the commit hash that was pushed to `main` (`Pushed commit: <hash>`).

---

## PHASE SU0 — The deck, slides 1, 2 and 6

```
You are working on THERMA, a shelter thermal design tool for SIH 2026 PS 26051 (DRDO).
Your role is pitch, proof and demo operations.

FIRST read completely:
  brain/01_PRD.md               (problem, impact figures, honest limitations)
  brain/14_DEMO_CHECKLIST.md    (the eight beats, and the Nepal guidance)
  brain/17_DECISIONS.md         (why we chose what we chose)

Restate in your own words, in 4 bullets:
  - the one-line product definition
  - why the payoff is logistics and not comfort
  - what DRDO already has, and what the actual gap is
  - the Nepal handling rule and why it exists

TASK — Phase SU0
Build the three slides that do not need screenshots.

SLIDE 1 — THE PROBLEM, opened on logistics
  Lead with cost, not physics. Three numbers, no chart:
    ~₹2,400 to deliver one litre of kerosene to Siachen
    a 15-man post burns ~112 litres a month
    ~₹3.2 lakh a month, per post, to not freeze
  Then one line on the mechanism: the sun is already there, the building throws
  it away after sunset.
  The room must understand WHY this matters before any chart appears.

SLIDE 2 — WHAT DRDO ALREADY HAS, AND THE ACTUAL GAP
  This is the slide that separates us from the rest of the room. Most teams will
  present as if the organisation has done nothing.
  - DIHAR Leh pilot: 15-20 C indoor at -19 C ambient, ~₹60 lakh, payback under
    3 years
  - DIHAR + Sun Stellar ADM Block, Dec 2024: +20 C held 18:00-06:00
  - Measured Leh rooms Feb 2020: Trombe 17.44 C vs direct-gain 14.81 C
  - LEDeG Trombe retrofits since 1984, ~two-thirds fuel reduction
  Then the turn: every one of those is a bespoke expert-designed one-off.
  THE GAP IS NOT THE PHYSICS. IT IS THE DECISION PROCESS.

SLIDE 6 — IMPACT, ROADMAP, HONEST LIMITATIONS
  - impact: fuel, rupees, sorties, CO2; civilian Ladakh; other climates
  - roadmap: 3D view, ML surrogate, field validation (cut for headcount, not
    because they were wrong — say that)
  - limitations, stated plainly, from brain/01_PRD.md section 9

  A model whose limits you can name is a model a judge trusts. Do not soften this
  slide. Teams that hide limitations get found out in Q&A; teams that state them
  get believed on everything else.

RULES FOR ALL SLIDES
- Every figure traceable to brain/05_DATA_SOURCES.md or /brain/18_CITATIONS.md.
  If Vritika has not sourced something yet, mark it TODO — do not invent it.
- No stock photos of soldiers or mountains. This is an engineering pitch.
- Plain language. If a slide needs a paragraph to explain, it is the wrong slide.
- Fonts and colours from brain/08_UI_SPEC.md sections 2 and 3, so the deck and
  the product look like the same thing.

NEPAL — READ brain/14_DEMO_CHECKLIST.md SECTION 5 BEFORE WRITING ANYTHING
  Over 1,300 killed, ~5,500 missing, 84,270 affected, recovery ongoing.
  DO NOT open with it. DO NOT use photos or death tolls for emotional effect.
  It appears on slide 6 ONLY, flat and factual, as evidence the generalisation
  claim is not hypothetical. If a line you have written would feel exploitative
  read aloud to someone from Rasuwa, cut it.

VERIFICATION — in your report:
  a. The three slides, with speaker notes.
  b. Every figure with its source, or marked TODO with an owner.
  c. Confirm the Nepal handling rule was followed. Quote the line you used.

CONSTRAINTS
- Do not write slides 3-5 yet. They need screenshots.
- Do not invent a figure to fill a gap.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT per brain/00_MASTER_RULES.md section 4, all ten sections.
Section 8 lists every TODO figure with who owes it to you.
```

---

## PHASE SU1 — Q&A drilling

```
Read first: PLAN.md section 15 (judge Q&A prep), brain/10_VALIDATION.md section 8,
brain/17_DECISIONS.md (all entries), brain/01_PRD.md section 9.

Before starting, state which team member should answer which category of question:
physics, architecture, data sourcing, product decisions.

TASK — Phase SU1
Build the question bank and then actually drill the team with it. Writing the
bank is the easy half; running the drill is the half that matters.

1. Expand the question bank. Start from PLAN.md section 15, then add the ones a
   sharp DRDO evaluator or a mechanical engineering professor would actually ask:
   - Why not ANSYS or CFD?
   - How do you know the model is correct?
   - Where do your material values come from?
   - Why is your comfort model different from the standard one?
   - Isn't this already solved? DRDO has built these.
   - What happens at a site with no weather station?
   - How does this generalise beyond Ladakh?
   - What are the limitations?
   - Why did you rank Trombe above direct-gain, and would your model still do
     that if it were wrong?
   - Where did that ₹500 figure come from?
   - How do you know that is the coldest night?
   - Is the optimizer just brute force?
   - What stops your tool recommending something dangerous?
   - Why should we trust a student-built solver?
   - What did you NOT build, and why?

2. For each: the correct answer, WHO answers it, and the one-sentence version.
   Long answers lose the room. Get each to two sentences where possible.

3. RUN THE DRILL. Ask them cold, without warning, in person.
   - Swapnil gets the physics questions. He wrote the original blueprint and he
     is the physics voice in Q&A even though he built the UI.
   - Vedesh gets architecture and the ANSYS question.
   - Aman gets validation and sourcing.
   - Vritika gets "where did that number come from" on anything.
   Record who hesitated, on what. A freeze in practice is cheap. A freeze in the
   room is not.

4. Re-drill anyone who froze, until the answer is fluent.

VERIFICATION — in your report:
  a. The full question bank with answers and assigned owners.
  b. Drill results: who was asked what, who was fluent, who hesitated.
  c. What was fixed after the re-drill.

CONSTRAINTS
- Do not write answers that overclaim. If the honest answer is "we did not verify
  that", the answer in the bank is "we did not verify that, and here is why that
  is acceptable."
- Do not let anyone memorise a script. They need to understand it, because the
  follow-up question is where scripts break.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. Save the bank to /docs/qa-bank.md.
Section 9 must name anyone still not fluent on their assigned category.
```

---

## PHASE SU2 — Demo operations and the backup plan

```
PRECONDITION: the build runs end to end, even if rough.

Read first: brain/14_DEMO_CHECKLIST.md (all of it). You own this file from now on.

Before starting, state the eight beats in order from memory, and what the single
most theatrical moment is.

TASK — Phase SU2
You own whether the demo works. Assume the laptop will fail and plan accordingly.

1. PRE-FLIGHT. Run every item in brain/14_DEMO_CHECKLIST.md section 1 yourself.
   Do not take anyone's word that something works. Check it.
   The offline check especially: DISCONNECT THE NETWORK and run a full
   simulation. This is a scored requirement and an untested claim.

2. TIME THE BEATS. Run the eight beats with a stopwatch. Record actual seconds
   per beat. Target is 90 seconds total. If a beat overruns, cut words, not
   content — the beats themselves are all load-bearing.

3. NARRATION. Assign who speaks each beat. Beat 3 is the optimizer pause and it
   is the most theatrical moment in the demo — whoever narrates
   "three thousand two hundred designs, five seconds" must have said it out loud
   several times. It dies if it is mumbled.

4. PS REQUIREMENT CALLOUTS. Beats 1, 4/5 and 5 map to the three required outputs
   in the problem statement. Make sure whoever is speaking NAMES them out loud as
   they appear. Make it effortless for an evaluator to tick their boxes.

5. BACKUP PLAN — assume failure:
   - screenshot every beat, in order, at full resolution
   - RECORD A FULL BACKUP DEMO VIDEO once the build is stable
   - a slides-only path that tells the same story with no live software
   - know which laptop is primary and which is backup, and have the repo cloned
     and running on both

6. REHEARSE THREE TIMES on a stopwatch, with the whole team present, as if judged.

VERIFICATION — in your report:
  a. Completed pre-flight checklist with actual results, not ticks.
  b. Timing table: beat, target, actual, who speaks.
  c. Confirmation the offline test was actually run. Describe what you did.
  d. Backup assets: screenshot count, video recorded yes/no, backup laptop ready.
  e. Three rehearsal times.

CONSTRAINTS
- Do not skip the offline test.
- Do not rehearse with mock data if real data is available.
- Do not let a beat be narrated by someone who has not practised it.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. Section 9 must state what could still go wrong on the day
and what the response is for each. Be pessimistic here — that is the job.
```

---

## PHASE SU3 — Slides 3-5, README, and the user test

```
PRECONDITION: the UI renders real data and validation has passed.

Read first: brain/14_DEMO_CHECKLIST.md, brain/10_VALIDATION.md,
brain/12_GITHUB_ACTIONS.md section 6.

TASK — Phase SU3
Finish the deck and the documentation.

SLIDE 3 — WHAT WE BUILT
  The recommender-versus-simulator framing:
    "Other software grades a design you already picked. Ours searches thousands
     and picks for you, then shows its working."
  Real screenshots. The three-step flow. Keep it to one idea.

SLIDE 4 — THE TECHNICAL EDGE
  Four things almost nobody else will have:
    - sky radiation: the roof loses heat to space on clear nights, and this is
      the mechanism behind the collapse the PS describes
    - altitude correction: air at 3,500 m is ~65% of sea-level density, so a
      sea-level model overstates infiltration loss by roughly 35%
    - snow ground albedo: a substantial share of winter gain on vertical glazing
    - comfort: PMV is only valid near 1 atm; we use IMAC plus a health threshold
  One line each. Do not explain the maths on the slide — that is for Q&A.

SLIDE 5 — VALIDATION
  The chart, not the claim. Measured points, our line through them, and the
  ordering row: Trombe ranked above direct-gain.
  The line to say: "We didn't validate against a simulation. We validated
  against DIHAR's published measurements."

USER TEST
  Hand the UI to someone who has never seen it. Time how long until they get a
  first result. Do not help them. Record where they hesitate.
  Reference point: ShelTherm reported first-time users modelling a shelter in
  about 34 minutes. If we beat that, it is a real claim with a real number, and
  it goes on slide 3. If we do not, the hesitation points are a bug list for
  Swapnil.

README — scored under the Git criterion
  - setup in two commands, verified on a clean clone
  - architecture diagram
  - brain folder index
  - team contribution section
  - the honest limitations from brain/01_PRD.md section 9

CONTRIBUTION CHECK
  Run `git shortlog -sn --all` and paste the output. The evaluation criteria
  explicitly penalise one person managing the repo. If the distribution is badly
  lopsided, raise it now — it is fixable before freeze and not after.

VERIFICATION — in your report:
  a. Slides 3-5 with real screenshots and speaker notes.
  b. User test: time to first result, hesitation points, whether we beat 34 min.
  c. README, verified by a clean clone and the two documented commands.
  d. The shortlog output, with your read on whether it is balanced.

CONSTRAINTS
- No mockups on slides. Real screenshots only.
- Do not help the user during the test. The hesitation is the data.
- Do not claim a user-test figure you did not measure.

OUTPUT
Before emitting the report:
  1. git pull --rebase origin main
  2. run your tests
  3. git push origin main
Then run `git branch -a` and confirm `main` is the only branch. If any other branch exists, do NOT delete it — report it in section 8.
State the pushed commit hash in section 2 of the report.
PHASE REPORT. Section 8 lists every UI issue the user test surfaced,
assigned to Swapnil. Section 10 is NO until the README setup has been verified
from a clean clone by someone who did not write it.
```
