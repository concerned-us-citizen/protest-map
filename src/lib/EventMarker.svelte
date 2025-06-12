<script module lang="ts">
  import type { EventMarkerInfoWithId } from './types';

  export interface ProtestEventMarkerOptions extends L.MarkerOptions {
    eventMarkerInfo: EventMarkerInfoWithId;
    eventModel: EventModel;
  }

  const iconSize = 30;

  export const htmlForClusterMarker = (cluster: MarkerCluster) => {
    const count = cluster.getChildCount();
    const childMarkers = cluster.getAllChildMarkers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counts = childMarkers.reduce((acc, marker: Marker<any>) => {
      const options = marker.options as ProtestEventMarkerOptions;
      const pct = options.eventMarkerInfo.pctDemLead;
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
      ? markerColor.unavailable
      : (counts.red > 0 && counts.blue > 0)
        ? markerColor.purple
        : (counts.red > counts.blue)
          ? markerColor.red
          : markerColor.blue;
    return `<div class='location-cluster-marker'>${htmlForMarker(color, 1)}<div class='location-cluster-count'>${count}</div>`;
  }

  const htmlForMarker = (color: string, opacity: number) => {
    return `<div style="color: ${color}; --background-opacity: ${opacity}; width: ${iconSize}px; height: ${iconSize}px;">${circledMarkerSvg}</div>`;
  }

  const htmlForMarkerWithMarginPercentage = (percentage: Nullable<number>) => {

    let color = percentage === null || isNaN(Number(percentage)) 
      ? markerColor.unavailable
      : (percentage > 0)
        ? markerColor.blue
        : markerColor.red;

    return htmlForMarker(color, 1);
  }
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { circledMarkerSvg } from '$lib/icons'; 
  import type { Marker, DivIcon, Map, MarkerClusterGroup, MarkerCluster } from 'leaflet';
  import type { Nullable } from './types';
  import { browser } from '$app/environment';
  import { markerColor } from './colors';
  import type { EventModel } from './store/EventModel.svelte';
  
  interface EventMarkerProps {
      L: typeof import('leaflet');
      map: Map;
      eventMarkerInfo: EventMarkerInfoWithId;
      eventModel: EventModel;
      markerClusterGroup: MarkerClusterGroup;
  }
  const { L, map, eventMarkerInfo, eventModel, markerClusterGroup }: EventMarkerProps = $props();

  let markerInstance: Nullable<Marker> = null;
  
  onMount(() => {
    
    if (!browser || !L || !map || !markerClusterGroup) {
      return;
    }
    
    const markerHtml = htmlForMarkerWithMarginPercentage(eventMarkerInfo.pctDemLead);

    const icon: DivIcon = L.divIcon({
      html: markerHtml,
      className: 'svg-marker',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize],
      popupAnchor: [0, -iconSize]
    });

    markerInstance = L.marker(
      [eventMarkerInfo.lat, eventMarkerInfo.lon], 
      { 
        eventMarkerInfo, 
        eventModel,
        icon 
      } as ProtestEventMarkerOptions
    );

    try {
        if (!markerClusterGroup.hasLayer(markerInstance)) { // Prevent adding duplicate if somehow already there
            markerInstance.addTo(markerClusterGroup);
        } else {
            console.warn(`[EventMarker onMount] Marker for event ${eventMarkerInfo.eventId} already exists in cluster group on mount. Skipping add.`);
        }
    } catch (e) {
        console.error(`[EventMarker onMount] ERROR adding marker ${eventMarkerInfo.eventId} to cluster group:`, e);
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