import maplibregl from "maplibre-gl";
import type { Bounds } from "./RegionModel";
import {
  boundsEqual,
  boundsFromLngLatBounds,
  boundsToLngLatBoundsLike,
} from "$lib/util/bounds";

export class MapModel {
  #mapInstance: maplibregl.Map | undefined;
  #pendingBounds: Bounds | undefined;
  #initialBounds: Bounds | undefined;
  #currentBounds: Bounds | undefined;
  #boundsStack = $state<Bounds[]>([]);

  constructor() {
    this.navigateTo(
      {
        xmin: -170,
        ymin: 15,
        xmax: -66,
        ymax: 70,
      },
      true
    );
  }

  get visibleBounds() {
    return this.#currentBounds;
  }

  readonly canPopBounds = $derived.by(() => {
    const current = this.#currentBounds;
    const initial = this.#initialBounds;
    const stackHasItems = this.#boundsStack.length > 0;

    if (!current || !initial) return false;

    const moved = !boundsEqual(current, initial);
    return stackHasItems || moved;
  });

  setMapInstance(map: maplibregl.Map) {
    this.#mapInstance = map;

    map.on("moveend", () => {
      this.#currentBounds = boundsFromLngLatBounds(map.getBounds());
    });

    if (this.#pendingBounds) {
      this.fitBounds(this.#pendingBounds);
      this.#pendingBounds = undefined;
    }
  }

  private fitBounds(bounds: Bounds, animate = true) {
    this.mapInstance.fitBounds(boundsToLngLatBoundsLike(bounds), {
      padding: 20,
      duration: animate ? 300 : 0,
    });
  }

  private get mapInstance(): maplibregl.Map {
    if (!this.#mapInstance) {
      throw new Error("Map instance not initialized");
    }
    return this.#mapInstance;
  }

  navigateTo(bounds: Bounds, initializing = false) {
    this.#initialBounds ??= bounds;

    if (!this.#mapInstance) {
      this.#pendingBounds = bounds;
      return;
    }

    const stack = this.#boundsStack;
    this.#boundsStack = [...stack, bounds];

    this.fitBounds(bounds, !initializing);
  }

  popBounds(): void {
    const stack = this.#boundsStack;

    if (stack.length > 0) {
      const poppedBounds = stack[stack.length - 1];
      this.#boundsStack = stack.slice(0, -1);

      if (poppedBounds) {
        this.fitBounds(poppedBounds, true);
      }
    } else if (this.#initialBounds) {
      this.fitBounds(this.#initialBounds);
    }
  }

  zoomIn() {
    this.#mapInstance?.zoomIn();
  }

  zoomOut() {
    this.#mapInstance?.zoomOut();
  }
}
