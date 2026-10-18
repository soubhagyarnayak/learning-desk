import type { Queryable } from '../config/db';
import { STUDY_HOURS_PER_DAY } from '../config/study';

/** Plan weeks = total section days / 7, rounded up (0 when the plan has no sections). */
export async function recalculatePlan(db: Queryable, planId: number): Promise<void> {
  await db.execute(
    `UPDATE learning_plans p
        SET expected_duration_weeks = (
          SELECT CEIL(COALESCE(SUM(s.expected_duration_days), 0) / 7)
            FROM learning_sections s
           WHERE s.plan_id = p.id)
      WHERE p.id = ?`,
    [planId],
  );
}

/** Section days = total task hours / study hours per day, rounded up (0 when it has no tasks). */
export async function recalculateSection(db: Queryable, sectionId: number): Promise<void> {
  await db.execute(
    `UPDATE learning_sections s
        SET expected_duration_days = (
          SELECT CEIL(COALESCE(SUM(t.expected_duration_hours), 0) / ?)
            FROM learning_tasks t
           WHERE t.section_id = s.id)
      WHERE s.id = ?`,
    [STUDY_HOURS_PER_DAY, sectionId],
  );
}

/** Call after any task in the section is added, changed or removed. */
export async function recalculateSectionAndPlan(db: Queryable, sectionId: number, planId: number): Promise<void> {
  await recalculateSection(db, sectionId);
  await recalculatePlan(db, planId);
}
