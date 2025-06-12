import { logInfo } from "./issueLog";

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
function clusterSimilarStrings(strings: string[], minSimilarity = 0.8) {
  const clusters: string[][] = [];
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

export function scanForSimilarNames(names: string[]) {
  const clusters = clusterSimilarStrings(names, 0.8);
  logInfo("\nPossible combinable names:");
  let found = false;
  for (const cluster of clusters) {
    const unique = new Set(cluster);
    if (unique.size > 1) {
      logInfo("----- Similar -----");
      logInfo([...unique].join("\n"));
      found = true;
    }
  }
  if (!found) {
    logInfo("No similar-but-not-identical name clusters found.");
  }
}
