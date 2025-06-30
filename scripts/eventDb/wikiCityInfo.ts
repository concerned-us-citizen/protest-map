import { config } from "./config";
import { urlForWikiThumbnailUrl } from "./util/wikimedia";
import { runSparqlQuery } from "./sparql";
import { getStateInfo } from "./usStateInfo";
import { asNormalizedKey } from "../../src/lib/util/string";
import type { ScrapeLogger } from "./ScrapeLogger";

export interface WikiCityInfo {
  articleUrl: string;
  thumbnailUrl: string;
}

const FALLBACK_THUMBNAIL_URL =
  "https://upload.wikimedia.org/wikipedia/en/5/59/Springfield_%28The_Simpsons%29.png";

async function fetchFuzzyLocationQids(
  city: string,
  state: string
): Promise<string[]> {
  let searchEntity = `${city}, ${state}`;

  // Special case for Washington DC, as it will sometimes show up as the city and state.
  if (
    asNormalizedKey(city) === "washingtondc" ||
    asNormalizedKey(state) == "washingtondc"
  ) {
    searchEntity = "Washington, DC";
  }

  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searchEntity)}&language=en&type=item&limit=10&format=json`;
  const response = await fetch(url, {
    headers: { "User-Agent": config.userAgent },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch fuzzy location QIDs: ${response.status} ${response.statusText}`
    );
  }
  const json = await response.json();
  return json.search.map((obj: { id: string }) => obj.id);
}

export async function fetchWikiCityInfo(
  city: string,
  state: string,
  logger: ScrapeLogger
): Promise<WikiCityInfo | null> {
  const stateInfo = getStateInfo(state);
  if (!stateInfo) {
    logger.logIssue(`Invalid state provided for ${city}, ${state}`);
    return null;
  }

  console.log(`Fetching wiki city info for ${city}, ${state}`);

  // First try an abbreviation for the state, as it tends to yield
  // better results from wikidata, if that fails, use the full name.
  let fuzzyPlaceQids = (
    await fetchFuzzyLocationQids(city, stateInfo.abbreviation)
  ).map((qid) => `wd:${qid}`);

  if (fuzzyPlaceQids.length === 0) {
    fuzzyPlaceQids = (
      await fetchFuzzyLocationQids(city, stateInfo.fullName)
    ).map((qid) => `wd:${qid}`);
  }

  if (fuzzyPlaceQids.length === 0) {
    logger.logIssue(`Could not find qids for ${city}, ${state}`);
    return null;
  }

  // Find the qid that's actually in the given state, to ensure
  // it's a place. Retrieve the wikipedia page and a thumbnail.
  const sparqlQuery = `
    SELECT ?articleUrl ?thumbnailUrl WHERE {
      VALUES ?place { ${fuzzyPlaceQids.join(" ")} }
      ?place wdt:P131* wd:${stateInfo.qid} .

      OPTIONAL {
        ?articleUrl schema:about ?place ;
                      schema:isPartOf <https://en.wikipedia.org/> .
      }

      OPTIONAL {
        ?place wdt:P18 ?thumbnailUrl.
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 1
  `;

  const data = await runSparqlQuery(sparqlQuery, logger);
  const result = data?.results?.bindings?.[0];
  if (!result) return null;

  const articleUrl = result.articleUrl?.value ?? "";
  let thumbnailUrl = urlForWikiThumbnailUrl(result.thumbnailUrl?.value ?? "");

  // 3. fallback to Wikipedia thumbnail if no P18
  if (!thumbnailUrl && articleUrl) {
    const pg = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(
        articleUrl.split("/").pop()!
      )}&pithumbsize=400&format=json`
    ).then((r) => r.json());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages = Object.values(pg.query.pages) as any;
    thumbnailUrl = pages[0]?.thumbnail?.source ?? null;
  }

  if (!thumbnailUrl) {
    thumbnailUrl = FALLBACK_THUMBNAIL_URL;
  }

  return {
    articleUrl,
    thumbnailUrl,
  };
}
