import fs from "fs/promises";
import { existsSync } from "fs";
import { isValidZipCode } from "../src/lib/util/string";

const CACHE_FILE = "./cache/geocache.json";
const BAD_CACHE_FILE = "./cache/bad_geocache.json";
const USER_AGENT = "EventVisualizer/1.0 (hypo.30-buggy@icloud.com)";
const DELAY_MS = 1500;

let cache = {};
let badCache = {};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const json = await fs.readFile(BAD_CACHE_FILE, "utf-8");
    badCache = JSON.parse(json);
    console.log(
      `⚠️ Loaded ${Object.keys(badCache).length} bad cached addresses.`
    );
  } else {
    badCache = {};
  }
}

async function writeCache() {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  await fs.writeFile(
    BAD_CACHE_FILE,
    JSON.stringify(badCache, null, 2),
    "utf-8"
  );
}

function normalizeAddress(address) {
  return address.trim().toLowerCase();
}

export function buildAddress({ address, zip, city, state, country }) {
  return [address, zip, city, state, country]
    .filter((part) => part?.trim() !== "")
    .join(" ");
}

async function fetchGeocode(url) {
  await delay(DELAY_MS);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to fetch geocode: ${res.statusText}`);
  return await res.json();
}

async function geocodeFromService({ address, zip, city, state, country }) {
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
    console.warn(`🔎 Attempt ${i + 1}: ${label}`);
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

  if (cache[key]) {
    return cache[key];
  }
  if (badCache[key]) {
    throw new Error(`Previously failed to geocode: "${address}"`);
  }

  console.log(`🌐 Cache miss: "${address}"`);
  try {
    const result = await geocodeFromService(locationObj);
    cache[key] = result;
    await writeCache();
    return result;
  } catch (err) {
    badCache[key] = { error: err.message };
    await writeCache();
    throw err;
  }
}
