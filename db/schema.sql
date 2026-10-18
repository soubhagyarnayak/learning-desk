-- Learning Desk schema (MySQL 8+)
-- Runs against the database selected on the connection (DB_NAME in .env).
-- Baseline only: after running this on a fresh database, apply db/migrations with `npm run db:migrate`.

CREATE TABLE IF NOT EXISTS learning_plans (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title                   VARCHAR(255) NOT NULL,
  objective               TEXT NOT NULL,
  expected_duration_weeks SMALLINT UNSIGNED NOT NULL,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_sections (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id                INT UNSIGNED NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  objective              TEXT NOT NULL,
  expected_duration_days SMALLINT UNSIGNED NOT NULL,
  position               INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (plan_id) REFERENCES learning_plans(id) ON DELETE CASCADE
);

-- Common columns for every task; type-specific data lives in the tables below.
CREATE TABLE IF NOT EXISTS learning_tasks (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section_id INT UNSIGNED NOT NULL,
  type       ENUM('lecture_note', 'lecture_video', 'coding_assignment',
                  'reading_assignment', 'writing_assignment') NOT NULL,
  title      VARCHAR(255) NOT NULL,
  position   INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (section_id) REFERENCES learning_sections(id) ON DELETE CASCADE
);

-- Lecture notes and reading assignments.
CREATE TABLE IF NOT EXISTS task_contents (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id      INT UNSIGNED NOT NULL UNIQUE,
  content_type ENUM('pdf', 'markdown', 'text', 'url') NOT NULL,
  file_path    VARCHAR(1024) NULL,
  body         MEDIUMTEXT NULL,
  url          VARCHAR(2048) NULL,
  FOREIGN KEY (task_id) REFERENCES learning_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lecture_videos (
  task_id INT UNSIGNED PRIMARY KEY,
  url     VARCHAR(2048) NOT NULL,
  FOREIGN KEY (task_id) REFERENCES learning_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coding_assignments (
  task_id  INT UNSIGNED PRIMARY KEY,
  question TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES learning_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coding_test_cases (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id         INT UNSIGNED NOT NULL,
  input           TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
  position        INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (task_id) REFERENCES coding_assignments(task_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS writing_assignments (
  task_id                 INT UNSIGNED PRIMARY KEY,
  question                TEXT NOT NULL,
  evaluation_instructions TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES learning_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_sessions (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(255) NOT NULL,
  status     ENUM('planned', 'in_progress', 'completed') NOT NULL DEFAULT 'planned',
  start_date DATE NULL,
  end_date   DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES learning_plans(id) ON DELETE RESTRICT
);
