import { EventModel } from "./EventModel.svelte";
import {
  EmptyVoterLeanCounts,
  type Marker,
  type MarkerType,
  type SetTimeoutId,
  type TurnoutCountSource,
  type VoterLean,
} from "$lib/types";
import { formatDate, isFutureDate } from "$lib/util/date";
import { joinWithAnd, mdBold, pluralize } from "$lib/util/string";
import { titleCase } from "title-case";
import type { MapModel } from "./MapModel.svelte";
import {
  prettifyNamedRegion,
  RegionModel,
  type NamedRegion,
} from "./RegionModel.svelte";
import type { Polygon, MultiPolygon } from "geojson";
import { omit } from "$lib/util/misc";

const INITIAL_REPEAT_DELAY = 400; // ms
const REPEAT_INTERVAL = 80; // ms

export interface FilterOptions {
  markerType: MarkerType;
  turnoutCountSource: TurnoutCountSource;
  date?: Date;
  eventNames?: string[]; // empty or missing means match all events
  namedRegion?: NamedRegion; // If not null, only match events within the region
  namedRegionPolygon?: Polygon | MultiPolygon;
  voterLeans?: VoterLean[]; // empty or missing means match all voter leans
}

interface DateAndCount {
  date: Date;
  count: number;
}

export class FilterModel {
  readonly eventModel: EventModel;
  readonly mapModel: MapModel;
  readonly regionModel: RegionModel;

  filter = $derived.by(() => ({
    markerType: this.markerType,
    turnoutCountSource: this.turnoutCountSource,
    date: this.date,
    eventNames: this.selectedEventNames,
    namedRegion: this.namedRegion,
    namedRegionPolygon: this.namedRegionPolygon,
    voterLeans: this.selectedVoterLeans,
  }));

  markerType: MarkerType = $state("event");
  turnoutCountSource: TurnoutCountSource = $state("low");

  allFilteredEvents = $state<Marker[]>([]);
  dateFilteredMarkers = $state<Marker[]>([]);
  totalCount = $state<number>(0);

  allDatesWithCounts = $state<DateAndCount[]>([]);
  filteredDatesWithEventCounts = $state<DateAndCount[]>([]);

  namedRegion = $state<NamedRegion | undefined>();
  namedRegionPolygon: Polygon | MultiPolygon | undefined = $state();

  selectedVoterLeans = $state<VoterLean[]>([]);

  // We don't derive one from the other here, because
  // we don't want to establish a dependency on filteredDatesWithEventCounts,
  // since it may change with filters, causing the two to misalign.
  // Instead, we explicitly set both of them when setting either one.

  // Worth noting - dateIndex is relative to
  // allDatesWithEventCounts, not filteredDatesWithEventCounts.
  #dateIndex: number = $state(-1);
  get dateIndex() {
    return this.#dateIndex;
  }
  #date = $state<Date | undefined>();
  get date() {
    return this.#date;
  }

  setDateIndex(index: number) {
    this.#dateIndex = index;
    if (index < 0 || index >= this.allDatesWithCounts.length) {
      this.#date = undefined;
    } else {
      this.#date = this.allDatesWithCounts[index].date;
    }
  }

  setDate(date: Date | undefined) {
    this.#date = date;
    if (!date) {
      this.#dateIndex = -1;
    } else {
      const index = this.allDatesWithCounts.findIndex(
        (d) => d.date.getTime() === date.getTime()
      );
      if (index !== -1) {
        this.#dateIndex = index;
      } else {
        console.warn(
          "Setting date to value not found in eventModel.allDatesWithEventCounts:",
          date
        );
        this.#dateIndex = -1;
      }
    }
  }

  largestDateCount = $derived.by(() => {
    const dates = this.allDatesWithCounts;
    const counts = dates.map((d) => d.count);
    return counts.length > 0 ? Math.max(...dates.map((d) => d.count)) : 0;
  });

  readonly hasDates = $derived(this.allDatesWithCounts.length > 0);

  isValidDate(date: Date | undefined) {
    if (!date) return false;
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

  readonly dateRange = $derived.by(() => {
    const dates = this.allDatesWithCounts;
    if (dates.length === 0) return null;
    return { start: dates[0].date, end: dates[dates.length - 1].date };
  });

  #selectRelativeDateWrapping(increment: number) {
    const filteredDates = this.filteredDatesWithEventCounts;
    const allDates = this.allDatesWithCounts;
    const currentDate = this.date;

    if (filteredDates.length === 0 || !currentDate) return;

    // Find current date’s index in filteredDates
    let filteredIndex = filteredDates.findIndex(
      (d) => d.date.getTime() === currentDate.getTime()
    );

    if (filteredIndex === -1) {
      filteredIndex = 0;
    }

    // Compute wrapped index
    const len = filteredDates.length;
    const targetIndex = (filteredIndex + increment + len) % len;

    const targetDate = filteredDates[targetIndex]?.date;
    if (!targetDate) return undefined;

    // Find target date's index in allDates
    const newIndex = allDates.findIndex(
      (d) => d.date.getTime() === targetDate.getTime()
    );

    this.setDateIndex(newIndex);
  }

  selectNextDate() {
    this.#selectRelativeDateWrapping(1);
  }

  selectPreviousDate() {
    this.#selectRelativeDateWrapping(-1);
  }

  readonly formattedDate = $derived(formatDate(this.date));

  readonly filteredEventNamesWithLocationCounts = $derived.by(() => {
    const filter = this.filter;

    if (!filter?.date) return [];

    // We want to see all the event names for the current date's filter,
    // excluding other filters, but with counts that reflect the
    // full current filter (i.e. many will be 0). This gives users the ability to select
    // names that would otherwise be filtered out, but see accurate counts.
    const allFullyFilteredEventNamesAndCounts = this.eventModel
      ? this.eventModel.getEventNamesAndCountsForFilter(filter)
      : [];

    const fullCountsMap = new Map(
      allFullyFilteredEventNamesAndCounts.map(({ name, count }) => [
        name,
        count,
      ])
    );

    const allDateEventNamesAndCounts = this.eventModel
      ? this.eventModel.getEventNamesAndCountsForFilter({
          markerType: filter.markerType,
          turnoutCountSource: filter.turnoutCountSource,
          date: filter.date,
        })
      : [];

    return allDateEventNamesAndCounts.map(({ name }) => ({
      name,
      count: fullCountsMap.get(name) ?? 0,
    }));
  });

  readonly dateHasEventNames = $derived(
    this.filteredEventNamesWithLocationCounts.length > 0
  );

  readonly dateHasMultipleEventNames = $derived(
    this.filteredEventNamesWithLocationCounts.length > 1
  );

  readonly filteredVoterLeanCounts = $derived.by(() => {
    const filter = this.filter;
    if (!filter?.date) return EmptyVoterLeanCounts;

    return this.eventModel
      ? this.eventModel.getVoterLeanCounts(filter)
      : EmptyVoterLeanCounts;
  });

  selectedEventNames = $state<string[]>([]);

  isFiltering = $derived(
    this.selectedEventNames.length > 0 ||
      this.namedRegion !== undefined ||
      this.selectedVoterLeans.length > 0
  );

  filterDescriptions = $derived.by(() => {
    const descriptions: { title: string; clearFunc: () => void }[] = [];
    const namedRegion = this.namedRegion;
    if (namedRegion) {
      const regionDisplayName = prettifyNamedRegion(namedRegion);
      descriptions.push({
        title: `In ${mdBold(regionDisplayName)}`,
        clearFunc: () => this.clearNamedRegionFilter(),
      });
    }

    const eventCount = this.selectedEventNames.length;
    if (eventCount > 0) {
      const title =
        eventCount < 5
          ? `From ${pluralize(this.selectedEventNames, "event")} ${joinWithAnd(this.selectedEventNames.map(mdBold))}`
          : `From ${eventCount} events`;
      descriptions.push({
        title,
        clearFunc: () => this.clearSelectedNames(),
      });
    }

    if (this.selectedVoterLeans.length > 0) {
      const voterLeanNames = this.selectedVoterLeans
        .map((n) => mdBold(titleCase(n)))
        .join(" or ");
      descriptions.push({
        title: `In precincts with voter lean ${voterLeanNames}`,
        clearFunc: () => this.clearVoterLeans(),
      });
    }

    return descriptions;
  });

  toggleSelectedEventName(name: string) {
    const cur = this.selectedEventNames;
    this.selectedEventNames = cur.includes(name)
      ? cur.filter((n) => n !== name)
      : [...cur, name];
  }

  toggleVoterLean(voterLean: VoterLean) {
    const cur = this.selectedVoterLeans;
    this.selectedVoterLeans = cur.includes(voterLean)
      ? cur.filter((n) => n !== voterLean)
      : [...cur, voterLean];
    if (this.selectedVoterLeans.length === 3) {
      this.selectedVoterLeans = [];
    }
  }

  clearSelectedNames() {
    this.selectedEventNames = [];
  }

  clearNamedRegionFilter() {
    this.namedRegion = undefined;
  }

  clearVoterLeans() {
    this.selectedVoterLeans = [];
  }

  clearAllFilters() {
    this.clearSelectedNames();
    this.clearNamedRegionFilter();
    this.clearVoterLeans();
  }

  #isRepeatingChange = false;
  #currentRepeatDirection: "next" | "prev" | null = null;
  #repeatTimer: SetTimeoutId;

  startDateRepeat(direction: "next" | "prev") {
    // If already repeating in the same direction, do nothing.
    if (this.#isRepeatingChange && this.#currentRepeatDirection === direction)
      return;

    // Stop any existing repeat action.
    this.stopDateRepeat();

    this.#isRepeatingChange = true;
    this.#currentRepeatDirection = direction;

    // Schedule the first continuous change after INITIAL_REPEAT_DELAY.
    // The immediate first change will be handled by the on:click event.
    this.#repeatTimer = setTimeout(() => {
      // Ensure we are still supposed to be repeating before the first programmatic change
      if (
        this.#isRepeatingChange &&
        this.#currentRepeatDirection === direction
      ) {
        this.#continuousDateChange();
      }
    }, INITIAL_REPEAT_DELAY);
  }

  stopDateRepeat() {
    if (this.#repeatTimer) {
      clearTimeout(this.#repeatTimer);
      this.#repeatTimer = undefined;
    }
    this.#isRepeatingChange = false;
    this.#currentRepeatDirection = null;
  }

  #continuousDateChange() {
    if (!this.#isRepeatingChange || !this.#currentRepeatDirection) {
      this.stopDateRepeat();
      return;
    }
    if (this.#currentRepeatDirection === "next") {
      this.selectNextDate();
    } else if (this.#currentRepeatDirection === "prev") {
      this.selectPreviousDate();
    }
    this.#repeatTimer = setTimeout(
      () => this.#continuousDateChange,
      REPEAT_INTERVAL
    );
  }

  constructor(
    eventModel: EventModel,
    mapModel: MapModel,
    regionModel: RegionModel
  ) {
    this.eventModel = eventModel;
    this.mapModel = mapModel;
    this.regionModel = regionModel;

    // Update all the dates
    $effect(() => {
      if (!this.eventModel.isLoading) {
        this.allDatesWithCounts = this.eventModel.getDatesWithCounts({
          markerType: this.markerType,
          turnoutCountSource: this.turnoutCountSource,
        });
      }
    });

    // Update filtered date counts and events
    $effect(() => {
      const filter = this.filter;
      const filterWithoutDate = omit(filter, "date");
      const isLoaded = this.eventModel.isLoaded;
      const update = async () => {
        if (isLoaded) {
          const datesWithEventCounts =
            this.eventModel.getDatesWithCounts(filterWithoutDate);
          this.filteredDatesWithEventCounts = datesWithEventCounts;

          this.allFilteredEvents = await this.eventModel.getMarkers(
            this.filter
          );
        } else {
          this.allFilteredEvents = [];
        }
      };
      update();
    });

    $effect(() => {
      const currentFilter = this.filter;
      const update = async () => {
        if (this.eventModel) {
          this.dateFilteredMarkers =
            await this.eventModel.getMarkers(currentFilter);
          this.totalCount = await this.eventModel.getCount(currentFilter);
        } else {
          this.dateFilteredMarkers = [];
          this.totalCount = 0;
        }
      };
      update();
    });

    $effect(() => {
      const date = this.date;
      const allDatesWithEventCounts = this.allDatesWithCounts;
      if (!this.isValidDate(date)) {
        // If no longer a valid date, set dateIndex to
        // be the date at or after the current system date
        // (or - 1 if no match) any time the eventModel's items change
        let newIndex = allDatesWithEventCounts.findIndex((dc) =>
          isFutureDate(dc.date, true)
        );
        // Handle case where there are no dates beyond today.
        if (newIndex < 0) {
          newIndex = allDatesWithEventCounts.length - 1;
        }
        this.setDateIndex(newIndex);
      }
    });

    $effect(() => {
      const namedRegion = this.namedRegion;
      void this.regionModel.allPolygonsLoaded; // Polygon updates when the full db is loaded.
      const update = async () => {
        this.namedRegionPolygon = namedRegion
          ? await this.regionModel.getPolygonForNamedRegion(namedRegion)
          : undefined;
      };
      update();
    });
  }
}
