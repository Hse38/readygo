import type { NotificationMessage, NotificationProvider } from "./notification-provider.interface";

export class WidgetNotificationProvider implements NotificationProvider {
  async schedule(messages: NotificationMessage[]): Promise<void> {
    void messages;
    // TODO: integrate widget timeline update channels.
  }
}
