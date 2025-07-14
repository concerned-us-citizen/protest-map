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
const versionedDbFilename = `events-${shortSha}-${dateStr}.sqlite`;
const targetDbFile = resolve(config.dirs.release, versionedDbFilename);
const targetManifestFile = resolve(config.dirs.release, "latest.json");

try {
  mkdirSync(config.dirs.release, { recursive: true });
  copyFileSync(config.paths.buildEvents, targetDbFile);
  copyFileSync(config.paths.buildLog, config.paths.releaseLog);

  const manifest = {
    dbFilename: versionedDbFilename,
    lastUpdated: isoTimestamp,
    sha: shortSha,
  };

  writeFileSync(targetManifestFile, JSON.stringify(manifest, null, 2));
  console.log(`✔ Wrote ${versionedDbFilename} and latest.json`);
} catch (err) {
  console.error("❌ Failed to version/copy the database:", err);
  process.exit(1);
}
