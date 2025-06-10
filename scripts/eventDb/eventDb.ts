import Database, { Statement } from "better-sqlite3";
import { ProtestEvent, LocationInfo } from "../../src/lib/types";

export class EventDb {
  private db: Database.Database;
  private insertEventStatement: Statement<unknown[], unknown>;
  private insertLocationInfoStatement: Statement<unknown[], unknown>;

  private hasSeenEventStatement: Statement<
    [string],
    { "1": number } | undefined
  >;
  private addSeenEventStatement: Statement<[string], void>;

  private hasSeenLocationInfoStatement: Statement<
    [string],
    { "1": number } | undefined
  >;
  private getSeenLocationInfoStatement: Statement<
    [string],
    { location_info_id: number } | undefined
  >;
  private addSeenLocationInfoStatement: Statement<[string, number], void>;

  private constructor(db: Database.Database) {
    this.db = db;

    this.insertEventStatement = db.prepare(
      "INSERT INTO events (lat, lon, date, name, link, location_info_id) VALUES (?, ?, ?, ?, ?, ?)"
    );

    this.insertLocationInfoStatement = db.prepare(
      "INSERT INTO location_infos (lat, lon, city_thumbnail_url, city_article_url, pct_dem_lead) VALUES (?, ?, ?, ?, ?)"
    );

    this.hasSeenEventStatement = this.db.prepare(
      "SELECT 1 FROM seen_events WHERE event_key = ?"
    );
    this.addSeenEventStatement = this.db.prepare(
      "INSERT OR IGNORE INTO seen_events (event_key) VALUES (?)"
    );

    this.hasSeenLocationInfoStatement = this.db.prepare(
      "SELECT 1 FROM seen_location_infos WHERE location_info_key = ?"
    );
    this.getSeenLocationInfoStatement = this.db.prepare(
      "SELECT location_info_id FROM seen_location_infos WHERE location_info_key = ?"
    );
    this.addSeenLocationInfoStatement = this.db.prepare(
      "INSERT OR IGNORE INTO seen_location_infos (location_info_key, location_info_id) VALUES (?, ?)"
    );
  }

  static create(dbPath: string): EventDb {
    console.log("Creating SQLite database...");
    try {
      const db = new Database(dbPath);

      db.pragma("synchronous = FULL");
      db.pragma("journal_mode = DELETE", { simple: true });

      db.exec(`CREATE TABLE location_infos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              lat REAL NOT NULL,
              lon REAL NOT NULL,
              city_thumbnail_url TEXT,
              city_article_url TEXT,
              pct_dem_lead REAL
          );`);

      db.exec(`CREATE TABLE events (
              lat REAL NOT NULL,
              lon REAL NOT NULL,
              date TEXT NOT NULL,
              name TEXT NOT NULL,
              link TEXT,
              location_info_id INTEGER,
              FOREIGN KEY (location_info_id) REFERENCES location_infos(id)
          );`);

      db.exec(`CREATE INDEX idx_events_date ON events(date);`);
      db.exec(`CREATE INDEX idx_events_name ON events(name)`);

      db.exec(`
        CREATE TEMPORARY TABLE seen_events (
          event_key TEXT PRIMARY KEY
        );
      `);

      db.exec(`
        CREATE TEMPORARY TABLE seen_location_infos (
          location_info_key TEXT PRIMARY KEY,
          location_info_id INTEGER
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

      return new EventDb(db);
    } catch (err) {
      console.error("Error creating database:", err);
      throw err;
    }
  }

  insertEvent(event: ProtestEvent) {
    const result = this.insertEventStatement.run(
      event.lat,
      event.lon,
      event.date,
      event.name,
      event.link,
      event.locationInfoId
    );
    return Number(result.lastInsertRowid);
  }

  hasSeenEventKey(eventKey: string): boolean {
    const row = this.hasSeenEventStatement.get(eventKey);
    return !!row;
  }

  addSeenEventKey(eventKey: string): number {
    const result = this.addSeenEventStatement.run(eventKey);
    return Number(result.lastInsertRowid);
  }

  hasSeenLocationInfoKey(locationInfoKey: string): boolean {
    const row = this.hasSeenLocationInfoStatement.get(locationInfoKey);
    return !!row;
  }

  getSeenLocationInfoIdForKey(locationInfoKey: string): number {
    const result = this.getSeenLocationInfoStatement.get(locationInfoKey);

    if (!result) {
      throw new Error(`Location info key not found: ${locationInfoKey}`);
    }
    return result.location_info_id as number;
  }

  addSeenLocationInfoKeyAndId(
    locationInfoKey: string,
    locationId: number
  ): number {
    const result = this.addSeenLocationInfoStatement.run(
      locationInfoKey,
      locationId
    );
    return Number(result.lastInsertRowid);
  }

  insertLocationInfo(info: LocationInfo) {
    const result = this.insertLocationInfoStatement.run(
      info.lat,
      info.lon,
      info.cityThumbnailUrl,
      info.cityArticleUrl,
      info.pctDemLead
    );
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
