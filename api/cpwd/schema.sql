-- CPWD Knowledge Database Schema
-- Normalized SQLite 3 schema for DSR, DAR & Specifications (Horticulture & Landscaping)
-- Separate storage for 2016, 2018, 2020, 2025 editions

CREATE TABLE IF NOT EXISTS cpwd_documents (
  id             TEXT PRIMARY KEY,
  filename       TEXT NOT NULL,
  year           INTEGER NOT NULL,
  total_pages    INTEGER NOT NULL,
  title          TEXT NOT NULL,
  checksum       TEXT,
  ingested_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cpwd_sections (
  id             TEXT PRIMARY KEY,
  year           INTEGER NOT NULL,
  section_name   TEXT NOT NULL,
  subhead        TEXT,
  page_start     INTEGER,
  page_end       INTEGER
);

CREATE TABLE IF NOT EXISTS cpwd_items (
  id              TEXT PRIMARY KEY,
  item_code       TEXT NOT NULL,
  description     TEXT NOT NULL,
  unit            TEXT,
  rate            REAL,
  rate_year       INTEGER NOT NULL,
  category        TEXT NOT NULL DEFAULT 'Horticulture and Landscaping',
  subhead         TEXT,
  source_document TEXT NOT NULL,
  page            INTEGER NOT NULL,
  source_text     TEXT,
  is_ocr          INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cpwd_items_code_year ON cpwd_items(item_code, rate_year);
CREATE INDEX IF NOT EXISTS idx_cpwd_items_year ON cpwd_items(rate_year);
CREATE INDEX IF NOT EXISTS idx_cpwd_items_category ON cpwd_items(category);

CREATE TABLE IF NOT EXISTS cpwd_rates (
  id              TEXT PRIMARY KEY,
  item_code       TEXT NOT NULL,
  rate_year       INTEGER NOT NULL,
  unit            TEXT,
  rate            REAL NOT NULL,
  source_document TEXT,
  page            INTEGER,
  UNIQUE(item_code, rate_year)
);

CREATE INDEX IF NOT EXISTS idx_cpwd_rates_code_year ON cpwd_rates(item_code, rate_year);

CREATE TABLE IF NOT EXISTS cpwd_labour_rates (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL,
  trade_name      TEXT NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'Day',
  rate            REAL NOT NULL,
  year            INTEGER NOT NULL,
  source_document TEXT NOT NULL,
  page            INTEGER NOT NULL,
  UNIQUE(code, year)
);

CREATE INDEX IF NOT EXISTS idx_cpwd_labour_year ON cpwd_labour_rates(year);

CREATE TABLE IF NOT EXISTS cpwd_materials (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL,
  description     TEXT NOT NULL,
  unit            TEXT,
  rate            REAL NOT NULL,
  year            INTEGER NOT NULL,
  category        TEXT NOT NULL DEFAULT 'Material',
  source_document TEXT NOT NULL,
  page            INTEGER NOT NULL,
  UNIQUE(code, year)
);

CREATE TABLE IF NOT EXISTS cpwd_plant_items (
  id              TEXT PRIMARY KEY,
  item_code       TEXT NOT NULL,
  common_name     TEXT,
  botanical_name  TEXT,
  category        TEXT,
  size_spec       TEXT,
  unit            TEXT,
  rate            REAL,
  year            INTEGER NOT NULL,
  source_document TEXT NOT NULL,
  page            INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cpwd_analysis_of_rates (
  id              TEXT PRIMARY KEY,
  item_code       TEXT NOT NULL,
  description     TEXT,
  component_type  TEXT,
  component_desc  TEXT,
  quantity        REAL,
  unit            TEXT,
  rate            REAL,
  amount          REAL,
  year            INTEGER NOT NULL,
  page            INTEGER NOT NULL,
  source_document TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cpwd_specifications (
  id              TEXT PRIMARY KEY,
  clause_no       TEXT,
  title           TEXT NOT NULL,
  section         TEXT,
  full_text       TEXT NOT NULL,
  year            INTEGER NOT NULL,
  page            INTEGER NOT NULL,
  source_document TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cpwd_chunks (
  id              TEXT PRIMARY KEY,
  document_year   INTEGER NOT NULL,
  page            INTEGER NOT NULL,
  section         TEXT,
  subhead         TEXT,
  item_code       TEXT,
  data_type       TEXT NOT NULL,
  title           TEXT,
  content         TEXT NOT NULL,
  embedding_blob  BLOB
);

CREATE INDEX IF NOT EXISTS idx_cpwd_chunks_year ON cpwd_chunks(document_year);
CREATE INDEX IF NOT EXISTS idx_cpwd_chunks_code ON cpwd_chunks(item_code);

-- Full-text search virtual table for hybrid keyword / exact phrase matching
CREATE VIRTUAL TABLE IF NOT EXISTS cpwd_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  item_code,
  year UNINDEXED,
  title,
  content
);
