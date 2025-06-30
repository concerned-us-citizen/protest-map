export interface Coordinates {
  lat: number;
  lon: number;
}

export type MarkerType = "event" | "turnout";
export type TurnoutCountSource = "high" | "low" | "average";

interface CommonMarkerProps extends Coordinates {
  id: number;
  pctDemLead: Nullable<number>;
}

interface CommonPopulatedProps extends CityInfo {
  name: string;
  date: Date;
  link: Nullable<string>;
}

export interface ProtestEventMarker extends CommonMarkerProps {
  type: "event";
}

export interface PopulatedProtestEventMarker
  extends ProtestEventMarker,
    CommonPopulatedProps {}

export interface TurnoutMarker extends CommonMarkerProps {
  type: "turnout";
  low: number;
  high: number;
}

export interface PopulatedTurnoutMarker
  extends TurnoutMarker,
    CommonPopulatedProps {
  coverageUrl: string;
}

export type Marker = ProtestEventMarker | TurnoutMarker;
export type PopulatedMarker =
  | PopulatedProtestEventMarker
  | PopulatedTurnoutMarker;

export interface CityInfo {
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
