import { createWriteStream } from "fs";
import { mkdir, stat } from "fs/promises";
import { pipeline } from "stream/promises";
import { config } from "./config";

const dataDir = config.dirs.build;
const path = config.paths.buildPrecinctsSpatialIndex;
const fileUrl =
  "https://github.com/concerned-us-citizen/voting-precincts-spatial-index/releases/download/v1/precincts-with-results-spatial-index.json";

export async function downloadPrecinctsSpatialIndex() {
  console.log("Starting downloadPrecinctsSpatialIndex step...");
  try {
    // Create directory if it doesn't exist
    await mkdir(dataDir, { recursive: true });
    console.log(`Ensured directory ${dataDir} exists.`);

    // Download file
    console.log(`Downloading file from ${fileUrl}...`);
    const response = await fetch(fileUrl);

    if (!response.ok || !response.body) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    await pipeline(response.body, createWriteStream(path));

    const stats = await stat(path);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty!");
    }

    console.log(
      `Non empty downloadPrecinctsSpatialIndex downloaded to ${path}.`
    );
  } catch (error) {
    console.error(`❌ downloadPrecinctsSpatialIndex failed!`, error);
    throw error; // Re-throw to be caught by the orchestrator
  }
}

downloadPrecinctsSpatialIndex();
