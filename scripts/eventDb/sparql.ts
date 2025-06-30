import { delay } from "../../src/lib/util/misc";
import { config } from "./config";
import type { ScrapeLogger } from "./ScrapeLogger";

const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";

export interface SparqlBinding {
  [key: string]: { value: string };
}

export interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

export async function runSparqlQuery(
  query: string,
  logger: ScrapeLogger,
  retries = 3
): Promise<SparqlResponse> {
  for (let attempt = 0; attempt < retries; attempt++) {
    await delay(1000);
    const res = await fetch(WIKIDATA_SPARQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/sparql-query",
        Accept: "application/sparql-results+json",
        "User-Agent": config.userAgent,
      },
      body: query,
    });

    if (res.status === 403) {
      logger.logIssue(
        `403 Forbidden from Wikidata. Backing off... (Attempt ${attempt + 1})`
      );
      await delay(1000 + attempt * 1000);
      continue;
    }

    if (!res.ok) {
      throw new Error(
        `SPARQL query failed: ${res.status} ${res.statusText} ${query}`
      );
    }

    return res.json();
  }

  throw new Error("SPARQL query failed after multiple attempts.");
}
