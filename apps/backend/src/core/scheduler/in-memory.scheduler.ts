import type { Scheduler, SchedulerJob } from "./scheduler.interface";

export class InMemoryScheduler implements Scheduler {
  private readonly jobs = new Map<string, SchedulerJob>();

  async schedule(job: SchedulerJob): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async cancel(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }
}
