import { browser } from "$app/environment";
import type {
  EventMarkerInfoWithId,
  Nullable,
  PopulatedEvent,
} from "$lib/types";
import { formatDate, formatDateTime } from "$lib/util/date";
import { ClientEventDb } from "./ClientEventDb";
import { booleanPointInPolygon, point } from "@turf/turf";
import type { RegionModel } from "./RegionModel";
import type { EventFilterOptions } from "./FilteredEventModel.svelte";

export class EventModel {
  private db: Nullable<ClientEventDb> = $state(null);
  private regionModel: RegionModel;

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

  readonly formattedDateRangeStart = $derived.by(() => {
    if (!this.dateRange) return "";
    return formatDate(this.dateRange.start);
  });

  readonly formattedDateRangeEnd = $derived.by(() => {
    if (!this.dateRange) return "";
    return formatDate(this.dateRange.end);
  });

  readonly formattedUpdatedAt = $derived(
    this.updatedAt
      ? `Data last refreshed ${formatDateTime(this.updatedAt)}`
      : "Not yet updated"
  );

  async getMarkerInfos(
    filter: EventFilterOptions
  ): Promise<EventMarkerInfoWithId[]> {
    let result = this.db ? this.db.getEventMarkerInfos(filter) : [];
    if (filter.namedRegion) {
      const polygon = await this.regionModel.getPolygonForNamedRegion(
        filter.namedRegion
      );
      if (!polygon) return [];
      result = result.filter((marker) =>
        booleanPointInPolygon(point([marker.lon, marker.lat]), polygon)
      );
    }
    return result;
  }

  getEventNamesAndCountsForFilter(
    filter: EventFilterOptions
  ): { name: string; count: number }[] {
    return this.db ? this.db.getEventNamesAndCountsForFilter(filter) : [];
  }

  getPopulatedEvent(eventId: number): Nullable<PopulatedEvent> {
    return this.db ? this.db.getPopulatedEvent(eventId) : null;
  }

  async checkIsUpdateAvailable(): Promise<boolean> {
    return this.db ? await this.db.checkIsUpdateAvailable() : false;
  }

  private constructor(regionModel: RegionModel) {
    this.regionModel = regionModel;
  }

  private async initialize() {
    try {
      this.db = await ClientEventDb.create();
      this.allDatesWithEventCounts = this.db.getAllDatesWithEventCounts();
      this.updatedAt = this.db.getCreatedAt();
    } catch (error) {
      console.error("Failed to load database:", error);
    }
  }

  static create(regionModel: RegionModel): EventModel {
    const model = new EventModel(regionModel);
    // Start async initialization in the background
    if (browser) {
      model.initialize();
    }
    return model;
  }
}
