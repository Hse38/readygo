import { EventProcessingState } from "@prisma/client";

const allowedTransitions: Record<EventProcessingState, EventProcessingState[]> = {
  created: ["processing", "archived"],
  processing: ["processed", "failed", "archived"],
  processed: ["processing", "archived"],
  failed: ["processing", "archived"],
  archived: [],
};

export function canTransition(from: EventProcessingState, to: EventProcessingState): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: EventProcessingState, to: EventProcessingState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid event state transition: ${from} -> ${to}`);
  }
}

export function startProcessing(current: EventProcessingState): EventProcessingState {
  assertTransition(current, EventProcessingState.processing);
  return EventProcessingState.processing;
}

export function markProcessed(current: EventProcessingState): EventProcessingState {
  assertTransition(current, EventProcessingState.processed);
  return EventProcessingState.processed;
}

export function markFailed(current: EventProcessingState): EventProcessingState {
  assertTransition(current, EventProcessingState.failed);
  return EventProcessingState.failed;
}

export function archive(current: EventProcessingState): EventProcessingState {
  assertTransition(current, EventProcessingState.archived);
  return EventProcessingState.archived;
}
