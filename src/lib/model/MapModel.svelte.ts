import maplibregl from "maplibre-gl";
import type { Bounds } from "./RegionModel.svelte";
import {
  boundsEqual,
  boundsFromLngLatBounds,
  boundsToLngLatBoundsLike,
} from "$lib/util/bounds";
import { deviceInfo } from "./DeviceInfo.svelte";

interface FitBoundsOptions {
  animate?: boolean;
  addPadding?: boolean;
}

export class MapModel {
  #mapInstance: maplibregl.Map | undefined;
  #pendingBounds: Bounds | undefined;
  #initialBounds: Bounds | undefined;
  #currentBounds: Bounds | undefined;

  #initialViewPort = { width: 0, height: 0 };
  #boundsStack = $state<Bounds[]>([]);
  #isAtInitialBounds = $state(false);

  constructor() {
    this.navigateToUS(true);
  }

  navigateToUS(initializing = false) {
    this.navigateTo(
      {
        xmin: -170,
        ymin: 15,
        xmax: -66,
        ymax: 70,
      },
      initializing
    );
  }

  get visibleBounds() {
    return this.#currentBounds;
  }

  readonly canPopBounds = $derived.by(() => {
    const stackHasItems = this.#boundsStack.length > 0;
    const isAtInitialBounds = this.#isAtInitialBounds;
    // Have to ignore it when viewport changes - don't have original bounds
    // in context of new viewport.
    const viewportChanged =
      this.#initialViewPort.width !== deviceInfo.width ||
      this.#initialViewPort.height !== deviceInfo.height;

    return stackHasItems || (!isAtInitialBounds && !viewportChanged);
  });

  setMapInstance(map: maplibregl.Map) {
    this.#mapInstance = map;

    this.#initialViewPort = {
      width: deviceInfo.width,
      height: deviceInfo.height,
    };

    map.on("moveend", () => {
      const newBounds = boundsFromLngLatBounds(map.getBounds());
      this.#initialBounds ??= newBounds;
      this.#currentBounds = newBounds;

      this.#isAtInitialBounds = boundsEqual(
        this.#currentBounds,
        this.#initialBounds
      );
    });

    if (this.#pendingBounds) {
      this.fitBounds(this.#pendingBounds, { animate: false });
      this.#pendingBounds = undefined;
    }
  }

  private fitBounds(bounds: Bounds, options?: FitBoundsOptions) {
    const animate = options?.animate ?? true;
    const addPadding = options?.addPadding ?? true;

    const container = this.mapInstance.getContainer();
    const paddingPercent = 0.1; // 10% of the smaller dimension
    const hPadding = paddingPercent * container.clientWidth;

    const padding = {
      top: 80,
      bottom: 120,
      left: hPadding,
      right: hPadding,
    };

    this.mapInstance.fitBounds(boundsToLngLatBoundsLike(bounds), {
      padding: addPadding ? padding : 0,
      duration: animate ? 500 : 0,
    });
  }

  private get mapInstance(): maplibregl.Map {
    if (!this.#mapInstance) {
      throw new Error("Map instance not initialized");
    }
    return this.#mapInstance;
  }

  navigateTo(bounds: Bounds, initializing = false) {
    if (!this.#mapInstance) {
      this.#pendingBounds = bounds;
      return;
    }

    const stack = this.#boundsStack;
    if (!this.#currentBounds) {
      throw new Error("No current bounds set");
    }
    this.#boundsStack = [...stack, this.#currentBounds];

    this.fitBounds(bounds, { animate: !initializing });
  }

  popBounds(): void {
    const stack = this.#boundsStack;

    if (stack.length > 0) {
      const poppedBounds = stack[stack.length - 1];
      this.#boundsStack = stack.slice(0, -1);

      if (poppedBounds) {
        this.fitBounds(poppedBounds, { addPadding: false });
      }
    } else if (this.#initialBounds) {
      this.fitBounds(this.#initialBounds, {
        addPadding: false,
      });
    }
  }

  zoomIn() {
    this.#mapInstance?.zoomIn();
  }

  zoomOut() {
    this.#mapInstance?.zoomOut();
  }
}
