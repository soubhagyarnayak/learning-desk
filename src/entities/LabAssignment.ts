import { LearningTask, type LearningTaskProps } from './LearningTask';
import { LabInstruction, type LabInstructionProps } from './LabInstruction';
import { TaskType } from './constants';

export interface LabAssignmentProps extends LearningTaskProps {
  /** In the order they must be carried out. */
  instructions: (LabInstruction | LabInstructionProps)[];
}

/** Lab assignment: text instructions the learner executes one after another. */
export class LabAssignment extends LearningTask {
  readonly type = TaskType.LAB_ASSIGNMENT;
  instructions: LabInstruction[];

  constructor({ instructions, ...base }: LabAssignmentProps) {
    super(base);
    if (instructions.length === 0) throw new Error('Lab assignment requires at least one instruction');
    // Array order is the execution order; positions are renumbered to match it.
    this.instructions = instructions.map((instruction, position) => new LabInstruction({ ...instruction, position }));
  }
}
