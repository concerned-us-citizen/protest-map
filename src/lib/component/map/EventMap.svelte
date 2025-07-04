<script lang="ts">
  import { onMount, onDestroy, mount } from "svelte";
  import maplibregl from "maplibre-gl";
  import EventPopup from "$lib/component/map/EventPopup.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { type Marker, type Nullable } from "$lib/types";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import "maplibre-gl/dist/maplibre-gl.css";
  import bbox from "@turf/bbox";
  import { featureCollection, point } from "@turf/helpers";
  import { bboxToBounds, type BBox2D } from "$lib/util/bounds";
  import {
    createRegionPolygonLayer,
    updateRegionPolygonLayer,
  } from "./regionPolygonLayer.svelte";
  import type { ClassValue } from "svelte/elements";
  import {
    colorsAndCountClusterProperties,
    // countRadiusExpr,
  } from "./mapLibreExpressions";
  import { loadResources } from "./loadResources";
  // import { markerColor } from "$lib/colors";
  import { addClusterMarkerLayers } from "./addClusterMarkerLayers";
  // import { addDebugRectangles } from "./addDebugRectangles";

  const iconForPct = (pct: number | null) =>
    pct === null
      ? "marker-unavailable"
      : pct > 0
        ? "marker-blue"
        : pct < 0
          ? "marker-red"
          : "marker-purple";

  function markersToGeoJSON(events: Marker[]): GeoJSON.GeoJSON {
    return {
      type: "FeatureCollection",
      features: events.map((m) => {
        const icon = iconForPct(m.pctDemLead ?? null);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [m.lon, m.lat] },
          properties: {
            id: m.id,
            type: m.type,
            pct: m.pctDemLead,
            icon,
            count: pageState.filter.countForMarker(m) ?? 1,
          },
        };
      }),
    };
  }

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();

  let mapDiv: HTMLElement | undefined;
  let map = $state<maplibregl.Map | undefined>();

  let popup: Nullable<maplibregl.Popup> = null;
  let sveltePopupInstance: Nullable<ReturnType<typeof mount>> = null;
  let sveltePopupContainer: Nullable<Element>;

  let navigationControl: Nullable<maplibregl.NavigationControl> = $state(null);
  let zoomControlVisible = $state(false);

  export function prefix(str: string, prefix: string) {
    return `${prefix}-{str}`;
  }

  const baseClusterLayerNames = [
    "cluster-icon",
    "cluster-badge",
    "cluster-count",
  ];

  const baseUnclusteredLayerNames = ["unclustered-point"];

  const eventClusterLayerNames = baseClusterLayerNames.map((s) =>
    prefix(s, "event")
  );
  const turnoutClusterLayerNames = baseClusterLayerNames.map((s) =>
    prefix(s, "turnout")
  );
  turnoutClusterLayerNames.push("turnout-magnitude-circle");

  const eventUnclusteredLayerNames = baseUnclusteredLayerNames.map((s) =>
    prefix(s, "event")
  );
  const turnoutUnclusteredLayerNames = baseUnclusteredLayerNames.map((s) =>
    prefix(s, "turnout")
  );

  const eventLayerNames = [
    ...eventClusterLayerNames,
    ...eventUnclusteredLayerNames,
  ];
  const turnoutLayerNames = [
    ...turnoutClusterLayerNames,
    ...turnoutUnclusteredLayerNames,
  ];

  const allClusteredLayerNames = [
    ...eventClusterLayerNames,
    ...turnoutClusterLayerNames,
  ];
  const allUnclusteredLayerNames = [
    ...eventUnclusteredLayerNames,
    ...turnoutUnclusteredLayerNames,
  ];
  const allEventAndTurnoutLayerNames = [
    ...eventLayerNames,
    ...turnoutLayerNames,
  ];

  // Update the markers when filtered events change
  $effect(() => {
    const { dateFilteredMarkers: dateFilteredEvents } = pageState.filter;
    if (!map) return;

    const source = map.getSource("markers") as maplibregl.GeoJSONSource;
    if (source) source.setData(markersToGeoJSON(dateFilteredEvents));
  });

  $effect(() => {
    const namedRegionPolygon = pageState.filter.namedRegionPolygon;
    if (!map) return;
    const update = async () =>
      await updateRegionPolygonLayer(map, namedRegionPolygon);
    update();
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
      map.addControl(navigationControl, "bottom-right");
    } else if (navigationControl && !zoomControlVisible) {
      map.removeControl(navigationControl);
      navigationControl = null;
    }
  });

  // Hide/show the appropriate marker layers as markerType changes
  $effect(() => {
    function setLayerVisibility(id: string, v: "visible" | "none") {
      if (map?.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    }

    const v = pageState.filter.markerType === "turnout" ? "visible" : "none";
    turnoutLayerNames.forEach((id) => setLayerVisibility(id, v));

    const vEvent = v === "visible" ? "none" : "visible";
    eventLayerNames.forEach((id) => setLayerVisibility(id, vEvent));
  });

  onMount(async () => {
    if (!mapDiv) return;

    const pendingMap = new maplibregl.Map({
      container: mapDiv,
      style: "https://tiles.openfreemap.org/styles/bright",
      minZoom: 1,
      maxZoom: 15,
      attributionControl: false,
      renderWorldCopies: true,
    });

    if (pendingMap === undefined) {
      throw new Error("Map is undefined");
    }

    try {
      await loadResources(pendingMap);
      map = pendingMap;
      if (!map) return;
      const safeMap = map;

      pageState.mapModel.setMapInstance(safeMap);
      pageState.regionLabeler.setMapInstance(safeMap);

      createRegionPolygonLayer(safeMap);

      // Now that images are loaded and map style is loaded, add source and layers
      safeMap.addSource("markers", {
        type: "geojson",
        data: markersToGeoJSON(pageState.filter.allFilteredEvents ?? []),
        cluster: true,
        clusterRadius: 20,
        clusterMaxZoom: 15,
        clusterProperties: colorsAndCountClusterProperties,
      });

      // safeMap.addLayer({
      //   id: "turnout-magnitude-circle",
      //   type: "circle",
      //   source: "markers",
      //   paint: {
      //     "circle-radius": countRadiusExpr,
      //     "circle-color": [
      //       "case",
      //       [
      //         "all",
      //         [">", ["coalesce", ["get", "red"], 0], 0],
      //         [">", ["coalesce", ["get", "blue"], 0], 0],
      //       ],
      //       markerColor.purple,
      //       [
      //         "all",
      //         [">", ["coalesce", ["get", "blue"], 0], 0],
      //         ["==", ["coalesce", ["get", "red"], 0], 0],
      //       ],
      //       markerColor.blue,
      //       [
      //         "all",
      //         [">", ["coalesce", ["get", "red"], 0], 0],
      //         ["==", ["coalesce", ["get", "blue"], 0], 0],
      //       ],
      //       markerColor.red,
      //       markerColor.unavailable,
      //     ],
      //     "circle-opacity": 0.3,
      //   },
      // });
      addClusterMarkerLayers(map, "turnout");

      addClusterMarkerLayers(map, "event");

      // For debugging
      // addVisibleNamedRegions(safeMap, pageState.regionModel);

      safeMap.on("mousemove", (e) => {
        const features = safeMap.queryRenderedFeatures(e.point, {
          layers: allEventAndTurnoutLayerNames,
        });

        if (features.length > 0) {
          // You can check feature.layer.id if you want different cursors
          safeMap.getCanvas().style.cursor = "pointer";
        } else {
          safeMap.getCanvas().style.cursor = "";
        }
      });

      allClusteredLayerNames.forEach(async (layerId) => {
        safeMap.on("click", layerId, async (e) => {
          const clusterId = e.features?.[0]?.properties?.cluster_id;
          if (clusterId === undefined) return;

          const source = safeMap.getSource(
            "markers"
          ) as maplibregl.GeoJSONSource;
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

      allUnclusteredLayerNames.forEach(async (layerId) => {
        safeMap.on("click", layerId, (e) => {
          const f = e.features?.[0];
          if (!f) return;

          const populated = pageState.eventModel.getPopulatedMarker(
            f.properties.id,
            f.properties.type
          );
          if (!populated) return;

          if (popup) popup.remove();

          sveltePopupContainer = document.createElement("div");
          sveltePopupInstance = mount(EventPopup, {
            target: sveltePopupContainer,
            props: { populatedMarker: populated },
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  bind:this={mapDiv}
  class={className}
  onclick={() => {
    pageState.overlayModel.closeAll();
  }}
></div>
