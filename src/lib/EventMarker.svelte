<script lang="ts">
  import { onMount, onDestroy } from 'svelte'; // Import onMount and onDestroy
  import { markerSvg } from '$lib/icons'; // Ensure this is correctly imported
  import type { Marker, DivIcon, LayerGroup, Map } from 'leaflet';
  import type { Nullable, ProtestEventAndLocation } from './types';
  import { browser } from '$app/environment';

  export interface ProtestEventMarkerOptions extends L.MarkerOptions {
    protestEventAndLocation: ProtestEventAndLocation;
  }

  interface EventMarkerProps {
      L: typeof import('leaflet');
      map: Map;
      protestEventAndLocation: ProtestEventAndLocation;
      isTouchDevice: boolean;
      markerLayerGroup: LayerGroup;
  }
  const { L, map, protestEventAndLocation, markerLayerGroup }: EventMarkerProps = $props();

  let markerInstance: Nullable<Marker> = null;

  const getColor = (pct?: number): string => {
      if (pct === undefined || pct === null) {
        return 'rgb(128, 128, 128)'; // Grey for undefined/null
      }
      const numericPct = typeof pct === 'string' ? parseFloat(pct) : pct;
      if (isNaN(numericPct)) {
          return 'rgb(220, 220, 220)'; // Fallback for invalid numbers
      }
      // Your existing color logic
      if (numericPct >= 0.75) return 'rgb(23, 78, 154)';
      else if (numericPct >= 0.50) return 'rgb(68, 120, 181)';
      else if (numericPct >= 0.25) return 'rgb(135, 170, 210)';
      else if (numericPct > 0) return 'rgb(200, 220, 240)';
      else if (numericPct <= -0.75) return 'rgb(190, 40, 40)';
      else if (numericPct <= -0.50) return 'rgb(220, 100, 100)';
      else if (numericPct <= -0.25) return 'rgb(240, 150, 150)';
      else if (numericPct < 0) return 'rgb(245, 200, 200)';
      else return 'rgb(220, 220, 220)'; // Light Grey for 0 or very small
  };

  onMount(() => {
    const protestEvent = protestEventAndLocation.event;
    const loc = protestEventAndLocation.location;
    
    if (!browser || !L || !map || !markerLayerGroup || loc?.lat == null || loc?.lon == null) {
      return;
    }

    const color = getColor(loc.pct_dem_lead);
    const iconSize = 50;
    const newIconHtml = `<div style="color: ${color}; width: ${iconSize}px; height: ${iconSize}px;">${markerSvg}</div>`;

    const icon: DivIcon = L.divIcon({
      html: newIconHtml,
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
        if (!markerLayerGroup.hasLayer(markerInstance)) { // Prevent adding duplicate if somehow already there
            markerInstance.addTo(markerLayerGroup);
        } else {
            console.warn(`[EventMarker onMount] Marker for event ${protestEvent.id} already exists in layer group on mount. Skipping add.`);
        }
    } catch (e) {
        console.error(`[EventMarker onMount] ERROR adding marker ${protestEvent.id} to layer group:`, e);
    }
  });

  onDestroy(() => {
    if (!browser) return;

    if (markerInstance && markerLayerGroup?.hasLayer(markerInstance)) {
        markerLayerGroup.removeLayer(markerInstance);
    }
    markerInstance = null;
  });
</script>