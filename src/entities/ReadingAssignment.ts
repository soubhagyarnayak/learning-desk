import { LearningTask, type LearningTaskProps } from './LearningTask';
import { Content, type ContentProps } from './Content';
import { TaskType } from './constants';

export interface ReadingAssignmentProps extends LearningTaskProps {
  content: Content | ContentProps;
}

/** Reading assignment: content as pdf, markdown, text document or external url. */
export class ReadingAssignment extends LearningTask {
  readonly type = TaskType.READING_ASSIGNMENT;
  content: Content;

  constructor({ content, ...base }: ReadingAssignmentProps) {
    super(base);
    this.content = content instanceof Content ? content : new Content(content);
  }
}
