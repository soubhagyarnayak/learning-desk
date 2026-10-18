import path from 'path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { withTransaction } from '../config/db';
import { STUDY_HOURS_PER_DAY } from '../config/study';
import { removeStoredFile, toStoredPath, upload } from '../config/uploads';
import {
  ContentType,
  ContentTypeLabel,
  TaskType,
  TaskTypeLabel,
  createTask,
  type AnyTask,
  type ContentProps,
  type LearningPlan,
  type LearningSection,
} from '../entities';
import * as learningPlanRepository from '../repositories/learningPlanRepository';
import * as learningSectionRepository from '../repositories/learningSectionRepository';
import * as learningTaskRepository from '../repositories/learningTaskRepository';
import { recalculateSectionAndPlan } from '../services/durationService';
import { field, idParam } from './params';

// Mounted at /learning-plans/:planId/sections/:sectionId/tasks
const router = Router({ mergeParams: true });

interface TestCaseFormValues {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

/** Everything the task form can show, as the strings the user typed. */
interface TaskFormValues {
  type: TaskType;
  title: string;
  expectedDurationHours: string;
  contentType: ContentType;
  body: string;
  url: string;
  existingFilePath: string | null;
  question: string;
  evaluationInstructions: string;
  testCases: TestCaseFormValues[];
  /** Lab steps in execution order. */
  instructions: string[];
}

interface TaskContext {
  plan: LearningPlan;
  section: LearningSection;
}

const allowedExtensions: Partial<Record<ContentType, string[]>> = {
  [ContentType.PDF]: ['.pdf'],
  [ContentType.MARKDOWN]: ['.md', '.markdown'],
  [ContentType.TEXT]: ['.txt'],
};

function isTaskType(value: unknown): value is TaskType {
  return Object.values(TaskType).includes(value as TaskType);
}

function isContentType(value: unknown): value is ContentType {
  return Object.values(ContentType).includes(value as ContentType);
}

function hasContent(type: TaskType): boolean {
  return type === TaskType.LECTURE_NOTE || type === TaskType.READING_ASSIGNMENT;
}

/** Textareas submit CRLF line endings; store LF. */
function text(value: unknown): string {
  return String(value ?? '').replace(/\r\n/g, '\n');
}

function emptyValues(type: TaskType): TaskFormValues {
  return {
    type,
    title: '',
    expectedDurationHours: '',
    contentType: ContentType.URL,
    body: '',
    url: '',
    existingFilePath: null,
    question: '',
    evaluationInstructions: '',
    testCases: [],
    instructions: [],
  };
}

function valuesFromTask(task: AnyTask): TaskFormValues {
  const values = emptyValues(task.type);
  values.title = task.title;
  values.expectedDurationHours = String(task.expectedDurationHours);
  switch (task.type) {
    case TaskType.LECTURE_NOTE:
    case TaskType.READING_ASSIGNMENT:
      values.contentType = task.content.contentType;
      values.body = task.content.body ?? '';
      values.url = task.content.url ?? '';
      values.existingFilePath = task.content.filePath;
      break;
    case TaskType.LECTURE_VIDEO:
      values.url = task.url;
      break;
    case TaskType.CODING_ASSIGNMENT:
      values.question = task.question;
      values.testCases = task.testCases.map((tc) => ({ input: tc.input, expectedOutput: tc.expectedOutput, isHidden: tc.isHidden }));
      break;
    case TaskType.WRITING_ASSIGNMENT:
      values.question = task.question;
      values.evaluationInstructions = task.evaluationInstructions;
      break;
    case TaskType.LAB_ASSIGNMENT:
      values.instructions = task.instructions.map((instruction) => instruction.content);
      break;
  }
  return values;
}

/** Form fields named `x[]` arrive as an array, or as a single string when only one was sent. */
function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return value === undefined || value === null ? [] : [value];
}

function valuesFromBody(body: Record<string, unknown>, type: TaskType, existing: AnyTask | null): TaskFormValues {
  // Rows removed in the browser leave gaps in the indexes; Object.values skips them.
  const rawTestCases = body.testCases && typeof body.testCases === 'object' ? Object.values(body.testCases) : [];
  const testCases = rawTestCases
    .map((tc: Record<string, unknown>) => ({
      input: text(tc?.input),
      expectedOutput: text(tc?.expectedOutput),
      isHidden: Boolean(tc?.isHidden),
    }))
    .filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
  // Steps keep the order they appear in the form; blank ones are dropped.
  const instructions = list(body.instructions)
    .map((instruction) => text(instruction).trim())
    .filter(Boolean);
  const contentType = field(body, 'contentType');

  return {
    type,
    title: field(body, 'title'),
    expectedDurationHours: field(body, 'expectedDurationHours'),
    contentType: isContentType(contentType) ? contentType : ContentType.URL,
    body: text(body.body),
    url: field(body, 'url'),
    existingFilePath: existing ? learningTaskRepository.contentFilePath(existing) : null,
    question: text(body.question).trim(),
    evaluationInstructions: text(body.evaluationInstructions).trim(),
    testCases,
    instructions,
  };
}

/**
 * Picks where a note's or reading's content comes from:
 * a new upload wins, then typed text (markdown/text), then the file already stored for the same content type.
 */
function resolveContent(values: TaskFormValues, uploadedPath: string | null, existing: AnyTask | null): ContentProps {
  const existingContent = existing && hasContent(existing.type) && 'content' in existing ? existing.content : null;
  const keptFile = existingContent?.contentType === values.contentType ? existingContent.filePath : null;

  switch (values.contentType) {
    case ContentType.PDF:
      return { contentType: values.contentType, filePath: uploadedPath ?? keptFile };
    case ContentType.MARKDOWN:
    case ContentType.TEXT:
      if (uploadedPath) return { contentType: values.contentType, filePath: uploadedPath };
      if (values.body.trim()) return { contentType: values.contentType, body: values.body };
      return { contentType: values.contentType, filePath: keptFile };
    case ContentType.URL:
      return { contentType: values.contentType, url: values.url };
  }
}

function buildTask(values: TaskFormValues, uploadedPath: string | null, existing: AnyTask | null, sectionId: number): AnyTask {
  const base = {
    id: existing?.id ?? null,
    sectionId,
    title: values.title,
    expectedDurationHours: Number(values.expectedDurationHours),
    position: existing?.position ?? 0,
  };
  switch (values.type) {
    case TaskType.LECTURE_NOTE:
    case TaskType.READING_ASSIGNMENT:
      return createTask({ type: values.type, ...base, content: resolveContent(values, uploadedPath, existing) });
    case TaskType.LECTURE_VIDEO:
      return createTask({ type: values.type, ...base, url: values.url });
    case TaskType.CODING_ASSIGNMENT:
      return createTask({ type: values.type, ...base, question: values.question, testCases: values.testCases });
    case TaskType.WRITING_ASSIGNMENT:
      return createTask({
        type: values.type,
        ...base,
        question: values.question,
        evaluationInstructions: values.evaluationInstructions,
      });
    case TaskType.LAB_ASSIGNMENT:
      return createTask({
        type: values.type,
        ...base,
        instructions: values.instructions.map((content) => ({ content })),
      });
  }
}

function checkUpload(values: TaskFormValues, file: Express.Multer.File | undefined): void {
  if (!file || !hasContent(values.type)) return;
  const allowed = allowedExtensions[values.contentType];
  if (allowed && !allowed.includes(path.extname(file.originalname).toLowerCase())) {
    throw new Error(`A ${ContentTypeLabel[values.contentType]} upload must be a ${allowed.join(' or ')} file`);
  }
}

/** Runs multer but turns its errors (e.g. file too large) into a form error instead of a 500. */
function acceptUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err?: unknown) => {
    res.locals.uploadError = err ? (err instanceof Error ? err.message : String(err)) : null;
    next();
  });
}

async function loadContext(req: Request, res: Response): Promise<TaskContext | null> {
  const planId = idParam(req, 'planId');
  const sectionId = idParam(req, 'sectionId');
  const plan = planId && (await learningPlanRepository.findById(planId));
  const section = plan && sectionId && (await learningSectionRepository.findById(plan.id!, sectionId));
  if (!plan || !section) {
    res.status(404).send('Learning section not found');
    return null;
  }
  return { plan, section };
}

async function loadTask(req: Request, res: Response, { section }: TaskContext): Promise<AnyTask | null> {
  const taskId = idParam(req, 'taskId');
  const task = taskId && (await learningTaskRepository.findById(section.id!, taskId));
  if (!task) {
    res.status(404).send('Learning task not found');
    return null;
  }
  return task;
}

function sectionAnchor({ plan, section }: TaskContext): string {
  return `/learning-plans/${plan.id}#section-${section.id}`;
}

function renderForm(res: Response, ctx: TaskContext, task: AnyTask | null, values: TaskFormValues, error: string | null) {
  const tasksUrl = `/learning-plans/${ctx.plan.id}/sections/${ctx.section.id}/tasks`;
  res.status(error ? 400 : 200).render('learning-tasks/form', {
    title: `${task ? 'Edit' : 'New'} ${TaskTypeLabel[values.type]}`,
    plan: ctx.plan,
    section: ctx.section,
    action: task ? `${tasksUrl}/${task.id}` : tasksUrl,
    cancelUrl: sectionAnchor(ctx),
    values,
    error,
    TaskType,
    ContentType,
    ContentTypeLabel,
    hoursPerDay: STUDY_HOURS_PER_DAY,
  });
}

/** Shared create/update flow: validate, save with duration recalculation, then tidy up files. */
async function saveTask(req: Request, res: Response, ctx: TaskContext, type: TaskType, existing: AnyTask | null) {
  const values = valuesFromBody(req.body ?? {}, type, existing);
  const uploadedPath = req.file ? toStoredPath(req.file.filename) : null;

  let task: AnyTask;
  try {
    if (res.locals.uploadError) throw new Error(`Upload failed: ${res.locals.uploadError}`);
    checkUpload(values, req.file);
    task = buildTask(values, uploadedPath, existing, ctx.section.id!);
  } catch (err) {
    await removeStoredFile(uploadedPath);
    renderForm(res, ctx, existing, values, (err as Error).message);
    return;
  }

  const newFilePath = learningTaskRepository.contentFilePath(task);
  if (uploadedPath && uploadedPath !== newFilePath) await removeStoredFile(uploadedPath);

  try {
    await withTransaction(async (db) => {
      if (existing) await learningTaskRepository.update(db, task);
      else await learningTaskRepository.create(db, task);
      await recalculateSectionAndPlan(db, ctx.section.id!, ctx.plan.id!);
    });
  } catch (err) {
    await removeStoredFile(uploadedPath);
    throw err;
  }

  const oldFilePath = existing ? learningTaskRepository.contentFilePath(existing) : null;
  if (oldFilePath && oldFilePath !== newFilePath) await removeStoredFile(oldFilePath);
  res.redirect(sectionAnchor(ctx));
}

router.get('/new', async (req, res) => {
  const ctx = await loadContext(req, res);
  if (!ctx) return;
  const type = req.query.type;
  if (!isTaskType(type)) {
    res.status(400).send('Unknown task type');
    return;
  }
  const values = emptyValues(type);
  if (type === TaskType.CODING_ASSIGNMENT) values.testCases = [{ input: '', expectedOutput: '', isHidden: false }];
  if (type === TaskType.LAB_ASSIGNMENT) values.instructions = [''];
  renderForm(res, ctx, null, values, null);
});

router.post('/', acceptUpload, async (req, res) => {
  const ctx = await loadContext(req, res);
  if (!ctx) {
    if (req.file) await removeStoredFile(toStoredPath(req.file.filename));
    return;
  }
  const type = field(req.body, 'type');
  if (!isTaskType(type)) {
    if (req.file) await removeStoredFile(toStoredPath(req.file.filename));
    res.status(400).send('Unknown task type');
    return;
  }
  await saveTask(req, res, ctx, type, null);
});

router.get('/:taskId/edit', async (req, res) => {
  const ctx = await loadContext(req, res);
  if (!ctx) return;
  const task = await loadTask(req, res, ctx);
  if (!task) return;
  renderForm(res, ctx, task, valuesFromTask(task), null);
});

router.post('/:taskId', acceptUpload, async (req, res) => {
  const ctx = await loadContext(req, res);
  const task = ctx && (await loadTask(req, res, ctx));
  if (!ctx || !task) {
    if (req.file) await removeStoredFile(toStoredPath(req.file.filename));
    return;
  }
  // The task type is fixed once created.
  await saveTask(req, res, ctx, task.type, task);
});

router.post('/:taskId/delete', async (req, res) => {
  const ctx = await loadContext(req, res);
  if (!ctx) return;
  const task = await loadTask(req, res, ctx);
  if (!task) return;
  await withTransaction(async (db) => {
    await learningTaskRepository.remove(db, task.id!);
    await recalculateSectionAndPlan(db, ctx.section.id!, ctx.plan.id!);
  });
  await removeStoredFile(learningTaskRepository.contentFilePath(task));
  res.redirect(sectionAnchor(ctx));
});

export default router;
