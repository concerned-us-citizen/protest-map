import type { PageState } from "$lib/model/PageState.svelte";
import { type BBox2D, bboxToBounds } from "$lib/util/bounds";
import bbox from "@turf/bbox";
import { featureCollection, point } from "@turf/helpers";
import type {
  ExpressionSpecification,
  FilterSpecification,
  MapMouseEvent,
} from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { mount } from "svelte";
import EventPopup from "./EventPopup.svelte";
import { getTerseLabelExpr } from "./util";
import { type Marker, type MarkerType } from "$lib/types";
import { markerColor } from "$lib/colors";
import type { MultiPolygon, Polygon } from "geojson";

type MapMouseEventWithFeatures = MapMouseEvent & {
  features?: maplibregl.MapGeoJSONFeature[];
};

type ClusterOrPoint = "cluster" | "point";

const innerRingRadius = 13;
const ringStroke = 2;
const clusterRingStroke = 1;
const ringSpacing = 1;
const outerRingRadius = innerRingRadius + ringStroke + ringSpacing;

function clusterOrPointFilter(
  clusterOrPoint: ClusterOrPoint
): FilterSpecification {
  return clusterOrPoint === "cluster"
    ? ["has", "point_count"] // only cluster features
    : ["!", ["has", "point_count"]]; // only unclustered points
}

/**
 * Choose the correct color for the current feature.
 *
 * ─────────────────────────────────────────────────────────
 * 1. **Single point**
 *    When `clusterOrPoint === "point"` the feature is an individual event.
 *    Its color is stored directly in the feature’s `"color"` property,
 *    so we simply return that (`["get", "color"]`).
 *
 * 2. **Cluster**
 *    Otherwise we’re dealing with a MapLibre cluster that represents many
 *    underlying events.  We color the cluster marker by inspecting two
 *    count properties on the cluster:
 *
 *       • `red`   – number of “red” events in the cluster
 *       • `blue`  – number of “blue” events in the cluster
 *
 *    The `coalesce(..., 0)` wrapper treats a missing attribute as **0**.
 *    The logic is:
 *
 *       ┌────────────────────────────────────────────┐
 *       │ Condition                                  │  Icon returned
 *       ├────────────────────────────────────────────┤
 *       │ red > 0  AND  blue > 0                     │  <markerType>-marker-purple
 *       │ blue > 0 AND  red == 0                     │  <markerType>-marker-blue
 *       │ red  > 0 AND  blue == 0                    │  <markerType>-marker-red
 *       │ anything else (neither red nor blue)       │  <markerType>-marker-unavailable
 *       └────────────────────────────────────────────┘
 *
 */
function colorExpression(
  clusterOrPoint: ClusterOrPoint
): ExpressionSpecification {
  return clusterOrPoint === "point"
    ? ["get", "color"]
    : [
        "case",
        [
          "all",
          [">", ["coalesce", ["get", "red"], 0], 0],
          [">", ["coalesce", ["get", "blue"], 0], 0],
        ],
        markerColor.purple,
        [
          "all",
          [">", ["coalesce", ["get", "blue"], 0], 0],
          ["==", ["coalesce", ["get", "red"], 0], 0],
        ],
        markerColor.blue,
        [
          "all",
          [">", ["coalesce", ["get", "red"], 0], 0],
          ["==", ["coalesce", ["get", "blue"], 0], 0],
        ],
        markerColor.red,
        markerColor.unavailable,
      ];
}

const REGION_SOURCE_ID = "region-polygon";

export class MapLayerModel {
  map: maplibregl.Map;
  pageState: PageState;
  mouseMoveLayerIds: string[] = [];
  layerIdsByMarkerType: {
    event: string[];
    turnout: string[];
  } = { event: [], turnout: [] };

  popup: maplibregl.Popup | undefined;
  sveltePopupInstance: ReturnType<typeof mount> | undefined;
  sveltePopupContainer: Element | undefined;

  constructor(map: maplibregl.Map, pageState: PageState) {
    this.map = map;
    this.pageState = pageState;
    map.on("mousemove", this.onMouseMove);
  }

  onMouseMove = (e: MapMouseEvent) => {
    const map = this.map;
    const features = map.queryRenderedFeatures(e.point, {
      layers: this.mouseMoveLayerIds,
    });

    if (features.length > 0) {
      map.getCanvas().style.cursor = "pointer";
    } else {
      map.getCanvas().style.cursor = "";
    }
  };

  onClusterMarkerClick = async (e: MapMouseEventWithFeatures) => {
    const map = this.map;
    const clusterId = e.features?.[0]?.properties?.cluster_id;
    if (clusterId === undefined) return;

    const source = map.getSource("markers") as maplibregl.GeoJSONSource;
    try {
      const features = await source.getClusterLeaves(clusterId, Infinity, 0);

      const fc = featureCollection(
        features.map((f) => point((f.geometry as GeoJSON.Point).coordinates))
      );

      const bboxValue = bbox(fc) as BBox2D; // [minX, minY, maxX, maxY]
      this.pageState.mapModel.navigateTo(bboxToBounds(bboxValue));
    } catch (error) {
      console.error("Error getting cluster leaves:", error);
    }
  };

  onMarkerClick = (e: MapMouseEventWithFeatures) => {
    const f = e.features?.[0];
    if (!f) return;

    const populated = this.pageState.eventModel.getPopulatedMarker(
      f.properties.id,
      f.properties.type
    );
    if (!populated) return;

    if (this.popup) this.popup.remove();

    this.sveltePopupContainer = document.createElement("div");
    this.sveltePopupInstance = mount(EventPopup, {
      target: this.sveltePopupContainer,
      props: { populatedMarker: populated },
    });
    const vOffset = 14;
    const hOffset = 16;
    this.popup = new maplibregl.Popup({
      closeButton: false,
      maxWidth: "300px",
      offset: {
        top: [0, vOffset],
        bottom: [0, -vOffset],
        left: [hOffset, 0],
        right: [-hOffset, 0],
      } as maplibregl.Offset,
    })
      .setLngLat(e.lngLat)
      .setDOMContent(this.sveltePopupContainer)
      .addTo(this.map);
  };

  addMouseHandlers(layerId: string, clusterOrPoint: ClusterOrPoint) {
    this.mouseMoveLayerIds.push(layerId);
    this.map.on(
      "click",
      layerId,
      clusterOrPoint === "cluster"
        ? this.onClusterMarkerClick
        : this.onMarkerClick
    );
  }

  markersToGeoJSON(markers: Marker[]): GeoJSON.GeoJSON {
    const colorForPct = (pct: number | null) => {
      return pct === null
        ? markerColor.unavailable
        : pct > 0
          ? markerColor.blue
          : pct < 0
            ? markerColor.red
            : markerColor.purple;
    };
    return {
      type: "FeatureCollection",
      features: markers.map((m) => {
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [m.lon, m.lat] },
          properties: {
            id: m.id,
            type: m.type,
            pct: m.pctDemLead,
            color: colorForPct(m.pctDemLead ?? null),
            count: this.pageState.filter.countForMarker(m),
          },
        };
      }),
    };
  }

  destroyPopup() {
    this.popup?.remove();
    this.popup = undefined;
    // TODO get clear on why there is a $destroy and not a destroy, and
    // why $destroy can't be invoked either. Defensive hack for now.
    if (this.sveltePopupInstance?.destroy) {
      this.sveltePopupInstance?.destroy();
    }
    this.sveltePopupInstance = undefined;

    this.sveltePopupContainer?.remove();
    this.sveltePopupContainer = undefined;
  }

  addRegionPolygonLayer() {
    const map = this.map;
    if (!map.getSource(REGION_SOURCE_ID)) {
      map.addSource(REGION_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "region-polygon-fill",
        type: "fill",
        source: REGION_SOURCE_ID,
        paint: {
          "fill-color": "#FF8C00",
          "fill-opacity": 0.05,
        },
      });

      map.addLayer({
        id: "region-polygon-outline",
        type: "line",
        source: REGION_SOURCE_ID,
        paint: {
          "line-color": "#FF8C00",
          "line-width": 2,
        },
      });
    }
  }

  updateRegionPolygonLayer(polygon: Polygon | MultiPolygon | undefined) {
    const source = this.map.getSource(
      REGION_SOURCE_ID
    ) as maplibregl.GeoJSONSource;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: polygon
        ? [{ type: "Feature", geometry: polygon, properties: {} }]
        : [],
    });
  }

  registerLayer(layerId: string, markerType: MarkerType) {
    this.layerIdsByMarkerType[markerType].push(layerId);
  }

  addMagnitudeHaloLayer(
    markerType: MarkerType,
    clusterOrPoint: ClusterOrPoint,
    maxValue: number
  ) {
    const MIN_RADIUS = outerRingRadius;
    const EXTRA_RADIUS = 20;
    const layerId = `${markerType}-${clusterOrPoint}-magnitude-halo`;
    this.map.addLayer({
      id: layerId,
      type: "circle",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      paint: {
        "circle-color": colorExpression(clusterOrPoint),
        "circle-opacity": 0.1,
        "circle-radius": [
          "case",
          /* guard: non-positive or missing "count" → just MIN_RADIUS */
          ["<=", ["coalesce", ["get", "count"], 0], 0],
          MIN_RADIUS,
          /* else: MIN_RADIUS + EXTRA_RADIUS * sqrt(count / maxValue) */
          [
            "min",
            [
              "+",
              MIN_RADIUS,
              ["*", EXTRA_RADIUS, ["sqrt", ["/", ["get", "count"], maxValue]]],
            ],
            MIN_RADIUS + EXTRA_RADIUS, // hard cap
          ],
        ],

        /* ------- kill the outline ------------------------------------ */
        "circle-stroke-width": 0, // or omit the property entirely
      },
    });
    this.registerLayer(layerId, markerType);
  }

  addMarkerIconLayer(markerType: MarkerType, clusterOrPoint: ClusterOrPoint) {
    const layerId = `${markerType}-${clusterOrPoint}-icon`;
    this.map.addLayer({
      id: layerId,
      type: "symbol",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      layout: {
        "icon-image": `markers:${markerType}`,
        "icon-size": 0.5,
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-color": colorExpression(clusterOrPoint),
      },
    });

    this.registerLayer(layerId, markerType);
    this.addMouseHandlers(layerId, clusterOrPoint);
  }

  addMarkerRings(markerType: MarkerType, clusterOrPoint: ClusterOrPoint) {
    // Add the main ring
    const layerId = `${markerType}-${clusterOrPoint}-ring`;
    this.map.addLayer({
      id: layerId,
      type: "circle",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      paint: {
        "circle-stroke-color": colorExpression(clusterOrPoint),
        "circle-opacity": 0,
        "circle-radius": innerRingRadius,
        "circle-stroke-width": ringStroke,
      },
    });
    this.registerLayer(layerId, markerType);

    // Possibly add the cluster ring
    if (clusterOrPoint === "cluster") {
      const layerId = `${markerType}-${clusterOrPoint}-outer-ring`;
      this.map.addLayer({
        id: layerId,
        type: "circle",
        source: "markers",
        filter: clusterOrPointFilter(clusterOrPoint),
        paint: {
          "circle-stroke-color": colorExpression(clusterOrPoint),
          "circle-opacity": 0,
          "circle-radius": outerRingRadius,
          "circle-stroke-width": clusterRingStroke,
          "circle-stroke-opacity": 0.5,
        },
      });
      this.registerLayer(layerId, markerType);
    }
  }

  addCountBadge(markerType: MarkerType, clusterOrPoint: ClusterOrPoint) {
    const layerId = `${markerType}-${clusterOrPoint}-badge`;
    this.map.addLayer({
      id: layerId,
      type: "symbol",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      layout: {
        "text-field": getTerseLabelExpr("count"),
        "text-font": ["Noto Sans Bold"],
        "text-size": 10,

        "icon-image": "markers:rounded-text-background",
        "icon-text-fit": "both", // stretch X & Y to wrap text
        "icon-text-fit-padding": [4, 8, 4, 8], // ↑ right ↓ left  (px)

        "symbol-placement": "point",
        "text-allow-overlap": true,
        "icon-allow-overlap": true,
        "icon-anchor": "center",
        "text-anchor": "center",
      },
      paint: {
        "icon-color": "#FFFFFF",
        "icon-translate": [0, innerRingRadius],
        "text-translate": [0, innerRingRadius],
      },
    });
    this.registerLayer(layerId, markerType);
  }

  addMarkerLayers() {
    const maxLikelyLocationsInCluster = 1000;
    // Event points
    this.addMarkerRings("event", "point");
    this.addMarkerIconLayer("event", "point");

    // Event clusters
    this.addMagnitudeHaloLayer(
      "turnout",
      "cluster",
      maxLikelyLocationsInCluster
    );
    this.addMarkerRings("event", "cluster");
    this.addMarkerIconLayer("event", "cluster");
    this.addCountBadge("event", "cluster");

    // Turnout points
    const maxLikelyTurnoutInMarker = 1_000_000;
    this.addMagnitudeHaloLayer("turnout", "point", maxLikelyTurnoutInMarker);
    this.addMarkerRings("turnout", "point");
    this.addMarkerIconLayer("turnout", "point");
    this.addCountBadge("turnout", "point");

    // Turnout clusters
    this.addMagnitudeHaloLayer("turnout", "cluster", maxLikelyTurnoutInMarker);
    this.addMarkerRings("turnout", "cluster");
    this.addMarkerIconLayer("turnout", "cluster");
    this.addCountBadge("turnout", "cluster");
  }

  addMarkerSource(geoJSON: GeoJSON.GeoJSON) {
    const colorClusterProperties = {
      red: ["+", ["case", ["<", ["coalesce", ["get", "pct"], 0], 0], 1, 0]],
      blue: ["+", ["case", [">", ["coalesce", ["get", "pct"], 0], 0], 1, 0]],
      unavail: ["+", ["case", ["!", ["has", "pct"]], 1, 0]],
    };

    const colorsAndCountClusterProperties = {
      ...colorClusterProperties,
      count: ["+", ["get", "count"]],
    };

    this.map.addSource("markers", {
      type: "geojson",
      data: geoJSON,
      cluster: true,
      clusterRadius: 20,
      clusterMinPoints: 2,
      clusterMaxZoom: 15,
      clusterProperties: colorsAndCountClusterProperties,
    });
  }

  setLayerVisibility(id: string, v: "visible" | "none") {
    const map = this.map;
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", v);
    }
  }

  updateLayerVisibility(visibleMarkerType: MarkerType) {
    for (const [key, value] of Object.entries(this.layerIdsByMarkerType)) {
      const newVisibility = key === visibleMarkerType ? "visible" : "none";
      for (const layerId of value) {
        this.setLayerVisibility(layerId, newVisibility);
      }
    }
  }

  initializeMap(markers: Marker[]) {
    this.addRegionPolygonLayer();
    this.addMarkerSource(this.markersToGeoJSON(markers));
    this.addMarkerLayers();
    this.updateLayerVisibility(this.pageState.filter.markerType);

    // For debugging
    // addVisibleNamedRegions(map, pageState.regionModel);
  }

  updateMarkers(markers: Marker[]) {
    const source = this.map.getSource("markers") as maplibregl.GeoJSONSource;
    if (source) source.setData(this.markersToGeoJSON(markers));
  }
}
