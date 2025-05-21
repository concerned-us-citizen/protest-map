export interface ProtestEventDataJson {
  events: Record<string, ProtestEvent[]>;
  locations: Record<string, Location>;
  updatedAt: string;
}

export interface ProtestEvent {
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
