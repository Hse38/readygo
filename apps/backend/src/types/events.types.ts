export interface CreateEventBody {
  title: string;
  type: string;
  date: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  travelMode?: string;
}

export interface CreateEventResponse {
  event: EventWithChecklist;
  checklistItems: ChecklistItemResponse[];
}

export interface EventsListResponse {
  events: EventWithChecklist[];
}

export interface EventDetailResponse {
  event: EventWithChecklist;
}

export interface ChecklistItemResponse {
  id: string;
  eventId: string;
  title: string;
  isCompleted: boolean;
  scheduledAt: Date | null;
}

export interface EventWithChecklist {
  id: string;
  userId: string;
  title: string;
  type: string;
  date: Date;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  travelMode: string | null;
  createdAt: Date;
  checklistItems: ChecklistItemResponse[];
}
