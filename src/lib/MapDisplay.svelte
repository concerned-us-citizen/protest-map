<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { browser } from '$app/environment';
  import type { EventData } from '$lib/types.ts';
  import type { Map as LeafletMap, Marker, DivIcon, LayerGroup, LeafletMouseEvent } from 'leaflet';

  export let eventData: EventData;
  export let currentDate: string;
  export let selectedEventNames: Set<string>;

  let mapElement: HTMLElement;
  let map: LeafletMap | null = null;
  let L: typeof import('leaflet') | null = null;
  let markerLayerGroup: LayerGroup | null = null;
  let markerSvgString: string | null = null;
  let popupCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let isTouchDevice = false;

  const getColor = (pct?: number): string => {
    if (pct === undefined || pct === null) {
      return 'rgb(128, 128, 128)'; // Gray for undefined/null
    }
    if (pct >= 0.75) {
      return 'rgb(23, 78, 154)';   // D+75 (Darkest Blue)
    } else if (pct >= 0.50) {
      return 'rgb(68, 120, 181)';  // D+50 (Medium Blue)
    } else if (pct >= 0.25) {
      return 'rgb(135, 170, 210)'; // D+25 (Light Blue)
    } else if (pct > 0) {
      return 'rgb(200, 220, 240)'; // D > 0 (Very Light Blue)
    } else if (pct <= -0.75) {
      return 'rgb(190, 40, 40)';   // R+75 (Darkest Red)
    } else if (pct <= -0.50) {
      return 'rgb(220, 100, 100)'; // R+50 (Medium Red)
    } else if (pct <= -0.25) {
      return 'rgb(240, 150, 150)'; // R+25 (Light Red)
    } else if (pct < 0) {
      return 'rgb(245, 200, 200)'; // R > 0 (Very Light Red)
    } else { // pct === 0
      return 'rgb(220, 220, 220)'; // Neutral Gray for 0%
    }
  };

  const renderMarkers = (): void => {
    // Ensure L and map are initialized before proceeding
    if (!L || !map || !markerSvgString || !eventData || !eventData.locations || !eventData.events) {
      return;
    }

    // L and map are now guaranteed to be non-null for the rest of this function scope.
    // markerLayerGroup will be initialized or re-initialized here.
    if (markerLayerGroup) {
      map.removeLayer(markerLayerGroup);
    }
    const currentMarkerLayerGroup = L.layerGroup(); // Create a new layer group
    markerLayerGroup = currentMarkerLayerGroup; // Assign to the component's reactive variable

    const eventsToRender = (eventData.events[currentDate] || []).filter(event =>
      selectedEventNames.size === 0 || selectedEventNames.has(event.name)
    );

    eventsToRender.forEach((event) => {
      const loc = eventData.locations[event.location];
      if (!loc || loc.lat == null || loc.lon == null) return;
      const color = getColor(loc.pct_dem_lead);
      const iconSize = 50;
      const iconHtml = `<div style="color: ${color}; width: ${iconSize}px; height: ${iconSize}px;">${markerSvgString}</div>`;

      const icon: DivIcon = L!.divIcon({ // L is confirmed non-null by the guard above
        html: iconHtml,
        className: 'custom-svg-marker',
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize],
        popupAnchor: [0, -iconSize]
      });

      const marker: Marker = L!.marker([loc.lat, loc.lon], { icon }); // L is confirmed non-null

      const margin = loc.pct_dem_lead;
      let marginDisplay = '';
      if (typeof margin === 'number') {
        const absMarginPercent = Math.round(Math.abs(margin) * 100);
        const candidateName = margin > 0 ? 'Harris' : 'Trump';
        const marginColor = margin > 0 ? 'rgb(23, 78, 154)' : 'rgb(190, 40, 40)';
        // Assuming the NYT attribution URL is the main data source URL for now
        const nytAttributionUrl = "https://github.com/nytimes/presidential-precinct-map-2024";
        
        marginDisplay = `
          <a href="${nytAttributionUrl}" target="_blank" class="popup-margin-link">
            <div class="popup-margin-display" style="color: ${marginColor};">
              <div class="popup-margin-title">2024 Margin</div>
              <div class="popup-margin-value">+${absMarginPercent}</div>
              <div class="popup-margin-candidate">${candidateName}</div>
            </div>
          </a>
        `;
      }
        
      marker.bindPopup(`
        <div class="custom-popup-layout">
          <div class="popup-image-container">
            <img src="${loc.image ? loc.image : 'https://en.wikipedia.org/wiki/Springfield_(The_Simpsons)#/media/File:Springfield_(The_Simpsons).png'}" alt="${loc.title}" />
          </div>
          <div class="popup-text-container">
            <a class="location-title" href="${loc.pageUrl}" target="_blank"><strong>${loc.title}</strong></a>
            ${event.link ?
              `<a class="event-title-link" href="${event.link}" target="_blank"><div class="event-title">${event.name}</div></a>` :
              `<div class="event-title">${event.name}</div>`
            }
          </div>
          ${marginDisplay}
        </div>
      `, { closeButton: false });
      
      let isMouseOverMarkerOrPopup = false; // Used for hover logic

      const openPopup = () => {
        if (markerLayerGroup) {
          markerLayerGroup.eachLayer((layer: any) => {
            if (layer !== marker && layer.isPopupOpen && layer.isPopupOpen()) {
              layer.closePopup();
            }
          });
        }
        if (!marker.isPopupOpen()) {
          marker.openPopup();
        }
      };

      const handleMarkerClick = () => {
        openPopup();
        // For touch devices, this is the primary way to open.
        // For non-touch, this makes the popup "stick" until another action.
        if (popupCloseTimer) { // Clear any pending close from hover
          clearTimeout(popupCloseTimer);
          popupCloseTimer = null;
        }
        isMouseOverMarkerOrPopup = true; // Keep it open if clicked
      };

      marker.on('click', handleMarkerClick);

      if (!isTouchDevice) {
        const handleMouseEnter = () => {
          isMouseOverMarkerOrPopup = true;
          if (popupCloseTimer) {
            clearTimeout(popupCloseTimer);
            popupCloseTimer = null;
          }
          openPopup();
        };

        const handleMouseLeave = () => {
          isMouseOverMarkerOrPopup = false;
          if (popupCloseTimer) clearTimeout(popupCloseTimer);
          popupCloseTimer = setTimeout(() => {
            if (!isMouseOverMarkerOrPopup && marker.isPopupOpen()) {
              marker.closePopup();
            }
            popupCloseTimer = null;
          }, 200);
        };
        
        const disableMapDragging = () => { if (map) map.dragging.disable(); };
        const enableMapDragging = () => { if (map) map.dragging.enable(); };

        marker.on('mouseover', handleMouseEnter);
        marker.on('mouseout', handleMouseLeave);

        marker.on('popupopen', () => {
          const popupEl = marker.getPopup()?.getElement();
          if (popupEl) {
            popupEl.addEventListener('mouseenter', handleMouseEnter);
            popupEl.addEventListener('mouseleave', handleMouseLeave);
            popupEl.addEventListener('mouseenter', disableMapDragging);
            popupEl.addEventListener('mouseleave', enableMapDragging);
          }
        });

        marker.on('popupclose', () => {
          const popupEl = marker.getPopup()?.getElement();
          if (popupEl) {
            popupEl.removeEventListener('mouseenter', handleMouseEnter);
            popupEl.removeEventListener('mouseleave', handleMouseLeave);
            popupEl.removeEventListener('mouseenter', disableMapDragging);
            popupEl.removeEventListener('mouseleave', enableMapDragging);
          }
          if (map) map.dragging.enable();
          isMouseOverMarkerOrPopup = false;
        });
      } else { // Touch device specific logic for popupopen/close if needed
        marker.on('popupopen', () => {
          // Potentially disable map dragging when a popup is open on touch
          const disableMapDragging = () => { if (map) map.dragging.disable(); };
          const popupEl = marker.getPopup()?.getElement();
          if (popupEl) {
            // Add listeners to popup itself if needed for touch, e.g. to keep it open
            // For now, click on map closes it.
             popupEl.addEventListener('mouseenter', disableMapDragging); // Keep for consistency
             popupEl.addEventListener('mouseleave', () => { if (map) map.dragging.enable(); });
          }
        });
        marker.on('popupclose', () => {
           if (map) map.dragging.enable();
        });
      }

      marker.on('add', function () {
        const el = marker.getElement?.();
        if (el) el.classList.add('fade-in');
      });

      marker.addTo(currentMarkerLayerGroup); // Add to the locally scoped, guaranteed non-null layer group
    });

    currentMarkerLayerGroup.addTo(map); // map is confirmed non-null here
  };

  onMount(async () => {
    if (browser) {
      isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      L = leaflet;

      try {
        // Import SVG from src/assets using Vite's raw loader
        markerSvgString = await import('$assets/marker.svg?raw').then(m => m.default);
      } catch (error) {
        console.error("Error loading marker SVG:", error);
      }
 
      if (L && mapElement) {
        map = L.map(mapElement, { zoomControl: false, keyboard: false, minZoom: 2 }); // Adjusted minZoom
        if (!isTouchDevice) {
          L.control.zoom({ position: 'topleft' }).addTo(map);
        }
        
        // Define bounds to include only the continental US
        const continentalUSBounds = L.latLngBounds(
          L.latLng(30, -125), // Southwest: Northern Florida / Southern California
          L.latLng(47, -66)   // Northeast: Northern Maine / Southern Canada border
        );
        
        // Calculate the center of the continental US bounds
        const center = continentalUSBounds.getCenter();
        
        map.setView(center, isTouchDevice ? 3 : 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        map.on('click', (e: LeafletMouseEvent) => {
          const target = e.originalEvent.target as HTMLElement;
          // Prevent map click from closing popups if click is on nav/info panels (handled by parent)
          // or if click is on a marker itself.
          if (target.closest('.nav-panel') || target.closest('.info-panel') || target.closest('.top-right-icon-controls')) {
            return;
          }
          let isMarkerClick = false;
          let currentElement: HTMLElement | null = target;
          while (currentElement && map && currentElement !== map.getContainer()) {
              if (currentElement.classList.contains('leaflet-marker-icon')) {
                  isMarkerClick = true;
                  break;
              }
              currentElement = currentElement.parentElement;
          }
          if (!isMarkerClick && markerLayerGroup) {
              markerLayerGroup.eachLayer((layer: any) => {
                  if (layer.isPopupOpen && layer.isPopupOpen()) {
                      layer.closePopup();
                  }
              });
          }
        });
        
        if (currentDate && markerSvgString) { // Initial render if currentDate is already set
          renderMarkers();
        }

        // Add keydown listener to mapElement to prevent arrow key propagation
        mapElement.addEventListener('keydown', (event: KeyboardEvent) => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            // console.log('MapDisplay: Arrow key pressed on map, prevented default.');
          }
        });
      }
    }
  });

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
    if (popupCloseTimer) {
      clearTimeout(popupCloseTimer);
    }
  });

  // Re-render markers when props change
  afterUpdate(() => {
    // The guards within renderMarkers will handle null checks for map, L, etc.
    renderMarkers();
  });

</script>

<div class="map-container" bind:this={mapElement} tabindex="-1"></div>

<style>
  .map-container {
    height: 100vh;
    width: 100vw;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
  }

  /* Styles moved from page-styles.css and made global */
  :global(.custom-svg-marker) {
    background: transparent !important;
    border: none !important;
  }
  :global(.custom-svg-marker svg) {
    width: 100%;
    height: 100%;
  }
  :global(.leaflet-control-zoom) {
    position: absolute;
    top: 15px !important;
    left: 15px !important;
    margin: 0px !important;
    bottom: auto !important; /* Ensure bottom is auto */
    right: auto !important;
  }
  /* Resetting any attempts to style intermediate containers like .leaflet-bottom or .leaflet-right */
  :global(.leaflet-control-container .leaflet-bottom),
  :global(.leaflet-control-container .leaflet-bottom .leaflet-right) {
    all: revert !important; /* Attempt to revert to Leaflet's original styles for these parents */
  }

  /* Highly specific selector for the attribution control itself */
  :global(.leaflet-control-container .leaflet-control-attribution), /* General Leaflet attribution */
  :global(.leaflet-control-container .leaflet-bottom .leaflet-right .leaflet-control-attribution) /* More specific if needed */ {
    position: absolute !important;
    bottom: 0 !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    
    /* Dimensional properties */
    width: auto !important;
    min-width: 150px !important; /* Prevent collapsing */
    max-width: 90% !important;
    height: auto !important;
    line-height: 1.3 !important; /* Normal line height */
    
    /* Box model & Visuals */
    display: block !important;
    margin: 0 !important;
    padding: 2px 6px !important;
    background-color: rgba(255, 255, 255, 0.8) !important;
    color: #333 !important;
    font-size: 10px !important;
    text-align: center !important;
    border-radius: 3px 3px 0 0 !important;
    box-shadow: none !important; /* Remove any conflicting shadows */
    
    /* Behavior overrides */
    float: none !important;
    clear: both !important;
    z-index: 1000 !important; /* Standard z-index for controls */
    box-sizing: border-box !important;
    white-space: normal !important; /* Allow text to wrap */
    overflow: visible !important;
  }
  
  /* Ensure any simpler global selector for .leaflet-control-attribution is cleared or less specific
     if it was causing issues. The one above is now more specific.
     This block can be removed if the above is sufficient.
  */
  :global(.leaflet-control-attribution) {
    /* If the above specific selector works, this can be empty or removed.
       If it's still needed for some reason, ensure it doesn't conflict.
       For now, making it very minimal.
    */
    background: none !important; /* Clear any very general background attempts */
    padding: 0 !important;
    margin: 0 !important;
  }

  :global(.custom-popup-layout) {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 280px;
  }
  :global(.popup-image-container) {
    line-height: 0;
  }
  :global(.popup-image-container img) {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
  }
  :global(.popup-text-container) {
    flex-grow: 1;
  }
  :global(.popup-text-container .location-title) {
    font-weight: bold;
    color: #333;
    text-decoration: none;
    display: block;
    margin-bottom: 3px;
    font-size: 1.15em;
    position: relative;
    z-index: 10;
    pointer-events: auto;
  }
  :global(.popup-text-container .location-title:hover) {
    text-decoration: underline !important;
    color: #007bff !important;
  }
  :global(.popup-text-container a) { /* General rule for links in popup */
    pointer-events: auto;
    position: relative;
    z-index: 10;
  }
  :global(.popup-text-container a:hover) {
    text-decoration: underline;
  }
  :global(.popup-text-container .event-title-link) {
    text-decoration: none; /* Remove underline from link by default */
    color: inherit; /* Inherit color from .event-title or set explicitly */
    display: block; /* Ensure the link takes up the block for proper clicking */
  }
  :global(.popup-text-container .event-title-link:hover .event-title) {
    text-decoration: underline; /* Underline text on link hover */
    color: #0056cc; /* Standard link hover color */
  }
  :global(.popup-text-container .event-title) {
    font-size: 1.05em;
    color: #555; /* Default color for event title text */
    display: block; /* Already here, good */
  }
  :global(.popup-margin-display) {
    text-align: right;
    min-width: 50px;
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  :global(.popup-margin-title) {
    font-size: 0.65em;
    color: #666;
    margin-bottom: 1px;
    text-align: right;
  }
  :global(.popup-margin-display .popup-margin-value) {
    font-size: 2.4em;
    font-weight: bold;
    line-height: 1;
  }
  :global(.popup-margin-display .popup-margin-candidate) {
    font-size: 0.9em;
    line-height: 1;
  }
  :global(a.popup-margin-link) {
    text-decoration: none;
    color: inherit; /* So it doesn't look like a typical blue link unless hovered */
  }
  :global(.leaflet-popup-content-wrapper) {
    border-radius: 8px !important;
  }
  :global(.leaflet-popup-content) {
    margin: 5px 8px !important;
    min-width: auto !important;
  }
/* Global styles moved from app.css */
  :global(.popup) {
    font-size: 14px;
    font-family: sans-serif;
  }
  /* .event-title and .location-title are already globally styled above for popups,
     but these are more generic. If they are intended for other uses,
     they might need to be differentiated or this is redundant.
     For now, including them as they were in app.css. */
  :global(.event-title),
  :global(.location-title) {
    color: #0056cc;
    text-decoration: none;
  }
  :global(.event-title:hover),
  :global(.location-title:hover) {
    text-decoration: underline;
  }
  /* .margin class does not appear to be used in current map/popup markup */
  /*
  :global(.margin) {
    margin-top: 5px;
    font-size: 16px;
    font-weight: bold;
  }
  */

  :global(.fade-in) { /* Used by marker.on('add', ...) */
    animation: fadein 0.5s ease-in forwards;
  }
  /* .fade-out class does not appear to be used */
  /*
  :global(.fade-out) {
    animation: fadeout 0.5s ease-out forwards;
  }
  */
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