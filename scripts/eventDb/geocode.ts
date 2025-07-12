import { Coordinates } from "../../src/lib/types";
import { delay } from "../../src/lib/util/misc";
import { config } from "./config";
import { Address } from "./types";

const USER_AGENT = config.userAgent;
const DELAY_MS = 1000;

export interface Geocode extends Coordinates {
  displayName: string;
}

async function fetchGeocode(url: string) {
  await delay(DELAY_MS);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to fetch geocode: ${res.statusText}`);
  return await res.json();
}

function sanitize(str: string | undefined | null) {
  return str?.trim() ?? "";
}

async function attemptGeocodeWithProps(
  addr: Address,
  propsToAttempt: (keyof Address)[]
) {
  const params = new URLSearchParams({
    country: "USA",
    format: "json",
    addressdetails: "1",
    extratags: "1",
    limit: "1",
  });
  for (const prop of propsToAttempt) {
    const value = addr[prop];
    if (!value || value?.length === 0) {
      return [];
    }
    params.set(prop, value);
  }
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  return await fetchGeocode(url);
}

export async function geocodeFromService({
  address,
  zip,
  city,
  state,
}: Address): Promise<Geocode> {
  console.log(`Geocoding ${address ? address : ""} ${city} ${state} ${zip}...`);

  const sanitized = {
    address: sanitize(address),
    city: sanitize(city),
    state: sanitize(state),
    zip: sanitize(zip),
  };

  const propsToAttempt: (keyof Address)[][] = [
    ["address", "city", "state", "zip"],
    ["address", "city", "state"],
    ["zip"],
    ["city", "state"],
  ];

  for (const props of propsToAttempt) {
    const data = await attemptGeocodeWithProps(sanitized, props);
    if (data.length > 0) {
      const loc = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
      if (isRoughlyInUS(loc.lat, loc.lon)) {
        return loc;
      }
    }
  }

  throw new Error(`No results found after all fallbacks.`);
}

const US_BOUNDS = {
  minLat: 18.9, // Southern tip of Hawaii
  maxLat: 71.4, // Northernmost point of Alaska
  minLng: -179.2, // Western Aleutian Islands, Alaska
  maxLng: -66.9, // Eastern tip of Maine
};

function isRoughlyInUS(lat: number, lon: number): boolean {
  // Rough bounding box for continental US
  const withinLat = lat >= US_BOUNDS.minLat && lat <= US_BOUNDS.maxLat;
  const withinLng = lon >= US_BOUNDS.minLng && lon <= US_BOUNDS.maxLng;
  return withinLat && withinLng;
}
