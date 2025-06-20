import { type Database } from "sql.js";
import Fuse from "fuse.js";
import { toTitleCase } from "$lib/util/string";
import { browser } from "$app/environment";
import { getSqlJs } from "./sqlJsInstance";

export type BoundsType = "zip" | "city" | "state" | "unnamed";

export type Bounds = Pick<RegionBounds, "xmin" | "ymin" | "xmax" | "ymax">;

export interface RegionBounds {
  id?: number;
  name?: string;
  type: BoundsType;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

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
};

export const abbreviationForStateName: Record<string, string> =
  Object.fromEntries(
    Object.entries(stateNameForAbbreviation).map(([abbr, name]) => [
      name.toLowerCase(),
      abbr,
    ])
  );

export function prettifyRegionName(
  name: string | undefined,
  type: BoundsType,
  onUnhandled = (name: string, _type: string) => name
): string {
  if (!name) name = "visible region";
  switch (type) {
    case "city": {
      const match = name.match(/^(.+),\s*([A-Z]{2})$/);
      if (match) {
        const [, city, stateAbbr] = match;
        const stateFull = stateNameForAbbreviation[stateAbbr] ?? stateAbbr;
        return `${toTitleCase(city)}, ${stateFull}`;
      } else {
        return onUnhandled(name, type);
      }
    }
    case "zip":
      return `ZIP Code ${name}`;
    case "state":
      return stateNameForAbbreviation[name];
    case "unnamed":
      return name;
  }
}

export class RegionDB {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  getBoundsByName(name: string): RegionBounds | undefined {
    return (
      this.querySingle(
        `SELECT * FROM region_bounds WHERE name = ? COLLATE NOCASE LIMIT 1`,
        [name]
      ) ?? undefined
    );
  }

  getBoundsByZip(zip: string): RegionBounds | undefined {
    return (
      this.querySingle(
        `SELECT * FROM region_bounds where name = ? AND type = 'zip' LIMIT 1`,
        [zip]
      ) ?? undefined
    );
  }

  getBoundsByStateAbbreviation(state: string): RegionBounds | undefined {
    return (
      this.querySingle(
        `SELECT * FROM region_bounds where name = ? COLLATE NOCASE AND type = 'state' LIMIT 1`,
        [state]
      ) ?? undefined
    );
  }

  getBoundsById(id: number): RegionBounds | undefined {
    return (
      this.querySingle(
        `SELECT * FROM region_bounds WHERE id = ? COLLATE NOCASE LIMIT 1`,
        [id]
      ) ?? undefined
    );
  }

  /**
   * Returns the best matching region whose bounds closely match the given viewport.
   * This uses a symmetric delta match on all sides and scales fuzziness by viewport size.
   */
  getMatchingRegion(bounds: Bounds): RegionBounds | undefined {
    const fuzziness = 0.05; // 5% of viewport span
    const xSpan = bounds.xmax - bounds.xmin;
    const ySpan = bounds.ymax - bounds.ymin;
    const xTol = xSpan * fuzziness;
    const yTol = ySpan * fuzziness;

    const stmt = this.db.prepare(
      `SELECT id, name, type, xmin, ymin, xmax, ymax FROM region_bounds
       WHERE ABS(xmin - :xmin) < :xTol
         AND ABS(ymin - :ymin) < :yTol
         AND ABS(xmax - :xmax) < :xTol
         AND ABS(ymax - :ymax) < :yTol
       ORDER BY
         ABS((xmax - xmin) * (ymax - ymin) - (:xSpan * :ySpan)) ASC
       LIMIT 1`
    );

    stmt.bind({
      ":xmin": bounds.xmin,
      ":ymin": bounds.ymin,
      ":xmax": bounds.xmax,
      ":ymax": bounds.ymax,
      ":xTol": xTol,
      ":yTol": yTol,
      ":xSpan": xSpan,
      ":ySpan": ySpan,
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
          type: type as BoundsType,
          xmin,
          ymin,
          xmax,
          ymax,
        };
      }
    }

    return undefined;
  }

  private querySingle(
    sql: string,
    params: (string | number)[]
  ): RegionBounds | undefined {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    let row: RegionBounds | null = null;
    if (stmt.step()) {
      const result = stmt.getAsObject();
      row = {
        id: Number(result.id),
        name: String(result.name),
        type: String(result.type) as BoundsType,
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
    return results.map((r) => ({
      id: r.item.id,
      type: r.item.type,
      name: prettifyRegionName(r.item.name, r.item.type as BoundsType),
    }));
  }

  async getBoundsForName(name: string): Promise<RegionBounds | undefined> {
    await this.waitUntilReady();
    return this.db!.getBoundsByName(name);
  }

  async getBoundsForZip(zip: string): Promise<RegionBounds | undefined> {
    await this.waitUntilReady();
    return this.db!.getBoundsByZip(zip);
  }

  private async getBoundsByFuzzyTypeMatch(
    query: string,
    type: "city" | "state"
  ): Promise<RegionBounds | undefined> {
    await this.waitUntilReady();

    const cleaned = query.trim().toLowerCase();
    const matches = this.fuse!.search(cleaned, { limit: 10 });
    const filtered = matches.filter((m) => m.item.type === type);

    if (filtered.length === 0) return undefined;

    return this.db!.getBoundsById(filtered[0].item.id);
  }

  async getBoundsForState(
    stateInput: string
  ): Promise<RegionBounds | undefined> {
    return this.getBoundsByFuzzyTypeMatch(stateInput, "state");
  }

  async getBoundsForCity(cityInput: string): Promise<RegionBounds | undefined> {
    return this.getBoundsByFuzzyTypeMatch(cityInput, "city");
  }

  async getMatchingRegion(bounds: Bounds): Promise<RegionBounds | undefined> {
    await this.waitUntilReady();
    return this.db!.getMatchingRegion(bounds);
  }
}
