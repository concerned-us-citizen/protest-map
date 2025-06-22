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

export type DateRange = {
  start: Date;
  end: Date;
};

export type Nullable<T> = T | null;
export type SetTimeoutId = ReturnType<typeof setTimeout> | undefined;

export const VoterLeanValues = ["trump", "harris", "unavailable"];
export type VoterLean = (typeof VoterLeanValues)[number];
export type VoterLeanCounts = Record<VoterLean, number>;
export const EmptyVoterLeanCounts: VoterLeanCounts = {
  trump: 0,
  harris: 0,
  unavailable: 0,
};
