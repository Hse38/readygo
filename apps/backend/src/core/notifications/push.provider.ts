import type { NotificationMessage, NotificationProvider } from "./notification-provider.interface";

export class PushNotificationProvider implements NotificationProvider {
  async schedule(messages: NotificationMessage[]): Promise<void> {
    void messages;
    // TODO: integrate Expo/Firebase/APNs provider.
  }
}
