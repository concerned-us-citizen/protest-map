#!/usr/bin/env node

import { createReadStream, statSync, existsSync } from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";
import mime from "mime-types";
import dotenv from "dotenv";

const owner = "concerned-us-citizen";
const repo = "protest-map";

dotenv.config();

// --- CONFIG ---
const FILE_PATH = "prebuilt_data/precincts-with-results-spatial-index.json";
const FILE_NAME = path.basename(FILE_PATH);

// --- ARGS ---
const tag = process.argv[2];
if (!tag) {
  console.error("Usage: node upload-precincts-spatial-index.js <tag>");
  process.exit(1);
}
if (!existsSync(FILE_PATH)) {
  console.error(`❌ File not found at ${FILE_PATH}`);
  process.exit(1);
}

// --- AUTH ---
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("❌ GITHUB_TOKEN environment variable not set.");
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

// --- Check or create release ---
let release;
try {
  release = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag });
  console.log(`✅ Found release for tag: ${tag}`);
} catch {
  console.log(`🚀 Creating release '${tag}'...`);
  release = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tag,
    name: tag,
    body: "Automated release of precincts spatial index",
  });
}

// --- Upload asset ---
const fileSize = statSync(FILE_PATH).size;
const contentType = mime.lookup(FILE_NAME) || "application/octet-stream";

console.log(`📦 Uploading ${FILE_NAME} (${fileSize} bytes)...`);

await octokit.rest.repos.uploadReleaseAsset({
  owner,
  repo,
  release_id: release.data.id,
  name: FILE_NAME,
  // @ts-ignore
  data: createReadStream(FILE_PATH),
  headers: {
    "content-type": contentType,
    "content-length": fileSize,
  },
});

console.log(`✅ Done: https://github.com/${owner}/${repo}/releases/tag/${tag}`);
