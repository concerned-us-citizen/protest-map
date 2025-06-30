import { Coordinates, Nullable } from "../../src/lib/types";
import { delay } from "../../src/lib/util/misc";
import { isValidZipCode } from "../../src/lib/util/string";
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
  // Defend against poorly formed zips
  zip = isValidZipCode(zip) ? zip : undefined;

  console.log(`Geocoding ${address ? address : ""} ${city} ${state}...`);

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
