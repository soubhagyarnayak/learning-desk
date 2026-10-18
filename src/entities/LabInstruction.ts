export interface LabInstructionProps {
  id?: number | null;
  taskId?: number | null;
  content: string;
  position?: number;
}

export interface LabInstructionRow {
  id: number;
  task_id: number;
  position: number;
  content: string;
}

/** One step of a lab assignment; `position` sets the order the steps are carried out in. */
export class LabInstruction {
  id: number | null;
  taskId: number | null;
  content: string;
  position: number;

  constructor({ id = null, taskId = null, content, position = 0 }: LabInstructionProps) {
    if (!content?.trim()) throw new Error('Lab instructions cannot be empty');
    this.id = id;
    this.taskId = taskId;
    this.content = content;
    this.position = position;
  }

  static fromRow(row: LabInstructionRow): LabInstruction {
    return new LabInstruction({
      id: row.id,
      taskId: row.task_id,
      content: row.content,
      position: row.position,
    });
  }
}
