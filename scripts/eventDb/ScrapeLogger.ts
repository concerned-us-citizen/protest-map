import fs from "fs/promises";
import { fileExists } from "../../src/lib/util/file";
import { config } from "./config";
import type {
  FetchedDataType,
  ProcessingSummary,
  RunSummary,
  ScrapeIssue,
} from "../../src/lib/stats/types";
import { IssueType } from "../../src/lib/stats/types";

const path = config.paths.buildLog;

class ScrapeRun {
  issues: ScrapeIssue[] = [];
  totalRows = 0; // Used to track progress, known after csv scraped.
  rowsProcessed = 0; // Incremented as they're processed
  duplicates = 0;
  rejects = 0;
  sheetsProcessed = 0;
  skippedSheets: { title: string; rows: number }[] = [];
  unfetchedSheets: { title: string; error: string }[] = [];
  fetchedDataType: FetchedDataType;
  issueCount = 0;
  startTime = Date.now();
  wikiFetches = 0;
  geocodings = 0;

  constructor(fetchedDataType: FetchedDataType) {
    this.fetchedDataType = fetchedDataType;
  }

  get summary(): RunSummary {
    return {
      fetchedDataType: this.fetchedDataType,
      issues: this.issues,
      totalRows: this.totalRows,
      rowsProcessed: this.rowsProcessed,
      rejects: this.rejects,
      duplicates: this.duplicates,
      skippedSheets: this.skippedSheets,
      unfetchedSheets: this.unfetchedSheets,
      loggedIssues: this.issueCount,
      wikiFetches: this.wikiFetches,
      geocodings: this.geocodings,
      elapsedSeconds: (Date.now() - this.startTime) / 1000,
    };
  }
}

export class ScrapeLogger {
  #runs: ScrapeRun[] = [];
  #current?: ScrapeRun;
  initialized = false;
  startTime = Date.now();

  startRun(fetchedDataType: FetchedDataType) {
    this.#current = new ScrapeRun(fetchedDataType);
    this.#runs.push(this.#current);
    if (!this.initialized) {
      this.initLog();
      this.initialized = true;
    }
  }

  get current() {
    if (!this.#current) throw new Error("No run has been started");
    return this.#current;
  }

  async initLog() {
    if (await fileExists(path)) {
      await fs.unlink(path);
    }
  }

  async logIssue(
    type: IssueType,
    item: Record<string, unknown>,
    sheetName: string,
    explanationArg: string
  ) {
    const issue = {
      fetchedDataType: this.current.fetchedDataType,
      sheetName,
      type,
      explanationArg,
      item,
    };

    console.warn(`⚠️ ${JSON.stringify(issue)}`);
    this.current.issues.push(issue);
  }

  async close() {
    const summary: ProcessingSummary = {
      runAt: new Date(),
      elapsedSeconds: (Date.now() - this.startTime) / 1000,
      runs: this.#runs.map((r) => r.summary),
    };
    await fs.writeFile(path, JSON.stringify(summary), "utf8");

    console.log(`\nProcessing complete: `, summary);
    return summary;
  }
}
