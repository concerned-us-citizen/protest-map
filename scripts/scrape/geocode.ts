import fs from "fs/promises";
import { existsSync } from "fs";
import { isValidZipCode } from "../../src/lib/util/string";

const CACHE_FILE = "./cache/geocache.json";
const BAD_CACHE_FILE = "./cache/bad_geocache.txt";
const USER_AGENT = "EventVisualizer/1.0 (hypo.30-buggy@icloud.com)";
const DELAY_MS = 1000;

interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

let cache: Record<string, GeocodeResult> = {};
let badCacheKeys: Set<string> = new Set();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadGeocodeCache() {
  if (existsSync(CACHE_FILE)) {
    const json = await fs.readFile(CACHE_FILE, "utf-8");
    cache = JSON.parse(json);
    console.log(`✅ Loaded ${Object.keys(cache).length} cached addresses.`);
  } else {
    console.log("ℹ️  No cache found. Starting fresh.");
    cache = {};
  }

  if (existsSync(BAD_CACHE_FILE)) {
    try {
      const content = await fs.readFile(BAD_CACHE_FILE, "utf-8");
      // Read bad_geocache.txt as a text file, each line is a key
      const lines = content.split("\n").filter((line) => line.trim() !== "");
      badCacheKeys = new Set(lines);
      console.log(`⚠️ Loaded ${badCacheKeys.size} bad cached address keys.`);
    } catch (e) {
      console.error(`Failed to load bad cache file ${BAD_CACHE_FILE}: ${e}`);
      badCacheKeys = new Set(); // Start fresh if loading fails
    }
  } else {
    console.log(
      `ℹ️  No bad cache file found at ${BAD_CACHE_FILE}. Starting fresh.`
    );
    badCacheKeys = new Set();
  }
}

// This function now only writes the main cache
async function writeCache() {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

export function buildAddress({ address, zip, city, state, country }) {
  return [address, zip, city, state, country]
    .filter((part) => part?.trim() !== "")
    .join(" ");
}

async function fetchGeocode(url: string) {
  await delay(DELAY_MS);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to fetch geocode: ${res.statusText}`);
  return await res.json();
}

async function geocodeFromService({
  address,
  zip,
  city,
  state,
  country,
}): Promise<GeocodeResult> {
  // Defend against poorly formed zips
  zip = isValidZipCode(zip) ? zip : undefined;

  const allFieldsEmpty = [address, zip, city, state, country].every(
    (part) => !part?.trim()
  );
  if (allFieldsEmpty) {
    throw new Error("Cannot geocode: all address fields are empty.");
  }

  const tryQuery = async ({
    useStructured,
    includeStreet = true,
    includeZip = true,
  }) => {
    const queryParts = {
      street: includeStreet ? address : undefined,
      city,
      state,
      postalcode: includeZip ? zip : undefined,
      country,
    };

    let params;
    if (useStructured) {
      params = new URLSearchParams({
        format: "json",
        addressdetails: "1",
        extratags: "1",
        limit: "1",
      });
      for (const [key, value] of Object.entries(queryParts)) {
        if (value?.trim()) params.set(key, value);
      }
    } else {
      const q = [
        includeStreet ? address : "",
        includeZip ? zip : "",
        city,
        state,
        country,
      ]
        .filter((p) => p?.trim())
        .join(", ");
      params = new URLSearchParams({
        q,
        format: "json",
        addressdetails: "1",
        extratags: "1",
        limit: "1",
      });
    }

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    return await fetchGeocode(url);
  };

  const attempts = [
    { useStructured: true, includeStreet: true, includeZip: true },
    { useStructured: true, includeStreet: false, includeZip: true },
    { useStructured: true, includeStreet: false, includeZip: false },
    { useStructured: false, includeStreet: true, includeZip: true },
    { useStructured: false, includeStreet: false, includeZip: true },
    { useStructured: false, includeStreet: false, includeZip: false },
  ];

  for (const [i, attempt] of attempts.entries()) {
    const label =
      `${attempt.useStructured ? "structured" : "q"} query` +
      (attempt.includeStreet ? " + street" : "") +
      (attempt.includeZip ? " + zip" : "");
    console.log(`🔎 Attempt ${i + 1}: ${label}`);
    const data = await tryQuery(attempt);
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }
  }

  throw new Error(`No results found after all fallbacks.`);
}

export async function geocode(locationObj) {
  const address = buildAddress(locationObj);
  const key = normalizeAddress(address);

  if (key.length === 0) {
    return null;
  }

  if (cache[key]) {
    return cache[key];
  }
  if (badCacheKeys.has(key)) {
    return null;
  }

  console.log(`🌐 Geocoding new address: "${address}" key: ${key}`);
  try {
    const result = await geocodeFromService(locationObj);
    cache[key] = result;
    await writeCache();
    return result;
  } catch {
    // Add the key to the in-memory Set
    badCacheKeys.add(key);
    // Append the key followed by a newline to the bad cache file
    await fs.appendFile(BAD_CACHE_FILE, key + "\n", "utf-8");
  }
}
