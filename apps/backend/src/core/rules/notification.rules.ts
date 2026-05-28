export type NotificationPriority = "critical" | "important" | "optional";

export function resolveNotificationPriority(title: string): NotificationPriority {
  const lower = title.toLocaleLowerCase("tr");
  if (lower.includes("evden çık") || lower.includes("çık") || lower.includes("now")) {
    return "critical";
  }
  if (lower.includes("kontrol") || lower.includes("hazırla") || lower.includes("hatırlatma")) {
    return "important";
  }
  return "optional";
}
