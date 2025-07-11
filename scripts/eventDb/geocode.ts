import { Coordinates, Nullable } from "../../src/lib/types";
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

export async function geocodeFromService({
  address,
  zip,
  city,
  state,
  country,
}: Address): Promise<Geocode> {
  console.log(`Geocoding ${address ? address : ""} ${city} ${state}...`);

  const allFieldsEmpty = [address, zip, city, state, country].every(
    (part) => !part?.trim()
  );
  if (allFieldsEmpty) {
    throw new Error("Cannot geocode: all address fields are empty.");
  }

  const tryQuery = async ({
    useStructured = true,
    includeStreet = true,
    includeZip = true,
    includeCity = true,
    includeState = true,
    includeCountry = true,
  }) => {
    const queryParts = {
      street: includeStreet ? address : undefined,
      city: includeCity ? city : undefined,
      state: includeState ? state : undefined,
      postalcode: includeZip ? zip : undefined,
      country: includeCountry ? country : undefined,
    };

    let params: Nullable<URLSearchParams> = null;
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
    { useStructured: true, includeStreet: true, includeZip: false },
    { useStructured: false, includeStreet: true, includeZip: false },
    { useStructured: true, includeStreet: false, includeZip: true },
    { useStructured: false, includeStreet: false, includeZip: false },
    // Last gasp, try just the zip
    {
      useStructured: false,
      includeStreet: false,
      includeZip: true,
      includeCity: false,
      includeState: false,
      includeCountry: false,
    },
  ];

  for (const [i, attempt] of attempts.entries()) {
    const label =
      `${attempt.useStructured ? "structured" : "q"} query` +
      (attempt.includeStreet ? " + street" : "") +
      (attempt.includeZip ? " + zip" : "") +
      (attempt.includeCity ? " + city" : "") +
      (attempt.includeState ? " + state" : "") +
      (attempt.includeCountry ? " + country " : "");
    console.log(`🔎 Attempt ${i + 1}: ${label}`);
    const data = await tryQuery(attempt);
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

function isRoughlyInUS(lat: number, lon: number): boolean {
  // Rough bounding box for continental US
  const withinLat = lat >= 24.396308 && lat <= 49.384358;
  const withinLng = lon >= -125.0 && lon <= -66.93457;
  return withinLat && withinLng;
}
