export interface Coordinates {
  lat: number;
  lon: number;
}

// Add coordinates to events for simpler, main path queries
export interface ProtestEvent extends Coordinates {
  name: string;
  date: string;
  link: string;
  locationInfoId: number;
}

export interface LocationInfo extends Coordinates {
  name: string;
  city: string;
  state: string;
  cityThumbnailUrl: string;
  cityArticleUrl: string;
  pctDemLead: Nullable<number>;
}

export interface ProtestEventAndLocation {
  event: ProtestEvent;
  location: LocationInfo;
}

export type DateRange = {
  start: Date;
  end: Date;
};

export type Nullable<T> = T | null;
export type SetTimeoutId = ReturnType<typeof setTimeout> | undefined;
