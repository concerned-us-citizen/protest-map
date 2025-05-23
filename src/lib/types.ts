export interface ProtestEventDataJson {
  events: Record<string, ProtestEventJson[]>;
  locations: Record<string, Location>;
  updatedAt: string;
}

export interface ProtestEventJson {
  id: number;
  date: string;
  name: string;
  link: string;
  location: string;
}

export interface ProtestEvent {
  id: number;
  name: string;
  link: string;
  location: string;
}

export interface Location {
  lat: number;
  lon: number;
  title: string;
  image: string;
  pageUrl: string;
  pct_dem_lead?: number;
}

export interface ProtestEventAndLocation {
  event: ProtestEvent;
  location: Location;
}

export interface ProtestEventData {
  events: Map<Date, ProtestEvent[]>;
  locations: Map<string, Location>;
  updatedAt: Date | null;
}

export type DateRange = {
  start: Date;
  end: Date;
};

export type Nullable<T> = T | null;
export type SetTimeoutId = ReturnType<typeof setTimeout> | undefined;
