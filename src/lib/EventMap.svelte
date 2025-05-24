<script lang="ts">
  import { type Map as LeafletMap, type LayerGroup, type Popup } from 'leaflet';
  import { onMount, onDestroy, mount } from 'svelte';
  import EventPopup from '$lib/EventPopup.svelte';
  import { getPageStateFromContext } from '$lib/store/PageState.svelte';
  import EventMarker, { type ProtestEventMarkerOptions } from './EventMarker.svelte';
  import type { Nullable } from './types';
  import { browser } from '$app/environment';
  import { deviceInfo } from '$lib/store/DeviceInfo.svelte';

  type LeafletModule = typeof import('leaflet');

  interface Props {
    className?: string;
  }

  const { className = '' }: Props = $props();

  let mapElement: HTMLElement | undefined;
  let L: LeafletModule | undefined = $state(undefined);
  let map: Nullable<LeafletMap> = $state(null);
  let markerLayerGroup: Nullable<LayerGroup> = $state(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sveltePopupInstance: Nullable<any> = null;
  let sveltePopupContainer: Nullable<HTMLElement> = null;
  let leafletPopupInstance: Popup;
  let zoomControlInstance: Nullable<L.Control.Zoom> = $state(null);

  const pageState = getPageStateFromContext();

  const handleMapKeyDown = (event: KeyboardEvent): void => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
    }
  };

  function handleMarkerClick(e: L.LayerEvent) {
    if (!browser || !L || !map) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marker = e.layer as L.Marker<any>;
    const clickedEventAndLocation = (marker.options as ProtestEventMarkerOptions).protestEventAndLocation;

    closePopup();

    sveltePopupContainer = document.createElement('div');
    sveltePopupInstance = mount(EventPopup, {
      target: sveltePopupContainer,
      props: { protestEventAndLocation: clickedEventAndLocation },
    });

    // The marker's position
    const latlng = marker.getLatLng();

    // We can't use leaflet's popupAnchor, since we're sharing a single popup 
    // for performance (possibly 1000's of markers) and therefore
    // not using bindPopup(). So we do this manually:
    // To shift the popup visually "above" the marker, offset the lat/lng
    // Calculate the offset in pixels, then convert to LatLng
    const offsetPixels = {x: 0, y: -40}; // x, y (y negative is up)

    // Project the marker's LatLng to a pixel point
    const point = map.project(latlng);
    const pointOffset = point.add(L.point(offsetPixels));
    const latlngOffset = map.unproject(pointOffset);

    leafletPopupInstance
      .setLatLng(latlngOffset)
      .setContent(sveltePopupContainer!)
      .openOn(map);
  }

  function closePopup() {
    if (!map) return;
    
    map.closePopup();
    if (sveltePopupInstance) {
      sveltePopupInstance.destroy?.();
      sveltePopupInstance = null;
    }
    if (sveltePopupContainer) {
      sveltePopupContainer.remove();
      sveltePopupContainer = null;
    }
  }

  // Close the popup when visible events change
  $effect(() => {
    if (pageState.filter.filteredEvents) {
      closePopup();
    }
  });

  onMount(async () => {
    if (!browser) return;

    if (!mapElement) {
      console.error("onMount: mapElement is not available. Cannot initialize map.");
      return;
    }

    try {
      // This has to be done dynamically because of SSR.
      const leaflet: LeafletModule = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      L = leaflet;

      const newMap = L.map(mapElement!, { zoomControl: false, keyboard: false, minZoom: 2 });
      map = newMap;

      const continentalUSBounds = L.latLngBounds(
        L.latLng(30, -125),
        L.latLng(47, -66)
      );
      const center = continentalUSBounds.getCenter();
      map.setView(center, deviceInfo.isTouchDevice ? 3 : 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (mapElement) {
        mapElement.addEventListener('keydown', handleMapKeyDown);
      }

      markerLayerGroup = L.featureGroup().addTo(map);

      markerLayerGroup?.on('click', handleMarkerClick);
      leafletPopupInstance = L.popup({
        maxWidth: 300,
        minWidth: 150,
        closeButton: false,
        autoClose: true,
        autoPan: true
      });

    } catch (error) {
      console.error('onMount: Failed to load Leaflet or initialize map:', error);
      // No need to reset flags like processingInitialization, as onMount runs once.
    }
  });

  // Reactively add/remove zoom control based on device info
  $effect(() => {
    if (!map || !L) return;

    const shouldShowZoom = !deviceInfo.isTouchDevice && deviceInfo.isWide;

    if (shouldShowZoom && !zoomControlInstance) {
      // Add zoom control if it should be shown and isn't already
      zoomControlInstance = L.control.zoom({ position: 'topleft' }).addTo(map);
    } else if (!shouldShowZoom && zoomControlInstance) {
      // Remove zoom control if it shouldn't be shown and is present
      zoomControlInstance.remove();
      zoomControlInstance = null;
    }
  });

  onDestroy(() => {
    if (!browser) return;

    if (map) {
      if (mapElement) {
         mapElement.removeEventListener('keydown', handleMapKeyDown);
      }
      map.remove();
      map = null;
      markerLayerGroup?.off('click', handleMarkerClick);
      L = undefined;
      markerLayerGroup = null;
    }
  });
</script>

<div class={`map-container ${className} ${deviceInfo.isTouchDevice ? 'touch-device' : ''}`} bind:this={mapElement} tabindex="-1">
  {#if !map}
    <p class="loading-message">Loading map...</p>
  {/if}

  {#if map && L && markerLayerGroup && pageState.filter.filteredEvents}
    {#each pageState.filter.filteredEvents as protestEvent (protestEvent.id)}
      {@const loc = pageState.eventStore.locations.get(protestEvent.location)}
      {#if loc && loc.lat != null && loc.lon != null}
        <EventMarker {L} {map} protestEventAndLocation={{event: protestEvent, location: loc}} {markerLayerGroup} />
      {/if}
    {/each}
  {/if}
</div>

<style>
  .map-container {
    height: 100vh;
    width: 100vw;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    overflow: hidden;
  }

  .loading-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.2em;
    color: #666;
    text-align: center;
    z-index: 10;
  }

  /* These move the leaflet attribution to the bottom center */
  :global(.leaflet-control-container .leaflet-bottom),
  :global(.leaflet-control-container .leaflet-bottom .leaflet-right) {
    all: revert !important; 
  }

  :global(.leaflet-control-container .leaflet-control-attribution), /* General Leaflet attribution */
  :global(.leaflet-control-container .leaflet-bottom .leaflet-right .leaflet-control-attribution) /* More specific if needed */ {
    position: absolute !important;
    bottom: 0 !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    float: none !important;
    width: auto !important;
    min-width: 150px !important; /* Prevent collapsing */
    display: block !important;
    margin: 0 !important;
    clear: both !important;
  }

  :global(.svg-marker) {
    animation: fadein 0.2s ease-in forwards;
  }

  @keyframes fadein {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes fadeout {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

</style>