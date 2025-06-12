import geojsonRbush from "geojson-rbush";
import * as turf from "@turf/turf";
import { readFile } from "fs/promises";
import { config } from "./config";

const tree = geojsonRbush();

export async function loadVotingInfo() {
  try {
    const raw = await readFile(config.paths.buildPrecinctsSpatialIndex, "utf8");
    const spatialIndex = JSON.parse(raw); // Validate JSON format
    if (!spatialIndex.features) {
      throw new Error("Missing 'features' key in JSON.");
    }
    tree.load(spatialIndex.features);
  } catch (err) {
    console.error(`Failed to load voting info: ${err.message}`);
    throw err;
  }
}

/**
 * @param {{ lat: number, lon: number }} point
 * @returns {object|null} the matching GeoJSON feature, or null
 */
export function findFeatureByLatLng({ lat, lon }) {
  const pt = turf.point([lon, lat]);

  // First, fast bbox search using the R-tree
  const candidates = tree.search(pt); // returns FeatureCollection

  // Then, precise check using turf
  for (const feature of candidates.features) {
    // Ensure the feature is a Polygon or MultiPolygon before checking containment
    if (
      (feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon") &&
      // Pass the geometry directly, as its type is now confirmed
      turf.booleanPointInPolygon(pt, feature.geometry)
    ) {
      // console.log(`Feature hit for ${lat}, ${lon}`);
      return feature.properties;
    }
  }

  return null;
}

export function fetchVotingInfo({ lat, lon }) {
  if (lat !== undefined && lon !== undefined) {
    return findFeatureByLatLng({ lat, lon });
  } else {
    return null;
  }
}
