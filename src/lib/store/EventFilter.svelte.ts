import { EventStore } from "./EventStore.svelte";
import type { Nullable, ProtestEvent, SetTimeoutId } from "$lib/types";
import { formatDate } from "$lib/util/dates";

const INITIAL_REPEAT_DELAY = 400; // ms
const REPEAT_INTERVAL = 80; // ms

export class EventFilter {
  readonly eventsStore: EventStore;

  currentDateIndex = $state(-1);

  #currentDate = $derived(() => {
    const dates = this.eventsStore.allDatesWithEventCounts;
    return dates[this.currentDateIndex].date ?? null;
  });
  get currentDate(): Nullable<Date> {
    return this.#currentDate();
  }
  set currentDate(date: Nullable<Date>) {
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

  #formattedCurrentDate = $derived(() => formatDate(this.currentDate));
  get formattedCurrentDate(): string {
    return this.#formattedCurrentDate();
  }

  #currentDateEvents = $derived(() =>
    this.currentDate
      ? (this.eventsStore.events.get(this.currentDate) ?? [])
      : []
  );
  get currentDateEvents(): ProtestEvent[] {
    return this.#currentDateEvents();
  }

  #currentDateEventNamesWithLocationCounts = $derived(() => {
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
  get currentDateEventNamesWithLocationCounts(): {
    name: string;
    count: number;
  }[] {
    return this.#currentDateEventNamesWithLocationCounts();
  }

  #currentDateHasEventNames = $derived(
    () => this.currentDateEventNamesWithLocationCounts.length > 0
  );
  get currentDateHasEventNames(): boolean {
    return this.#currentDateHasEventNames();
  }

  #selectedEventNames = $state<string[]>([]);
  get selectedEventNames(): string[] {
    return this.#selectedEventNames;
  }

  toggleSelectedEventName(eventName: string) {
    const selected = this.#selectedEventNames;
    const index = selected.indexOf(eventName);

    if (index !== -1) {
      selected.splice(index, 1);
    } else {
      selected.push(eventName);
    }
  }

  #filteredEvents = $derived(() => {
    return this.currentDateEvents.filter(
      (evt) =>
        this.selectedEventNames.length == 0 ||
        this.selectedEventNames.includes(evt.name)
    );
  });
  get filteredEvents(): ProtestEvent[] {
    return this.#filteredEvents();
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
    this.#repeatTimer = setTimeout(this.#continuousDateChange, REPEAT_INTERVAL);
  }

  constructor(eventsStore: EventStore) {
    this.eventsStore = eventsStore;
  }
}
