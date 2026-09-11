-- THERMA Database Schema per brain/04_DATA_MODEL.md and brain/07A_PLATFORM_CONTRACT_PROPOSAL.md
-- SQLite 3 compatible

CREATE TABLE IF NOT EXISTS materials (
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
  locally_available INTEGER DEFAULT 0,  -- obtainable in Leh? (0 or 1)
  source            TEXT NOT NULL       -- 'ASHRAE HoF 2021 Ch.26 Tbl 1'
);

CREATE TABLE IF NOT EXISTS weather_cache (
  lat        REAL,
  lon        REAL,
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

CREATE TABLE IF NOT EXISTS worst_night_profile (
  lat            REAL,
  lon            REAL,
  hour           INTEGER,        -- 0-23
  t_air          REAL,           -- degC, synthesised diurnal
  ghi            REAL,           -- W/m2
  p1_daily_min_c REAL,           -- 1st pct daily minimum over record
  p5_daily_ghi   REAL,           -- 5th pct daily irradiance
  years_used     INTEGER,
  grid_note      TEXT,           -- 'NASA POWER ~0.5x0.625 deg — regional estimate'
  PRIMARY KEY (lat, lon, hour)
);

CREATE TABLE IF NOT EXISTS runs (
  id           TEXT PRIMARY KEY, -- uuid4
  created_at   TEXT,
  kind         TEXT,             -- 'simulate' | 'optimize' | 'validation'
  request_json TEXT,
  result_json  TEXT
);

CREATE TABLE IF NOT EXISTS forecast_watch_cache (
  lat           REAL,
  lon           REAL,
  forecast_date TEXT,               -- ISO yyyy-mm-dd
  hour          INTEGER,            -- 0-23
  t_air         REAL,               -- degC
  ghi           REAL,               -- W/m2
  fetched_at    TEXT,
  PRIMARY KEY (lat, lon, forecast_date, hour)
);

-- ===========================================================================
-- THERMA PLATFORM ASSET MANAGEMENT TABLES (Phase P0 per prompt & 07A proposal)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS sites (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  estate              TEXT NOT NULL DEFAULT 'Ladakh',  -- 'Ladakh' | 'Nepal Relief'
  lat                 REAL NOT NULL,
  lon                 REAL NOT NULL,
  altitude_m          REAL NOT NULL,
  district            TEXT NOT NULL,                   -- 'Leh' | 'Kargil' | 'Rasuwa'
  site_type           TEXT NOT NULL,                   -- 'forward_post' | 'relief_camp' | 'dwelling'
  occupants           INTEGER NOT NULL DEFAULT 8,
  current_design_json TEXT,                            -- full envelope & geometry json
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_results (
  site_id             TEXT PRIMARY KEY,                -- 1:1 current evaluated cache
  computed_at         TEXT NOT NULL,
  weather_mode        TEXT NOT NULL,                   -- 'typical_day' | 'design_winter_night'
  summary_json        TEXT NOT NULL,                   -- cached engine output
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS designs (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  revision            INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'approved' | 'superseded'
  design_json         TEXT NOT NULL,
  author              TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  parent_id           TEXT,
  FOREIGN KEY (parent_id) REFERENCES designs(id)
);

CREATE TABLE IF NOT EXISTS site_history (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id             TEXT NOT NULL,
  changed_at          TEXT NOT NULL,
  field               TEXT NOT NULL,
  old_value           TEXT,
  new_value           TEXT,
  note                TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id                  TEXT PRIMARY KEY,
  site_id             TEXT NOT NULL,
  kind                TEXT NOT NULL,                   -- 'cold_snap'
  severity            TEXT NOT NULL,                   -- 'critical' | 'warning' | 'advisory'
  window_start        TEXT NOT NULL,
  window_end          TEXT NOT NULL,
  detail_json         TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  acknowledged        INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);
