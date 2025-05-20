import { readFileSync } from "fs";
import { toTitleCase } from "../src/lib/stringUtils";

/**
 * Returns true if the date string is not in M/D/YYYY or M/D/YY format,
 * not parseable by Date, or not in 2025.
 */
function isMalformedDate(dateStr) {
  if (typeof dateStr !== "string") return true;
  // Accepts e.g. "5/19/2025", "05/09/2025"
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr.trim());
  if (!match) return true;
  const [, mm, dd, yyyy] = match.map(Number);
  if (yyyy !== 2025) return true;
  // Check that the date is valid and matches the input
  const date = new Date(dateStr);
  return (
    isNaN(date.getTime()) ||
    date.getUTCFullYear() !== 2025 ||
    date.getUTCMonth() + 1 !== mm ||
    date.getUTCDate() !== dd
  );
}

/**
 * Token set similarity, word order independent.
 */
function tokenSetSimilarity(a, b) {
  const tokensA = new Set(a.toLowerCase().split(/\s+/));
  const tokensB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  return intersection.size / union.size;
}

/**
 * Find clusters of similar strings.
 */
function clusterSimilarStrings(strings, minSimilarity = 0.8) {
  const clusters = [];
  const used = new Set();
  const canonical = strings.map((s) =>
    s.toLowerCase().replace(/\s+/g, " ").trim()
  );

  for (let i = 0; i < canonical.length; i++) {
    if (used.has(i)) continue;
    const group = [strings[i]];
    used.add(i);
    for (let j = 0; j < canonical.length; j++) {
      if (i === j || used.has(j)) continue;
      const sim = tokenSetSimilarity(canonical[i], canonical[j]);
      if (sim >= minSimilarity) {
        group.push(strings[j]);
        used.add(j);
      }
    }
    if (group.length > 1) clusters.push(group);
  }
  return clusters;
}

// --- Main script ---
if (process.argv.length < 3) {
  console.error("Usage: node analyzeEvents.mjs path/to/file.json");
  process.exit(1);
}

const filePath = process.argv[2];
let data;
try {
  data = JSON.parse(readFileSync(filePath, "utf8"));
} catch (e) {
  console.error("Could not read file:", e.message);
  process.exit(1);
}

const malformedDates = [];
const names = [];

if (Array.isArray(data.data)) {
  for (const entry of data.data) {
    if (entry && typeof entry === "object") {
      if (isMalformedDate(entry.date)) malformedDates.push(entry.date);
      if (entry.name) names.push(toTitleCase(entry.name));
    }
  }
}

const clusters = clusterSimilarStrings(names, 0.8);

console.log("Malformed dates:", malformedDates);
console.log("\nPossible combinable names:");
let found = false;
for (const cluster of clusters) {
  const unique = new Set(cluster);
  if (unique.size > 1) {
    console.log("----- Similar -----");
    console.log([...unique].join("\n"));
    found = true;
  }
}
if (!found) {
  console.log("No similar-but-not-identical name clusters found.");
}
