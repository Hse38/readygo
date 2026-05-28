export function calculateRetryDelay(retryCount: number, baseMs = 1000, maxMs = 60_000): number {
  const delay = baseMs * Math.pow(2, Math.max(0, retryCount));
  return Math.min(delay, maxMs);
}
