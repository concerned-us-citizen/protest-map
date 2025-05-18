import { createWriteStream } from "fs";
import { mkdir, stat } from "fs/promises";
import { pipeline } from "stream/promises";
import path from "path";

const dataDir = "prebuilt_data";
const fileUrl =
  "https://github.com/concerned-us-citizen/voting-precincts-spatial-index/releases/download/v1/precincts-with-results-spatial-index.json";
const filePath = path.join(
  dataDir,
  "precincts-with-results-spatial-index.json"
);

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

    await pipeline(response.body, createWriteStream(filePath));

    const stats = await stat(filePath);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty!");
    }

    console.log(
      "Non empty downloadPrecinctsSpatialIndex downloaded to ${filePath}."
    );
  } catch (error) {
    console.error(`❌ downloadPrecinctsSpatialIndex failed!`, error);
    throw error; // Re-throw to be caught by the orchestrator
  }
}

downloadPrecinctsSpatialIndex();
