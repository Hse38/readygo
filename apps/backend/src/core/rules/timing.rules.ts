export function applyOffset(eventDate: Date, offsetMinutes: number): Date {
  return new Date(eventDate.getTime() + offsetMinutes * 60 * 1000);
}

export function ensureBeforeEvent(candidate: Date, eventDate: Date): Date {
  if (candidate < eventDate) return candidate;
  return new Date(eventDate.getTime() - 30 * 60 * 1000);
}

export function sortChronologically<T extends { scheduledAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}
