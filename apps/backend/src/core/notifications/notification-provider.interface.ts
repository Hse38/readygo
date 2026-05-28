export type NotificationPriority = "CRITICAL" | "IMPORTANT" | "OPTIONAL";

export interface NotificationMessage {
  eventId: string;
  title: string;
  body?: string;
  scheduledAt: Date;
  priority: NotificationPriority;
}

export interface NotificationProvider {
  schedule(messages: NotificationMessage[]): Promise<void>;
}
