-- Lab assignments: ordered text instructions the learner carries out one after another.
ALTER TABLE learning_tasks
  MODIFY COLUMN type ENUM('lecture_note', 'lecture_video', 'coding_assignment',
                          'reading_assignment', 'writing_assignment', 'lab_assignment') NOT NULL;

CREATE TABLE IF NOT EXISTS lab_instructions (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id  INT UNSIGNED NOT NULL,
  position INT UNSIGNED NOT NULL,
  content  TEXT NOT NULL,
  UNIQUE KEY uq_lab_instructions_task_position (task_id, position),
  FOREIGN KEY (task_id) REFERENCES learning_tasks(id) ON DELETE CASCADE
);
