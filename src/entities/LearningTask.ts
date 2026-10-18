import type { TaskType } from './constants';

export interface LearningTaskProps {
  id?: number | null;
  sectionId?: number | null;
  title: string;
  expectedDurationHours: number;
  position?: number;
}

export interface LearningTaskRow {
  id: number;
  section_id: number;
  type: TaskType;
  title: string;
  // mysql2 returns DECIMAL columns as strings.
  expected_duration_hours: string | number;
  position: number;
}

const MAX_DURATION_HOURS = 9999.99;

/** Base class for every kind of task inside a learning section. */
export abstract class LearningTask {
  abstract readonly type: TaskType;
  id: number | null;
  sectionId: number | null;
  title: string;
  expectedDurationHours: number;
  position: number;

  constructor({ id = null, sectionId = null, title, expectedDurationHours, position = 0 }: LearningTaskProps) {
    if (!title?.trim()) throw new Error('Title is required');
    if (!Number.isFinite(expectedDurationHours) || expectedDurationHours <= 0 || expectedDurationHours > MAX_DURATION_HOURS) {
      throw new Error(`Expected duration must be between 0 and ${MAX_DURATION_HOURS} hours`);
    }
    this.id = id;
    this.sectionId = sectionId;
    this.title = title;
    this.expectedDurationHours = expectedDurationHours;
    this.position = position;
  }

  static baseFromRow(row: LearningTaskRow): Required<LearningTaskProps> {
    return {
      id: row.id,
      sectionId: row.section_id,
      title: row.title,
      expectedDurationHours: Number(row.expected_duration_hours),
      position: row.position,
    };
  }
}
