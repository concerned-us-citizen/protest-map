import { formatDateTime } from "../../src/lib/util/date";
import fs from "fs/promises";
import { fileExists } from "../../src/lib/util/file";
import { config } from "./config";
import type { FetchedDataType } from "./types";
import { maybeCreateGithubIssue } from "./createGithubSummaryIssue";

export interface RunSummary {
  fetchedDataType: FetchedDataType;
  rowsProcessed: number;
  badAddresses: number;
  badCities: number;
  badZipcodes: number;
  badDates: number;
  badLinks: number;
  badNames: number;
  badCoverageUrls: number;
  badTurnoutNumbers: number;
  rejects: number;
  duplicates: number;
  added: number;
  skippedSheets: { title: string; rows: number }[];
  unfetchedSheets: { title: string; error: string }[];
  elapsedSeconds: number;
  loggedIssues: number;
  wikiFetches: number;
  geocodings: number;
}

export interface ProcessingSummary {
  elapsedSeconds: number;
  runs: RunSummary[];
}

const path = config.paths.buildLog;

class ScrapeRun {
  totalRows = 0; // Used to track progress, known after csv scraped.
  rowsProcessed = 0; // Incremented as they're processed
  duplicates = 0;
  badAddresses = 0;
  badCities = 0;
  badZipcodes = 0;
  badDates = 0;
  badLinks = 0;
  badNames = 0;
  badCoverageUrls = 0;
  badTurnoutNumbers = 0;
  rejects = 0;
  sheetsProcessed = 0;
  skippedSheets: { title: string; rows: number }[] = [];
  unfetchedSheets: { title: string; error: string }[] = [];
  fetchedDataType: FetchedDataType;
  loggedIssueCount = 0;
  startTime = Date.now();
  wikiFetches = 0;
  geocodings = 0;

  constructor(fetchedDataType: FetchedDataType) {
    this.fetchedDataType = fetchedDataType;
  }

  get summary(): RunSummary {
    return {
      fetchedDataType: this.fetchedDataType,
      elapsedSeconds: (Date.now() - this.startTime) / 1000,
      rowsProcessed: this.rowsProcessed,
      badAddresses: this.badAddresses,
      badCities: this.badCities,
      badZipcodes: this.badZipcodes,
      badDates: this.badDates,
      badLinks: this.badLinks,
      badNames: this.badNames,
      badCoverageUrls: this.badCoverageUrls,
      badTurnoutNumbers: this.badTurnoutNumbers,
      rejects: this.rejects,
      duplicates: this.duplicates,
      added: this.totalRows - this.rejects - this.duplicates,
      skippedSheets: this.skippedSheets,
      unfetchedSheets: this.unfetchedSheets,
      loggedIssues: this.loggedIssueCount,
      wikiFetches: this.wikiFetches,
      geocodings: this.geocodings,
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
    await fs.writeFile(
      path,
      `--- Issue log for run ${formatDateTime(new Date())} ---\n\n`,
      "utf8"
    );
  }

  async logInvalidEntry(
    item: Record<string, unknown>,
    sheetName: string,
    reason: string
  ) {
    await this.logIssue(`'${sheetName}': ${reason}`, item);
  }

  async logInfo(message: string, arg?: unknown) {
    await this.logIssue(message, arg, false);
  }

  async logIssue(message: string, arg?: unknown, isIssue = true) {
    const namedMessage = `${this.current.fetchedDataType}: ${message}`;
    if (isIssue) {
      this.current.loggedIssueCount++;
      warnToConsole(namedMessage, arg);
    } else {
      if (arg) {
        console.log(namedMessage, arg);
      } else {
        console.log(namedMessage);
      }
    }
    const logEntry = `${namedMessage} ${arg ? JSON.stringify(arg) : ""}\n`;
    await fs.appendFile(path, logEntry, "utf8");
  }

  async saveSummary(summary: ProcessingSummary) {
    const summaryPath = config.paths.buildSummary;
    if (await fileExists(summaryPath)) {
      await fs.unlink(summaryPath);
    }
    await fs.writeFile(
      summaryPath,
      `--- Run Summary ${formatDateTime(new Date())} ---\n\n${summary ? JSON.stringify(summary, null, 2) : ""}`,
      "utf8"
    );
  }

  async publishResults() {
    const summaryInfo: ProcessingSummary = {
      elapsedSeconds: (Date.now() - this.startTime) / 1000,
      runs: this.#runs.map((r) => r.summary),
    };
    await this.logInfo(`\nProcessing complete: `, summaryInfo);
    this.saveSummary(summaryInfo);

    if (process.env.GITHUB_ACTIONS === "true") {
      await maybeCreateGithubIssue(summaryInfo);
    }
  }
}

function warnToConsole(str: string, arg?: unknown) {
  console.warn(`⚠️ ${str}`, arg);
}

export class TestScrapeLogger extends ScrapeLogger {
  async logIssue(_message: string, _arg?: unknown, _isIssue = true) {}
}
