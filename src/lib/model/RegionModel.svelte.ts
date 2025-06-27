import Fuse from "fuse.js";
import { toTitleCase } from "$lib/util/string";
import { browser } from "$app/environment";
import { getSqlJs } from "./sqlJsInstance";
import type { MultiPolygon, Polygon } from "geojson";
import { boundsToPolygon } from "$lib/util/bounds";
import { RegionDB } from "./RegionDb";
import type { SqlJsStatic } from "sql.js";

export type Bounds = {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
};

export type NameAndRegionType = {
  name: string;
  type: RegionType;
};

export type RegionType = "zip" | "city" | "state" | "metro" | "unnamed";

export type NamedRegion = {
  id: number;
} & NameAndRegionType &
  Bounds;

export interface FuseRegionEntry {
  id: number;
  name: string;
  type: string;
}
export const stateNameForAbbreviation: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  PR: "Puerto Rico",
  DC: "District of Columbia",
  GU: "Guam",
  AS: "American Samoa",
  VI: "U.S. Virgin Islands",
  MP: "Northern Mariana Islands",
};

export const abbreviationForStateName: Record<string, string> =
  Object.fromEntries(
    Object.entries(stateNameForAbbreviation).map(([abbr, name]) => [
      name.toLowerCase(),
      abbr,
    ])
  );

export function prettifyNamedRegion(
  region: NameAndRegionType,
  onUnhandled = (_region: NameAndRegionType) => "US"
): string {
  if (!region || !region.name || !region.type) return onUnhandled(region);

  switch (region.type) {
    case "city":
    case "metro": {
      const match = region.name.match(/^(.+)[,\s]\s([A-Za-z]{2})$/);
      if (match) {
        const [, city, stateAbbr] = match;
        const uppedStateAbbr = stateAbbr.toUpperCase();
        const stateFull =
          stateNameForAbbreviation[uppedStateAbbr] ?? uppedStateAbbr;
        return `${toTitleCase(city)}, ${stateFull}${region.type === "metro" ? " (Metro)" : ""}`;
      } else {
        return onUnhandled(region);
      }
    }
    case "zip":
      return `ZIP Code ${region.name}`;
    case "state":
      if (region.name.length > 2) {
        return toTitleCase(region.name);
      } else {
        return stateNameForAbbreviation[region.name.toUpperCase()];
      }
    case "unnamed":
      return region.name;
  }
}

const regionsVersion = "v1.0.1";
const FULL_URL = `/data/regions-${regionsVersion}.sqlite.gz`;
const LITE_URL = `/data/regions-lite-${regionsVersion}.sqlite.gz`;
const NAMES_URL = `/data/region-names-${regionsVersion}.json.gz`;

export class RegionModel {
  private static instance: RegionModel;

  private sql: SqlJsStatic | undefined;

  private fuse: Fuse<FuseRegionEntry> | null = null;

  private liteDb: RegionDB | null = null;
  private fullDb: RegionDB | null = $state(null);

  allPolygonsLoaded = $derived(this.fullDb !== null);

  private async getActiveDb() {
    await this.waitUntilReady();
    const result = this.fullDb ?? this.liteDb;
    if (!result) throw new Error("RegionModel - no active DB");
    return result;
  }

  private async getFuse() {
    await this.waitUntilReady();
    const result = this.fuse;
    if (!result) throw new Error("RegionModel - no fuse");
    return result;
  }

  private async getSql() {
    await this.waitUntilReady();
    const result = this.sql;
    if (!result) throw new Error("RegionModel - no sql");
    return result;
  }

  private readonly readyPromise: Promise<void>;

  private polygonCache: Map<string, Polygon | MultiPolygon | undefined> =
    new Map();

  private constructor() {
    this.readyPromise = this.load(); // ← only waits for LITE
  }

  loadedFullPolygons = $state(false);

  static getInstance(): RegionModel {
    return (RegionModel.instance ??= new RegionModel());
  }

  /** gate anything that needs *some* DB + names index */
  async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  /** loads the *lite* DB + names, then kicks off background full-DB fetch */
  private async load(): Promise<void> {
    if (!browser) return; // SSR / prerender
    if (this.liteDb) return; // already started

    const looksLikeGzip = (u8: Uint8Array) =>
      u8[0] === 0x1f && u8[1] === 0x8b && u8[2] === 0x08;

    const fetchMaybeGunzipped = async (url: string): Promise<Uint8Array> => {
      const res = await fetch(url);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (looksLikeGzip(buf)) {
        const { gunzipSync } = await import("fflate");
        return gunzipSync(buf);
      }
      return buf;
    };

    try {
      const [SQL, liteBuf, namesBuf] = await Promise.all([
        getSqlJs(),
        fetchMaybeGunzipped(LITE_URL),
        fetchMaybeGunzipped(NAMES_URL),
      ]);

      this.sql = SQL;

      this.liteDb = new RegionDB(new SQL.Database(liteBuf));

      const raw = new TextDecoder().decode(namesBuf);
      const names = JSON.parse(raw) as FuseRegionEntry[];
      this.fuse = new Fuse(names, { keys: ["name"], threshold: 0.4 });

      /** fire-and-forget full DB download */
      this.loadFullDb(fetchMaybeGunzipped);
    } catch (err) {
      console.error("Failed to initialise RegionModel", err);
      throw err;
    }
  }

  /** becomes activeDb once the full DB is available */
  private async loadFullDb(
    fetchMaybeGunzipped: (_url: string) => Promise<Uint8Array>
  ): Promise<void> {
    try {
      const buf = await fetchMaybeGunzipped(FULL_URL);
      const sql = await this.getSql();
      const full = new RegionDB(new sql.Database(buf));

      this.fullDb = full;
      console.info("[RegionModel] full region DB ready");

      this.polygonCache = new Map();
    } catch (err) {
      console.warn("Full region DB failed to load; continuing with lite", err);
    }
  }

  async search(
    query: string,
    limit = 10
  ): Promise<{ name: string; id: number; type: string }[]> {
    const results = (await this.getFuse()).search(query, { limit });
    const seen = new Set<number>();
    return results
      .filter((r) => {
        if (!r.item.name) return false;
        if (seen.has(r.item.id)) return false;
        seen.add(r.item.id);
        return true;
      })
      .map((r) => ({
        id: r.item.id,
        type: r.item.type,
        name: prettifyNamedRegion(r.item as NameAndRegionType),
      }));
  }

  async getNamedRegionForId(id: number) {
    return (await this.getActiveDb()).getNamedRegionById(id);
  }

  async getNamedRegionForName(name: string): Promise<NamedRegion | undefined> {
    return (await this.getActiveDb()).getNamedRegionByName(name);
  }

  async getNamedRegionForZip(zip: string): Promise<NamedRegion | undefined> {
    return (await this.getActiveDb()).getNamedRegionByZip(zip);
  }

  async getNamedRegionForCity(
    cityInput: string
  ): Promise<NamedRegion | undefined> {
    return this.getNamedRegionByFuzzyTypeMatch({
      name: cityInput,
      type: "city",
    });
  }

  async getNamedRegionForMetro(
    metroInput: string
  ): Promise<NamedRegion | undefined> {
    return this.getNamedRegionByFuzzyTypeMatch({
      name: metroInput,
      type: "metro",
    });
  }

  async getNamedRegionForState(
    stateInput: string
  ): Promise<NamedRegion | undefined> {
    if (stateInput.length === 2) {
      return (await this.getActiveDb()).getNamedRegionByStateAbbreviation(
        stateInput.toUpperCase()
      );
    } else {
      return this.getNamedRegionByFuzzyTypeMatch({
        name: stateInput,
        type: "state",
      });
    }
  }

  private async getIdForNamedRegion(namedRegion: NameAndRegionType) {
    const cleaned = namedRegion.name.trim().toLowerCase();
    const matches = (await this.getFuse()).search(cleaned, { limit: 10 });
    const filtered = matches.filter((m) => m.item.type === namedRegion.type);

    if (filtered.length === 0) return undefined;

    return filtered[0].item.id;
  }

  private async getNamedRegionByFuzzyTypeMatch(
    nameAndRegionType: NameAndRegionType
  ): Promise<NamedRegion | undefined> {
    const id = await this.getIdForNamedRegion(nameAndRegionType);
    if (!id) return undefined;

    return (await this.getActiveDb()).getNamedRegionById(id);
  }

  async getPolygonForNamedRegion(
    namedRegion: NamedRegion
  ): Promise<Polygon | MultiPolygon | undefined> {
    const cacheKey = `${namedRegion.type}:${namedRegion.name}`;
    const cachedPolygon = this.polygonCache.get(cacheKey);
    if (cachedPolygon) return cachedPolygon;

    let polygon = (await this.getActiveDb()).getPolygonForRegion(
      namedRegion.id
    );
    // If we're using the lite version of the region database,
    // and don't have a polygon for this region, fall back to bounds.
    if (!polygon) {
      polygon = boundsToPolygon(namedRegion);
    }

    this.polygonCache.set(cacheKey, polygon);
    return polygon;
  }

  async getMatchingNamedRegion(
    bounds: Bounds
  ): Promise<NamedRegion | undefined> {
    return (await this.getActiveDb()).getMatchingNamedRegion(bounds);
  }

  async getNamedRegionsWithin(
    bounds: Bounds
  ): Promise<NamedRegion[] | undefined> {
    return (await this.getActiveDb()).getNamedRegionWithin(bounds);
  }
}
