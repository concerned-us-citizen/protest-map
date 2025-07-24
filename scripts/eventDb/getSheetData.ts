import crypto from "crypto";
import { fetchHtml } from "../../src/lib/util/html";
import { load } from "cheerio";
import { ColumnOption, parse } from "csv-parse/sync";
import { ScrapeLogger } from "./ScrapeLogger";

export interface SheetTabData {
  title: string;
  gid: string;
  hash: number;
  rows: Record<string, string>[];
}

async function getTabNames(
  sheetId: string
): Promise<{ title: string; gid: string }[]> {
  const html = await fetchHtml(
    `https://docs.google.com/spreadsheets/d/${sheetId}/preview`
  );
  const $ = load(html);

  const initScript = $("script")
    .filter((_, el) => !!$(el).html()?.includes("function init()"))
    .first()
    .html();

  if (!initScript) {
    throw new Error("Could not find init() script.");
  }

  const tabs: { title: string; gid: string }[] = [];

  const itemRegex = /items\.push\(\s*{([\s\S]*?)}\s*\);/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(initScript)) !== null) {
    const block = match[1];

    const nameMatch = block.match(/name:\s*"(.*?)"/);
    const gidMatch = block.match(/gid:\s*"(.*?)"/);

    if (nameMatch && gidMatch) {
      const gid = gidMatch[1];
      tabs.push({ title: nameMatch[1], gid: gid });
    }
  }

  return tabs;
}

async function getCsvForTab(sheetId: string, tabGid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${tabGid}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch CSV for tab: ${res.status} ${res.statusText}`
    );
  }
  return await res.text();
}

function getCsvHash(csvContent: string): number {
  const hash = crypto.createHash("sha256").update(csvContent).digest("hex");
  return parseInt(hash.slice(0, 8), 16);
}

const columns = [
  "date",
  "time",
  "address",
  "zip",
  "city",
  "state",
  "country",
  "name",
  "link",
  "adaAccessible",
  "reoccurring",
] as const satisfies ColumnOption[];

type Row = Record<(typeof columns)[number], string | undefined>;

const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
const now = Date.now();

function isRecentDate(s?: string): boolean {
  if (!s) return false;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return false;
  // eslint-disable-next-line prefer-const
  let [, mm, dd, yyyy] = m;
  if (yyyy.length === 2) yyyy = (Number(yyyy) < 70 ? "20" : "19") + yyyy;
  const d = new Date(+yyyy, +mm - 1, +dd);
  const t = d.getTime();
  return !isNaN(t) && now - t <= ONE_YEAR;
}

export function getCsvRows(csvContent: string): Row[] {
  return parse(csvContent, {
    columns,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    on_record(record: Row) {
      return isRecentDate(record.date) ? record : null;
    },
  }) as Row[];
}

export async function getSheetData(
  sheetId: string,
  logger: ScrapeLogger
): Promise<SheetTabData[]> {
  const tabs = await getTabNames(sheetId);

  const results: SheetTabData[] = [];

  for (const tab of tabs) {
    console.log(`Retrieving tab ${tab.title}...`);
    try {
      const csv = await getCsvForTab(sheetId, tab.gid);
      const hash = getCsvHash(csv);
      const rows = getCsvRows(csv) as Record<string, string>[];
      results.push({
        title: tab.title,
        gid: tab.gid,
        hash,
        rows,
      });
    } catch (e) {
      console.log("Failed to retrieve tab ", e);
      logger.current.unfetchedSheets.push({
        title: tab.title,
        error: JSON.stringify(e),
      });
    }
  }

  return results;
}
