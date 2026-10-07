-- My gym on ChatGPT Sites: schema for the D1 database (binding DB).
-- Documents keep the same JSON shape as the Claude variant (see AGENTS.md); the columns next to
-- the JSON are what the queries filter and sort by. Every row belongs to one user_id.

CREATE TABLE IF NOT EXISTS plans (
  user_id    TEXT NOT NULL PRIMARY KEY,
  plan_json  TEXT NOT NULL,            -- PlanDoc: { plans, tabs, soon, profil }
  updated_at TEXT NOT NULL             -- ISO 8601
);

-- Performed workouts: the history. One row per workout id (YYYY-MM-DD_tN) per user.
CREATE TABLE IF NOT EXISTS workouts (
  user_id      TEXT NOT NULL,
  id           TEXT NOT NULL,          -- YYYY-MM-DD_tN
  date         TEXT NOT NULL,          -- YYYY-MM-DD
  training     TEXT NOT NULL,          -- tN
  finished     INTEGER NOT NULL DEFAULT 0,
  workout_json TEXT NOT NULL,          -- Workout: { id, trening, data, warm, cool, sets, fb, notes, finished, updatedAt }
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS workouts_user_date ON workouts (user_id, date DESC);
CREATE INDEX IF NOT EXISTS workouts_user_training_date ON workouts (user_id, training, date DESC);

-- Targets for the next workout of a training. Separate from history on purpose.
CREATE TABLE IF NOT EXISTS targets (
  user_id     TEXT NOT NULL,
  training    TEXT NOT NULL,           -- tN
  target_json TEXT NOT NULL,           -- Target: { trening, ex: { A1: { kg, reps, note } }, note, updatedAt }
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, training)
);

-- Read-only view of single sets for ad-hoc analysis (the application does not query it).
CREATE VIEW IF NOT EXISTS workout_sets AS
  SELECT w.user_id, w.id AS workout_id, w.date, w.training,
         ex.key AS exercise, s.key AS set_index,
         json_extract(s.value, '$.kg') AS kg,
         json_extract(s.value, '$.reps') AS reps,
         json_extract(s.value, '$.done') AS done
  FROM workouts AS w,
       json_each(w.workout_json, '$.sets') AS ex,
       json_each(ex.value) AS s;
