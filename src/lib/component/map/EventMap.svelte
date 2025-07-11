<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import maplibregl from "maplibre-gl";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import "maplibre-gl/dist/maplibre-gl.css";
  import type { ClassValue } from "svelte/elements";
  import { MapLayerModel } from "./MapLayerModel";

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();

  let mapDiv: HTMLElement | undefined;
  let map = $state<maplibregl.Map | undefined>();
  let mapLayerModel = $state<MapLayerModel | undefined>();

  let navigationControl: maplibregl.NavigationControl | undefined = $state();
  let zoomControlVisible = $state(false);

  $effect(() => {
    const { markers: dateFilteredMarkers } = pageState.filter;
    if (mapLayerModel) {
      mapLayerModel.closePopup();
      mapLayerModel.updateMarkers(dateFilteredMarkers);
    }
  });

  $effect(() => {
    const namedRegionPolygon = pageState.filter.namedRegionPolygon;
    if (mapLayerModel) {
      mapLayerModel.updateRegionPolygonLayer(namedRegionPolygon);
    }
  });

  $effect(() => {
    const markerType = pageState.filter.markerType;
    if (mapLayerModel) {
      mapLayerModel.closePopup();
      mapLayerModel?.updateLayerVisibility(markerType);
    }
  });

  $effect(() => {
    const isTouchDevice = deviceInfo.isTouchDevice;
    const isWide = deviceInfo.isWide;
    zoomControlVisible = !isTouchDevice && isWide;

    if (!map) return;

    if (!navigationControl && zoomControlVisible) {
      navigationControl = new maplibregl.NavigationControl({
        showZoom: true,
        showCompass: false,
      });
      map.addControl(navigationControl, "bottom-left");
    } else if (navigationControl && !zoomControlVisible) {
      map.removeControl(navigationControl);
      navigationControl = undefined;
    }
  });

  onMount(async () => {
    if (!mapDiv) return;

    const safeMap = new maplibregl.Map({
      container: mapDiv,
      style: "https://tiles.openfreemap.org/styles/bright",
      minZoom: 1,
      maxZoom: 15,
      attributionControl: false,
      renderWorldCopies: true,
    });

    map = safeMap;

    safeMap.on("style.load", () => {
      safeMap.addSprite("markers", "sprites/sprite");

      pageState.mapModel.setMapInstance(safeMap);
      pageState.regionLabeler.setMapInstance(safeMap);

      try {
        mapLayerModel = new MapLayerModel(safeMap, pageState);
        mapLayerModel.initializeMap(pageState.filter.markers ?? []);
      } catch (error) {
        console.error("Error during map initialization:", error);
      }
    });
  });

  onDestroy(() => {
    mapLayerModel?.closePopup();
    map?.remove();
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  bind:this={mapDiv}
  class={className}
  onclick={() => {
    pageState.filterVisible = false;
  }}
></div>
