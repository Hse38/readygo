export type ChecklistPriority = "critical" | "important" | "optional";
export type ChecklistSource = "template" | "ai";

export interface ChecklistTemplateItem {
  title: string;
  offsetMinutes: number;
  priority: ChecklistPriority;
  source?: ChecklistSource;
}

export interface GeneratedChecklistEntry {
  title: string;
  scheduledAt: Date;
  priority: ChecklistPriority;
  source: ChecklistSource;
  order: number;
}
