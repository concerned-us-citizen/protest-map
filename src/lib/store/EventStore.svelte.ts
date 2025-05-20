import type {
  ProtestEvent,
  ProtestEventDataJson,
  Location,
  DateRange,
  Nullable,
} from "../types";
import {
  formatDateRange,
  formatDateTime,
  getFirstAndLastDate,
  parseDateString,
} from "../util/dates";

export class EventStore {
  events = $state(new Map<Date, ProtestEvent[]>());
  locations = $state(new Map<string, Location>());
  updatedAt = $state<Nullable<Date>>(null);

  #allDatesWithEventCounts = $derived(() =>
    [...this.events.entries()]
      .map(([date, events]) => ({
        date,
        eventCount: events.length,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  );
  get allDatesWithEventCounts(): { date: Date; eventCount: number }[] {
    return this.#allDatesWithEventCounts();
  }

  #largestDateEventCount = $derived(() =>
    Math.max(...this.allDatesWithEventCounts.map((d) => d.eventCount))
  );
  get largestDateEventCount(): number {
    return this.#largestDateEventCount();
  }

  #hasDates = $derived(() => this.allDatesWithEventCounts.length > 0);
  get hasDates(): boolean {
    return this.#hasDates();
  }

  #dateRange = $derived(() => getFirstAndLastDate(this.events));
  get dateRange(): Nullable<DateRange> {
    return this.#dateRange();
  }

  #formattedDateRange = $derived(() => formatDateRange(this.dateRange));
  get formattedDateRange(): string {
    return this.#formattedDateRange();
  }

  #formattedUpdatedAt = $derived(() =>
    this.updatedAt
      ? `Last updated: ${formatDateTime(this.updatedAt)}`
      : "Not yet updated"
  );
  get formattedUpdatedAt(): string {
    return this.#formattedUpdatedAt();
  }

  loadData(json: ProtestEventDataJson): void {
    const events = new Map<Date, ProtestEvent[]>();

    for (const [dateString, event] of Object.entries(json.events ?? {})) {
      const parsedDate = parseDateString(dateString);
      if (parsedDate) {
        const existing = events.get(parsedDate) ?? [];
        existing.push(event);
        events.set(parsedDate, existing);
      } else {
        console.warn(`Unparseable date: ${dateString}`, event);
      }
    }

    this.events = events;
    this.locations = new Map(Object.entries(json.locations ?? {}));
    this.updatedAt = parseDateString(json.updatedAt);
  }
}
