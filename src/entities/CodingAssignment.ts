import { LearningTask, type LearningTaskProps } from './LearningTask';
import { TestCase, type TestCaseProps } from './TestCase';
import { TaskType } from './constants';

export interface CodingAssignmentProps extends LearningTaskProps {
  question: string;
  testCases?: (TestCase | TestCaseProps)[];
}

/** Coding assignment: a question plus test cases to check the solution against. */
export class CodingAssignment extends LearningTask {
  readonly type = TaskType.CODING_ASSIGNMENT;
  question: string;
  testCases: TestCase[];

  constructor({ question, testCases = [], ...base }: CodingAssignmentProps) {
    super(base);
    if (!question) throw new Error('Coding assignment requires a question');
    if (testCases.length === 0) throw new Error('Coding assignment requires at least one test case');
    this.question = question;
    this.testCases = testCases.map((tc) => (tc instanceof TestCase ? tc : new TestCase(tc)));
  }
}
