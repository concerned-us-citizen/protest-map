import type {
  MarkerType,
  Nullable,
  PopulatedMarker,
  PopulatedProtestEventMarker,
  PopulatedTurnoutMarker,
  ProtestEventMarker,
  TurnoutMarker,
  TurnoutRange,
  VoterLean,
  VoterLeanCounts,
  VoterLeanTurnoutRange,
} from "$lib/types";
import type { FilterOptions } from "./FilterModel.svelte";
import { type Database, type SqlValue } from "sql.js";
import { dateToYYYYMMDDInt, yyyymmddIntToDate } from "$lib/util/date";
import { getSqlJs } from "./sqlJsInstance";
import type { NamedRegion } from "./RegionModel.svelte";

interface LatestDbManifest {
  dbFilename: string;
  lastUpdated: string;
  sha?: string;
}

export interface DateSummary {
  date: Date;
  eventCount: number;
  hasTurnout: boolean;
}

export class EventDb {
  private db: Database;
  private manifest: LatestDbManifest;

  constructor(db: Database, manifest: LatestDbManifest) {
    this.db = db;
    this.manifest = manifest;
  }

  getMarkers(filter: FilterOptions): (ProtestEventMarker | TurnoutMarker)[] {
    const { markerType, date, eventNames, namedRegion, voterLeans } = filter;

    const selectFields = ["id", "lat", "lon", "pct_dem_lead"];
    if (markerType === "turnout") {
      selectFields.push("low", "high");
    }

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT ${selectFields.join(", ")}
      FROM ${markerType}s
      ${whereClause}`
    );

    builder.addDateSubquery(date);
    builder.addVoterLeanSubquery(voterLeans);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addNamedRegionOnlySubquery(markerType, namedRegion);

    const stmt = builder.createStatement(this.db);

    const results: (ProtestEventMarker | TurnoutMarker)[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [id, lat, lon, pctDemLead, low, high] = row as [
        number,
        number,
        number,
        number | null,
        number | undefined,
        number | undefined,
      ];

      if (markerType === "turnout") {
        results.push({
          type: "turnout",
          id,
          lat,
          lon,
          pctDemLead,
          high: high as number,
          low: low as number,
        } satisfies TurnoutMarker);
      } else {
        results.push({
          type: "event",
          id,
          lat,
          lon,
          pctDemLead,
        } satisfies ProtestEventMarker);
      }
    }

    stmt.free();
    return results;
  }

  getVoterLeanCounts(filter: FilterOptions): VoterLeanCounts {
    const { date, markerType, eventNames, namedRegion, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT
          SUM(CASE WHEN pct_dem_lead <  0 THEN 1 ELSE 0 END) AS trump,
          SUM(CASE WHEN pct_dem_lead >  0 THEN 1 ELSE 0 END) AS harris,
          SUM(CASE WHEN pct_dem_lead IS NULL THEN 1 ELSE 0 END) AS unavailable
        FROM events
        ${whereClause}
`
    );
    builder.addDateSubquery(date);
    builder.addVoterLeanSubquery(voterLeans);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addNamedRegionOnlySubquery(markerType, namedRegion);

    const stmt = builder.createStatement(this.db);
    if (!stmt.step()) {
      throw new Error("Nothing returned for voter lean counts");
    }

    const [trump, harris, unavailable] = stmt.get();
    return {
      trump: (trump ?? 0) as number,
      harris: (harris ?? 0) as number,
      unavailable: (unavailable ?? 0) as number,
    };
  }

  getVoterLeanTurnoutRange(filter: FilterOptions): VoterLeanTurnoutRange {
    const { date, markerType, eventNames, namedRegion, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT
          SUM(CASE WHEN pct_dem_lead < 0 THEN low ELSE 0 END) AS trump_low,
          SUM(CASE WHEN pct_dem_lead < 0 THEN high ELSE 0 END) AS trump_high,
          SUM(CASE WHEN pct_dem_lead > 0 THEN low ELSE 0 END) AS harris_low,
          SUM(CASE WHEN pct_dem_lead > 0 THEN high ELSE 0 END) AS harris_high,
          SUM(CASE WHEN pct_dem_lead IS NULL THEN low ELSE 0 END) AS unavailable_low,
          SUM(CASE WHEN pct_dem_lead IS NULL THEN high ELSE 0 END) AS unavailable_high
        FROM turnouts
        ${whereClause}
`
    );
    builder.addDateSubquery(date);
    builder.addVoterLeanSubquery(voterLeans);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addNamedRegionOnlySubquery(markerType, namedRegion);

    const stmt = builder.createStatement(this.db);
    if (!stmt.step()) {
      throw new Error("Nothing returned for voter lean counts");
    }

    const [
      trumpLow,
      trumpHigh,
      harrisLow,
      harrisHigh,
      unavailableLow,
      unavailableHigh,
    ] = stmt.get();
    return {
      trump: {
        low: (trumpLow ?? 0) as number,
        high: (trumpHigh ?? 0) as number,
      },
      harris: {
        low: (harrisLow ?? 0) as number,
        high: (harrisHigh ?? 0) as number,
      },
      unavailable: {
        low: (unavailableLow ?? 0) as number,
        high: (unavailableHigh ?? 0) as number,
      },
    };
  }

  getCount(filter: FilterOptions): number {
    const { date, eventNames, namedRegion, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT SUM(1) as count
      FROM events
      ${whereClause}
      LIMIT 1
    `
    );
    builder.addDateSubquery(date);
    builder.addNamedRegionOnlySubquery("event", namedRegion);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

    stmt.step();
    const row = stmt.get();
    const [count] = row as [number];

    stmt.free();
    return count ?? 0;
  }

  getTurnoutRange(filter: FilterOptions): TurnoutRange {
    const { date, eventNames, namedRegion, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT SUM(low) as low_sum, SUM(high) as high_sum
      FROM turnouts
      ${whereClause}
      LIMIT 1
    `
    );
    builder.addDateSubquery(date);
    builder.addNamedRegionOnlySubquery("turnout", namedRegion);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

    stmt.step();
    const row = stmt.get();
    const [low, high] = row as [number, number];

    stmt.free();
    return { low, high };
  }

  getDates(filter: FilterOptions): Date[] {
    const { markerType, eventNames, namedRegion, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT DISTINCT date
      FROM ${markerType}s
      ${whereClause}
      ORDER BY date ASC
    `
    );

    builder.addNamedRegionOnlySubquery(markerType, namedRegion);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

    const results: Date[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [date] = row as [number, number];
      results.push(yyyymmddIntToDate(date));
    }

    stmt.free();
    return results;
  }

  getPopulatedMarker(
    id: number,
    markerType: MarkerType
  ): Nullable<PopulatedMarker> {
    if (!id) {
      return null;
    }

    const selectFields = [
      "lat",
      "lon",
      "pct_dem_lead",
      "date",
      "event_name",
      "link",
      "city_info_id",
    ];
    if (markerType === "turnout") {
      selectFields.push("low", "high", "coverage_url");
    }

    const stmt = this.db.prepare(`
      SELECT ${selectFields.join(", ")}
      FROM ${markerType}s
      WHERE id = ?
    `);

    stmt.bind([id]);

    if (!stmt.step()) {
      stmt.free();
      throw new Error(`Marker not found for id: ${id}`);
    }

    const row = stmt.get();
    const [
      lat,
      lon,
      pctDemLead,
      date,
      eventName,
      link,
      cityInfoId,
      low,
      high,
      coverageUrl,
    ] = row as [
      number,
      number,
      number | null,
      number,
      string,
      string | null,
      number,
      number | undefined,
      number | undefined,
      string | undefined,
    ];

    stmt.free();

    const cityInfo = this.getCityInfo(cityInfoId);

    const populatedMarker = {
      id,
      eventName,
      date: yyyymmddIntToDate(date),
      link,
      lat,
      lon,
      pctDemLead,
      ...cityInfo,
    };

    if (markerType === "turnout") {
      return {
        ...populatedMarker,
        type: "turnout",
        low: low as number,
        high: high as number,
        coverageUrl: coverageUrl as string,
      } satisfies PopulatedTurnoutMarker;
    } else {
      return {
        ...populatedMarker,
        type: "event",
      } satisfies PopulatedProtestEventMarker;
    }
  }

  getCityInfo(cityInfoId: number) {
    const cityStmt = this.db.prepare(`
      SELECT city_name, city_thumbnail_url, city_article_url
      FROM city_infos
      WHERE id = ?
    `);

    cityStmt.bind([cityInfoId]);

    if (!cityStmt.step()) {
      cityStmt.free();
      throw new Error(`CityInfo not found for id: ${cityInfoId}`);
    }

    const cityRow = cityStmt.get();
    const [cityName, cityThumbnailUrl, cityArticleUrl] = cityRow as [
      string,
      string,
      string,
    ];

    cityStmt.free();

    return {
      cityName,
      cityThumbnailUrl,
      cityArticleUrl,
    };
  }

  getDateSummaries(): DateSummary[] {
    const stmt = this.db.prepare(`
      SELECT date, event_count, has_turnout FROM date_summaries
    `);

    const results: DateSummary[] = [];
    while (stmt.step()) {
      const [dateInt, eventCount, hasTurnout] = stmt.get();
      results.push({
        date: yyyymmddIntToDate(dateInt as number),
        eventCount: eventCount as number,
        hasTurnout: hasTurnout === 1,
      });
    }

    stmt.free();
    return results;
  }

  getSummaryForDate(date: Date): DateSummary | null {
    const stmt = this.db.prepare(`
      SELECT date, event_count, has_turnout FROM date_summaries WHERE date = ?
    `);

    const dateAsInt = dateToYYYYMMDDInt(date);

    stmt.bind([dateAsInt]);
    if (stmt.step()) {
      const [dateInt, eventCount, hasTurnout] = stmt.get();
      stmt.free();
      return {
        date: yyyymmddIntToDate(dateInt as number),
        eventCount: eventCount as number,
        hasTurnout: !!hasTurnout,
      };
    }

    stmt.free();
    return null;
  }

  getEventNamesAndCounts(
    filter: FilterOptions
  ): { name: string; count: number }[] {
    const { date, markerType, namedRegion, eventNames, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT event_name, SUM(1) as count
      FROM events
      ${whereClause}
      GROUP BY event_name
      ORDER BY count DESC
      `
    );

    builder.addDateSubquery(date);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addNamedRegionOnlySubquery(markerType, namedRegion);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

    const results: { name: string; count: number }[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [name, count] = row as [string, number];
      results.push({ name, count });
    }

    stmt.free();
    return results;
  }

  getEventNamesAndTurnoutRanges(
    filter: FilterOptions
  ): { name: string; turnoutRange: TurnoutRange }[] {
    const { date, markerType, namedRegion, eventNames, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT event_name, SUM(low) as low_count, SUM(high) as high_count
      FROM turnouts
      ${whereClause}
      GROUP BY event_name
      ORDER BY low_count DESC
      `
    );

    builder.addDateSubquery(date);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addNamedRegionOnlySubquery(markerType, namedRegion);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

    const results: { name: string; turnoutRange: TurnoutRange }[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [name, lowCount, highCount] = row as [string, number, number];
      results.push({ name, turnoutRange: { low: lowCount, high: highCount } });
    }

    stmt.free();
    return results;
  }

  getCreatedAt(): Date {
    const stmt = this.db.prepare(
      `SELECT value FROM meta WHERE key = 'created_at'`
    );
    if (!stmt.step()) {
      stmt.free();
      throw new Error("created_at not found in meta");
    }

    const [createdAt] = stmt.get();
    stmt.free();
    return new Date(createdAt as string);
  }

  async checkIsUpdateAvailable() {
    const newManifest = await EventDb.#fetchManifest();
    return (
      newManifest.dbFilename !== this.manifest.dbFilename ||
      newManifest.sha !== this.manifest.sha
    );
  }

  static async #fetchManifest(): Promise<LatestDbManifest> {
    const manifestRes = await fetch("data/latest.json", { cache: "no-cache" });
    if (!manifestRes.ok) throw new Error(`Failed to load latest.json`);
    return (await manifestRes.json()) as LatestDbManifest;
  }

  static async create(): Promise<EventDb> {
    const manifest = await EventDb.#fetchManifest();

    const dbRes = await fetch(`/data/${manifest.dbFilename}`);
    if (!dbRes.ok)
      throw new Error(`Failed to fetch database file: ${manifest.dbFilename}`);
    const dbBuffer = await dbRes.arrayBuffer();

    const SQL = await getSqlJs();
    const db = new SQL.Database(new Uint8Array(dbBuffer));

    return new EventDb(db, manifest);
  }
}

class QueryBuilder {
  #whereClause = "";
  #params: SqlValue[] = [];
  #templateFunc: (_whereClause: string) => string;

  addDateSubquery(date: Date | undefined) {
    if (date) {
      this.appendSubquery(` date = ?`);
      this.#params.push(dateToYYYYMMDDInt(date));
    }
  }

  addVoterLeanSubquery(voterLeans: VoterLean[] | undefined) {
    if (voterLeans && voterLeans.length > 0) {
      const subquery: string[] = [];
      for (const voterLean of voterLeans) {
        switch (voterLean) {
          case "trump":
            subquery.push("pct_dem_lead < 0");
            break;
          case "harris":
            subquery.push("pct_dem_lead > 0");
            break;
          case "unavailable":
            subquery.push("pct_dem_lead IS NULL");
            break;
        }
      }
      this.appendSubquery(`(${subquery.join(" OR ")})`);
    }
  }

  addNamedRegionOnlySubquery(
    markerType: MarkerType,
    namedRegion: NamedRegion | undefined
  ) {
    if (namedRegion) {
      this.appendSubquery(`
        EXISTS (
        SELECT 1
        FROM ${markerType}_regions er
        WHERE er.${markerType}_id = id
          AND er.region_id = ?
    )
        `);
      this.#params.push(namedRegion.id);
    }
  }

  addSelectedEventNamesSubquery(selectedEventNames: string[] | undefined) {
    if (selectedEventNames && selectedEventNames.length > 0) {
      const placeholders = selectedEventNames.map(() => "?").join(", ");
      this.appendSubquery(`event_name IN (${placeholders})`);
      this.#params.push(...selectedEventNames);
    }
  }

  private appendSubquery(sub: string) {
    if (this.#whereClause.length > 0) {
      this.#whereClause += "\nAND ";
    }
    this.#whereClause += sub;
  }

  get fullWhereClause() {
    return this.#whereClause.length > 0
      ? `
    WHERE \n${this.#whereClause}
    `
      : "";
  }

  get params() {
    return this.#params;
  }

  createStatement(db: Database) {
    const query = this.#templateFunc(this.fullWhereClause);
    try {
      const stmt = db.prepare(query);
      stmt.bind(this.params);
      return stmt;
    } catch (err) {
      console.error(`Failed to build sql statement ${query}`, err);
      throw err;
    }
  }

  constructor(templateFunc: (_whereClause: string) => string) {
    this.#templateFunc = templateFunc;
  }
}
