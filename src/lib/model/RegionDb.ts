import type { Polygon, MultiPolygon } from "geojson";
import type { Database } from "sql.js";
import type { NamedRegion, Bounds, RegionType } from "./RegionModel.svelte";
import { Geometry, BinaryReader } from "wkx-ts";

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
      SELECT polygon_wkb FROM polygon_regions
      WHERE region_id = ?
    `);

    const result = stmt.getAsObject([id]);
    stmt.free();

    if (result && result.polygon_wkb) {
      try {
        const u8 = result.polygon_wkb as Uint8Array;
        // @ts-expect-error wkx-ts typings still require Node Buffer
        const geo = Geometry.parse(new BinaryReader(u8)).toGeoJSON();
        return geo as Polygon | MultiPolygon;
      } catch (err) {
        console.error("Failed to parse region polygon", err);
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
