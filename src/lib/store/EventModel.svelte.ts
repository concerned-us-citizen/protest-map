import type { EventFilter, EventMarkerInfoWithId, Nullable } from "$lib/types";
import { formatDateRange, formatDateTime } from "$lib/util/date";
import { ClientEventDb } from "./ClientEventDb";

export class EventModel {
  private db: ClientEventDb;

  visibleMarkerInfos = $state<EventMarkerInfoWithId[]>([]);
  allDatesWithEventCounts = $state<{ date: Date; eventCount: number }[]>([]);
  updatedAt = $state<Nullable<Date>>(null);

  largestDateEventCount = $derived(
    Math.max(...this.allDatesWithEventCounts.map((d) => d.eventCount))
  );

  readonly hasDates = $derived(this.allDatesWithEventCounts.length > 0);

  readonly dateRange = $derived.by(() => {
    const dates = this.allDatesWithEventCounts;
    if (dates.length === 0) return null;
    return { start: dates[0].date, end: dates[dates.length - 1].date };
  });

  isValidDate(date: Date) {
    return (
      this.dateRange &&
      date >= this.dateRange.start &&
      date <= this.dateRange?.end
    );
  }

  readonly formattedDateRange = $derived.by(() =>
    this.dateRange != null ? formatDateRange(this.dateRange) : ""
  );

  readonly formattedUpdatedAt = $derived(
    this.updatedAt
      ? `Data last refreshed ${formatDateTime(this.updatedAt)}`
      : "Not yet updated"
  );

  getMarkerInfos(filter: EventFilter) {
    return this.db.getEventMarkerInfos(filter);
  }

  getEventNamesAndCountsForDate(date: Date) {
    return this.db.getEventNamesAndCountsForDate(date);
  }

  getPopulatedEvent(eventId: number) {
    return this.db.getPopulatedEvent(eventId);
  }

  async checkIsUpdateAvailable() {
    return await this.db.checkIsUpdateAvailable();
  }

  private constructor(db: ClientEventDb) {
    this.db = db;
  }

  private initialize() {
    this.allDatesWithEventCounts = this.db.getAllDatesWithEventCounts();
    this.updatedAt = this.db.getCreatedAt();
  }

  static async create(): Promise<EventModel> {
    const db = await ClientEventDb.create();
    const model = new EventModel(db);
    model.initialize();
    return model;
  }
}
