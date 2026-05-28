import type { NotificationMessage, NotificationProvider } from "./notification-provider.interface";

export class EmailNotificationProvider implements NotificationProvider {
  async schedule(messages: NotificationMessage[]): Promise<void> {
    void messages;
    // TODO: integrate transactional email provider.
  }
}
