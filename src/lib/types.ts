export interface Coordinates {
  lat: number;
  lon: number;
}

export interface EventMarkerInfo extends Coordinates {
  pctDemLead: Nullable<number>;
}

export interface EventMarkerInfoWithId extends EventMarkerInfo {
  eventId: number;
}

export interface ProtestEvent extends EventMarkerInfo {
  name: string;
  date: string;
  link: Nullable<string>;
  cityInfoId: number;
}

export interface CityInfo {
  city: string;
  state: string;
  cityThumbnailUrl: string;
  cityArticleUrl: string;
}

export interface PopulatedEvent {
  name: string;
  date: Date;
  link: Nullable<string>;
  lat: number;
  lon: number;
  pctDemLead: Nullable<number>;
  city: string;
  state: string;
  cityThumbnailUrl: string;
  cityArticleUrl: string;
}

export interface EventFilter {
  date: Date;
  eventNames?: string[]; // empty or missing means match all events
}

export type DateRange = {
  start: Date;
  end: Date;
};

export type Nullable<T> = T | null;
export type SetTimeoutId = ReturnType<typeof setTimeout> | undefined;
