import { SheetProcessingProps } from "./fetchAndProcessData";
import { TurnoutRowSchema } from "../../src/lib/stats/types";

export const processTurnoutDataProps: SheetProcessingProps<
  typeof TurnoutRowSchema
> = {
  fetchedDataType: "turnout",
  sheetId: "1hQzNbsbupLqtijfQywpmZs6nKSNLmEbugaYl6HWbyvA",
  mapHeaders,
  schema: TurnoutRowSchema,
  knownBadSheetNames: ["June 14 Duplicates"],
};

function mapHeaders(headers: string[]) {
  let unknownCount = 1;
  const newHeaders = headers.map(
    (h) => headerForTitle(h) ?? `unknown${unknownCount++}`
  );
  return newHeaders;
}

function headerForTitle(title: string): string | undefined {
  const lowerInput = title.toLowerCase();

  const headerToTitlePatternMap = {
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
    recordType: ["Which best describes", "Record Type"],
    eventType: ["Event Type"],
    sponsor: ["Sponsoring Org"],
    reportedBy: ["Reported By"],
    notes: ["Additional Notes"],
    hostNotes: ["Note"],
  };

  for (const [key, values] of Object.entries(headerToTitlePatternMap)) {
    if (values.some((v) => lowerInput.includes(v.toLowerCase()))) {
      return key;
    }
  }

  return undefined;
}
