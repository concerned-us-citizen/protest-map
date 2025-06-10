import crypto from "crypto";
import { fetchHtml } from "../../src/lib/util/html";
import { load } from "cheerio";
import { parse } from "csv-parse/sync";

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

export function getCsvRows(
  csvContent: string,
  mapHeader?: (_header: string) => string,
  mapCell?: (_cell: string) => string
): Record<string, string>[] {
  const records = parse(csvContent, {
    columns: (headers: string[]) =>
      mapHeader ? headers.map((h) => mapHeader(h)) : headers,
    skip_empty_lines: true,
    trim: true,
  });

  if (mapCell) {
    return records.map((row) => {
      const mapped: Record<string, string> = {};
      for (const key in row) {
        mapped[key] = mapCell(row[key]);
      }
      return mapped;
    });
  }

  return records;
}

export async function getSheetData(
  sheetId: string,
  mapHeader?: (_header: string) => string
): Promise<SheetTabData[]> {
  const tabs = await getTabNames(sheetId);

  const results: SheetTabData[] = [];

  for (const tab of tabs) {
    const csv = await getCsvForTab(sheetId, tab.gid);
    const hash = getCsvHash(csv);
    const rows = getCsvRows(csv, mapHeader);
    results.push({
      title: tab.title,
      gid: tab.gid,
      hash,
      rows,
    });
  }

  return results;
}
