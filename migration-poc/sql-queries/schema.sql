-- raw_dataシート相当のテーブル。日付・真偽値はSQLiteに専用の型がないため
-- ISO 8601文字列（YYYY-MM-DD）/ 0・1 の INTEGER で統一する方針で設計する
CREATE TABLE raw_data (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  amount INTEGER NOT NULL,
  institution TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  memo TEXT NOT NULL DEFAULT '',
  is_transfer INTEGER NOT NULL DEFAULT 0,
  is_target INTEGER NOT NULL DEFAULT 1,
  imported_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  category_locked INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_raw_data_date ON raw_data (date);
CREATE INDEX idx_raw_data_category ON raw_data (category);
