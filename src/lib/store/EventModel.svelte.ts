import { browser } from "$app/environment";
import type {
  EventFilter,
  EventMarkerInfoWithId,
  Nullable,
  PopulatedEvent,
} from "$lib/types";
import { formatDateRange, formatDateTime } from "$lib/util/date";
import { ClientEventDb } from "./ClientEventDb";

export class EventModel {
  private db: Nullable<ClientEventDb> = $state(null);

  visibleMarkerInfos = $state<EventMarkerInfoWithId[]>([]);
  allDatesWithEventCounts = $state<{ date: Date; eventCount: number }[]>([]);
  updatedAt = $state<Nullable<Date>>(null);

  largestDateEventCount = $derived.by(() => {
    const dates = this.allDatesWithEventCounts;
    const counts = dates.map((d) => d.eventCount);
    return counts.length > 0 ? Math.max(...dates.map((d) => d.eventCount)) : 0;
  });

  readonly isLoading = $derived(this.db === null);

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

  getMarkerInfos(filter: EventFilter): EventMarkerInfoWithId[] {
    return this.db ? this.db.getEventMarkerInfos(filter) : [];
  }

  getEventNamesAndCountsForDate(date: Date): { name: string; count: number }[] {
    return this.db ? this.db.getEventNamesAndCountsForDate(date) : [];
  }

  getPopulatedEvent(eventId: number): Nullable<PopulatedEvent> {
    return this.db ? this.db.getPopulatedEvent(eventId) : null;
  }

  async checkIsUpdateAvailable(): Promise<boolean> {
    return this.db ? await this.db.checkIsUpdateAvailable() : false;
  }

  private constructor() {}

  private async initialize() {
    try {
      this.db = await ClientEventDb.create();
      this.allDatesWithEventCounts = this.db.getAllDatesWithEventCounts();
      this.updatedAt = this.db.getCreatedAt();
    } catch (error) {
      console.error("Failed to load database:", error);
    }
  }

  static create(): EventModel {
    const model = new EventModel();
    // Start async initialization in the background
    if (browser) {
      model.initialize();
    }
    return model;
  }
}
