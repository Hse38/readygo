export const TRANSPORT_MODES = [
  "walking",
  "transit",
  "driving",
  "cycling",
] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const WORK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WorkDay = (typeof WORK_DAYS)[number];

export interface UpdateProfileBody {
  name: string;
  surname: string;
  occupation: string;
  workLocation: string;
  workLocationLat?: number;
  workLocationLng?: number;
  homeLocation: string;
  homeLocationLat?: number;
  homeLocationLng?: number;
  workDays: string[];
  transportMode: TransportMode;
  morningAlarm: boolean;
}

export interface ProfileResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    surname: string | null;
    occupation: string | null;
    workLocation: string | null;
    workLocationLat: number | null;
    workLocationLng: number | null;
    homeLocation: string | null;
    homeLocationLat: number | null;
    homeLocationLng: number | null;
    workDays: string[];
    transportMode: string | null;
    morningAlarm: boolean | null;
    createdAt: Date;
  };
}
