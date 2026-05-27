export type User = {
  id: string;
  email: string;
  name: string;
  surname: string;
  occupation?: string;
  workLocation?: string;
  workLocationLat?: number;
  workLocationLng?: number;
  homeLocation?: string;
  homeLocationLat?: number;
  homeLocationLng?: number;
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

export type Participant = {
  id: string;
  eventId: string;
  userId?: string | null;
  email: string;
  name?: string | null;
  status: "pending" | "accepted" | "declined";
  inviteToken: string;
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
    surname?: string | null;
    email: string;
  } | null;
};

export type ChecklistItem = {
  id: string;
  eventId: string;
  title: string;
  isCompleted: boolean;
  scheduledAt?: string;
  order?: number;
};
