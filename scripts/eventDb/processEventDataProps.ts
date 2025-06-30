import { SheetProcessingProps } from "./fetchAndProcessData";
import { EventRowSchema } from "./types";

export const processEventDataProps: SheetProcessingProps<
  typeof EventRowSchema
> = {
  fetchedDataType: "event",
  sheetId: "1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A",
  mapHeaders,
  schema: EventRowSchema,
  knownBadSheetNames: ["June 14 State Counts"],
};

function mapHeaders(headers: string[]) {
  // No header at all, but is a valid row, create a dummy header:
  const dummyHeaders = [
    "date",
    "address",
    "zip",
    "city",
    "state",
    "country",
    "name",
    "link",
    "unknown",
    "mapby",
    "info",
    "reoccurs",
  ];

  if (
    headers.length === dummyHeaders.length &&
    headers[0].match(/\d{1,4}\/\d{1,4}\/\d{1,4}/)
  ) {
    return dummyHeaders;
  }

  // Use the existing first row values, mapping some weird ones
  return headers.map((header) => {
    let firstWord = header.trim().split(/\s+/)[0].toLowerCase();
    if (firstWord === "linke") {
      firstWord = "name";
    } else if (firstWord === "submit" || firstWord === "dill") {
      firstWord = "date";
    } else if (firstWord === "org.") {
      firstWord = "link";
    }
    return firstWord;
  });
}
