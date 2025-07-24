import { SheetProcessingProps } from "./fetchAndProcessData";
import { TurnoutRowSchema } from "../../src/lib/stats/types";

export const processTurnoutDataProps: SheetProcessingProps<
  typeof TurnoutRowSchema
> = {
  fetchedDataType: "turnout",
  sheetId: "1hQzNbsbupLqtijfQywpmZs6nKSNLmEbugaYl6HWbyvA",
  headerHints: {
    timestamp: ["Timestamp"],
    date: ["Date"],
    zip: ["Zip"],
    city: ["City"],
    state: ["State"],
    name: ["Event Name"],
    low: ["Low Estimate"],
    high: ["High Estimate"],
    link: ["Protest Listing", "Source"],
    coverageUrl: ["News Coverage"],
  },
  schema: TurnoutRowSchema,
  knownBadSheetNames: ["June 14 Duplicates"],
};
