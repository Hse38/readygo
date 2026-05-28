import type { BaseEvent } from "../core/types/event.types";
import type { GeneratedChecklistEntry } from "../core/types/checklist.types";

export interface EnrichedSuggestion {
  title: string;
  detail: string;
}

/**
 * AI enrichment layer:
 * - never replaces deterministic engine output
 * - only adds optional contextual suggestions.
 */
export async function enrichEventIntelligence(
  _event: BaseEvent,
  _checklist: GeneratedChecklistEntry[]
): Promise<EnrichedSuggestion[]> {
  // Placeholder integration point for Gemini/OpenAI:
  // 1. inspect weather/calendar context
  // 2. generate optional helper tips
  // 3. return suggestions as non-blocking additions
  return [];
}
