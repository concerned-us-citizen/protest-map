// scripts/build-spatial-index.js
import { readFile, writeFile } from "fs/promises";
import rbush from "geojson-rbush";
import * as turf from "@turf/turf";

const inputPath = "./cache/precincts-with-results.geojson";
const outputPath = "./prebuilt_data/precincts-with-results-spatial-index.json";

console.log(`📥 Reading ${inputPath}...`);
const raw = await readFile(inputPath, "utf8");
const geojson = JSON.parse(raw);

// Add bboxes if missing
for (const feature of geojson.features) {
  if (!feature.bbox) {
    feature.bbox = turf.bbox(feature);
  }
}

// Index with R-tree
console.log(`🌲 Indexing ${geojson.features.length} features...`);

// @ts-ignore
const tree = rbush();
tree.load(geojson);

// Serialize the indexed features
const indexedFeatures = tree.all();
await writeFile(
  outputPath,
  JSON.stringify({ type: "FeatureCollection", features: indexedFeatures }),
  "utf8"
);

console.log(`✅ Wrote indexed file to ${outputPath}`);
