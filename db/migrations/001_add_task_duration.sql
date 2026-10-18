-- Tasks carry an expected duration; section days and plan weeks are derived from it.
ALTER TABLE learning_tasks
  ADD COLUMN expected_duration_hours DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER title;
