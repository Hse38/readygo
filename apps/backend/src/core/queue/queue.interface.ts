export enum QueueJobType {
  PROCESS_EVENT = "PROCESS_EVENT",
  GENERATE_NOTIFICATIONS = "GENERATE_NOTIFICATIONS",
  AI_ENRICHMENT = "AI_ENRICHMENT",
  RECALCULATE_TRAVEL = "RECALCULATE_TRAVEL",
}

export interface ProcessEventPayload {
  eventId: string;
}

export interface GenerateNotificationsPayload {
  eventId: string;
}

export interface AiEnrichmentPayload {
  eventId: string;
}

export interface RecalculateTravelPayload {
  eventId: string;
}

export interface QueueProvider {
  enqueue<TPayload>(type: QueueJobType, payload: TPayload): Promise<void>;
}
