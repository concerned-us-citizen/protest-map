import { getSheetData } from "./getSheetData";
import { LocationDataModel } from "./LocationDataModel";
import { NodeEventAndTurnoutModel } from "./NodeEventAndTurnoutModel";
import { ScrapeLogger } from "./ScrapeLogger";
import {
  EventOrTurnoutRowSchemaType,
  EventRow,
  TurnoutRow,
  EventOrTurnoutRow,
  EventRowSchema,
  FetchedDataType,
} from "./types";
import {
  normalizeYearTo2025,
  normalizeToMMDDYYYY,
} from "../../src/lib/util/date";
import {
  toTitleCase,
  isValidZipCode,
  isLikelyMalformedUrl,
} from "../../src/lib/util/string";
import { Nullable } from "../../src/lib/types";
import { RawProtestEvent, RawTurnout } from "./NodeEventAndTurnoutDb";

export interface SheetProcessingProps<T extends EventOrTurnoutRowSchemaType> {
  fetchedDataType: FetchedDataType;
  sheetId: string;
  mapHeaders: (_headers: string[]) => string[];
  schema: T;
  knownBadSheetNames: string[];
}

export async function fetchAndProcessData<
  T extends EventOrTurnoutRowSchemaType,
>(
  props: SheetProcessingProps<T>,
  eventAndTurnoutModel: NodeEventAndTurnoutModel,
  locationDataModel: LocationDataModel,
  logger: ScrapeLogger
) {
  const { fetchedDataType, schema, knownBadSheetNames } = props;

  logger.startRun(fetchedDataType);

  const { sheets, rowCount } = await fetchData(props, logger);
  logger.current.totalRows = rowCount;

  const totalSheets = sheets.length;
  for (const sheet of sheets) {
    logger.current.sheetsProcessed++;
    let sheetEventsProcessed = 0;
    const totalSheetEvents = sheet.rows.length;

    // Skip sheets that aren't tables of the object type
    // (sample second row to avoid potentially bad first data)
    if (sheet.rows.length > 1) {
      // Skip sheets we know to ignore
      if (knownBadSheetNames.includes(sheet.title)) {
        continue;
      }
      const firstRowSampleResult = schema.safeParse(sheet.rows[1]);
      if (!firstRowSampleResult.success) {
        logger.logIssue(
          `'${sheet.title}': differently shaped, skipping`,
          firstRowSampleResult.error.errors
        );
        logger.current.skippedSheets.push({
          title: sheet.title,
          rows: sheet.rows.length,
        });
        logger.current.totalRows -= sheet.rows.length;
        continue;
      }
    }

    for (const row of sheet.rows) {
      sheetEventsProcessed++;
      logger.current.rowsProcessed++;
      console.log(
        `${sheet.title} ${logger.current.sheetsProcessed}/${totalSheets}: ${sheetEventsProcessed}/${totalSheetEvents} events, (total ${logger.current.rowsProcessed}/${logger.current.totalRows}):`,
        row
      );
      let parsedRow: EventOrTurnoutRow;
      try {
        parsedRow = schema.parse(row);
      } catch (err) {
        logger.logIssue(`'${sheet.title}': Zod failed to parse:`, err);
        logger.current.rejects++;
        continue;
      }

      const sanitized = await sanitize(
        parsedRow,
        sheet.title,
        fetchedDataType,
        logger
      );
      if (!sanitized) {
        logger.current.rejects++;
        continue;
      }

      const locationInfo = await locationDataModel.getLocationInfo(
        sanitized,
        sheet.title
      );

      if (!locationInfo) {
        logger.current.rejects++;
        continue;
      }

      const cityInfoId = eventAndTurnoutModel.getOrCreateCityInfo(locationInfo);

      // We denormalize a bit here, moving some location info to the
      // event or turnout directly to optimize map marker generation
      const inserted = eventAndTurnoutModel.maybeCreateEventOrTurnout({
        type: schema === EventRowSchema ? "event" : "turnout",
        ...sanitized,
        ...locationInfo,
        cityInfoId,
      } as RawProtestEvent | RawTurnout);

      // Skips duplicates
      if (!inserted) {
        logger.current.duplicates++;
      }
    }
  }
}

export async function fetchData(
  props: {
    fetchedDataType: FetchedDataType;
    sheetId: string;
    mapHeaders: (_headers: string[]) => string[];
  },
  logger: ScrapeLogger
) {
  const { fetchedDataType, sheetId, mapHeaders } = props;
  console.log(`Retrieving ${fetchedDataType}s from google sheets...`);
  const sheets = await getSheetData(sheetId, logger, mapHeaders);

  const rowCount = sheets.reduce((acc, sheet) => acc + sheet.rows.length, 0);
  console.log(`Retrieved ${rowCount} total ${fetchedDataType}s`);

  return { sheets, rowCount };
}

async function sanitize<T extends EventRow | TurnoutRow>(
  row: T,
  sheetName: string,
  fetchedDataType: FetchedDataType,
  logger: ScrapeLogger
): Promise<Nullable<T>> {
  const unnamed = `Unnamed ${fetchedDataType}`;
  const badNames = new Set(["None", "No name"]);

  const { name, zip, date, link, ...rest } = row;
  const { coverageUrl, low, high } = row as TurnoutRow;

  // Sanitize Name
  let sanitizedName: string;
  if (!name || name === "" || badNames.has(name)) {
    sanitizedName = unnamed;
    logger.logInvalidEntry(row, sheetName, `Unnamed ${fetchedDataType}`);
  } else {
    sanitizedName = toTitleCase(name).trim();
  }

  // Sanitize and Validate Date (critical, skip row if invalid)
  const sanitizedDate = normalizeYearTo2025(normalizeToMMDDYYYY(date));
  if (!sanitizedDate) {
    logger.logInvalidEntry(row, sheetName, `Bad date '${date}'`);
    return null; // Skip row if date is invalid
  }

  // Sanitize and Validate Zip (warn only)
  let sanitizedZip = zip?.trim();
  if (!isValidZipCode(sanitizedZip)) {
    logger.logInvalidEntry(row, sheetName, `Bad zipcode '${sanitizedZip}'`);
    sanitizedZip = "";
  }

  // Look for bad links
  let sanitizedLink = link?.trim();
  if (isLikelyMalformedUrl(sanitizedLink)) {
    logger.logInvalidEntry(row, sheetName, `Bad link '${sanitizedLink}'`);
    sanitizedLink = "";
  }

  // Specific to turnouts
  let sanitizedLow: number | undefined = undefined;
  let sanitizedHigh: number | undefined = undefined;
  let sanitizedCoverageUrl: string | undefined = undefined;
  if (fetchedDataType === "turnout") {
    // Look for bad coverageUrls
    sanitizedCoverageUrl = coverageUrl?.trim();
    if (sanitizedCoverageUrl) {
      if (isLikelyMalformedUrl(sanitizedCoverageUrl)) {
        logger.logInvalidEntry(
          row,
          sheetName,
          `Bad coverageUrl '${sanitizedCoverageUrl}'`
        );
        sanitizedCoverageUrl = "";
      }
    }

    // Look for invalid low/high numbers

    sanitizedLow = low;
    sanitizedHigh = high;

    let badLow = false;
    if (!Number.isInteger(low)) {
      badLow = true;
      logger.logInvalidEntry(
        row,
        sheetName,
        `Bad turnout #, low (${low}) should be a whole number`
      );
    }
    let badHigh = false;
    if (!Number.isInteger(high)) {
      badHigh = true;
      logger.logInvalidEntry(
        row,
        sheetName,
        `Bad turnout #, high (${high}) should be a whole number`
      );
    }
    if (badLow && badHigh) {
      return null;
    } else if (badLow) {
      sanitizedLow = high;
    } else {
      sanitizedHigh = low;
    }

    if (low > high) {
      logger.logInvalidEntry(
        row,
        sheetName,
        `Bad turnout #, low of ${low} > high of ${high}`
      );
      return null;
    }
  }

  // Return the sanitized raw event
  return {
    name: sanitizedName,
    date: sanitizedDate,
    zip: sanitizedZip,
    link: sanitizedLink,
    low: sanitizedLow,
    high: sanitizedHigh,
    coverageUrl: sanitizedCoverageUrl,
    ...rest,
  } as T;
}
