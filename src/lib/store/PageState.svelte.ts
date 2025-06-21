import { setContext, getContext } from "svelte";
import { EventModel } from "./EventModel.svelte";
import { FilteredEventModel } from "./FilteredEventModel.svelte";
import { deviceInfo } from "$lib/store/DeviceInfo.svelte";
import type { SetTimeoutId } from "$lib/types";
import { RegionModel, type NamedRegion } from "./RegionModel";
import { isFutureDate } from "$lib/util/date";
import { RegionLabeler } from "./RegionLabeler.svelte";
import { MapModel } from "./MapModel.svelte";

const EVENTINFO_VISIBILITY_DURATION = 1000; // 1s

// Timing for advancing to next date on autoplay
const QUICK_NAV_TIME = 500; // ms, for < 20 events
const STANDARD_NAV_TIME = 1000; // ms, for >= 20 events
const ZERO_EVENT_NAV_TIME = 50; // ms, for dates with no events

export class PageState {
  readonly eventModel: EventModel;
  readonly filter: FilteredEventModel;
  readonly mapModel: MapModel;
  readonly regionModel: RegionModel;
  readonly regionLabeler: RegionLabeler;

  filterVisible = $state(false);
  helpVisible = $state(false);
  updateAvailable = $state(false);

  private _eventInfoVisible = $state(false);
  #hideEventInfoTimer: SetTimeoutId = undefined;

  autoplaying = $state(false);
  #autoplayTimer: SetTimeoutId = undefined;

  toggleFilterVisible() {
    this.filterVisible = !this.filterVisible;
    this.helpVisible = false;
  }

  toggleHelpVisible() {
    this.helpVisible = !this.helpVisible;
    this.filterVisible = false;
  }

  toggleAutoplay() {
    this.autoplaying = !this.autoplaying;
    this.scheduleNextDateAdvance();
  }

  async scheduleNextDateAdvance() {
    clearTimeout(this.#autoplayTimer);
    this.#autoplayTimer = undefined;

    if (!this.autoplaying) return;

    const numEvents = this.filter.currentDateEvents.length;
    let lingerTime;

    if (numEvents === 0 && this.eventModel.allDatesWithEventCounts.length > 1) {
      lingerTime = ZERO_EVENT_NAV_TIME;
    } else if (numEvents < 20) {
      lingerTime = QUICK_NAV_TIME;
    } else {
      lingerTime = STANDARD_NAV_TIME;
    }

    this.#autoplayTimer = setTimeout(() => {
      if (this.autoplaying) {
        this.filter.currentDateIndex =
          (this.filter.currentDateIndex + 1) %
          this.eventModel.allDatesWithEventCounts.length;
        // Schedule the next date advance
        this.scheduleNextDateAdvance();
      }
    }, lingerTime);
  }

  readonly eventInfoVisible = $derived.by(() => {
    const isTall = deviceInfo.isTall;
    const eventInfoVisible = this._eventInfoVisible;
    return isTall || eventInfoVisible;
  });

  showEventInfo() {
    if (!deviceInfo.isTall) {
      this._eventInfoVisible = true;
      this.#debouncedHideEventInfo();
    }
  }

  async updateFromUrlParams(params: URLSearchParams) {
    if (this.eventModel.hasDates) {
      // Only initialize date if eventModel has loaded dates
      const specifiedDateStr = params.get("date");
      const specifiedDate = specifiedDateStr
        ? new Date(specifiedDateStr)
        : undefined;
      if (specifiedDate && this.eventModel.isValidDate(specifiedDate)) {
        this.filter.setCurrentDate(new Date(specifiedDate));
      } else {
        // If not specified, initialize currentDateIndex to be the date at or after the current system date
        // (or - 1 if no match) any time the eventModel's items change
        this.filter.currentDateIndex =
          this.eventModel.allDatesWithEventCounts.findIndex((dc) =>
            isFutureDate(dc.date, true)
          );
      }
    }

    const zoomParams: [
      string,
      (_val: string) => Promise<NamedRegion | undefined>,
    ][] = [
      ["zip", this.regionModel.getNamedRegionForZip],
      ["state", this.regionModel.getNamedRegionForState],
      ["city", this.regionModel.getNamedRegionForCity],
      ["zoomto", this.regionModel.getNamedRegionForName],
    ];
    for (const [key, lookupFn] of zoomParams) {
      const value = params.get(key);
      if (!value) continue;

      const namedRegion = await lookupFn.call(this.regionModel, value);
      if (namedRegion) {
        if (namedRegion.type === "state") {
          this.filter.namedRegion = namedRegion;
        }
        this.mapModel.navigateTo(namedRegion, true);
        break;
      } else {
        console.warn(`Could not find region bounds for ${key} = ${value}`);
      }
    }
  }

  #debouncedHideEventInfo() {
    clearTimeout(this.#hideEventInfoTimer);

    this.#hideEventInfoTimer = setTimeout(() => {
      this._eventInfoVisible = false;
    }, EVENTINFO_VISIBILITY_DURATION);
  }

  cleanup() {
    clearTimeout(this.#hideEventInfoTimer);
    this.#hideEventInfoTimer = undefined;
    clearTimeout(this.#autoplayTimer);
    this.#autoplayTimer = undefined;
  }

  pollForUpdates() {
    setTimeout(
      async () => {
        try {
          this.updateAvailable = await this.eventModel.checkIsUpdateAvailable();
          console.log("Checking for update...");
          if (this.updateAvailable) {
            console.log("Update now available!");
          }
        } catch (err) {
          console.warn("Polling failed", err);
        }

        this.pollForUpdates(); // repeat indefinitely
      },
      1000 * 60 * 60
    );
  }

  private constructor() {
    this.regionModel = RegionModel.getInstance();
    this.eventModel = EventModel.create(this.regionModel); // Create EventModel immediately, it loads db in background
    this.mapModel = new MapModel();
    this.regionLabeler = new RegionLabeler(this.regionModel);
    this.filter = new FilteredEventModel(this.eventModel, this.mapModel);
    this.pollForUpdates();
  }

  static create(): PageState {
    return new PageState();
  }
}

const PAGE_STATE_KEY = Symbol("PAGE_STATE");

export function createPageStateInContext(pageState: PageState) {
  return setContext(PAGE_STATE_KEY, pageState);
}

export function getPageStateFromContext(): PageState {
  const pageState = getContext<PageState>(PAGE_STATE_KEY);
  if (!pageState) {
    throw new Error("Missing Page State");
  }
  return pageState;
}
