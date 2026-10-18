import type { AnyTask } from './tasks';

export interface LearningSectionProps {
  id?: number | null;
  planId?: number | null;
  title: string;
  objective: string;
  // Derived from the section's tasks; see durationService.
  expectedDurationDays?: number;
  position?: number;
  tasks?: AnyTask[];
}

export interface LearningSectionRow {
  id: number;
  plan_id: number;
  title: string;
  objective: string;
  expected_duration_days: number;
  position: number;
}

/** A section of a learning plan, made up of ordered learning tasks. */
export class LearningSection {
  id: number | null;
  planId: number | null;
  title: string;
  objective: string;
  expectedDurationDays: number;
  position: number;
  tasks: AnyTask[];

  constructor({ id = null, planId = null, title, objective, expectedDurationDays = 0, position = 0, tasks = [] }: LearningSectionProps) {
    if (!title?.trim()) throw new Error('Title is required');
    if (!objective?.trim()) throw new Error('Objective is required');
    if (!Number.isInteger(expectedDurationDays) || expectedDurationDays < 0) {
      throw new Error('expectedDurationDays must be a non-negative integer');
    }
    this.id = id;
    this.planId = planId;
    this.title = title;
    this.objective = objective;
    this.expectedDurationDays = expectedDurationDays;
    this.position = position;
    this.tasks = tasks;
  }

  /** Sum of the task hours, before conversion to days. */
  get totalTaskHours(): number {
    return this.tasks.reduce((sum, task) => sum + task.expectedDurationHours, 0);
  }

  static fromRow(row: LearningSectionRow): LearningSection {
    return new LearningSection({
      id: row.id,
      planId: row.plan_id,
      title: row.title,
      objective: row.objective,
      expectedDurationDays: row.expected_duration_days,
      position: row.position,
    });
  }
}
