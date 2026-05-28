import { QueueJobType, type QueueProvider } from "./queue.interface";

type QueueItem = { type: QueueJobType; payload: unknown; createdAt: Date };

export class InMemoryQueueProvider implements QueueProvider {
  private readonly queue: QueueItem[] = [];

  async enqueue<TPayload>(type: QueueJobType, payload: TPayload): Promise<void> {
    this.queue.push({ type, payload, createdAt: new Date() });
  }

  getItems(): QueueItem[] {
    return [...this.queue];
  }
}
