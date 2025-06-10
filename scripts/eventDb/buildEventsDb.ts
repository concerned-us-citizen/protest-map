import fs from "fs/promises";
import { config } from "./config";
import { EventSink } from "./EventSink";
import { LocationDataSource } from "./LocationDataSource";
import { getSheetData } from "./getSheetData";
import { DissenterEvent, DissenterEventSchema } from "./types";
import { getLoggedIssueCount, initLog, logInfo, logIssue } from "./issueLog";
import { scanForSimilarNames } from "./similarNames";
import { loadVotingInfo } from "./votingInfo";

async function main() {
  const startTime = Date.now();

  await fs.mkdir(config.dirs.build, { recursive: true });

  initLog();
  loadVotingInfo();

  const locationInfoSource = await LocationDataSource.create(
    config.paths.buildLocationCache
  );
  const eventSink = await EventSink.create();

  console.log("Retrieving events from google sheets...");
  const SHEET_ID = "1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A";
  const sheets = await getSheetData(SHEET_ID, (header: string): string => {
    let firstWord = header.trim().split(/\s+/)[0].toLowerCase();
    if (firstWord === "linke") {
      firstWord = "name";
    } else if (firstWord === "submit") {
      firstWord = "date";
    } else if (firstWord === "org.") {
      firstWord = "link";
    }
    return firstWord;
  });

  const totalEvents = sheets.reduce((acc, sheet) => acc + sheet.rows.length, 0);
  console.log(`Retrieved ${totalEvents} total events`);

  const eventNames: string[] = [];

  let totalEventsProcessed = 0;
  let sheetsProcessed = 0;
  const totalSheets = sheets.length;
  for (const sheet of sheets) {
    sheetsProcessed++;
    let sheetEventsProcessed = 0;
    const totalSheetEvents = sheet.rows.length;

    // Skip sheets that aren't tables of events
    // (sample second row to avoid potentially bad first data)
    if (sheet.rows.length > 1) {
      const firstRowSampleResult = DissenterEventSchema.safeParse({
        ...sheet.rows[1],
        sheetName: sheet.title,
      });
      if (!firstRowSampleResult.success) {
        logIssue(
          `'${sheet.title}': differently shaped, skipping`,
          firstRowSampleResult.error.errors
        );
        continue;
      }
    }

    for (const row of sheet.rows) {
      sheetEventsProcessed++;
      totalEventsProcessed++;
      console.log(
        `${sheet.title} ${sheetsProcessed}/${totalSheets}: ${sheetEventsProcessed}/${totalSheetEvents} events, (total ${totalEventsProcessed}/${totalEvents}):`,
        row
      );
      const namedRow = {
        ...row,
        sheetName: sheet.title,
      };
      let dissenterEvent: DissenterEvent;
      try {
        dissenterEvent = DissenterEventSchema.parse(namedRow);
      } catch (err) {
        logIssue(`'${sheet.title}': Zod failed to parse:`, err);
        continue;
      }

      const sanitized = await eventSink.sanitize(dissenterEvent);
      if (!sanitized) continue;

      const locationInfo = await locationInfoSource.getLocationInfo(sanitized);
      if (!locationInfo) continue;

      const cityInfoId = eventSink.getOrCreateCityInfo(locationInfo);

      // We denormalize a bit here, moving some location info to the
      // event directly to optimize map marker generation
      const locatedDissenterEvent = {
        ...sanitized,
        lat: locationInfo.lat,
        lon: locationInfo.lon,
        pctDemLead: locationInfo.pctDemLead,
        cityInfoId: cityInfoId,
      };

      // Skips duplicates
      eventSink.maybeCreateEvent(locatedDissenterEvent);

      eventNames.push(locatedDissenterEvent.name);
    }
  }

  console.log("Looking for similar event names...");
  scanForSimilarNames(eventNames);

  const elapsedTime = `${(Date.now() - startTime) / 1000}s`;
  logInfo(`\nProcessing complete: `, {
    totalEvents,
    elapsedTime,
    loggedIssues: getLoggedIssueCount(),
    wikiFetches: locationInfoSource.cityInfoFetchCount,
    geocodings: locationInfoSource.geocodeFetchCount,
  });

  locationInfoSource.close();
  eventSink.close();
}

main();
