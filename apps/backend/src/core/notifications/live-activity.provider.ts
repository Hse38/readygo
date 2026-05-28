import type { NotificationMessage, NotificationProvider } from "./notification-provider.interface";

export class LiveActivityProvider implements NotificationProvider {
  async schedule(messages: NotificationMessage[]): Promise<void> {
    void messages;
    // TODO: integrate iOS Live Activities / Android Live Updates.
  }
}
