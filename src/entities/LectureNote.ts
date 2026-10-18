import { LearningTask, type LearningTaskProps } from './LearningTask';
import { Content, type ContentProps } from './Content';
import { TaskType } from './constants';

export interface LectureNoteProps extends LearningTaskProps {
  content: Content | ContentProps;
}

/** Lecture note: content as pdf, markdown, text document or external url. */
export class LectureNote extends LearningTask {
  readonly type = TaskType.LECTURE_NOTE;
  content: Content;

  constructor({ content, ...base }: LectureNoteProps) {
    super(base);
    this.content = content instanceof Content ? content : new Content(content);
  }
}
