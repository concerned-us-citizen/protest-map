<script lang="ts">
  import { onMount, onDestroy, mount } from "svelte";
  import maplibregl from "maplibre-gl";
  import EventPopup from "$lib/EventPopup.svelte";
  import { getPageStateFromContext } from "$lib/store/PageState.svelte";
  import type { EventMarkerInfoWithId, Nullable } from "./types";
  import { deviceInfo } from "./store/DeviceInfo.svelte";
  import "maplibre-gl/dist/maplibre-gl.css";
  import bbox from "@turf/bbox";
  import { featureCollection, point } from "@turf/helpers";
  import { bboxToBounds, type BBox2D } from "./util/bounds";

  const iconForPct = (pct: number | null) =>
    pct === null
      ? "marker-unavailable"
      : pct > 0
        ? "marker-blue"
        : pct < 0
          ? "marker-red"
          : "marker-purple";

  function eventsToGeoJSON(events: EventMarkerInfoWithId[]): GeoJSON.GeoJSON {
    return {
      type: "FeatureCollection",
      features: events.map((e) => {
        const icon = iconForPct(e.pctDemLead ?? null);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [e.lon, e.lat] },
          properties: {
            eventId: e.eventId,
            pct: e.pctDemLead,
            icon,
          },
        };
      }),
    };
  }

  const pageState = getPageStateFromContext();

  let mapDiv: HTMLElement | undefined;
  let map: maplibregl.Map | undefined;

  let popup: Nullable<maplibregl.Popup> = null;
  let sveltePopupInstance: Nullable<ReturnType<typeof mount>> = null;
  let sveltePopupContainer: Nullable<Element>;

  let navigationControl: Nullable<maplibregl.NavigationControl> = $state(null);
  let zoomControlVisible = $state(false);

  const spriteIcons = [
    ["marker-red", "/sprites/marker-red.png"],
    ["marker-blue", "/sprites/marker-blue.png"],
    ["marker-purple", "/sprites/marker-purple.png"],
    ["marker-unavailable", "/sprites/marker-unavailable.png"],
  ];

  // Update the markers when filtered events change
  $effect(() => {
    const { filteredEvents } = pageState.filter;
    if (!map || !filteredEvents) return;

    const source = map.getSource("events") as maplibregl.GeoJSONSource;
    if (source) source.setData(eventsToGeoJSON(filteredEvents));
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
      map.addControl(navigationControl, "top-left");
    } else if (navigationControl && !zoomControlVisible) {
      map.removeControl(navigationControl);
      navigationControl = null;
    }
  });

  // Helper function to load an individual image and add it to the map
  async function loadImageToMap(
    mapInstance: maplibregl.Map,
    name: string,
    url: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        if (!mapInstance.hasImage(name)) {
          mapInstance.addImage(name, img);
        }
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${url}`);
        reject(`Failed to load image: ${url}`);
      };
    });
  }

  onMount(async () => {
    if (!mapDiv) return;

    map = new maplibregl.Map({
      container: mapDiv,
      style: "https://tiles.openfreemap.org/styles/bright",
      minZoom: 1,
      maxZoom: 15,
      attributionControl: false,
      renderWorldCopies: true,
    });

    if (map === undefined) {
      throw new Error("Map is undefined");
    }
    const safeMap = map;
    pageState.mapModel.setMapInstance(safeMap);
    pageState.regionLabeler.setMapInstance(safeMap);

    try {
      // Await all image loading promises concurrently
      const imageLoadPromises = spriteIcons.map(([name, url]) =>
        loadImageToMap(safeMap, name, url)
      );
      await Promise.all(imageLoadPromises);

      // Await for the map to fully load its style and resources
      await new Promise<void>((resolve) => {
        if (safeMap.isStyleLoaded()) {
          // Check if style is already loaded
          resolve();
        } else {
          safeMap.on("load", () => {
            resolve();
          });
        }
      });

      // Now that images are loaded and map style is loaded, add source and layers
      safeMap.addSource("events", {
        type: "geojson",
        data: eventsToGeoJSON(pageState.filter.filteredEvents ?? []),
        cluster: true,
        clusterRadius: 20,
        clusterMaxZoom: 15,
        clusterProperties: {
          red: ["+", ["case", ["<", ["coalesce", ["get", "pct"], 0], 0], 1, 0]],
          blue: [
            "+",
            ["case", [">", ["coalesce", ["get", "pct"], 0], 0], 1, 0],
          ],
          unavail: ["+", ["case", ["!", ["has", "pct"]], 1, 0]],
        },
      });

      // cluster background marker
      map.addLayer({
        id: "cluster-icon",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "icon-image": [
            "case",
            [
              "all",
              [">", ["coalesce", ["get", "red"], 0], 0],
              [">", ["coalesce", ["get", "blue"], 0], 0],
            ],
            "marker-purple",
            [
              "all",
              [">", ["coalesce", ["get", "blue"], 0], 0],
              ["==", ["coalesce", ["get", "red"], 0], 0],
            ],
            "marker-blue",
            [
              "all",
              [">", ["coalesce", ["get", "red"], 0], 0],
              ["==", ["coalesce", ["get", "blue"], 0], 0],
            ],
            "marker-red",
            "marker-unavailable",
          ],
          "icon-size": 0.5,
          "icon-allow-overlap": true,
        },
      });

      // white badge background
      map.addLayer({
        id: "cluster-badge",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#fff",
          "circle-stroke-color": "#000",
          "circle-stroke-width": 1,

          // 0–9 → 8 px, 10–99 → 10 px, 100-up → 12 px
          "circle-radius": ["step", ["get", "point_count"], 8, 10, 10, 100, 12],

          // push it down & right ~12 px (tweak to taste)
          "circle-translate": [12, 12],
          "circle-translate-anchor": "viewport",
        },
      });

      // count label
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 10,
          "text-anchor": "center",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#000",
          "text-halo-color": "#fff",
          "text-halo-width": 1,
          "text-translate": [12, 12], // same offset as circle
          "text-translate-anchor": "viewport",
        },
      });

      safeMap.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": 0.5,
          "icon-allow-overlap": true,
        },
      });

      const hoverLayers = [
        "cluster-count",
        "cluster-badge",
        "cluster-icon",
        "unclustered-point",
      ];
      safeMap.on("mousemove", (e) => {
        const features = safeMap.queryRenderedFeatures(e.point, {
          layers: hoverLayers,
        });

        if (features.length > 0) {
          // You can check feature.layer.id if you want different cursors
          safeMap.getCanvas().style.cursor = "pointer";
        } else {
          safeMap.getCanvas().style.cursor = "";
        }
      });

      const clusterLayers = ["cluster-count", "cluster-badge", "cluster-icon"];
      clusterLayers.forEach(async (layerId) => {
        safeMap.on("click", layerId, async (e) => {
          const clusterId = e.features?.[0]?.properties?.cluster_id;
          if (clusterId === undefined) return;

          const source = map?.getSource("events") as maplibregl.GeoJSONSource;
          try {
            const features = await source.getClusterLeaves(
              clusterId,
              Infinity,
              0
            );

            const fc = featureCollection(
              features.map((f) =>
                point((f.geometry as GeoJSON.Point).coordinates)
              )
            );

            const bboxValue = bbox(fc) as BBox2D; // [minX, minY, maxX, maxY]
            pageState.mapModel.navigateTo(bboxToBounds(bboxValue));
          } catch (error) {
            console.error("Error getting cluster leaves:", error);
          }
        });
      });

      safeMap.on("click", "unclustered-point", (e) => {
        const f = e.features?.[0];
        if (!f) return;

        const populated = pageState.eventModel.getPopulatedEvent(
          f.properties.eventId
        );
        if (!populated) return;

        if (popup) popup.remove();

        sveltePopupContainer = document.createElement("div");
        sveltePopupInstance = mount(EventPopup, {
          target: sveltePopupContainer,
          props: { populatedEvent: populated },
        });
        const vOffset = 14;
        const hOffset = 16;
        popup = new maplibregl.Popup({
          closeButton: false,
          maxWidth: "300px",
          offset: {
            top: [0, vOffset],
            bottom: [0, -vOffset],
            left: [hOffset, 0],
            right: [-hOffset, 0],
            // "top-left": [hOffset, vOffset],
            // "top-right": [-hOffset, vOffset],
            // "bottom-left": [hOffset, -vOffset],
            // "bottom-right": [-hOffset, -vOffset],
          } as maplibregl.Offset,
        })
          .setLngLat(e.lngLat)
          .setDOMContent(sveltePopupContainer)
          .addTo(safeMap);
      });
    } catch (error) {
      console.error("Error during map initialization:", error);
    }
  });

  onDestroy(() => {
    destroyPopup();
    map?.remove();
  });

  function destroyPopup() {
    popup?.remove();
    popup = null;
    // TODO get clear on why there is a $destroy and not a destroy, and
    // why $destroy can't be invoked either. Defensive hack for now.
    if (sveltePopupInstance?.destroy) {
      sveltePopupInstance?.destroy();
    }
    sveltePopupInstance = null;

    sveltePopupContainer?.remove();
    sveltePopupContainer = null;
  }
</script>

<div bind:this={mapDiv} class="map-container"></div>

<style>
  .map-container {
    position: absolute;
    inset: 0;
  }
</style>
