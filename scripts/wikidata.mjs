import fs from "fs/promises";
import { existsSync } from "fs";

const CACHE_FILE = "./cache/wikicache.json";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

let cache = {};

// --- Cache loading and writing ---
export async function loadWikiCache() {
  if (existsSync(CACHE_FILE)) {
    const json = await fs.readFile(CACHE_FILE, "utf-8");
    cache = JSON.parse(json);
    console.log(`✅ Loaded ${Object.keys(cache).length} wiki cache entries.`);
  } else {
    console.log("ℹ️  No Wikimedia cache found. Starting fresh.");
  }
}

async function writeCache() {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

// --- Normalize key to avoid duplicates ---
function normalizeKey({ city, state }) {
  return `${city?.trim().toLowerCase() || ""},${state?.trim().toLowerCase() || ""}`;
}

// --- External Wikipedia title search ---
async function getWikipediaTitle(query) {
  const url =
    `${WIKIPEDIA_API}?` +
    new URLSearchParams({
      action: "query",
      format: "json",
      list: "search",
      srsearch: query,
      utf8: "1",
    });

  const res = await fetch(url);
  const data = await res.json();

  if (!data?.query?.search?.length) return null;
  return data.query.search[0].title;
}

// --- Get image thumbnail for title ---
async function getWikipediaImageData(title) {
  const url =
    `${WIKIPEDIA_API}?` +
    new URLSearchParams({
      action: "query",
      format: "json",
      prop: "pageimages",
      titles: title,
      redirects: "1",
      pithumbsize: "400",
    });

  const res = await fetch(url);
  const data = await res.json();
  const pages = Object.values(data.query.pages);
  const page = pages[0];

  return {
    title: page.title,
    image: page.thumbnail?.source || null,
    pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
  };
}

// --- Main lookup with caching ---
export async function getWikipediaCityInfo({ city, state }) {
  const key = normalizeKey({ city, state });

  if (cache[key]) {
    return cache[key];
  }

  if (!city) return null;

  const query = state ? `${city} ${state}` : city;
  const title = await getWikipediaTitle(query);
  if (!title) {
    console.warn(`⚠️  No Wikipedia title found for ${query}`);
    return null;
  }

  const result = await getWikipediaImageData(title);
  cache[key] = result;
  await writeCache();
  return result;
}
