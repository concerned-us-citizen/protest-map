import { getStateInfo } from "./usStateInfo";

export const fallBackCityThumbnailUrl =
  "https://upload.wikimedia.org/wikipedia/en/5/59/Springfield_%28The_Simpsons%29.png";
export interface WikiCityInfo {
  articleUrl: string;
  thumbnailUrl: string;
}

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

  const searchQueries = [`${city}, ${fullStateName}`];
  if (
    normalizedCity.includes("island") ||
    normalizedCity.includes("township")
  ) {
    searchQueries.push(city); // try without state for special cases
  } else {
    searchQueries.push(`${city} Township, ${fullStateName}`);
    searchQueries.push(`${city} County, ${fullStateName}`);
  }

  for (const query of searchQueries) {
    const opensearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=10&namespace=0&format=json&origin=*`;
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
      const title = candidate.title;
      const articleUrl = candidate.url;

      // Step 1: Validate categories
      const categoryUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=categories&cllimit=max&redirects=1&format=json&origin=*`;
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
          cat.includes("populated places in") ||
          cat.includes("cities in") ||
          cat.includes("townships in") ||
          cat.includes("towns in") ||
          cat.includes("villages in") ||
          cat.includes("islands of") ||
          cat.includes("county seats in") ||
          cat.includes("boroughs in") ||
          cat.includes("unincorporated communities in") ||
          cat.includes("counties in")
      );

      if (!isPlace) continue;

      // Step 2: Get thumbnail
      const thumbUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=thumbnail&pithumbsize=400&redirects=1&format=json&origin=*`;
      const thumbRes = await fetch(thumbUrl);
      const thumbData = await thumbRes.json();
      const thumbPage = Object.values(thumbData.query.pages)[0] as {
        thumbnail?: { source: string };
      };
      const thumbnailUrl: string = thumbPage?.thumbnail?.source ?? "";

      return {
        articleUrl,
        thumbnailUrl,
      };
    }
  }

  return null;
}
