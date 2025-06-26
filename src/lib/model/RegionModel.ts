import { type Database } from "sql.js";
import Fuse from "fuse.js";
import { toTitleCase } from "$lib/util/string";
import { browser } from "$app/environment";
import { getSqlJs } from "./sqlJsInstance";
import type { MultiPolygon, Polygon } from "geojson";
import { boundsToPolygon } from "$lib/util/bounds";
import { BinaryReader, Geometry } from "wkx-ts";

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

export class RegionDB {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  getNamedRegionByName(name: string): NamedRegion | undefined {
    return (
      this.querySingle(
        `SELECT * FROM region_bounds WHERE name = ? COLLATE NOCASE LIMIT 1`,
        [name]
      ) ?? undefined
    );
  }

  getNamedRegionByZip(zip: string): NamedRegion | undefined {
    return (
      this.querySingle(
        `SELECT * FROM region_bounds where name = ? AND type = 'zip' LIMIT 1`,
        [zip]
      ) ?? undefined
    );
  }

  getNamedRegionByStateAbbreviation(state: string): NamedRegion | undefined {
    return (
      this.querySingle(
        `SELECT * FROM region_bounds where name = ? COLLATE NOCASE AND type = 'state' LIMIT 1`,
        [state]
      ) ?? undefined
    );
  }

  getPolygonForRegion(id: number): Polygon | MultiPolygon | undefined {
    const stmt = this.db.prepare(`
      SELECT polygon_geojson FROM polygon_regions
      WHERE region_id = ?
    `);

    const result = stmt.getAsObject([id]);
    stmt.free();

    if (result && result.polygon_geojson) {
      try {
        const bytes = result.polygon_geojson as Uint8Array;
        // @ts-expect-error wkx-ts typings still require Node Buffer
        const geo = Geometry.parse(new BinaryReader(bytes)).toGeoJSON();
        return geo as Polygon | MultiPolygon;
      } catch {
        console.error("Failed parse state region polygon");
        return undefined;
      }
    }
    return undefined;
  }

  getNamedRegionById(id: number): NamedRegion | undefined {
    return (
      this.querySingle(
        `SELECT * FROM region_bounds WHERE id = ? COLLATE NOCASE LIMIT 1`,
        [id]
      ) ?? undefined
    );
  }

  getMatchingNamedRegion(bounds: Bounds): NamedRegion | undefined {
    const minFraction = 0.8;
    const xSpan = bounds.xmax - bounds.xmin;
    const ySpan = bounds.ymax - bounds.ymin;

    const minWidth = xSpan * minFraction;
    const minHeight = ySpan * minFraction;

    const stmt = this.db.prepare(
      `SELECT id, name, type, xmin, ymin, xmax, ymax,
              (xmax - xmin) * (ymax - ymin) AS area
       FROM region_bounds
       WHERE xmin >= :xmin
         AND ymin >= :ymin
         AND xmax <= :xmax
         AND ymax <= :ymax
         AND ((xmax - xmin) >= :minWidth OR (ymax - ymin) >= :minHeight)
       ORDER BY area DESC
       LIMIT 1`
    );

    stmt.bind({
      ":xmin": bounds.xmin,
      ":ymin": bounds.ymin,
      ":xmax": bounds.xmax,
      ":ymax": bounds.ymax,
      ":minWidth": minWidth,
      ":minHeight": minHeight,
    });

    if (stmt.step()) {
      const [id, name, type, xmin, ymin, xmax, ymax] = stmt.get();
      if (
        typeof id === "number" &&
        typeof name === "string" &&
        typeof type === "string" &&
        typeof xmin === "number" &&
        typeof ymin === "number" &&
        typeof xmax === "number" &&
        typeof ymax === "number"
      ) {
        return {
          id,
          name,
          type: type as RegionType,
          xmin,
          ymin,
          xmax,
          ymax,
        };
      }
    }

    return undefined;
  }

  getNamedRegionWithin(bounds: Bounds): NamedRegion[] {
    const stmt = this.db.prepare(
      `SELECT id, name, type, xmin, ymin, xmax, ymax FROM region_bounds
       WHERE xmin >= :xmin
         AND ymin >= :ymin
         AND xmax <= :xmax
         AND ymax <= :ymax`
    );

    stmt.bind({
      ":xmin": bounds.xmin,
      ":ymin": bounds.ymin,
      ":xmax": bounds.xmax,
      ":ymax": bounds.ymax,
    });

    const results: NamedRegion[] = [];

    while (stmt.step()) {
      const [id, name, type, xmin, ymin, xmax, ymax] = stmt.get();
      if (
        typeof id === "number" &&
        typeof name === "string" &&
        typeof type === "string" &&
        typeof xmin === "number" &&
        typeof ymin === "number" &&
        typeof xmax === "number" &&
        typeof ymax === "number"
      ) {
        results.push({
          id,
          name,
          type: type as RegionType,
          xmin,
          ymin,
          xmax,
          ymax,
        });
      }
    }

    stmt.free();
    return results;
  }

  private querySingle(
    sql: string,
    params: (string | number)[]
  ): NamedRegion | undefined {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    let row: NamedRegion | null = null;
    if (stmt.step()) {
      const result = stmt.getAsObject();
      row = {
        id: Number(result.id),
        name: String(result.name),
        type: String(result.type) as RegionType,
        xmin: Number(result.xmin),
        ymin: Number(result.ymin),
        xmax: Number(result.xmax),
        ymax: Number(result.ymax),
      };
    }

    stmt.free();
    return row ?? undefined;
  }
}

export class RegionModel {
  private static instance: RegionModel;
  private fuse: Fuse<FuseRegionEntry> | null = null;
  private db: RegionDB | null = null;
  private loaded = false;
  private readyPromise: Promise<void>;
  private polygonCache: Map<string, Polygon | MultiPolygon | undefined> =
    new Map();

  private constructor() {
    this.readyPromise = this.load();
  }

  static getInstance(): RegionModel {
    if (!RegionModel.instance) {
      RegionModel.instance = new RegionModel();
    }
    return RegionModel.instance;
  }

  private async load(): Promise<void> {
    if (!browser) return;

    if (this.loaded) return;
    this.loaded = true;

    try {
      function looksLikeGzip(data: Uint8Array): boolean {
        return data[0] === 0x1f && data[1] === 0x8b && data[2] === 0x08;
      }

      async function fetchMaybeGunzipped(url: string): Promise<Uint8Array> {
        const res = await fetch(url);
        const buf = new Uint8Array(await res.arrayBuffer());

        if (looksLikeGzip(buf)) {
          const { gunzipSync } = await import("fflate");
          return gunzipSync(buf);
        }

        return buf;
      }

      const [SQL, dbData, fuseData] = await Promise.all([
        getSqlJs(),
        fetchMaybeGunzipped("/data/regions.sqlite.gz"),
        fetchMaybeGunzipped("/data/region-names.json.gz").then(
          (buf) =>
            JSON.parse(new TextDecoder().decode(buf)) as FuseRegionEntry[]
        ),
      ]);

      const db = new SQL.Database(new Uint8Array(dbData));
      this.db = new RegionDB(db);

      this.fuse = new Fuse(fuseData, {
        keys: ["name"],
        threshold: 0.4,
      });
    } catch (err) {
      this.loaded = false;
      throw err;
    }
  }

  async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  async search(
    query: string,
    limit = 10
  ): Promise<{ name: string; id: number; type: string }[]> {
    await this.waitUntilReady();
    const results = this.fuse!.search(query, { limit });
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
    await this.waitUntilReady();
    return this.db!.getNamedRegionById(id);
  }

  async getNamedRegionForName(name: string): Promise<NamedRegion | undefined> {
    await this.waitUntilReady();
    return this.db!.getNamedRegionByName(name);
  }

  async getNamedRegionForZip(zip: string): Promise<NamedRegion | undefined> {
    await this.waitUntilReady();
    return this.db!.getNamedRegionByZip(zip);
  }

  async getNamedRegionForCity(
    cityInput: string
  ): Promise<NamedRegion | undefined> {
    return this.getNamedRegionByFuzzyTypeMatch({
      name: cityInput,
      type: "city",
    });
  }

  async getNamedRegionForState(
    stateInput: string
  ): Promise<NamedRegion | undefined> {
    await this.waitUntilReady();
    if (stateInput.length === 2) {
      return this.db!.getNamedRegionByStateAbbreviation(
        stateInput.toUpperCase()
      );
    } else {
      return this.getNamedRegionByFuzzyTypeMatch({
        name: stateInput,
        type: "state",
      });
    }
  }

  private getIdForNamedRegion(namedRegion: NameAndRegionType) {
    const cleaned = namedRegion.name.trim().toLowerCase();
    const matches = this.fuse!.search(cleaned, { limit: 10 });
    const filtered = matches.filter((m) => m.item.type === namedRegion.type);

    if (filtered.length === 0) return undefined;

    return filtered[0].item.id;
  }

  private async getNamedRegionByFuzzyTypeMatch(
    nameAndRegionType: NameAndRegionType
  ): Promise<NamedRegion | undefined> {
    await this.waitUntilReady();
    const id = this.getIdForNamedRegion(nameAndRegionType);
    if (!id) return undefined;

    return this.db!.getNamedRegionById(id);
  }

  async getPolygonForNamedRegion(
    namedRegion: NamedRegion
  ): Promise<Polygon | MultiPolygon | undefined> {
    await this.waitUntilReady();
    // We only keep polygon info for states and metros - cities and zips
    // would be too big for client download
    if (namedRegion.type !== "state" && namedRegion.type !== "metro") {
      return boundsToPolygon(namedRegion);
    }
    const cacheKey = `${namedRegion.type}:${namedRegion.name}`;
    let cachedPolygon = this.polygonCache.get(cacheKey);
    if (cachedPolygon) return cachedPolygon;
    cachedPolygon = this.db!.getPolygonForRegion(namedRegion.id);
    this.polygonCache.set(cacheKey, cachedPolygon);
    return cachedPolygon;
  }

  async getMatchingNamedRegion(
    bounds: Bounds
  ): Promise<NamedRegion | undefined> {
    await this.waitUntilReady();
    return this.db!.getMatchingNamedRegion(bounds);
  }

  async getNamedRegionsWithin(
    bounds: Bounds
  ): Promise<NamedRegion[] | undefined> {
    await this.waitUntilReady();
    return this.db!.getNamedRegionWithin(bounds);
  }
}
