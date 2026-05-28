export interface VersionSet {
  engineVersion: number;
  templateVersion: number;
  timelineVersion: number;
  notificationVersion: number;
  travelVersion: number;
}

const CURRENT_VERSIONS: VersionSet = {
  engineVersion: 1,
  templateVersion: 1,
  timelineVersion: 1,
  notificationVersion: 1,
  travelVersion: 1,
};

export function getCurrentVersionSet(): VersionSet {
  return { ...CURRENT_VERSIONS };
}

export function toVersionString(versions: VersionSet): string {
  return `e${versions.engineVersion}-t${versions.templateVersion}-tl${versions.timelineVersion}-n${versions.notificationVersion}-tr${versions.travelVersion}`;
}

export function isStaleEventIntelligence(saved: Partial<VersionSet>): boolean {
  return (
    saved.engineVersion !== CURRENT_VERSIONS.engineVersion ||
    saved.templateVersion !== CURRENT_VERSIONS.templateVersion ||
    saved.timelineVersion !== CURRENT_VERSIONS.timelineVersion ||
    saved.notificationVersion !== CURRENT_VERSIONS.notificationVersion ||
    saved.travelVersion !== CURRENT_VERSIONS.travelVersion
  );
}
