import type { Nullable } from "$lib/types";
import { latLngsMatch } from "$lib/util/map";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";

export class MapState {
  // Reference to the Leaflet map instance
  #mapInstance: Nullable<LeafletMap> = $state(null);

  // Map state
  initialCenter: Nullable<LatLngExpression> = $state(null);
  initialZoom: Nullable<number> = $state(null);
  currentMapCenter: Nullable<LatLngExpression> = $state(null);
  currentMapZoom: Nullable<number> = $state(null);

  // Method to set the Leaflet map instance
  setMapInstance(map: Nullable<LeafletMap>) {
    this.#mapInstance = map;
  }

  // Method to set initial map view
  setInitialMapView(center: LatLngExpression, zoom: number) {
    this.initialCenter = center;
    this.initialZoom = zoom;
    this.currentMapCenter = center;
    this.currentMapZoom = zoom;
  }

  // Method to update current map view
  updateCurrentMapView(center: LatLngExpression, zoom: number) {
    this.currentMapCenter = center;
    this.currentMapZoom = zoom;
  }

  // Derived state to check if map is at initial view
  readonly isAtInitialMapView = $derived.by(() => {
    if (
      this.initialCenter == null ||
      this.initialZoom == null ||
      this.currentMapCenter == null ||
      this.currentMapZoom == null
    )
      return false;

    const centerMatches = latLngsMatch(
      this.currentMapCenter,
      this.initialCenter
    );
    const zoomMatches = Math.abs(this.currentMapZoom - this.initialZoom) < 0.01;
    return centerMatches && zoomMatches;
  });

  // Map control methods
  zoomIn() {
    this.#mapInstance?.zoomIn();
  }

  zoomOut() {
    this.#mapInstance?.zoomOut();
  }

  resetMapZoom() {
    if (this.#mapInstance && this.initialCenter && this.initialZoom !== null) {
      this.#mapInstance.setView(this.initialCenter, this.initialZoom);
    }
  }
}
