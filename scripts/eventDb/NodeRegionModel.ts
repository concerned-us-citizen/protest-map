import { point } from "@turf/helpers";
import { NodeRegionDb } from "./NodeRegionDb";
import { booleanPointInPolygon } from "@turf/turf";
import { config } from "./config";
import { decompressGzip } from "./util/decompress";
import { fileExists } from "../../src/lib/util/file";
import path from "path";

export class NodeRegionModel {
  private db: NodeRegionDb;

  constructor(db: NodeRegionDb) {
    this.db = db;
  }

  getRegionIdsContaining(lat: number, lon: number) {
    const idsAndPolygons = this.db.getRegionIdsAndPolygonsContaining(lat, lon);
    return idsAndPolygons
      .filter(({ polygon }) =>
        booleanPointInPolygon(point([lon, lat]), polygon)
      )
      .map(({ regionId }) => regionId);
  }

  static async create() {
    const dbPath = path.join(
      config.dirs.release,
      `regions-${config.regionDbTag}.sqlite`
    );
    if (!(await fileExists(dbPath))) {
      const compressedDbPath = dbPath + ".gz";
      if (!(await fileExists(compressedDbPath))) {
        throw new Error(`Missing regions database, expected ${dbPath}.gz`);
      }
      decompressGzip(compressedDbPath, dbPath);
    }
    const db = new NodeRegionDb(dbPath);
    return new NodeRegionModel(db);
  }
}
