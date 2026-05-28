export interface SchedulerJob {
  id: string;
  runAt: Date;
  payload: Record<string, unknown>;
}

export interface Scheduler {
  schedule(job: SchedulerJob): Promise<void>;
  cancel(jobId: string): Promise<void>;
}
