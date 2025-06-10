export interface Coordinates {
  lat: number;
  lon: number;
}

export interface MarkerInfo extends Coordinates {
  pctDemLead: Nullable<number>;
}

export interface ProtestEvent extends MarkerInfo {
  name: string;
  date: string;
  link: string;
  cityInfoId: number;
}

export interface CityInfo {
  city: string;
  state: string;
  cityThumbnailUrl: string;
  cityArticleUrl: string;
}

export type ProtestEventWithCityInfo = ProtestEvent & CityInfo;

// TODO DELETE - use above to combine into a single object with & interfaces
export interface ProtestEventAndCityInfo {
  event: ProtestEvent;
  cityInfo: CityInfo;
}

export type DateRange = {
  start: Date;
  end: Date;
};

export type Nullable<T> = T | null;
export type SetTimeoutId = ReturnType<typeof setTimeout> | undefined;
