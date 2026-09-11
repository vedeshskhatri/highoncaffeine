# 16 — CHANGELOG

Append-only. Never edit another person's entry. One line per phase completion or material decision.

Format:
```
[YYYY-MM-DD HH:MM] <AGENT><PHASE> — <what changed> — <why, if not obvious>
```

---

```
[2026-09-11 00:00] INIT — brain folder created, 17 spec files + 4 phase prompt sets
[2026-09-11 00:00] INIT — stack locked: Python/NumPy/FastAPI/SQLite/React/Vite/Tailwind/Recharts
[2026-09-11 00:00] INIT — rejected Postgres, Prisma, ORM, Docker, Streamlit, PDF export (see 02_TRD §1)
[2026-09-11 00:00] INIT — 3D view and ML surrogate cut for headcount, moved to roadmap
[2026-09-11 00:00] INIT — fonts: Montserrat + DM Sans (Google Sans not web-licensed) + JetBrains Mono
[2026-09-11 00:00] INIT — colour palette PROVISIONAL pending team palette
```

---

## Contract changes

Any change to `07_API_CONTRACT.md` gets its own entry here with the reason and who approved it. Contract changes are the highest-risk edits in the project because three people build against it.

## Validation history

Every `validation.run` result gets logged here, pass or fail. Failures are as informative as passes and must not be deleted.
