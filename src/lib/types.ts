export interface Coordinates {
  lat: number;
  lon: number;
}

export interface CityInfo {
  cityName: string;
  cityThumbnailUrl: string;
  cityArticleUrl: string;
}

export const markerTypes = ["event", "turnout"] as const;
export type MarkerType = (typeof markerTypes)[number];

export const turnoutEstimates = ["high", "low", "average"] as const;
export type TurnoutEstimate = (typeof turnoutEstimates)[number];

interface CommonMarkerProps extends Coordinates {
  id: number;
  pctDemLead: Nullable<number>;
}

interface CommonPopulatedProps extends CityInfo {
  eventName: string;
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

export type DateRange = {
  start: Date;
  end: Date;
};

export type TurnoutRange = {
  low: number;
  high: number;
};
export type CountOrTurnoutRange = TurnoutRange | number;
export const EmptyTurnoutRange = { low: 0, high: 0 };
export type EventCount<T extends CountOrTurnoutRange> = {
  name: string;
  count: T;
};

export type Nullable<T> = T | null;
export type SetTimeoutId = ReturnType<typeof setTimeout> | undefined;

export const VoterLeanValues = ["trump", "harris", "unavailable"];
export type VoterLean = (typeof VoterLeanValues)[number];
export type VoterLeanCounts = Record<VoterLean, number>;
export type VoterLeanTurnoutRange = Record<VoterLean, TurnoutRange>;
export const EmptyVoterLeanCounts: VoterLeanCounts = {
  trump: 0,
  harris: 0,
  unavailable: 0,
};

export const EmptyVoterLeanTurnoutRange: VoterLeanTurnoutRange = {
  trump: EmptyTurnoutRange,
  harris: EmptyTurnoutRange,
  unavailable: EmptyTurnoutRange,
};
