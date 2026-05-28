import type { QueueProvider } from "./queue.interface";
import { QueueJobType } from "./queue.interface";

/**
 * Placeholder BullMQ provider abstraction.
 * Intentionally left non-functional until Redis/BullMQ infra is enabled.
 */
export class BullMqQueueProvider implements QueueProvider {
  async enqueue<TPayload>(type: QueueJobType, payload: TPayload): Promise<void> {
    void type;
    void payload;
    // TODO: integrate BullMQ queue.add(...) with retry/backoff policies.
  }
}
