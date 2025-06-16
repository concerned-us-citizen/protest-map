import type { Nullable } from "$lib/types";
import type maplibregl from "maplibre-gl";

export interface VisibleMapRegion {
  bounds: maplibregl.LngLatBounds;
  options?: maplibregl.FitBoundsOptions;
}

function lngLatsMatch(
  a: maplibregl.LngLat,
  b: maplibregl.LngLat,
  epsilon = 1e-5
): boolean {
  return Math.abs(a.lng - b.lng) < epsilon && Math.abs(a.lat - b.lat) < epsilon;
}

export class MapState {
  // Reference to the MapLibre map instance
  #mapInstance: Nullable<maplibregl.Map> = $state(null);

  // Initial and current state
  initialCenter: Nullable<maplibregl.LngLat> = $state(null);
  initialZoom: Nullable<number> = $state(null);
  currentMapCenter: Nullable<maplibregl.LngLat> = $state(null);
  currentMapZoom: Nullable<number> = $state(null);

  // Region to zoom to
  visibleMapRegion: Nullable<VisibleMapRegion> = $state(null);

  setMapInstance(map: Nullable<maplibregl.Map>) {
    this.#mapInstance = map;
  }

  setInitialMapView(center: maplibregl.LngLat, zoom: number) {
    this.initialCenter = center;
    this.initialZoom = zoom;
    this.currentMapCenter = center;
    this.currentMapZoom = zoom;
  }

  updateCurrentMapView(center: maplibregl.LngLat, zoom: number) {
    this.currentMapCenter = center;
    this.currentMapZoom = zoom;
  }

  readonly isAtInitialMapView = $derived.by(() => {
    const initialCenter = this.initialCenter;
    const initialZoom = this.initialZoom;
    const currentMapCenter = this.currentMapCenter;
    const currentMapZoom = this.currentMapZoom;
    if (
      initialCenter == null ||
      initialZoom == null ||
      currentMapCenter == null ||
      currentMapZoom == null
    )
      return false;

    const centerMatches = lngLatsMatch(currentMapCenter, initialCenter);
    const zoomMatches = Math.abs(currentMapZoom - initialZoom) < 0.01;
    return centerMatches && zoomMatches;
  });

  zoomIn() {
    this.#mapInstance?.zoomIn();
  }

  zoomOut() {
    this.#mapInstance?.zoomOut();
  }

  resetMapZoom() {
    if (this.#mapInstance && this.initialCenter && this.initialZoom !== null) {
      this.#mapInstance.easeTo({
        center: this.initialCenter,
        zoom: this.initialZoom,
      });
    }
  }
}
