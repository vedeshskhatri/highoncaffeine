-- THERMA Database Schema per brain/04_DATA_MODEL.md
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
