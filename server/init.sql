PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS reminder_logs;
DROP TABLE IF EXISTS reminder_settings;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS skin_cancer_trend;
DROP TABLE IF EXISTS monthly_uv_2pm;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  uv_threshold INTEGER DEFAULT 8,
  threshold_enabled INTEGER DEFAULT 0,
  dynamic_theme_enabled INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE reminder_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  start_time TEXT,
  interval_hours INTEGER,
  enabled INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE reminder_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reminder_time DATETIME,
  status TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE skin_cancer_trend (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  incidence_rate REAL NOT NULL
);

CREATE TABLE monthly_uv_2pm (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  avg_uv_2pm REAL NOT NULL
);

INSERT INTO users (username, email)
VALUES ('demo_user', 'demo@example.com');

INSERT INTO user_preferences (
  user_id,
  uv_threshold,
  threshold_enabled,
  dynamic_theme_enabled
)
VALUES (1, 8, 0, 1);

INSERT INTO reminder_settings (
  user_id,
  start_time,
  interval_hours,
  enabled
)
VALUES (1, '10:00', 2, 0);

INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (1, 6.0);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (2, 6.5);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (3, 4.5);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (4, 2.0);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (5, 1.2);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (6, 0.7);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (7, 0.8);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (8, 1.5);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (9, 2.0);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (10, 3.5);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (11, 4.5);
INSERT INTO monthly_uv_2pm (month, avg_uv_2pm) VALUES (12, 6.4);