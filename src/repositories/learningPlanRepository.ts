import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { LearningPlan, type LearningPlanRow } from '../entities';

type LearningPlanRowPacket = LearningPlanRow & RowDataPacket;

export async function findAll(): Promise<LearningPlan[]> {
  const [rows] = await pool.query<LearningPlanRowPacket[]>(
    'SELECT * FROM learning_plans ORDER BY created_at DESC, id DESC',
  );
  return rows.map((row) => LearningPlan.fromRow(row));
}

export async function findById(id: number): Promise<LearningPlan | null> {
  const [rows] = await pool.query<LearningPlanRowPacket[]>('SELECT * FROM learning_plans WHERE id = ?', [id]);
  return rows.length ? LearningPlan.fromRow(rows[0]) : null;
}

/** New plans start at 0 weeks; the duration grows as sections and tasks are added. */
export async function create(plan: LearningPlan): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO learning_plans (title, objective, expected_duration_weeks) VALUES (?, ?, 0)',
    [plan.title, plan.objective],
  );
  return result.insertId;
}

/** Updates the editable fields; the duration is maintained by durationService. */
export async function update(plan: LearningPlan): Promise<void> {
  if (plan.id === null) throw new Error('Cannot update a learning plan without an id');
  await pool.execute('UPDATE learning_plans SET title = ?, objective = ? WHERE id = ?', [
    plan.title,
    plan.objective,
    plan.id,
  ]);
}
