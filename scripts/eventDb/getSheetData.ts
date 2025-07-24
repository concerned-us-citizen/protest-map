import crypto from "crypto";
import { fetchHtml } from "../../src/lib/util/html";
import { load } from "cheerio";
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

import { parse as parseSync } from "csv-parse/sync";

/** ------------------------------------------------------------------
 *  Public API
 * ------------------------------------------------------------------*/

/**
 * Hints the parser uses to recognise each column.
 *
 *  - **keys** ⇒ the property names you want in the final `Row`
 *               (i.e. what csv‑parse would normally use in `columns:`).
 *  - **values** ⇒ a string | RegExp | array of those
 *                 that should match the header cell text.
 *
 * Example:
 *   const HINTS = {
 *     date:       /\bdate\b/i,
 *     time:       'time',
 *     address:    /address/i,
 *     zip:        ['zip', 'postal'],
 *     city:       'city',
 *     state:      /\bstate\b/i,
 *     country:    'country',
 *     name:       'name',
 *     link:       'link'
 *   } as const;
 */
export type HeaderHints = Record<string, string | RegExp | (string | RegExp)[]>;

/** Row type derived automatically from the keys you pass. */
export type Row<H extends HeaderHints> = {
  // eslint-disable-next-line no-unused-vars
  [_K in keyof H]: string | undefined;
};

/**
 * Parse a CSV string with messy / shifting headers.
 * @param csvText  Full CSV file as a string
 * @param hints    Mapping of output keys → header‑matching patterns
 * @param mandatoryKey  Key that must exist & hold a “recent date” (defaults to "date")
 */
export function getCsvRows<
  H extends HeaderHints,
  K extends keyof H & string = "date",
>(csvText: string, hints: H, mandatoryKey: K = "date" as K): Row<H>[] {
  /* ---------- constants / helpers ---------- */

  /** Compile all hint patterns into functions for quick matching */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tests: Record<keyof H, (_cell: string) => boolean> = {} as any;
  for (const k in hints) {
    const raw = hints[k];
    const arr = Array.isArray(raw) ? raw : [raw];
    const fns = arr.map((p) =>
      typeof p === "string"
        ? (c: string) => c.includes(p)
        : (c: string) => (p as RegExp).test(c)
    );
    tests[k] = (cell: string) => fns.some((fn) => fn(cell));
  }

  /* recent‑date predicate ----------------------------------------------------*/
  const ONE_YEAR = 365 * 24 * 60 * 60 * 1_000;
  const NOW = Date.now();
  const isRecentDate = (s?: string): boolean => {
    if (!s) return false;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return false;
    // eslint-disable-next-line prefer-const
    let [, mm, dd, yyyy] = m;
    if (yyyy.length === 2) yyyy = (+yyyy < 70 ? "20" : "19") + yyyy;
    const t = new Date(+yyyy, +mm - 1, +dd).getTime();
    return !Number.isNaN(t) && NOW - t <= ONE_YEAR;
  };

  const SAMPLE_LINES = 10;
  const sample = parseSync(csvText, {
    to_line: SAMPLE_LINES,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    columns: false,
  }) as string[][];

  if (sample.length === 0) return [];

  /* choose the “most header‑ish” row */
  let headerIdx = 0,
    bestScore = 0;
  sample.forEach((row, i) => {
    let hits = 0;
    row.forEach((c) => {
      for (const k in tests)
        if (tests[k](c)) {
          hits++;
          break;
        }
    });
    if (hits > bestScore) {
      bestScore = hits;
      headerIdx = i;
    }
  });

  const headerRow = sample[headerIdx];

  /* build position map: output key -> CSV column index (‑1 if not present) */
  const keys = Object.keys(hints) as (keyof H & string)[];
  const posMap = keys.map(() => -1);
  headerRow.forEach((cell, colIdx) => {
    keys.forEach((k, ki) => {
      if (posMap[ki] === -1 && tests[k](cell)) posMap[ki] = colIdx;
    });
  });

  /* repair mandatory “date” (or supplied key) if header missed it */
  const mandIdx = keys.indexOf(mandatoryKey);
  if (posMap[mandIdx] === -1) {
    for (const rec of sample.slice(headerIdx + 1)) {
      for (let i = 0; i < rec.length; i++) {
        if (isRecentDate(rec[i])) {
          posMap[mandIdx] = i;
          break;
        }
      }
      if (posMap[mandIdx] !== -1) break;
    }
    if (posMap[mandIdx] === -1)
      throw new Error(`Unable to locate mandatory column "${mandatoryKey}"`);
  }

  const raw = parseSync(csvText, {
    from_line: headerIdx + 2, // +1 to move past header (1‑based)
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    columns: false,
  }) as string[][];

  const out: Row<H>[] = [];
  for (const rec of raw) {
    if (!isRecentDate(rec[posMap[mandIdx]])) continue; // filter junk
    const row = {} as Row<H>;
    keys.forEach((k, ki) => {
      row[k] = posMap[ki] !== -1 ? rec[posMap[ki]] : undefined;
    });
    out.push(row);
  }
  return out;
}

export async function getSheetData(
  sheetId: string,
  headerHints: HeaderHints,
  logger?: ScrapeLogger
): Promise<SheetTabData[]> {
  const tabs = await getTabNames(sheetId);

  const results: SheetTabData[] = [];

  for (const tab of tabs) {
    console.log(`Retrieving tab ${tab.title}...`);

    try {
      const csv = await getCsvForTab(sheetId, tab.gid);
      const hash = getCsvHash(csv);
      const rows = getCsvRows(csv, headerHints) as Record<string, string>[];
      results.push({
        title: tab.title,
        gid: tab.gid,
        hash,
        rows,
      });
    } catch (e) {
      console.log("Failed to retrieve tab ", e);
      logger?.current.unfetchedSheets.push({
        title: tab.title,
        error: JSON.stringify(e),
      });
    }
  }

  return results;
}
