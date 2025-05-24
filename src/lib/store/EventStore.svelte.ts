import type {
  ProtestEvent,
  ProtestEventDataJson,
  Location,
  Nullable,
} from "../types";
import {
  formatDateRange,
  formatDateTime,
  getFirstAndLastDate,
  parseDateString,
} from "../util/date";

export class EventStore {
  events = $state(new Map<Date, ProtestEvent[]>());
  locations = $state(new Map<string, Location>());
  updatedAt = $state<Nullable<Date>>(null);

  readonly allDatesWithEventCounts = $derived(
    [...this.events.entries()]
      .map(([date, events]) => ({
        date,
        eventCount: events.length,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  );

  readonly largestDateEventCount = $derived(
    Math.max(...this.allDatesWithEventCounts.map((d) => d.eventCount))
  );

  readonly hasDates = $derived(this.allDatesWithEventCounts.length > 0);

  readonly dateRange = $derived(getFirstAndLastDate(this.events));

  readonly formattedDateRange = $derived(formatDateRange(this.dateRange));

  readonly formattedUpdatedAt = $derived(
    this.updatedAt
      ? `Protest data last refreshed ${formatDateTime(this.updatedAt)}`
      : "Not yet updated"
  );

  loadData(json: ProtestEventDataJson): void {
    const events = new Map<Date, ProtestEvent[]>();

    for (const [dateString, eventsForDate] of Object.entries(
      json.events ?? {}
    )) {
      const parsedDate = parseDateString(dateString);
      if (parsedDate) {
        events.set(parsedDate, eventsForDate);
      } else {
        console.warn(`Unparseable date: ${dateString}`, event);
      }
    }

    this.events = events;
    this.locations = new Map(Object.entries(json.locations ?? {}));
    this.updatedAt = new Date(json.updatedAt);
  }
}
