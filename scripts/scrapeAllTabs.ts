import { load } from "cheerio";
import { loadGeocodeCache, geocode } from "./geocode.mjs";
import { loadWikiCache, getWikipediaCityInfo } from "./wikidata.mjs";
import { loadVotingInfo, fetchVotingInfo } from "./votingInfo.mjs";
import {
  normalizeToYYYYMMDD,
  normalizeYearTo2025,
} from "../src/lib/util/date.ts";
import { mkdir } from "fs/promises";
import { toTitleCase } from "../src/lib/util/string.ts";
import { stripPropsFromValues } from "../src/lib/util/misc.ts";
import { ProtestEventJson } from "../src/lib/types.ts";

const DOC_ID = "1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A";
const OUTPUT_DIR = "./static/data";
const OUTPUT = `${OUTPUT_DIR}/data.json`;
const RAW_OUTPUT = "./cache/events_raw.json";

async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return await res.text();
}

async function augmentLocations(locations) {
  await loadGeocodeCache();
  await loadWikiCache();
  await loadVotingInfo();

  const result = {};

  const keys = Object.keys(locations);
  for (const key of keys) {
    //console.log(`Augmenting ${++i} of ${keys.length}`);
    const location = locations[key];
    try {
      const geo = await geocode(location);
      const wiki = await getWikipediaCityInfo(location);
      const voting = await fetchVotingInfo(geo);

      result[key] = {
        ...location,
        ...geo,
        ...wiki,
        pct_dem_lead: voting?.pct_dem_lead,
      };
    } catch {
      // console.warn(
      //   `⚠️ Failed to augment: ${JSON.stringify(location)}\n  → ${err.message}`
      // );
      result[key] = location;
    }
  }
  return result;
}

type TabInfo = { name: string; gid: string };

function extractTabsFromInitScript(html: string): TabInfo[] {
  const $ = load(html);

  const initScript = $("script")
    .filter((_, el) => !!$(el).html()?.includes("function init()"))
    .first()
    .html();

  if (!initScript) {
    throw new Error("Could not find init() script.");
  }

  const tabs: TabInfo[] = [];

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: Record<string, any> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? null;
    });
    obj.sheetName = name;
    return obj;
  });

  console.log(`Scraped ${mappedRows.length} rows`);

  return mappedRows;
}

async function scrapeAllSheets() {
  const url = `https://docs.google.com/spreadsheets/d/${DOC_ID}/preview`;
  const mainHTML = await fetchHTML(url);
  const tabs = extractTabsFromInitScript(mainHTML);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRows: Record<string, any>[] = [];

  for (const tab of tabs) {
    console.log(`Scraping tab: ${tab.name}`);
    const rows = (await scrapeSheet(tab)) ?? [];
    allRows.push(...rows);
  }
  console.log(
    `Scraped ${allRows.length} total rows, augmenting with lat/long and wiki data...`
  );
  return allRows;
}

function getLocationKey(event) {
  const parts = [event.address, event.city, event.state]
    .map((p) => (p || "").toLowerCase())
    .filter(Boolean);
  return parts.join("-");
}

function normalizeNames(rawEvents) {
  const correctedEventNames = {
    "": "Unnamed event",
    None: "Unnamed event",
    "No name": "Unnamed event",
  };

  return rawEvents.map((event) => {
    const { name: originalName, ...rest } = event;
    const normalizedName =
      correctedEventNames[originalName] ?? toTitleCase(originalName);
    return { name: normalizedName, ...rest };
  });
}

async function normalizeByLocationAndGroupByDate(originalEvents) {
  const locations = {};
  const events: ProtestEventJson[] = [];

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
    events.push({
      id: curId++,
      date: event.date,
      name: event.name,
      link: event.link,
      location: locKey,
    });
  }

  const groupedEvents = events.reduce((acc, event) => {
    const { date: originalDateStr, ...rest } = event;

    const normalizedDate = normalizeToYYYYMMDD(originalDateStr);

    if (!normalizedDate) {
      console.warn(
        `Could not normalize date: "${originalDateStr}". Skipping event: ${JSON.stringify(rest)}`
      );
      return acc;
    }

    const finalDate = normalizeYearTo2025(normalizedDate);

    if (!finalDate) {
      console.warn(
        `Could not normalize year in date: "${normalizedDate}". Skipping event: ${JSON.stringify(rest)}`
      );
      return acc;
    }
    if (!acc[finalDate]) {
      acc[finalDate] = [];
    }

    acc[finalDate].push(rest);
    return acc;
  }, {});

  console.log(
    `${events.length} total events, ${Object.keys(groupedEvents).length} dates, ${Object.keys(locations).length} locations`
  );

  return { groupedEvents, locations };
}

const { readFile, writeFile, access, copyFile } = await import("fs/promises"); // Add copyFile
const { constants } = await import("fs"); // Ensure constants is imported

const run = async () => {
  const args = process.argv.slice(2);
  const tryUsingCache = args.includes("--use-cache");
  const updatePrebuiltData = args.includes("--updatePrebuiltData"); // Check for the new flag
  let rawEvents;
  let loadedFromCache = false;
  let cacheTimestamp;

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

    const normalizedNameRawEvents = normalizeNames(rawEvents);

    const normalizedEvents = await normalizeByLocationAndGroupByDate(
      normalizedNameRawEvents
    );

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

    const result = {
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

    // Add logic to copy cache files to prebuilt_data if flag is present
    if (updatePrebuiltData) {
      console.log("Copying cache files to prebuilt_data...");
      const cacheFiles = [
        "bad_geocache.json",
        "geocache.json",
        "wikicache.json",
      ];
      const cacheDir = "./cache/";
      const prebuiltDataDir = "./prebuilt_data/";

      for (const file of cacheFiles) {
        const src = cacheDir + file;
        const dest = prebuiltDataDir + file;
        try {
          await copyFile(src, dest);
          console.log(`Copied ${src} to ${dest}`);
        } catch (copyErr) {
          console.warn(
            `⚠️ Failed to copy ${src} to ${dest}: ${copyErr.message}`
          );
          throw copyErr;
        }
      }
      console.log("Finished copying cache files.");
    }
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
