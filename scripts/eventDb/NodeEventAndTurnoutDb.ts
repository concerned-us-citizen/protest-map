import Database, { Statement } from "better-sqlite3";
import { CityInfo } from "../../src/lib/types";
import { dateToYYYYMMDDInt } from "../../src/lib/util/date";
import { RawProtestEvent, RawTurnout } from "../../src/lib/stats/types";

export class NodeEventAndTurnoutDb {
  private db: Database.Database;

  private insertEventStatement: Statement<unknown[], unknown>;
  private hasSeenEventOrTurnoutStatement: Statement<
    [string],
    { "1": number } | undefined
  >;
  private addSeenEventOrTurnoutStatement: Statement<[string], void>;

  private insertCityInfoStatement: Statement<unknown[], unknown>;
  private hasSeenCityInfoStatement: Statement<
    [string],
    { "1": number } | undefined
  >;
  private getSeenCityInfoStatement: Statement<
    [string],
    { city_info_id: number } | undefined
  >;
  private addSeenCityInfoStatement: Statement<[string, number], void>;

  private insertTurnoutStatement: Statement<unknown[], unknown>;

  private insertEventRegionStatement: Statement<
    [number, number],
    { "1": number } | undefined
  >;

  private insertTurnoutRegionStatement: Statement<
    [number, number],
    { "1": number } | undefined
  >;

  private constructor(db: Database.Database) {
    this.db = db;

    this.insertEventStatement = db.prepare(
      "INSERT INTO events (lat, lon, pct_dem_lead, date, event_name, link, city_info_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    this.insertCityInfoStatement = db.prepare(
      "INSERT INTO city_infos (city_name, city_thumbnail_url, city_article_url) VALUES (?, ?, ?)"
    );

    this.hasSeenEventOrTurnoutStatement = this.db.prepare(
      "SELECT 1 FROM seen_events_or_turnouts WHERE event_key = ?"
    );
    this.addSeenEventOrTurnoutStatement = this.db.prepare(
      "INSERT OR IGNORE INTO seen_events_or_turnouts (event_key) VALUES (?)"
    );

    this.insertTurnoutStatement = db.prepare(
      "INSERT INTO turnouts (lat, lon, pct_dem_lead, date, event_name, link, coverage_url, low, high, city_info_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    this.hasSeenCityInfoStatement = this.db.prepare(
      "SELECT 1 FROM seen_city_infos WHERE city_info_key = ?"
    );
    this.getSeenCityInfoStatement = this.db.prepare(
      "SELECT city_info_id FROM seen_city_infos WHERE city_info_key = ?"
    );
    this.addSeenCityInfoStatement = this.db.prepare(
      "INSERT OR IGNORE INTO seen_city_infos (city_info_key, city_info_id) VALUES (?, ?)"
    );
    this.insertEventRegionStatement = this.db.prepare(
      "INSERT INTO event_regions (event_id, region_id) VALUES (?, ?)"
    );
    this.insertTurnoutRegionStatement = this.db.prepare(
      "INSERT INTO turnout_regions (turnout_id, region_id) VALUES (?, ?)"
    );
  }

  static create(dbPath: string): NodeEventAndTurnoutDb {
    console.log("Creating SQLite database...");
    try {
      const db = new Database(dbPath);

      db.pragma("synchronous = FULL");
      db.pragma("journal_mode = DELETE", { simple: true });

      db.exec(`CREATE TABLE city_infos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              city_name TEXT,
              city_thumbnail_url TEXT,
              city_article_url TEXT
          );
      `);

      db.exec(`CREATE TABLE events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              lat REAL NOT NULL,
              lon REAL NOT NULL,
              pct_dem_lead REAL,
              date INTEGER NOT NULL,
              event_name TEXT NOT NULL,
              link TEXT,
              city_info_id INTEGER,
              FOREIGN KEY (city_info_id) REFERENCES city_infos(id)
          );
      `);

      db.exec(`CREATE INDEX idx_events_date ON events(date);`);
      db.exec(`CREATE INDEX idx_events_name ON events(event_name)`);

      db.exec(`
        CREATE TEMPORARY TABLE seen_events_or_turnouts (
          event_key TEXT PRIMARY KEY
        );
      `);

      db.exec(`CREATE TABLE turnouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            pct_dem_lead REAL,
            date INTEGER NOT NULL,
            event_name TEXT NOT NULL,
            link TEXT,
            coverage_url TEXT,
            low INTEGER,
            high INTEGER,
            city_info_id INTEGER,
            FOREIGN KEY (city_info_id) REFERENCES city_infos(id)
        );
      `);
      db.exec(`CREATE INDEX idx_turnouts_date ON turnouts(date);`);
      db.exec(`CREATE INDEX idx_turnouts_event_name ON turnouts(event_name)`);

      db.exec(`
        CREATE TABLE turnout_regions(
          turnout_id INTEGER,
          region_id INTEGER
        );
      `);
      db.exec(
        `CREATE INDEX idx_turnout_region_id ON turnout_regions(turnout_id, region_id)`
      );

      db.exec(`
        CREATE TABLE event_regions(
          event_id INTEGER,
          region_id INTEGER
        );
      `);
      db.exec(
        `CREATE INDEX idx_event_region_id ON event_regions(event_id, region_id)`
      );

      db.exec(`
        CREATE TEMPORARY TABLE seen_turnouts (
          event_key TEXT PRIMARY KEY
        );
      `);

      db.exec(`
        CREATE TEMPORARY TABLE seen_city_infos (
          city_info_key TEXT PRIMARY KEY,
          city_info_id INTEGER
        );
      `);

      db.exec(`CREATE TABLE meta (
              key TEXT PRIMARY KEY,
              value TEXT
            );`);

      const now = new Date().toISOString();
      db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run(
        "created_at",
        now
      );

      return new NodeEventAndTurnoutDb(db);
    } catch (err) {
      console.error("Error creating database:", err);
      throw err;
    }
  }

  insertEvent(event: RawProtestEvent) {
    const result = this.insertEventStatement.run(
      event.lat,
      event.lon,
      event.pctDemLead,
      dateToYYYYMMDDInt(new Date(event.date)),
      event.name,
      event.link,
      event.cityInfoId
    );
    return Number(result.lastInsertRowid);
  }

  hasSeenEventOrTurnoutKey(eventKey: string): boolean {
    const row = this.hasSeenEventOrTurnoutStatement.get(eventKey);
    return !!row;
  }

  addSeenEventOrTurnoutKey(eventKey: string): number {
    const result = this.addSeenEventOrTurnoutStatement.run(eventKey);
    return Number(result.lastInsertRowid);
  }

  insertTurnout(turnout: RawTurnout) {
    const result = this.insertTurnoutStatement.run(
      turnout.lat,
      turnout.lon,
      turnout.pctDemLead,
      dateToYYYYMMDDInt(new Date(turnout.date)),
      turnout.name,
      turnout.link,
      turnout.coverageUrl,
      turnout.low,
      turnout.high,
      turnout.cityInfoId
    );
    return Number(result.lastInsertRowid);
  }

  hasSeenCityInfoKey(cityInfoKey: string): boolean {
    const row = this.hasSeenCityInfoStatement.get(cityInfoKey);
    return !!row;
  }

  getSeenCityInfoIdForKey(cityInfoKey: string): number {
    const result = this.getSeenCityInfoStatement.get(cityInfoKey);

    if (!result) {
      throw new Error(`City info key not found: ${cityInfoKey}`);
    }
    return result.city_info_id as number;
  }

  addSeenCityInfoKeyAndId(cityInfoKey: string, id: number): number {
    const result = this.addSeenCityInfoStatement.run(cityInfoKey, id);
    return Number(result.lastInsertRowid);
  }

  insertCityInfo(info: CityInfo) {
    const result = this.insertCityInfoStatement.run(
      info.cityName,
      info.cityThumbnailUrl,
      info.cityArticleUrl
    );
    return Number(result.lastInsertRowid);
  }

  createDateSummaryTable() {
    this.db.exec(`CREATE TABLE date_summaries (
      date INTEGER PRIMARY KEY,
      event_count INTEGER NOT NULL,
      has_turnout INTEGER NOT NULL
      );

      INSERT INTO date_summaries (date, event_count, has_turnout)
        SELECT
          e.date,
          COUNT(*) AS event_count,
          CASE WHEN COALESCE(t.total_low, 0) > 1000000 THEN 1 ELSE 0 END AS has_turnout
        FROM events e
        LEFT JOIN (
          SELECT date, SUM(low) AS total_low
          FROM turnouts
          GROUP BY date
        ) t ON t.date = e.date
        GROUP BY e.date;
`);
  }

  insertEventRegion(eventId: number, regionId: number) {
    const result = this.insertEventRegionStatement.run(eventId, regionId);
    return Number(result.lastInsertRowid);
  }

  insertTurnoutRegion(turnoutId: number, regionId: number) {
    const result = this.insertTurnoutRegionStatement.run(turnoutId, regionId);
    return Number(result.lastInsertRowid);
  }

  beginTransaction() {
    this.db.exec("BEGIN TRANSACTION;");
  }

  commit() {
    this.db.exec("COMMIT;");
  }

  close() {
    this.db.close();
  }
}
