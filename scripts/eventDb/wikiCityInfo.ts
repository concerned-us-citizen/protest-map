import { delay } from "../../src/lib/util/misc";
import { getStateInfo } from "./usStateInfo";

export interface WikiCityInfo {
  title: string;
  articleUrl: string;
  thumbnailUrl: string;
  lat?: number;
  lon?: number;
}

const DELAY_MS = 1000;

/**
 * Attempts to fetch Wikipedia info for a city+state, with fallback, validation, and prioritization.
 */
export async function fetchWikiCityInfo(
  city: string,
  state: string
): Promise<WikiCityInfo | null> {
  const fullStateName =
    (state.length === 2 ? getStateInfo(state)?.fullName : state) ?? state;

  const normalize = (str: string) => str.trim().toLowerCase();
  const normalizedCity = normalize(city);
  const normalizedState = normalize(fullStateName);
  const loweredCity = city.toLowerCase();

  let searchQueries: string[];

  const nationalSites = [
    "monument",
    "park",
    "historic",
    "forest",
    "memorial",
    "battlefield",
    "preserve",
    "lakeshore",
    "seashore",
    "recreational area",
    "military",
    "scenic",
    "river",
  ];

  if (
    fullStateName === "District of Columbia" ||
    normalizedCity.endsWith("D.C.") ||
    normalizedCity.endsWith("DC")
  ) {
    searchQueries = ["Washington, D.C."];
  } else if (
    nationalSites.some((siteName) =>
      loweredCity.includes(`national ${siteName}`)
    )
  ) {
    searchQueries = [normalizedCity];
  } else {
    searchQueries = [`${city}, ${fullStateName}`];
    if (
      normalizedCity.includes("island") ||
      normalizedCity.includes("township")
    ) {
      searchQueries.push(city); // try without state for special cases
    } else {
      searchQueries.push(`${city} Township, ${fullStateName}`);
      searchQueries.push(`${city} County, ${fullStateName}`);
    }
  }

  for (const query of searchQueries) {
    const opensearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=10&namespace=0&format=json&origin=*`;
    await delay(DELAY_MS);
    const res = await fetch(opensearchUrl);
    const data: [string, string[], string[], string[]] = await res.json();
    // eslint-disable-next-line no-unused-vars
    const [_, titles, snippets, urls] = data;

    if (!titles.length || !urls.length) continue;

    type Candidate = {
      title: string;
      url: string;
      snippet: string;
      priority: number; // lower is better
    };

    const candidates: Candidate[] = [];

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      const url = urls[i];
      const snippet = snippets[i];

      // Prioritize exact or partial matches to city/state
      const normalizedTitle = normalize(title);
      let priority = 10;

      if (normalizedTitle === normalizedCity) {
        priority = 0;
      } else if (normalizedTitle.startsWith(normalizedCity)) {
        priority = 1;
      } else if (normalizedTitle.includes(normalizedCity)) {
        priority = 2;
      }

      if (normalizedTitle.includes(normalizedState)) {
        priority -= 1; // bonus if it includes state name
      } else if (normalize(snippet).includes(normalizedState)) {
        priority += 0; // weak bonus if snippet includes state
      } else {
        priority += 2; // penalty for missing state
      }

      candidates.push({ title, url, snippet, priority });
    }

    // Sort candidates by computed priority
    candidates.sort((a, b) => a.priority - b.priority);

    for (const candidate of candidates) {
      const candidateTitle = candidate.title;
      const articleUrl = candidate.url;

      // Step 1: Validate categories
      const categoryUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(candidateTitle)}&prop=categories&cllimit=max&redirects=1&format=json&origin=*`;
      const categoryRes = await fetch(categoryUrl);
      const categoryData = await categoryRes.json();
      const page = Object.values(categoryData.query.pages)[0] as {
        title: string;
        categories?: { title: string }[];
      };

      const categories =
        page.categories?.map((c) => c.title.toLowerCase()) ?? [];

      const isPlace = categories.some(
        (cat) =>
          cat.includes("census-designated places in") ||
          cat.includes("populated places ") ||
          cat.includes("cities in") ||
          cat.includes("counties in") ||
          cat.includes("townships in") ||
          cat.includes("towns in") ||
          cat.includes("villages in") ||
          cat.includes("islands of") ||
          cat.includes("county seats in") ||
          cat.includes("boroughs in") ||
          cat.includes("unincorporated communities in") ||
          cat.endsWith(" counties") ||
          cat.includes("military base") ||
          cat.includes("military camp") ||
          cat.includes("military camp") ||
          // This might be too broad - if so we could set up a whitelist
          cat.includes("coordinates on wikidata") ||
          nationalSites.some((siteName) => cat.includes(`national ${siteName}`))
      );

      if (!isPlace) continue;

      // Step 2: Get thumbnail + coordinates
      const metaUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(candidateTitle)}&prop=pageimages|coordinates&piprop=thumbnail&pithumbsize=400&redirects=1&format=json&origin=*`;
      const metaRes = await fetch(metaUrl);
      const metaData = await metaRes.json();
      const metaPage = Object.values(metaData.query.pages)[0] as {
        title: string;
        thumbnail?: { source: string };
        coordinates?: { lat: number; lon: number }[];
      };

      const title = metaPage?.title;
      const thumbnailUrl: string = metaPage?.thumbnail?.source ?? "";
      const lat = metaPage?.coordinates?.[0]?.lat;
      const lon = metaPage?.coordinates?.[0]?.lon;
      return {
        title,
        articleUrl,
        thumbnailUrl,
        lat,
        lon,
      };
    }
  }

  return null;
}
