import { Router, type Request, type Response } from 'express';
import { withTransaction } from '../config/db';
import { removeStoredFile } from '../config/uploads';
import { LearningSection, type LearningPlan } from '../entities';
import * as learningPlanRepository from '../repositories/learningPlanRepository';
import * as learningSectionRepository from '../repositories/learningSectionRepository';
import * as learningTaskRepository from '../repositories/learningTaskRepository';
import { recalculatePlan } from '../services/durationService';
import { field, idParam } from './params';

// Mounted at /learning-plans/:planId/sections
const router = Router({ mergeParams: true });

interface SectionFormValues {
  title: string;
  objective: string;
}

async function loadPlan(req: Request, res: Response): Promise<LearningPlan | null> {
  const planId = idParam(req, 'planId');
  const plan = planId && (await learningPlanRepository.findById(planId));
  if (!plan) {
    res.status(404).send('Learning plan not found');
    return null;
  }
  return plan;
}

async function loadSection(req: Request, res: Response, plan: LearningPlan): Promise<LearningSection | null> {
  const sectionId = idParam(req, 'sectionId');
  const section = sectionId && (await learningSectionRepository.findById(plan.id!, sectionId));
  if (!section) {
    res.status(404).send('Learning section not found');
    return null;
  }
  return section;
}

function renderForm(res: Response, plan: LearningPlan, section: LearningSection | null, values: SectionFormValues, error: string | null) {
  const planUrl = `/learning-plans/${plan.id}`;
  res.status(error ? 400 : 200).render('learning-sections/form', {
    title: section ? 'Edit Section' : 'New Section',
    plan,
    action: section ? `${planUrl}/sections/${section.id}` : `${planUrl}/sections`,
    cancelUrl: section ? `${planUrl}#section-${section.id}` : planUrl,
    values,
    error,
  });
}

router.get('/new', async (req, res) => {
  const plan = await loadPlan(req, res);
  if (!plan) return;
  renderForm(res, plan, null, { title: '', objective: '' }, null);
});

router.post('/', async (req, res) => {
  const plan = await loadPlan(req, res);
  if (!plan) return;
  const values = { title: field(req.body, 'title'), objective: field(req.body, 'objective') };
  let section: LearningSection;
  try {
    section = new LearningSection({ ...values, planId: plan.id });
  } catch (err) {
    renderForm(res, plan, null, values, (err as Error).message);
    return;
  }
  const sectionId = await withTransaction(async (db) => {
    const id = await learningSectionRepository.create(db, section);
    await recalculatePlan(db, plan.id!);
    return id;
  });
  res.redirect(`/learning-plans/${plan.id}#section-${sectionId}`);
});

router.get('/:sectionId/edit', async (req, res) => {
  const plan = await loadPlan(req, res);
  if (!plan) return;
  const section = await loadSection(req, res, plan);
  if (!section) return;
  renderForm(res, plan, section, { title: section.title, objective: section.objective }, null);
});

router.post('/:sectionId', async (req, res) => {
  const plan = await loadPlan(req, res);
  if (!plan) return;
  const existing = await loadSection(req, res, plan);
  if (!existing) return;
  const values = { title: field(req.body, 'title'), objective: field(req.body, 'objective') };
  let section: LearningSection;
  try {
    section = new LearningSection({ ...values, id: existing.id, planId: plan.id, expectedDurationDays: existing.expectedDurationDays });
  } catch (err) {
    renderForm(res, plan, existing, values, (err as Error).message);
    return;
  }
  await learningSectionRepository.update(section);
  res.redirect(`/learning-plans/${plan.id}#section-${section.id}`);
});

router.post('/:sectionId/delete', async (req, res) => {
  const plan = await loadPlan(req, res);
  if (!plan) return;
  const section = await loadSection(req, res, plan);
  if (!section) return;
  const filePaths = await learningTaskRepository.findFilePathsBySection(section.id!);
  await withTransaction(async (db) => {
    await learningSectionRepository.remove(db, section.id!);
    await recalculatePlan(db, plan.id!);
  });
  await Promise.all(filePaths.map((filePath) => removeStoredFile(filePath)));
  res.redirect(`/learning-plans/${plan.id}`);
});

export default router;
