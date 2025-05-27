<script module lang="ts">
  import type { ProtestEventAndLocation } from './types';

  export interface ProtestEventMarkerOptions extends L.MarkerOptions {
    protestEventAndLocation: ProtestEventAndLocation;
  }

  const iconSize = 30;
  const red = 'rgb(190, 40, 40)';
  const blue = 'rgb(23, 78, 154)';
  const purple = 'rgb(110, 48, 155)';
  const unavailable = 'rgb(255, 140, 0)'; // currently orange;

  export const htmlForClusterMarker = (cluster: MarkerCluster) => {
    const count = cluster.getChildCount();
    const childMarkers = cluster.getAllChildMarkers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counts = childMarkers.reduce((acc, marker: Marker<any>) => {
      const options = marker.options as ProtestEventMarkerOptions;
      const pct = options.protestEventAndLocation.location.pct_dem_lead;
      if (!pct || pct === 0) {
        acc.unavailable++; 
      } else if (pct < 0) { 
        acc.red++ 
      } else if (pct > 0) {
        acc.blue++;
      }
      return acc;
    }, {red: 0, blue: 0, unavailable: 0});
    const color = (counts.red === 0 && counts.blue === 0)
      ? unavailable
      : (counts.red > 0 && counts.blue > 0)
        ? purple
        : (counts.red > counts.blue)
          ? red
          : blue;
    return `<div class='location-cluster-marker'>${htmlForMarker(color, 1)}<div class='location-cluster-count'>${count}</div>`;
  }

  const htmlForMarker = (color: string, opacity: number) => {
    return `<div style="color: ${color}; --background-opacity: ${opacity}; width: ${iconSize}px; height: ${iconSize}px;">${circledMarkerSvg}</div>`;
  }

  const htmlForMarkerWithMarginPercentage = (pct?: number | string) => {

    const percentage = typeof pct === 'string' ? parseFloat(pct) : pct ?? 0;
    let color = pct === undefined || pct === null || isNaN(Number(pct)) 
      ? unavailable
      : (percentage > 0)
        ? blue
        : red;

    return htmlForMarker(color, 1);
  }
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { circledMarkerSvg } from '$lib/icons'; 
  import type { Marker, DivIcon, Map, MarkerClusterGroup, MarkerCluster } from 'leaflet';
  import type { Nullable } from './types';
  import { browser } from '$app/environment';
  
  interface EventMarkerProps {
      L: typeof import('leaflet');
      map: Map;
      protestEventAndLocation: ProtestEventAndLocation;
      markerClusterGroup: MarkerClusterGroup;
  }
  const { L, map, protestEventAndLocation, markerClusterGroup }: EventMarkerProps = $props();

  let markerInstance: Nullable<Marker> = null;
  
  onMount(() => {
    const protestEvent = protestEventAndLocation.event;
    const loc = protestEventAndLocation.location;
    
    if (!browser || !L || !map || !markerClusterGroup || loc?.lat == null || loc?.lon == null) {
      return;
    }
    
    const markerHtml = htmlForMarkerWithMarginPercentage(loc.pct_dem_lead);

    const icon: DivIcon = L.divIcon({
      html: markerHtml,
      className: 'svg-marker',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize],
      popupAnchor: [0, -iconSize]
    });

    markerInstance = L.marker(
      [loc.lat, loc.lon], 
      { 
        protestEventAndLocation: protestEventAndLocation, 
        icon 
      } as ProtestEventMarkerOptions
    );

    try {
        if (!markerClusterGroup.hasLayer(markerInstance)) { // Prevent adding duplicate if somehow already there
            markerInstance.addTo(markerClusterGroup);
        } else {
            console.warn(`[EventMarker onMount] Marker for event ${protestEvent.id} already exists in cluster group on mount. Skipping add.`);
        }
    } catch (e) {
        console.error(`[EventMarker onMount] ERROR adding marker ${protestEvent.id} to cluster group:`, e);
    }
  });

  onDestroy(() => {
    if (!browser) return;

    if (markerInstance && markerClusterGroup?.hasLayer(markerInstance)) {
        markerClusterGroup.removeLayer(markerInstance);
    }
    markerInstance = null;
  });
</script>

<style>

:global(.leaflet-div-icon) {
  background: none !important;
  border: none !important;
}

:global(.location-cluster-marker) {
  position: relative;
  display: inline-block;
}

:global(.location-cluster-marker) > :global(.location-cluster-count) {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 0.7em;
  transform: translate(30%, 30%);
  background: white;
  color: #222;
  border-radius: 50%;
  min-width: 1.8em;
  min-height: 1.8em;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  border: 2px solid #fff;
  z-index: 1;
}
</style>