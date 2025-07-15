import Database from "better-sqlite3";
import { MultiPolygon, Polygon } from "geojson";
import { Geometry } from "wkx";

export class NodeRegionDb {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
  }

  getRegionIdsAndPolygonsContaining(
    lat: number,
    lon: number
  ): { regionId: number; polygon: Polygon | MultiPolygon }[] {
    const stmt = this.db.prepare(`
    SELECT rb.id AS regionId, pr.polygon_wkb as polygonBuffer
    FROM region_bounds rb
    JOIN polygon_regions pr ON pr.region_id = rb.id
    WHERE
      @lon BETWEEN rb.xmin AND rb.xmax AND
      @lat BETWEEN rb.ymin AND rb.ymax
  `);

    const raw = stmt.all({ lat, lon }) as {
      regionId: number;
      polygonBuffer: Buffer;
    }[];

    return raw.map(({ regionId, polygonBuffer }) => {
      const geo = Geometry.parse(polygonBuffer).toGeoJSON() as
        | Polygon
        | MultiPolygon;
      return { regionId, polygon: geo };
    });
  }
}
