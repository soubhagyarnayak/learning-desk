export interface TestCaseProps {
  id?: number | null;
  taskId?: number | null;
  input?: string;
  expectedOutput: string;
  isHidden?: boolean;
  position?: number;
}

export interface TestCaseRow {
  id: number;
  task_id: number;
  input: string;
  expected_output: string;
  is_hidden: number | boolean;
  position: number;
}

/** Single input/expected-output pair for a coding assignment. */
export class TestCase {
  id: number | null;
  taskId: number | null;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  position: number;

  constructor({ id = null, taskId = null, input = '', expectedOutput, isHidden = false, position = 0 }: TestCaseProps) {
    this.id = id;
    this.taskId = taskId;
    this.input = input;
    this.expectedOutput = expectedOutput;
    this.isHidden = isHidden;
    this.position = position;
  }

  static fromRow(row: TestCaseRow): TestCase {
    return new TestCase({
      id: row.id,
      taskId: row.task_id,
      input: row.input,
      expectedOutput: row.expected_output,
      isHidden: Boolean(row.is_hidden),
      position: row.position,
    });
  }
}
