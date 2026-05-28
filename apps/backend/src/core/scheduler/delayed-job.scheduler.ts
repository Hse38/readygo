import type { Scheduler, SchedulerJob } from "./scheduler.interface";

/**
 * Placeholder delayed-job scheduler abstraction for BullMQ/Temporal/Trigger.dev.
 */
export class DelayedJobScheduler implements Scheduler {
  async schedule(job: SchedulerJob): Promise<void> {
    void job;
    // TODO: wire delayed jobs provider.
  }

  async cancel(jobId: string): Promise<void> {
    void jobId;
    // TODO: wire cancel support.
  }
}
