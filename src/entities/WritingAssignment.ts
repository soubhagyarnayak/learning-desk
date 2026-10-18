import { LearningTask, type LearningTaskProps } from './LearningTask';
import { TaskType } from './constants';

export interface WritingAssignmentProps extends LearningTaskProps {
  question: string;
  evaluationInstructions: string;
}

/** Writing assignment: a question and text instructions on how to evaluate the answer. */
export class WritingAssignment extends LearningTask {
  readonly type = TaskType.WRITING_ASSIGNMENT;
  question: string;
  evaluationInstructions: string;

  constructor({ question, evaluationInstructions, ...base }: WritingAssignmentProps) {
    super(base);
    if (!question) throw new Error('Writing assignment requires a question');
    if (!evaluationInstructions) throw new Error('Writing assignment requires evaluation instructions');
    this.question = question;
    this.evaluationInstructions = evaluationInstructions;
  }
}
