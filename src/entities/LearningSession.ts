import { SessionStatus } from './constants';
import type { LearningPlan } from './LearningPlan';

export interface LearningSessionProps {
  id?: number | null;
  planId: number;
  title: string;
  status?: SessionStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  plan?: LearningPlan | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface LearningSessionRow {
  id: number;
  plan_id: number;
  title: string;
  status: SessionStatus;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** A run through a learning plan; the plan supplies the sections and tasks. */
export class LearningSession {
  id: number | null;
  planId: number;
  title: string;
  status: SessionStatus;
  startDate: Date | null;
  endDate: Date | null;
  plan: LearningPlan | null;
  createdAt: Date | null;
  updatedAt: Date | null;

  constructor({
    id = null,
    planId,
    title,
    status = SessionStatus.PLANNED,
    startDate = null,
    endDate = null,
    plan = null,
    createdAt = null,
    updatedAt = null,
  }: LearningSessionProps) {
    if (!planId) throw new Error('Learning session requires a planId');
    if (!Object.values(SessionStatus).includes(status)) {
      throw new Error(`Invalid session status: ${status}`);
    }
    this.id = id;
    this.planId = planId;
    this.title = title;
    this.status = status;
    this.startDate = startDate;
    this.endDate = endDate;
    this.plan = plan;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromRow(row: LearningSessionRow): LearningSession {
    return new LearningSession({
      id: row.id,
      planId: row.plan_id,
      title: row.title,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
