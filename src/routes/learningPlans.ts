import { Router, type Request } from 'express';
import { STUDY_HOURS_PER_DAY } from '../config/study';
import { LearningPlan, TaskTypeLabel } from '../entities';
import * as learningPlanRepository from '../repositories/learningPlanRepository';
import * as learningSectionRepository from '../repositories/learningSectionRepository';
import * as learningTaskRepository from '../repositories/learningTaskRepository';
import { field, idParam } from './params';

const router = Router();

interface PlanFormValues {
  title: string;
  objective: string;
}

function formValues(req: Request): PlanFormValues {
  return { title: field(req.body, 'title'), objective: field(req.body, 'objective') };
}

router.get('/', async (_req, res) => {
  const plans = await learningPlanRepository.findAll();
  res.render('learning-plans/index', { title: 'Learning Plans', plans });
});

router.get('/new', (_req, res) => {
  res.render('learning-plans/form', {
    title: 'New Learning Plan',
    action: '/learning-plans',
    cancelUrl: '/learning-plans',
    values: { title: '', objective: '' },
    error: null,
  });
});

router.post('/', async (req, res) => {
  const values = formValues(req);
  let plan: LearningPlan;
  try {
    plan = new LearningPlan(values);
  } catch (err) {
    res.status(400).render('learning-plans/form', {
      title: 'New Learning Plan',
      action: '/learning-plans',
      cancelUrl: '/learning-plans',
      values,
      error: (err as Error).message,
    });
    return;
  }
  const id = await learningPlanRepository.create(plan);
  // Straight to the plan so sections can be added.
  res.redirect(`/learning-plans/${id}`);
});

router.get('/:id', async (req, res) => {
  const id = idParam(req, 'id');
  const plan = id && (await learningPlanRepository.findById(id));
  if (!plan) {
    res.status(404).send('Learning plan not found');
    return;
  }
  const sections = await learningSectionRepository.findByPlan(plan.id!);
  const tasks = await learningTaskRepository.findByPlan(plan.id!);
  for (const section of sections) {
    section.tasks = tasks.filter((task) => task.sectionId === section.id);
  }
  plan.sections = sections;
  res.render('learning-plans/show', {
    title: plan.title,
    plan,
    TaskTypeLabel,
    hoursPerDay: STUDY_HOURS_PER_DAY,
  });
});

router.get('/:id/edit', async (req, res) => {
  const id = idParam(req, 'id');
  const plan = id && (await learningPlanRepository.findById(id));
  if (!plan) {
    res.status(404).send('Learning plan not found');
    return;
  }
  res.render('learning-plans/form', {
    title: 'Edit Learning Plan',
    action: `/learning-plans/${plan.id}`,
    cancelUrl: `/learning-plans/${plan.id}`,
    values: { title: plan.title, objective: plan.objective },
    error: null,
  });
});

router.post('/:id', async (req, res) => {
  const id = idParam(req, 'id');
  const existing = id && (await learningPlanRepository.findById(id));
  if (!existing) {
    res.status(404).send('Learning plan not found');
    return;
  }
  const values = formValues(req);
  let plan: LearningPlan;
  try {
    plan = new LearningPlan({ ...values, id: existing.id, expectedDurationWeeks: existing.expectedDurationWeeks });
  } catch (err) {
    res.status(400).render('learning-plans/form', {
      title: 'Edit Learning Plan',
      action: `/learning-plans/${existing.id}`,
      cancelUrl: `/learning-plans/${existing.id}`,
      values,
      error: (err as Error).message,
    });
    return;
  }
  await learningPlanRepository.update(plan);
  res.redirect(`/learning-plans/${existing.id}`);
});

export default router;
