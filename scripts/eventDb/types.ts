import { z } from "zod";
import {
  type CityInfo,
  type Coordinates,
  type Nullable,
} from "../../src/lib/types";

export const EventOrTurnoutRowCommonSchema = z.object({
  date: z.string(),
  address: z.string().optional(),
  zip: z.string().optional(),
  city: z.string(),
  state: z.string(),
  country: z.string().optional(),
  name: z.string(),
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
