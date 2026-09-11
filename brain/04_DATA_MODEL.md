# 04 — DATA MODEL

SQLite. Four tables. File at `/data/therma.db`, **committed to the repo** so everyone has identical data.

## materials

```sql
CREATE TABLE materials (
  id                TEXT PRIMARY KEY,   -- 'mud_brick'
  name              TEXT NOT NULL,      -- 'Mud brick (adobe)'
  category          TEXT NOT NULL,      -- structural|insulation|glazing|mass|relief
  k                 REAL NOT NULL,      -- thermal conductivity   W/m.K
  rho               REAL NOT NULL,      -- density                kg/m3
  cp                REAL NOT NULL,      -- specific heat          J/kg.K
  absorptivity      REAL,               -- solar, 0-1
  emissivity        REAL,               -- long-wave, 0-1
  g_value           REAL,               -- glazing only, 0-1
  u_value           REAL,               -- glazing only, W/m2.K
  cost_per_m3       REAL,               -- INR
  cost_source       TEXT,               -- NULL => render as [estimate]
  install_note      TEXT,               -- 'local craftsman, 1 day'
  locally_available INTEGER DEFAULT 0,  -- obtainable in Leh?
  source            TEXT NOT NULL       -- 'ASHRAE HoF 2021 Ch.26 Tbl 1'
);
```

**`source` is NOT NULL and is enforced at load time.** `materials.load()` raises `UnsourcedMaterialError` on any row with an empty source. This is the mechanical enforcement of Rule R1.

`cost_source` may be NULL — that material's cost renders with an `[estimate]` tag in the UI. Labelled, never hidden.

## weather_cache

```sql
CREATE TABLE weather_cache (
  lat        REAL, lon REAL,
  date       TEXT,               -- ISO yyyy-mm-dd
  hour       INTEGER,            -- 0-23, local
  t_air      REAL,               -- degC
  ghi        REAL,               -- W/m2 global horizontal
  dni        REAL,               -- W/m2 direct normal
  dhi        REAL,               -- W/m2 diffuse horizontal
  wind       REAL,               -- m/s
  rh         REAL,               -- %
  snow_cover INTEGER,            -- 0/1
  provider   TEXT,               -- 'open-meteo' | 'nasa-power' | 'user-csv' | 'fallback'
  fetched_at TEXT,
  PRIMARY KEY (lat, lon, date, hour)
);
```

Coordinates rounded to 4 dp before insert or lookup, or the cache never hits.

## worst_night_profile

```sql
CREATE TABLE worst_night_profile (
  lat REAL, lon REAL,
  hour INTEGER,                  -- 0-23
  t_air REAL,                    -- degC, synthesised diurnal
  ghi REAL,                      -- W/m2
  p1_daily_min_c REAL,           -- 1st pct daily minimum over record
  p5_daily_ghi REAL,             -- 5th pct daily irradiance
  years_used INTEGER,
  grid_note TEXT,                -- 'NASA POWER ~0.5x0.625 deg — regional estimate'
  PRIMARY KEY (lat, lon, hour)
);
```

`grid_note` is **rendered in the UI**, not just stored. NASA POWER meteorology is gridded at roughly 0.5° × 0.625° — about a 50 km cell. In Ladakh's terrain that is a regional estimate, not a site measurement. Label it as such.

## runs

```sql
CREATE TABLE runs (
  id           TEXT PRIMARY KEY,   -- uuid4
  created_at   TEXT,
  kind         TEXT,               -- 'simulate' | 'optimize' | 'validation'
  request_json TEXT,
  result_json  TEXT
);
```

Convenience only. Nothing depends on it.

---

## In-memory structures

### Design
```python
@dataclass(frozen=True)
class Design:
    orientation_deg: float          # 0=N, 90=E, 180=S
    walls:  tuple[Layer, ...]       # outside -> inside
    roof:   tuple[Layer, ...]
    floor:  tuple[Layer, ...]
    openings: tuple[Opening, ...]
    ach: float                      # air changes per hour
    roof_emissivity: float
    night_shutter: bool
```
Frozen so it can be hashed and cached.

### Layer
```python
@dataclass(frozen=True)
class Layer:
    material_id: str
    thickness_m: float
```

### NodeArray — the vectorised form
```
T         : float64 (MAX_NODES, N)   node temperatures, KELVIN
C         : float64 (MAX_NODES, N)   capacitance, J/K
K         : float64 (MAX_NODES, N)   conductance to next node, W/K
active    : bool    (MAX_NODES, N)   padding mask
surf_idx  : int     (n_surfaces, N)  index of outermost node per surface
```

**`MAX_NODES` is fixed.** Designs with fewer nodes are padded: `active=False`, `C=inf`, `K=0`. Padded nodes must contribute exactly zero to every flow. Assert this in tests — silent leakage through padding is the nastiest bug available in this design.

## Seeding

`/data/materials.csv` is the source of truth, human-editable, in git. `scripts/seed.py` rebuilds `therma.db` from it. Never hand-edit the `.db`.

Minimum material set for the demo:

| Category | Entries |
|---|---|
| structural | mud brick, rammed earth, stone masonry, CGI sheet, prefab sandwich panel |
| insulation | EPS, rockwool, straw, air gap |
| glazing | single pane, double pane, double + night shutter |
| mass | concrete, water wall, stone floor |
| relief | tarpaulin, plastic sheeting, blanket layer, mud skirt |

Every row needs a real `source`. If a value can't be sourced, **the row does not ship** — better a smaller library than an invented one.
