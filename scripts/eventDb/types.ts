import { z } from "zod";
import {
  CityInfo,
  Coordinates,
  MarkerInfo,
  Nullable,
} from "../../src/lib/types";

export const DissenterEventSchema = z
  .object({
    date: z.string(),
    address: z.string(),
    zip: z.string().optional(),
    city: z.string(),
    state: z.string(),
    country: z.string().optional(),
    name: z.string(),
    link: z.string(),
    sheetName: z.string(),
  })
  .passthrough();

export type DissenterEvent = z.infer<typeof DissenterEventSchema>;

export type LocatedDissenterEvent = DissenterEvent &
  MarkerInfo & {
    cityInfoId: number;
  };

export type LocationInfo = Coordinates &
  CityInfo & {
    name: string;
    pctDemLead: Nullable<number>;
  };
