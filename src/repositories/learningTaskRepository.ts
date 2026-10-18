import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool, { type Queryable } from '../config/db';
import {
  Content,
  LabInstruction,
  LearningTask,
  TaskType,
  TestCase,
  createTask,
  type AnyTask,
  type ContentRow,
  type LabInstructionRow,
  type LearningTaskRow,
  type TestCaseRow,
} from '../entities';

type TaskRowPacket = LearningTaskRow & RowDataPacket;
type ContentRowPacket = ContentRow & RowDataPacket;
type TestCaseRowPacket = TestCaseRow & RowDataPacket;
type LabInstructionRowPacket = LabInstructionRow & RowDataPacket;
interface VideoRow extends RowDataPacket {
  task_id: number;
  url: string;
}
interface CodingRow extends RowDataPacket {
  task_id: number;
  question: string;
}
interface WritingRow extends RowDataPacket {
  task_id: number;
  question: string;
  evaluation_instructions: string;
}

function requireRow<T>(rows: Map<number, T>, taskId: number, table: string): T {
  const row = rows.get(taskId);
  if (!row) throw new Error(`Task ${taskId} is missing its ${table} row`);
  return row;
}

/** Loads the type-specific rows for the given base rows and builds full task entities. */
async function hydrate(db: Queryable, rows: LearningTaskRow[]): Promise<AnyTask[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);

  const [contents] = await db.query<ContentRowPacket[]>('SELECT * FROM task_contents WHERE task_id IN (?)', [ids]);
  const [videos] = await db.query<VideoRow[]>('SELECT * FROM lecture_videos WHERE task_id IN (?)', [ids]);
  const [codings] = await db.query<CodingRow[]>('SELECT * FROM coding_assignments WHERE task_id IN (?)', [ids]);
  const [testCases] = await db.query<TestCaseRowPacket[]>(
    'SELECT * FROM coding_test_cases WHERE task_id IN (?) ORDER BY position, id',
    [ids],
  );
  const [writings] = await db.query<WritingRow[]>('SELECT * FROM writing_assignments WHERE task_id IN (?)', [ids]);
  const [labInstructions] = await db.query<LabInstructionRowPacket[]>(
    'SELECT * FROM lab_instructions WHERE task_id IN (?) ORDER BY position',
    [ids],
  );

  const contentByTask = new Map(contents.map((row) => [row.task_id, row]));
  const videoByTask = new Map(videos.map((row) => [row.task_id, row]));
  const codingByTask = new Map(codings.map((row) => [row.task_id, row]));
  const writingByTask = new Map(writings.map((row) => [row.task_id, row]));
  const testCasesByTask = new Map<number, TestCase[]>();
  for (const row of testCases) {
    const list = testCasesByTask.get(row.task_id) ?? [];
    list.push(TestCase.fromRow(row));
    testCasesByTask.set(row.task_id, list);
  }
  const labInstructionsByTask = new Map<number, LabInstruction[]>();
  for (const row of labInstructions) {
    const list = labInstructionsByTask.get(row.task_id) ?? [];
    list.push(LabInstruction.fromRow(row));
    labInstructionsByTask.set(row.task_id, list);
  }

  return rows.map((row): AnyTask => {
    const base = LearningTask.baseFromRow(row);
    switch (row.type) {
      case TaskType.LECTURE_NOTE:
      case TaskType.READING_ASSIGNMENT:
        return createTask({ type: row.type, ...base, content: Content.fromRow(requireRow(contentByTask, row.id, 'task_contents')) });
      case TaskType.LECTURE_VIDEO:
        return createTask({ type: row.type, ...base, url: requireRow(videoByTask, row.id, 'lecture_videos').url });
      case TaskType.CODING_ASSIGNMENT:
        return createTask({
          type: row.type,
          ...base,
          question: requireRow(codingByTask, row.id, 'coding_assignments').question,
          testCases: testCasesByTask.get(row.id) ?? [],
        });
      case TaskType.WRITING_ASSIGNMENT: {
        const writing = requireRow(writingByTask, row.id, 'writing_assignments');
        return createTask({
          type: row.type,
          ...base,
          question: writing.question,
          evaluationInstructions: writing.evaluation_instructions,
        });
      }
      case TaskType.LAB_ASSIGNMENT:
        return createTask({ type: row.type, ...base, instructions: labInstructionsByTask.get(row.id) ?? [] });
    }
  });
}

async function insertDetails(db: Queryable, taskId: number, task: AnyTask): Promise<void> {
  switch (task.type) {
    case TaskType.LECTURE_NOTE:
    case TaskType.READING_ASSIGNMENT:
      await db.execute(
        'INSERT INTO task_contents (task_id, content_type, file_path, body, url) VALUES (?, ?, ?, ?, ?)',
        [taskId, task.content.contentType, task.content.filePath, task.content.body, task.content.url],
      );
      break;
    case TaskType.LECTURE_VIDEO:
      await db.execute('INSERT INTO lecture_videos (task_id, url) VALUES (?, ?)', [taskId, task.url]);
      break;
    case TaskType.CODING_ASSIGNMENT:
      await db.execute('INSERT INTO coding_assignments (task_id, question) VALUES (?, ?)', [taskId, task.question]);
      for (const [position, testCase] of task.testCases.entries()) {
        await db.execute(
          'INSERT INTO coding_test_cases (task_id, input, expected_output, is_hidden, position) VALUES (?, ?, ?, ?, ?)',
          [taskId, testCase.input, testCase.expectedOutput, testCase.isHidden, position],
        );
      }
      break;
    case TaskType.WRITING_ASSIGNMENT:
      await db.execute(
        'INSERT INTO writing_assignments (task_id, question, evaluation_instructions) VALUES (?, ?, ?)',
        [taskId, task.question, task.evaluationInstructions],
      );
      break;
    case TaskType.LAB_ASSIGNMENT:
      for (const instruction of task.instructions) {
        await db.execute('INSERT INTO lab_instructions (task_id, position, content) VALUES (?, ?, ?)', [
          taskId,
          instruction.position,
          instruction.content,
        ]);
      }
      break;
  }
}

const detailTable: Record<TaskType, string> = {
  [TaskType.LECTURE_NOTE]: 'task_contents',
  [TaskType.READING_ASSIGNMENT]: 'task_contents',
  [TaskType.LECTURE_VIDEO]: 'lecture_videos',
  // Test cases cascade from coding_assignments.
  [TaskType.CODING_ASSIGNMENT]: 'coding_assignments',
  [TaskType.WRITING_ASSIGNMENT]: 'writing_assignments',
  [TaskType.LAB_ASSIGNMENT]: 'lab_instructions',
};

/** All tasks in a plan, in display order; group them by `sectionId`. */
export async function findByPlan(planId: number): Promise<AnyTask[]> {
  const [rows] = await pool.query<TaskRowPacket[]>(
    `SELECT t.* FROM learning_tasks t
       JOIN learning_sections s ON s.id = t.section_id
      WHERE s.plan_id = ?
      ORDER BY s.position, s.id, t.position, t.id`,
    [planId],
  );
  return hydrate(pool, rows);
}

/** Finds a task only if it belongs to the given section. */
export async function findById(sectionId: number, taskId: number): Promise<AnyTask | null> {
  const [rows] = await pool.query<TaskRowPacket[]>(
    'SELECT * FROM learning_tasks WHERE id = ? AND section_id = ?',
    [taskId, sectionId],
  );
  const [task] = await hydrate(pool, rows);
  return task ?? null;
}

/** Appends the task to the end of its section. */
export async function create(db: Queryable, task: AnyTask): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO learning_tasks (section_id, type, title, expected_duration_hours, position)
     SELECT ?, ?, ?, ?, COALESCE(MAX(position), -1) + 1 FROM learning_tasks WHERE section_id = ?`,
    [task.sectionId, task.type, task.title, task.expectedDurationHours, task.sectionId],
  );
  await insertDetails(db, result.insertId, task);
  return result.insertId;
}

/** Updates a task in place; the task type cannot change. */
export async function update(db: Queryable, task: AnyTask): Promise<void> {
  if (task.id === null) throw new Error('Cannot update a learning task without an id');
  await db.execute('UPDATE learning_tasks SET title = ?, expected_duration_hours = ? WHERE id = ?', [
    task.title,
    task.expectedDurationHours,
    task.id,
  ]);
  await db.execute(`DELETE FROM ${detailTable[task.type]} WHERE task_id = ?`, [task.id]);
  await insertDetails(db, task.id, task);
}

/** Deletes the task; type-specific rows are removed by ON DELETE CASCADE. */
export async function remove(db: Queryable, taskId: number): Promise<void> {
  await db.execute('DELETE FROM learning_tasks WHERE id = ?', [taskId]);
}

/** Uploaded files referenced by tasks in a section, so they can be cleaned up when it is deleted. */
export async function findFilePathsBySection(sectionId: number): Promise<string[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.file_path FROM task_contents c
       JOIN learning_tasks t ON t.id = c.task_id
      WHERE t.section_id = ? AND c.file_path IS NOT NULL`,
    [sectionId],
  );
  return rows.map((row) => row.file_path as string);
}

/** The uploaded file a task points to, if any. */
export function contentFilePath(task: AnyTask): string | null {
  return task.type === TaskType.LECTURE_NOTE || task.type === TaskType.READING_ASSIGNMENT ? task.content.filePath : null;
}
