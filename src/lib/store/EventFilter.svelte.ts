import { EventStore } from "./EventStore.svelte";
import type { Nullable, SetTimeoutId } from "$lib/types";
import { formatDate } from "$lib/util/date";

const INITIAL_REPEAT_DELAY = 400; // ms
const REPEAT_INTERVAL = 80; // ms

export class EventFilter {
  readonly eventsStore: EventStore;

  currentDateIndex = $state(-1);

  readonly currentDate = $derived.by(() => {
    const dates = this.eventsStore.allDatesWithEventCounts;
    return dates[this.currentDateIndex]?.date ?? null;
  });

  setCurrentDate(date: Nullable<Date>) {
    if (date === null) {
      this.currentDateIndex = -1;
    } else {
      const index = this.eventsStore.allDatesWithEventCounts.findIndex(
        (d) => d.date.getTime() === date.getTime()
      );
      if (index !== -1) {
        this.currentDateIndex = index;
      } else {
        console.warn(
          "Setting currentDate to value not found in eventsStore.allDatesWithEventCounts:",
          date
        );
        this.currentDateIndex = -1;
      }
    }
  }

  #selectRelativeDateWrapping(increment: number) {
    const dates = this.eventsStore.allDatesWithEventCounts;
    const count = dates.length;
    if (count === 0) return;
    const curIndex = Math.max(0, this.currentDateIndex);

    this.currentDateIndex = (curIndex + increment + count) % count;
  }

  selectNextDate() {
    this.#selectRelativeDateWrapping(1);
  }

  selectPreviousDate() {
    this.#selectRelativeDateWrapping(-1);
  }

  readonly formattedCurrentDate = $derived(formatDate(this.currentDate));

  readonly currentDateEvents = $derived.by(() =>
    this.currentDate && this.eventsStore
      ? (this.eventsStore.events.get(this.currentDate) ?? [])
      : []
  );

  readonly currentDateEventNamesWithLocationCounts = $derived.by(() => {
    const eventCountsMap = this.currentDateEvents.reduce(
      (acc, event) => {
        acc[event.name] = (acc[event.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(eventCountsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  readonly currentDateHasEventNames = $derived(
    this.currentDateEventNamesWithLocationCounts.length > 0
  );

  readonly selectedEventNames = $state<string[]>([]);

  toggleSelectedEventName(eventName: string) {
    const index = this.selectedEventNames.indexOf(eventName);

    if (index !== -1) {
      this.selectedEventNames.splice(index, 1);
    } else {
      this.selectedEventNames.push(eventName);
    }
  }

  readonly filteredEvents = $derived(
    this.currentDateEvents.filter(
      (evt) =>
        this.selectedEventNames.length == 0 ||
        this.selectedEventNames.includes(evt.name)
    )
  );

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

  constructor(eventsStore: EventStore) {
    this.eventsStore = eventsStore;
    $effect(() => {
      this.currentDateIndex =
        eventsStore.allDatesWithEventCounts.length === 0 ? -1 : 0;
    });
  }
}
