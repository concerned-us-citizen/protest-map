import { SheetProcessingProps } from "./fetchAndProcessData";
import { EventRowSchema } from "../../src/lib/stats/types";

export const processEventDataProps: SheetProcessingProps<
  typeof EventRowSchema
> = {
  fetchedDataType: "event",
  sheetId: "1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A",
  headerHints: {
    date: "Date",
    time: "Time",
    address: "Address",
    zip: "Zip",
    city: "City",
    state: "State",
    country: "Country",
    name: "Name",
    link: "Link",
  },
  schema: EventRowSchema,
  knownBadSheetNames: [
    "June 14 State Counts",
    "Good Trouble State Counts",
    "2025 State Counts",
    "2025 Protest Summary",
  ],
};
