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
  RawProtestEvent,
  RawTurnout,
} from "../../src/lib/stats/types";
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
import { getStateInfo } from "./usStateInfo";

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
        await logger.logIssue(
          "other",
          firstRowSampleResult,
          sheet.title,
          `Differently shaped header row, skipping ${JSON.stringify(firstRowSampleResult.error.errors, null, 2)}`
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
        await logger.logIssue(
          "other",
          row,
          sheet.title,
          `Zod failed to parse: ${JSON.stringify(err)}`
        );
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
  const unnamed = "Unnamed event";
  const badNames = new Set(["None", "No name"]);

  const { name, state, zip, date, link, ...rest } = row;
  const { coverageUrl, low, high } = row as TurnoutRow;

  // Sanitize Name
  let sanitizedName: string;
  if (!name || name === "" || badNames.has(name)) {
    sanitizedName = unnamed;
    await logger.logIssue(
      "name",
      row,
      sheetName,
      `Unnamed - will be titled '${unnamed}'`
    );
  } else if (name.includes("http:") || name.includes("https:")) {
    await logger.logIssue(
      "name",
      row,
      sheetName,
      `${name} shouldn't be a URL - will be titled '${unnamed}'`
    );
    sanitizedName = unnamed;
  } else {
    sanitizedName = toTitleCase(name).trim();
  }

  // Sanitize and Validate Date (critical, skip row if invalid)
  const sanitizedDate = normalizeYearTo2025(normalizeToMMDDYYYY(date));
  if (!sanitizedDate) {
    await logger.logIssue(
      "date",
      row,
      sheetName,
      date.length > 0 ? date : "<unspecified>"
    );
    return null; // Skip row if date is invalid
  }

  // Validate State
  const sanitizedState = state.trim();
  const stateIdInfo = getStateInfo(sanitizedState);
  if (!stateIdInfo) {
    await logger.logIssue("state", row, sheetName, state);
    return null;
  }

  // Sanitize and Validate Zip (warn only)
  let sanitizedZip = zip?.trim();
  if (!isValidZipCode(sanitizedZip)) {
    await logger.logIssue("zip", row, sheetName, sanitizedZip ?? "");
    sanitizedZip = "";
  }

  // Look for bad links
  let sanitizedLink = link?.trim();
  if (isLikelyMalformedUrl(sanitizedLink)) {
    await logger.logIssue("link", row, sheetName, sanitizedLink);
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
        await logger.logIssue(
          "coverageUrl",
          row,
          sheetName,
          sanitizedCoverageUrl
        );
        sanitizedCoverageUrl = "";
      }
    }

    // Validate low/high numbers
    sanitizedLow = low;
    sanitizedHigh = high;

    let badLow = false;
    if (!Number.isInteger(low)) {
      badLow = true;
      await logger.logIssue(
        "turnoutNumbers",
        row,
        sheetName,
        `Low (${low}) should be a whole number`
      );
    }
    let badHigh = false;
    if (!Number.isInteger(high)) {
      badHigh = true;
      await logger.logIssue(
        "turnoutNumbers",
        row,
        sheetName,
        `High (${high}) should be a whole number`
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
      await logger.logIssue(
        "turnoutNumbers",
        row,
        sheetName,
        `Low of ${low} > high of ${high}`
      );
      return null;
    }
  }

  // Return the sanitized raw event
  return {
    name: sanitizedName,
    date: sanitizedDate,
    state: sanitizedState,
    zip: sanitizedZip,
    link: sanitizedLink,
    low: sanitizedLow,
    high: sanitizedHigh,
    coverageUrl: sanitizedCoverageUrl,
    ...rest,
  } as T;
}
