import type { CityInfo, Coordinates, Nullable } from "$lib/types";
import { z } from "zod";

export type FetchedDataType = "event" | "turnout";

export const issueTypeInfos = {
  address: {
    title: "Bad Address",
    rejected: true,
    explanation: (arg: string) => `Could not geocode '${arg}'`,
  },
  cityOrState: {
    title: "Bad City or State",
    rejected: false,
    explanation: (arg: string) =>
      `No direct link on Wikipedia for '${arg}' (ambiguous?, mispelled?, wrong state?). Will use default thumbnail, no article link`,
  },
  zip: {
    title: "Bad ZIP Code",
    rejected: false,
    explanation: (arg: string) => `Invalid ZIP code ${arg}, ignoring field`,
  },
  date: {
    title: "Bad Date",
    rejected: true,
    explanation: (arg: string) => `Invalid date ${arg}`,
  },
  link: {
    title: "Bad Event Link",
    rejected: false,
    explanation: (arg: string) => `Invalid event link ${arg}, ignoring field`,
  },
  name: {
    title: "Bad Event Name",
    rejected: false,
    explanation: (arg: string) => arg,
  },
  coverageUrl: {
    title: "Bad Coverage URL",
    rejected: false,
    explanation: (arg: string) => `Invalid coverage URL ${arg}`,
  },
  turnoutNumbers: {
    title: "Bad Turnout Numbers",
    rejected: false,
    explanation: (arg: string) => arg,
  },
  other: {
    title: "Other Issue",
    rejected: true,
    explanation: (arg: string) => arg,
  },
} as const;

export type IssueType = keyof typeof issueTypeInfos;

export interface ScrapeIssue {
  fetchedDataType: FetchedDataType;
  sheetName: string;
  type: IssueType;
  explanationArg: string;
  item: unknown;
}

export interface RunSummary {
  fetchedDataType: FetchedDataType;
  issues: ScrapeIssue[];
  totalRows: number;
  rowsProcessed: number;
  rejects: number;
  duplicates: number;
  skippedSheets: { title: string; rows: number }[];
  unfetchedSheets: { title: string; error: string }[];
  elapsedSeconds: number;
  loggedIssues: number;
  wikiFetches: number;
  geocodings: number;
}

export interface ProcessingSummary {
  runAt: Date;
  elapsedSeconds: number;
  runs: RunSummary[];
}

type CommonProps = Coordinates & {
  pctDemLead: Nullable<number>;
  cityInfoId: number;
  name: string;
  date: string;
  link: Nullable<string>;
};
export type RawProtestEvent = CommonProps & {
  type: "event";
};

export type RawTurnout = CommonProps & {
  type: "turnout";
  coverageUrl: string;
  low: number;
  high: number;
};

export const EventOrTurnoutRowCommonSchema = z.object({
  date: z.string(),
  name: z.string(),
  address: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zip: z.string().optional(),
  link: z.string(),
});

const NumberWithCommasSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      const normalized = val.replace(/,/g, ""); // remove commas
      const parsed = Number(normalized);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  },
  z.number({ invalid_type_error: "Must be a number" })
);

export const EventRowSchema = EventOrTurnoutRowCommonSchema.extend({
  address: z.string(),
}).passthrough();
export type EventRow = z.infer<typeof EventRowSchema>;

export const TurnoutRowSchema = EventOrTurnoutRowCommonSchema.extend({
  coverageUrl: z.string(),
  low: NumberWithCommasSchema,
  high: NumberWithCommasSchema,
}).passthrough();
export type TurnoutRow = z.infer<typeof TurnoutRowSchema>;

export type EventOrTurnoutRowSchemaType =
  | typeof EventRowSchema
  | typeof TurnoutRowSchema;
export type EventOrTurnoutRow = EventRow | TurnoutRow;

export type Address = {
  address?: string;
  city: string;
  state: string;
  zip?: string;
  country?: string;
};

export type LocationInfo = Coordinates &
  CityInfo & {
    pctDemLead: Nullable<number>;
  };
