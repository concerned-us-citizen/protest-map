import { mkdirSync, copyFileSync, writeFileSync } from "fs";
import { format } from "date-fns";
import { resolve } from "path";
import { config } from "./config";
import simpleGit from "simple-git";

// Current UTC date
const now = new Date();
const dateStr = format(now, "yyyyMMdd-HHmm");
const isoTimestamp = now.toISOString();

const git = simpleGit();
const shortSha = (await git.revparse(["--short", "HEAD"])).trim();

// Versioned filename
const versionedFilename = `events-${shortSha}-${dateStr}.sqlite`;
const targetFile = resolve(config.dirs.release, versionedFilename);
const manifestFile = resolve(config.dirs.release, "latest.json");

try {
  mkdirSync(config.dirs.release, { recursive: true });
  copyFileSync(config.paths.buildEvents, targetFile);

  const manifest = {
    dbFilename: versionedFilename,
    lastUpdated: isoTimestamp,
    sha: shortSha,
  };

  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`✔ Wrote ${versionedFilename} and latest.json`);
} catch (err) {
  console.error("❌ Failed to version/copy the database:", err);
  process.exit(1);
}
