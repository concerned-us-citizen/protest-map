import { z } from "zod";

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

export type LocatedDissenterEvent = DissenterEvent & {
  locationInfoId: number;
  lat: number;
  lon: number;
};
