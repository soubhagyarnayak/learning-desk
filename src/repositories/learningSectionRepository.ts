import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool, { type Queryable } from '../config/db';
import { LearningSection, type LearningSectionRow } from '../entities';

type LearningSectionRowPacket = LearningSectionRow & RowDataPacket;

export async function findByPlan(planId: number): Promise<LearningSection[]> {
  const [rows] = await pool.query<LearningSectionRowPacket[]>(
    'SELECT * FROM learning_sections WHERE plan_id = ? ORDER BY position, id',
    [planId],
  );
  return rows.map((row) => LearningSection.fromRow(row));
}

/** Finds a section only if it belongs to the given plan. */
export async function findById(planId: number, sectionId: number): Promise<LearningSection | null> {
  const [rows] = await pool.query<LearningSectionRowPacket[]>(
    'SELECT * FROM learning_sections WHERE id = ? AND plan_id = ?',
    [sectionId, planId],
  );
  return rows.length ? LearningSection.fromRow(rows[0]) : null;
}

/** Appends the section to the end of the plan; it starts at 0 days. */
export async function create(db: Queryable, section: LearningSection): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO learning_sections (plan_id, title, objective, expected_duration_days, position)
     SELECT ?, ?, ?, 0, COALESCE(MAX(position), -1) + 1 FROM learning_sections WHERE plan_id = ?`,
    [section.planId, section.title, section.objective, section.planId],
  );
  return result.insertId;
}

/** Updates the editable fields; the duration is maintained by durationService. */
export async function update(section: LearningSection): Promise<void> {
  if (section.id === null) throw new Error('Cannot update a learning section without an id');
  await pool.execute('UPDATE learning_sections SET title = ?, objective = ? WHERE id = ?', [
    section.title,
    section.objective,
    section.id,
  ]);
}

/** Deletes the section; its tasks are removed by ON DELETE CASCADE. */
export async function remove(db: Queryable, sectionId: number): Promise<void> {
  await db.execute('DELETE FROM learning_sections WHERE id = ?', [sectionId]);
}
