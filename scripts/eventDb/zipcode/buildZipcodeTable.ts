import path from "path";
import shapefile from "shapefile";
import * as turf from "@turf/turf";
import { db } from "./db";

export type ZipcodeBounds = {
  zip: string;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  cx: number;
  cy: number;
};

const ZIPCODE_DIR = "./ZIPCODE_DIR"; // change if needed
const SHP_PATH = path.join(ZIPCODE_DIR, "cb_2020_us_zcta520_500k.shp");
const DBF_PATH = path.join(ZIPCODE_DIR, "cb_2020_us_zcta520_500k.dbf");

async function loadAndInsertZipcodes() {
  const source = await shapefile.open(SHP_PATH, DBF_PATH);
  let count = 0;

  while (true) {
    const result = await source.read();
    if (result.done) break;

    const { properties, geometry } = result.value;
    const zip = properties["ZCTA5CE20"];
    if (!zip || !geometry) continue;

    const feature = turf.feature(geometry);
    const [xmin, ymin, xmax, ymax] = turf.bbox(feature);
    const [cx, cy] = turf.centroid(feature).geometry.coordinates;

    const bounds: ZipcodeBounds = {
      zip,
      xmin,
      ymin,
      xmax,
      ymax,
      cx,
      cy,
    };

    await db.insertZipcodeBounds(bounds);
    count++;
  }

  console.log(`✅ Inserted ${count} ZIP code bounds.`);
}

loadAndInsertZipcodes().catch((err) => {
  console.error("❌ Failed to load ZIP code bounds:", err);
  process.exit(1);
});
