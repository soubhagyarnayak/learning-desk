import { LearningTask, type LearningTaskProps } from './LearningTask';
import { TaskType } from './constants';
import { isHttpUrl } from './validation';

export interface LectureVideoProps extends LearningTaskProps {
  url: string;
}

/** Lecture video: always hosted externally. */
export class LectureVideo extends LearningTask {
  readonly type = TaskType.LECTURE_VIDEO;
  url: string;

  constructor({ url, ...base }: LectureVideoProps) {
    super(base);
    if (!isHttpUrl(url)) throw new Error('Lecture video requires a valid http(s) url');
    this.url = url;
  }
}
