// Sloppy one-off to prune bad lookups from the cached geocache.json file because of bad zipcodes.
// These will now be caught during the scraping.
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { isValidZipCode } from "../src/lib/util/string";

// Define the structure of your data objects
interface LocationData {
  date: string;
  address: string;
  zip: string;
  city: string;
  state: string;
  country: string;
}

// These are the actual functions used to build and normalize the address
function buildAddress({
  address,
  zip,
  city,
  state,
  country,
}: LocationData): string {
  return [address, zip, city, state, country]
    .filter((part) => part?.trim() !== "")
    .join(" ");
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "../cache/events_raw.json");

try {
  const fileContent = await fs.readFile(filePath, "utf8");
  const data: { data: LocationData[] } = JSON.parse(fileContent);

  if (!data || !Array.isArray(data.data)) {
    console.error("Error: JSON file does not contain a 'data' array.");
    process.exit(1);
  }

  const badZips = data.data
    .filter((locationObj: LocationData) => !isValidZipCode(locationObj.zip))
    .map((locationObj) => normalizeAddress(buildAddress(locationObj)));

  data.data.forEach((locationObj: LocationData) => {
    if (!isValidZipCode(locationObj.zip)) {
      // Calculate the 'key' using the actual functions
      const address = buildAddress(locationObj);
      const key = normalizeAddress(address);

      // Print only the requested output string
      console.log(`bad zip ${key}`);
      badZips.push(key);
    }
  });

  const CACHE_FILE = "./cache/geocache.json";
  const json = await fs.readFile(CACHE_FILE, "utf-8");
  const cache = JSON.parse(json);

  console.log(`✅ Loaded ${Object.keys(cache).length} cached addresses.`);

  badZips.forEach((key) => {
    console.log(`pruning bad zip key ${key}`);
    delete cache[key];
  });

  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
} catch (error: any) {
  if (error.code === "ENOENT") {
    console.error(`Error: File not found at ${filePath}`);
  } else if (error instanceof SyntaxError) {
    console.error(`Error: Invalid JSON format in ${filePath}\n`, error.message);
  } else {
    console.error("An unexpected error occurred:", error.message);
  }
  process.exit(1);
}
