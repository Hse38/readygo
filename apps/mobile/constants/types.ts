export type User = {
  id: string;
  email: string;
  name: string;
  surname: string;
  occupation?: string;
  workLocation?: string;
  homeLocation?: string;
  workDays?: string[];
  transportMode?: string;
  morningAlarm?: boolean;
};

export type Event = {
  id: string;
  userId: string;
  title: string;
  type: string;
  date: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  travelMode?: string;
  checklistItems?: ChecklistItem[];
};

export type ChecklistItem = {
  id: string;
  eventId: string;
  title: string;
  isCompleted: boolean;
  scheduledAt?: string;
  order?: number;
};
