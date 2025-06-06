import { load } from "cheerio";
import { loadGeocodeCache, geocode } from "./geocode.js";
import { loadWikiCache, getWikipediaCityInfo } from "./wikidata.js";
import { loadVotingInfo, fetchVotingInfo } from "./votingInfo.js";
import {
  normalizeToYYYYMMDD,
  normalizeYearTo2025,
} from "../../src/lib/util/date.ts";
import { mkdir } from "fs/promises";
import { isValidZipCode, toTitleCase } from "../../src/lib/util/string.ts";
import { stripPropsFromValues } from "../../src/lib/util/misc.ts";
import { ProtestEventDataJson, ProtestEventJson } from "../../src/lib/types.ts";
import { RawEvent, RawLocation } from "./types.ts";

const DOC_ID = "1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A";
const OUTPUT_DIR = "./static/data";
const OUTPUT = `${OUTPUT_DIR}/data.json`;
const RAW_OUTPUT = "./cache/events_raw.json";
const INVALID_EVENTS_LOG = "./cache/invalidEvents.log";

await loadGeocodeCache();
await loadWikiCache();
await loadVotingInfo();

interface SpreadsheetTabInfo {
  name: string;
  gid: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function warn(str: string, arg?: any) {
  console.warn(`⚠️ ${str}`, arg);
}

async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return await res.text();
}

async function augmentLocations(locations: Record<string, RawLocation>) {
  const result = {};

  const keys = Object.keys(locations);
  for (const key of keys) {
    const location = locations[key];
    try {
      const geo = await geocode(location);
      if (!geo) {
        throw new Error(`Could not geocode ${geo}`);
      }
      const wiki = await getWikipediaCityInfo(location);
      if (!wiki) {
        warnInvalid(`No Wikipedia title ${location.city}`, location);
      }
      const voting = await fetchVotingInfo(geo);

      result[key] = {
        ...location,
        ...geo,
        ...wiki,
        pct_dem_lead: voting?.pct_dem_lead,
      };
    } catch (err) {
      warn(`Failed to augment location ${err.message}`, location);
    }
  }
  return result;
}

function extractTabsFromInitScript(html: string): SpreadsheetTabInfo[] {
  const $ = load(html);

  const initScript = $("script")
    .filter((_, el) => !!$(el).html()?.includes("function init()"))
    .first()
    .html();

  if (!initScript) {
    throw new Error("Could not find init() script.");
  }

  const tabs: SpreadsheetTabInfo[] = [];

  const itemRegex = /items\.push\(\s*{([\s\S]*?)}\s*\);/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(initScript)) !== null) {
    const block = match[1];

    const nameMatch = block.match(/name:\s*"(.*?)"/);
    const gidMatch = block.match(/gid:\s*"(.*?)"/);

    if (nameMatch && gidMatch) {
      tabs.push({ name: nameMatch[1], gid: gidMatch[1] });
    }
  }

  return tabs;
}

async function scrapeSheet({ name, gid }) {
  const url = `https://docs.google.com/spreadsheets/d/${DOC_ID}/preview/sheet?gid=${gid}#gid=${gid}`;
  const html = await fetchHTML(url);
  const $ = load(html);

  const allRows = $("table.waffle tbody tr");

  if (allRows.length < 2) return [];

  let headerRowIndex = -1;

  for (let i = 0; i < allRows.length; i++) {
    const tds = $(allRows[i]).find("td");
    if (tds.length < 2) continue;
    const first = tds.eq(0).text().trim().toLowerCase();
    const second = tds.eq(1).text().trim().toLowerCase();
    if (first === "date" && second === "address") {
      // Look ahead at next row for same number of columns
      if ($(allRows[i + 1]).find("td").length == tds.length) {
        headerRowIndex = i;
        break;
      }
    }
  }

  if (headerRowIndex < 0) {
    throw new Error(
      "Couldn't find a header in the sheet that starts with cells Date and Address"
    );
  }

  function getRowCells(row) {
    return $(row)
      .find("td") // Only <td> elements
      .map((_, el) => $(el).text().trim())
      .get();
  }

  const headers = getRowCells(allRows[headerRowIndex]).map((name) => {
    const renames = {
      "Org. Link": "Link",
      "Name of Protest": "Name",
    };
    const header = renames[name] || name;
    return header.toLowerCase();
  });
  const dataRows: string[][] = [];
  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    dataRows.push(getRowCells(allRows[i]));
  }

  const mappedRows = dataRows.map((row) => {
    const obj: RawEvent = { sheetName: name };
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? null;
    });
    return obj;
  });

  console.log(`Scraped ${mappedRows.length} rows`);

  return mappedRows;
}

async function scrapeAllSheets() {
  const url = `https://docs.google.com/spreadsheets/d/${DOC_ID}/preview`;
  const mainHTML = await fetchHTML(url);
  const tabs = extractTabsFromInitScript(mainHTML);

  const allRows: RawEvent[] = [];

  for (const tab of tabs) {
    console.log(`Scraping tab: ${tab.name}`);
    try {
      const rows = (await scrapeSheet(tab)) ?? [];
      allRows.push(...rows);
    } catch (err) {
      console.log(`Error scraping tab ${tab.name}, skipping...`, err);
    }
  }
  console.log(
    `Scraped ${allRows.length} total rows, augmenting with lat/long and wiki data...`
  );
  return allRows;
}

function getLocationKey(event: RawLocation): string {
  const parts = [event.address, event.city, event.state]
    .map((p) => (p || "").toLowerCase())
    .filter(Boolean);
  return parts.join("-");
}
const correctedEventNames: Record<string, string> = {
  "": "Unnamed event",
  None: "Unnamed event",
  "No name": "Unnamed event",
};

async function warnInvalid(str: string, event: RawEvent | RawLocation) {
  warn(`[Validation Error] ${str}`, event);

  const logMessage = `${str} ${JSON.stringify(event)}\n`;
  try {
    await appendFile(INVALID_EVENTS_LOG, logMessage);
  } catch (err) {
    console.error(`Failed to write to invalid events log: ${err.message}`);
  }
}
async function normalizeRawEvents(rawEvents: RawEvent[]): Promise<RawEvent[]> {
  const normalizedEvents: RawEvent[] = []; // Array to store only valid, normalized events

  for (const event of rawEvents) {
    const { name, zip, date, ...rest } = event;

    // 1. Normalize Name
    const normalizedName = name
      ? (correctedEventNames[name] ?? toTitleCase(name).trim())
      : "Unnamed event";
    if (!name) {
      await warnInvalid("Missing or empty name", event);
    }

    // 2. Normalize and Validate Date (critical, skip event if invalid)
    const normalizedDate = normalizeYearTo2025(normalizeToYYYYMMDD(date));
    if (!normalizedDate) {
      await warnInvalid("Bad date", event);
      continue; // Skip to the next event in the loop
    }

    // 3. Normalize and Validate Zip (warn only)
    let normalizedZip = zip?.trim();
    if (!isValidZipCode(normalizedZip)) {
      await warnInvalid(`Bad zipcode ${normalizedZip}`, event);
      normalizedZip = undefined;
    }

    const candidateEvent = {
      name: normalizedName,
      zip: normalizedZip,
      date: normalizedDate,
      ...rest,
    };

    // 4. Geocode (critical, skip event if fails, await sequentially to be a good citizen)
    if (!(await geocode(candidateEvent))) {
      await warnInvalid("Could not geolocate address", event);
      continue; // Skip to the next event in the loop
    }

    // If all checks pass, add the event to the result array
    normalizedEvents.push(candidateEvent);
  }

  return normalizedEvents;
}

async function createEventsByDateAndLocations(originalEvents: RawEvent[]) {
  const locations: Record<string, RawLocation> = {};
  const events: ProtestEventJson[] = [];
  const seenEvents = new Set<string>(); // Set to track seen events

  let curId = 0;

  for (const event of originalEvents) {
    const locKey = getLocationKey(event);

    // Deduplicate and populate locations
    if (!locations[locKey]) {
      locations[locKey] = {
        address: event.address,
        zip: event.zip,
        city: event.city,
        state: event.state,
        country: event.country,
      };
    }

    // Create a unique key for the event based on date, name, link, and location
    const eventKey = `${event.date}:::${event.name}:::${event.link}:::${locKey}`;

    // Check if the event has already been seen
    if (!seenEvents.has(eventKey)) {
      seenEvents.add(eventKey); // Add the key to the set
      events.push({
        id: curId++,
        date: event.date ?? "",
        name: event.name ?? "",
        link: event.link ?? "",
        location: locKey,
      });
    } else {
      warn(`Skipping duplicate event: ${eventKey}`);
    }
  }

  const groupedEvents: Record<string, ProtestEventJson[]> = events.reduce(
    (acc, event) => {
      const { date, ...rest } = event;

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(rest);
      return acc;
    },
    {}
  );

  console.log(
    `${events.length} total events (after deduplication of ${originalEvents.length - events.length}), ${Object.keys(groupedEvents).length} dates, ${Object.keys(locations).length} locations`
  );

  return { groupedEvents, locations };
}

async function updatePrebuiltDataCaches() {
  console.log("Copying cache files to prebuilt_data...");
  const cacheFiles = ["bad_geocache.txt", "geocache.json", "wikicache.json"];
  const cacheDir = "./cache/";
  const prebuiltDataDir = "./prebuilt_data/";

  for (const file of cacheFiles) {
    const src = cacheDir + file;
    const dest = prebuiltDataDir + file;
    try {
      await copyFile(src, dest);
      console.log(`Copied ${src} to ${dest}`);
    } catch (copyErr) {
      warn(`Failed to copy ${src} to ${dest}: ${copyErr.message}`);
      throw copyErr;
    }
  }
  console.log("Finished copying cache files.");
}

const { readFile, writeFile, access, copyFile, appendFile } = await import(
  "fs/promises"
); // Add copyFile and appendFile
const { constants } = await import("fs"); // Ensure constants is imported

const run = async () => {
  const args = process.argv.slice(2);
  const tryUsingCache = args.includes("--use-cache");
  let rawEvents: RawEvent[] = [];
  let loadedFromCache = false;
  let cacheTimestamp;

  // Ensure cache directory exists and clear the invalid events log file at the start
  await mkdir("./cache", { recursive: true });
  await writeFile(INVALID_EVENTS_LOG, "");

  try {
    if (tryUsingCache) {
      try {
        await access(RAW_OUTPUT, constants.F_OK); // Check if cache file exists
        console.log(`Attempting to use cached data from ${RAW_OUTPUT}`);
        const fileContents = await readFile(RAW_OUTPUT, "utf8");
        const cachedData = JSON.parse(fileContents);
        // Expecting raw_output to be an object like { scrapedAt: 'timestamp', data: [...] }
        if (
          cachedData &&
          cachedData.scrapedAt &&
          Array.isArray(cachedData.data)
        ) {
          rawEvents = cachedData.data;
          cacheTimestamp = cachedData.scrapedAt;
          loadedFromCache = true;
          console.log(
            `Successfully used cached data from ${RAW_OUTPUT} (scraped at ${cacheTimestamp})`
          );
        } else {
          console.log(
            `Cached data in ${RAW_OUTPUT} is not in the expected format. Will scrape live data.`
          );
        }
      } catch {
        console.log(
          `Cache file ${RAW_OUTPUT} not found or unreadable. Will scrape live data.`
        );
      }
    }

    if (!loadedFromCache) {
      console.log(
        tryUsingCache
          ? "Scraping live data (cache miss, error, or invalid format)..."
          : "Scraping live data (cache not requested - use --use-cache to do so)..."
      );
      const liveScrapedEvents = await scrapeAllSheets();
      cacheTimestamp = new Date().toISOString(); // Timestamp for when this live scrape happened
      const dataToCache = {
        scrapedAt: cacheTimestamp,
        data: liveScrapedEvents,
      };
      await writeFile(RAW_OUTPUT, JSON.stringify(dataToCache, null, 2));
      rawEvents = liveScrapedEvents; // Use the data part for further processing
      console.log(
        `Saved live scraped data (scraped at ${cacheTimestamp}) to ${RAW_OUTPUT}`
      );
    }

    if (rawEvents.length === 0) {
      warn("Empty raw events!");
    }

    const normalizedRawEvents = await normalizeRawEvents(rawEvents);

    const normalizedEvents =
      await createEventsByDateAndLocations(normalizedRawEvents);

    const augmentedLocations = await augmentLocations(
      normalizedEvents.locations
    );

    const simplifiedLocations = stripPropsFromValues(augmentedLocations, [
      "address",
      "zip",
      "city",
      "state",
      "country",
      "displayName",
    ]);

    const result: ProtestEventDataJson = {
      updatedAt:
        loadedFromCache && cacheTimestamp
          ? cacheTimestamp
          : new Date().toISOString(),
      events: normalizedEvents.groupedEvents,
      locations: simplifiedLocations,
    };
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT, JSON.stringify(result, null, 2));
    console.log(`Saved to ${OUTPUT}`);

    await updatePrebuiltDataCaches();
  } catch (err) {
    console.error("Error:", err);
    throw err;
  }
};

try {
  run();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
