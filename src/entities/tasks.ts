import { TaskType } from './constants';
import { LectureNote, type LectureNoteProps } from './LectureNote';
import { LectureVideo, type LectureVideoProps } from './LectureVideo';
import { CodingAssignment, type CodingAssignmentProps } from './CodingAssignment';
import { ReadingAssignment, type ReadingAssignmentProps } from './ReadingAssignment';
import { WritingAssignment, type WritingAssignmentProps } from './WritingAssignment';
import { LabAssignment, type LabAssignmentProps } from './LabAssignment';

/** Any concrete task; narrow on `task.type` to get the specific class. */
export type AnyTask =
  | LectureNote
  | LectureVideo
  | CodingAssignment
  | ReadingAssignment
  | WritingAssignment
  | LabAssignment;

export type TaskInput =
  | ({ type: typeof TaskType.LECTURE_NOTE } & LectureNoteProps)
  | ({ type: typeof TaskType.LECTURE_VIDEO } & LectureVideoProps)
  | ({ type: typeof TaskType.CODING_ASSIGNMENT } & CodingAssignmentProps)
  | ({ type: typeof TaskType.READING_ASSIGNMENT } & ReadingAssignmentProps)
  | ({ type: typeof TaskType.WRITING_ASSIGNMENT } & WritingAssignmentProps)
  | ({ type: typeof TaskType.LAB_ASSIGNMENT } & LabAssignmentProps);

/** Build the right LearningTask subclass from a plain object with a `type` field. */
export function createTask(input: TaskInput): AnyTask {
  switch (input.type) {
    case TaskType.LECTURE_NOTE:
      return new LectureNote(input);
    case TaskType.LECTURE_VIDEO:
      return new LectureVideo(input);
    case TaskType.CODING_ASSIGNMENT:
      return new CodingAssignment(input);
    case TaskType.READING_ASSIGNMENT:
      return new ReadingAssignment(input);
    case TaskType.WRITING_ASSIGNMENT:
      return new WritingAssignment(input);
    case TaskType.LAB_ASSIGNMENT:
      return new LabAssignment(input);
    default: {
      const unknownType: never = input;
      throw new Error(`Unknown task type: ${(unknownType as { type: string }).type}`);
    }
  }
}
