import type { LearningSection } from './LearningSection';

export interface LearningPlanProps {
  id?: number | null;
  title: string;
  objective: string;
  // Derived from the plan's sections; see durationService.
  expectedDurationWeeks?: number;
  sections?: LearningSection[];
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface LearningPlanRow {
  id: number;
  title: string;
  objective: string;
  expected_duration_weeks: number;
  created_at: Date;
  updated_at: Date;
}

/** A learning plan: an objective, an expected duration and ordered sections. */
export class LearningPlan {
  id: number | null;
  title: string;
  objective: string;
  expectedDurationWeeks: number;
  sections: LearningSection[];
  createdAt: Date | null;
  updatedAt: Date | null;

  constructor({ id = null, title, objective, expectedDurationWeeks = 0, sections = [], createdAt = null, updatedAt = null }: LearningPlanProps) {
    if (!title?.trim()) throw new Error('Title is required');
    if (!objective?.trim()) throw new Error('Objective is required');
    if (!Number.isInteger(expectedDurationWeeks) || expectedDurationWeeks < 0) {
      throw new Error('expectedDurationWeeks must be a non-negative integer');
    }
    this.id = id;
    this.title = title;
    this.objective = objective;
    this.expectedDurationWeeks = expectedDurationWeeks;
    this.sections = sections;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /** Sum of the section days, before conversion to weeks. */
  get totalSectionDays(): number {
    return this.sections.reduce((sum, section) => sum + section.expectedDurationDays, 0);
  }

  static fromRow(row: LearningPlanRow): LearningPlan {
    return new LearningPlan({
      id: row.id,
      title: row.title,
      objective: row.objective,
      expectedDurationWeeks: row.expected_duration_weeks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
