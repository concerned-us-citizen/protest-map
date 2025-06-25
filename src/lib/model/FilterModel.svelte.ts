import { EventModel } from "./EventModel.svelte";
import {
  EmptyVoterLeanCounts,
  type EventMarkerInfoWithId,
  type SetTimeoutId,
  type VoterLean,
} from "$lib/types";
import { formatDate, isFutureDate } from "$lib/util/date";
import { joinWithAnd, mdBold, pluralize } from "$lib/util/string";
import { titleCase } from "title-case";
import type { MapModel } from "./MapModel.svelte";
import { prettifyNamedRegion, type NamedRegion } from "./RegionModel";

const INITIAL_REPEAT_DELAY = 400; // ms
const REPEAT_INTERVAL = 80; // ms

export interface EventFilterOptions {
  date?: Date;
  eventNames?: string[]; // empty or missing means match all events
  namedRegion?: NamedRegion; // If not null, only match events within the region (only states rn)
  voterLeans?: VoterLean[]; // empty or missing means match all voter leans
}

interface DateAndEventCount {
  date: Date;
  eventCount: number;
}

export class FilterModel {
  readonly eventModel: EventModel;
  readonly mapModel: MapModel;

  filter = $derived.by(() => ({
    eventNames: this.selectedEventNames,
    namedRegion: this.namedRegion,
    voterLeans: this.selectedVoterLeans,
  }));

  currentDateFilter = $derived.by(() => {
    return { ...this.filter, date: this.currentDate };
  });

  allFilteredEvents = $state<EventMarkerInfoWithId[]>([]);
  currentDateFilteredEvents = $state<EventMarkerInfoWithId[]>([]);

  allDatesWithEventCounts = $state<DateAndEventCount[]>([]);
  filteredDatesWithEventCounts = $state<DateAndEventCount[]>([]);

  namedRegion = $state<NamedRegion | undefined>();

  selectedVoterLeans = $state<VoterLean[]>([]);

  // We don't derive one from the other here, because
  // we don't want to establish a dependency on filteredDatesWithEventCounts,
  // since it may change with filters, causing the two to misalign.
  // Instead, we explicitly set both of them when setting either one.

  // Worth noting - currentDate Index is relative to
  // allDatesWithEventCounts, not filteredDatesWithEventCounts.
  #currentDateIndex: number = $state(-1);
  get currentDateIndex() {
    return this.#currentDateIndex;
  }
  #currentDate = $state<Date | undefined>();
  get currentDate() {
    return this.#currentDate;
  }

  setCurrentDateIndex(index: number) {
    this.#currentDateIndex = index;
    if (index < 0 || index >= this.allDatesWithEventCounts.length) {
      this.#currentDate = undefined;
    } else {
      this.#currentDate = this.allDatesWithEventCounts[index].date;
    }
  }

  setCurrentDate(date: Date | undefined) {
    this.#currentDate = date;
    if (!date) {
      this.#currentDateIndex = -1;
    } else {
      const index = this.allDatesWithEventCounts.findIndex(
        (d) => d.date.getTime() === date.getTime()
      );
      if (index !== -1) {
        this.#currentDateIndex = index;
      } else {
        console.warn(
          "Setting currentDate to value not found in eventModel.allDatesWithEventCounts:",
          date
        );
        this.#currentDateIndex = -1;
      }
    }
  }

  largestDateEventCount = $derived.by(() => {
    const dates = this.allDatesWithEventCounts;
    const counts = dates.map((d) => d.eventCount);
    return counts.length > 0 ? Math.max(...dates.map((d) => d.eventCount)) : 0;
  });

  readonly hasDates = $derived(this.allDatesWithEventCounts.length > 0);

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
    const dates = this.allDatesWithEventCounts;
    if (dates.length === 0) return null;
    return { start: dates[0].date, end: dates[dates.length - 1].date };
  });

  #selectRelativeDateWrapping(increment: number) {
    const filteredDates = this.filteredDatesWithEventCounts;
    const allDates = this.allDatesWithEventCounts;
    const currentDate = this.currentDate;

    if (filteredDates.length === 0 || !currentDate) return;

    // Find current date’s index in filteredDates
    let currentFilteredIndex = filteredDates.findIndex(
      (d) => d.date.getTime() === currentDate.getTime()
    );

    if (currentFilteredIndex === -1) {
      currentFilteredIndex = 0;
    }

    // Compute wrapped index
    const len = filteredDates.length;
    const targetIndex = (currentFilteredIndex + increment + len) % len;

    const targetDate = filteredDates[targetIndex]?.date;
    if (!targetDate) return undefined;

    // Find target date's index in allDates
    const newIndex = allDates.findIndex(
      (d) => d.date.getTime() === targetDate.getTime()
    );

    this.setCurrentDateIndex(newIndex);
  }

  selectNextDate() {
    this.#selectRelativeDateWrapping(1);
  }

  selectPreviousDate() {
    this.#selectRelativeDateWrapping(-1);
  }

  readonly formattedCurrentDate = $derived(formatDate(this.currentDate));

  readonly filteredEventNamesWithLocationCounts = $derived.by(() => {
    const date = this.currentDate;
    const namedRegion = this.namedRegion;
    if (!date) return [];

    return this.eventModel
      ? this.eventModel.getEventNamesAndCountsForFilter({
          date,
          namedRegion,
        })
      : [];
  });

  readonly currentDateHasEventNames = $derived(
    this.filteredEventNamesWithLocationCounts.length > 0
  );

  readonly currentDateHasMultipleEventNames = $derived(
    this.filteredEventNamesWithLocationCounts.length > 1
  );

  readonly filteredVoterLeanCounts = $derived.by(() => {
    const date = this.currentDate;
    const namedRegion = this.namedRegion;
    if (!date) return EmptyVoterLeanCounts;

    return this.eventModel
      ? this.eventModel.getVoterLeanCounts({
          date,
          namedRegion,
        })
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

  constructor(eventModel: EventModel, mapModel: MapModel) {
    this.eventModel = eventModel;
    this.mapModel = mapModel;

    // Update all the dates
    $effect(() => {
      if (!this.eventModel.isLoading) {
        this.allDatesWithEventCounts = this.eventModel.getDatesWithEventCounts(
          {}
        );
      }
    });

    // Update filtered date counts and events
    $effect(() => {
      const filter = this.filter;
      const isLoading = this.eventModel.isLoading;
      const update = async () => {
        if (!isLoading) {
          this.filteredDatesWithEventCounts =
            this.eventModel.getDatesWithEventCounts(filter);

          this.allFilteredEvents = await this.eventModel.getMarkerInfos(
            this.filter
          );
        } else {
          this.allFilteredEvents = [];
        }
      };
      update();
    });

    $effect(() => {
      const currentDateFilter = this.currentDateFilter;
      const update = async () => {
        if (this.eventModel) {
          this.currentDateFilteredEvents =
            await this.eventModel.getMarkerInfos(currentDateFilter);
        } else {
          this.currentDateFilteredEvents = [];
        }
      };
      update();
    });

    $effect(() => {
      const currentDate = this.currentDate;
      const allDatesWithEventCounts = this.allDatesWithEventCounts;
      if (!this.isValidDate(currentDate)) {
        // If no longer a valid date, set currentDateIndex to
        // be the date at or after the current system date
        // (or - 1 if no match) any time the eventModel's items change
        console.log(
          `🔁 Running setCurrentDateIndex effect ${this.#currentDateIndex}`
        );
        let newIndex = allDatesWithEventCounts.findIndex((dc) =>
          isFutureDate(dc.date, true)
        );
        // Handle case where there are no dates beyond today.
        if (newIndex < 0) {
          newIndex = allDatesWithEventCounts.length - 1;
        }
        this.setCurrentDateIndex(newIndex);
      }
    });
  }
}
