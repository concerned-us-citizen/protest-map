import type { PageState } from "$lib/model/PageState.svelte";
import { type BBox2D, bboxToBounds } from "$lib/util/bounds";
import bbox from "@turf/bbox";
import { featureCollection, point } from "@turf/helpers";
import type { FilterSpecification, MapMouseEvent } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { mount } from "svelte";
import EventPopup from "./EventPopup.svelte";
import { getTerseLabelExpr } from "./util";
import { markerTypes, type Marker, type MarkerType } from "$lib/types";
import { markerColor } from "$lib/colors";
import type { MultiPolygon, Polygon } from "geojson";

type MapMouseEventWithFeatures = MapMouseEvent & {
  features?: maplibregl.MapGeoJSONFeature[];
};

type ClusterOrPoint = "cluster" | "point";

function clusterOrPointFilter(
  clusterOrPoint: ClusterOrPoint
): FilterSpecification {
  return clusterOrPoint === "cluster"
    ? ["has", "point_count"] // only cluster features
    : ["!", ["has", "point_count"]]; // only unclustered points
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
    const iconForPct = (pct: number | null) => {
      const markerType = markers.length === 0 ? "event" : markers[0].type;
      return pct === null
        ? `${markerType}-marker-unavailable`
        : pct > 0
          ? `${markerType}-marker-blue`
          : pct < 0
            ? `${markerType}-marker-red`
            : `${markerType}-marker-purple`;
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
            icon: iconForPct(m.pctDemLead ?? null),
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

  async loadImageToMap(
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

  async loadResources(map: maplibregl.Map) {
    // Await all image loading promises concurrently

    const spriteIcons: string[] = [];

    for (const markerType of markerTypes) {
      for (const color of ["red", "blue", "purple", "unavailable"]) {
        spriteIcons.push(`${markerType}-marker-${color}`);
      }
    }

    const imageLoadPromises = spriteIcons.map((name) =>
      this.loadImageToMap(map, name, `/sprites/${name}.png`)
    );
    await Promise.all(imageLoadPromises);

    // Await for the map to fully load its style and resources
    await new Promise<void>((resolve) => {
      if (map.isStyleLoaded()) {
        // Check if style is already loaded
        resolve();
      } else {
        map.on("load", () => {
          resolve();
        });
      }
    });
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

  addBadge(markerType: MarkerType, clusterOrPoint: ClusterOrPoint) {
    const layerIdPrefix = `${markerType}-${clusterOrPoint}`;

    // white badge background
    const badgeLayerId = `${layerIdPrefix}-badge`;
    this.map.addLayer({
      id: badgeLayerId,
      type: "circle",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      paint: {
        "circle-color": "#fff",

        // Make space for bigger numbers
        // 0–9 → 8 px, 10–99 → 10 px, 100-up → 12 px
        "circle-radius": [
          "step",
          ["get", "count"],
          8,
          10,
          9,
          100,
          10,
          1000,
          11,
          100_000,
          12,
        ],

        // push it down & right ~12 px (tweak to taste)
        "circle-translate": [12, 12],
        "circle-translate-anchor": "viewport",
      },
    });
    this.registerLayer(badgeLayerId, markerType);
    this.addMouseHandlers(badgeLayerId, clusterOrPoint);

    // count label
    const badgeLabelId = `${layerIdPrefix}-count`;
    this.map.addLayer({
      id: badgeLabelId,
      type: "symbol",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      layout: {
        "text-field": getTerseLabelExpr("count"),
        "text-font": ["Noto Sans Bold"],
        "text-size": ["step", ["get", "count"], 10, 10000, 9, 100_000, 8],
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
    this.registerLayer(badgeLabelId, markerType);
    this.addMouseHandlers(badgeLabelId, clusterOrPoint);
  }

  addMarkerIconLayer(markerType: MarkerType, clusterOrPoint: ClusterOrPoint) {
    const layerId = `${markerType}-${clusterOrPoint}-icon`;
    this.map.addLayer({
      id: layerId,
      type: "symbol",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      layout: {
        "icon-image":
          /**
           * Choose the correct marker icon for the current feature.
           *
           * ─────────────────────────────────────────────────────────
           * 1. **Single point**
           *    When `clusterOrPoint === "point"` the feature is an individual event.
           *    Its icon name is stored directly in the feature’s `"icon"` property,
           *    so we simply return that (`["get", "icon"]`).
           *
           * 2. **Cluster**
           *    Otherwise we’re dealing with a MapLibre *cluster* that represents many
           *    underlying events.  We colour the cluster marker by inspecting two
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

          clusterOrPoint === "point"
            ? ["get", "icon"]
            : [
                "case",
                [
                  "all",
                  [">", ["coalesce", ["get", "red"], 0], 0],
                  [">", ["coalesce", ["get", "blue"], 0], 0],
                ],
                `${markerType}-marker-purple`,
                [
                  "all",
                  [">", ["coalesce", ["get", "blue"], 0], 0],
                  ["==", ["coalesce", ["get", "red"], 0], 0],
                ],
                `${markerType}-marker-blue`,
                [
                  "all",
                  [">", ["coalesce", ["get", "red"], 0], 0],
                  ["==", ["coalesce", ["get", "blue"], 0], 0],
                ],
                `${markerType}-marker-red`,
                `${markerType}-marker-unavailable`,
              ],
        "icon-size": 0.5,
        "icon-allow-overlap": true,
      },
    });
    this.registerLayer(layerId, markerType);
    this.addMouseHandlers(layerId, clusterOrPoint);
  }

  addMagnitudeCircleLayer(
    markerType: MarkerType,
    clusterOrPoint: ClusterOrPoint
  ) {
    const MAX_COUNT = 800_000;
    const MAX_STROKE = 15;
    const layerId = `${markerType}-${clusterOrPoint}-magnitude-circle`;
    this.map.addLayer({
      id: layerId,
      type: "circle",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      paint: {
        "circle-radius": 17,
        "circle-stroke-width": [
          "case",
          ["<=", ["get", "count"], 0], // guard against bad data
          0,

          // min( MAX_STROKE ,
          //      MAX_STROKE * sqrt( count / MAX_COUNT ) )
          [
            "min",
            MAX_STROKE,
            ["*", MAX_STROKE, ["sqrt", ["/", ["get", "count"], MAX_COUNT]]],
          ],
        ],
        "circle-stroke-color": [
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
        ],
        "circle-opacity": 0,
        "circle-stroke-opacity": 0.1,
      },
    });
    this.registerLayer(layerId, markerType);
  }

  addMarkerLayers() {
    // Events
    this.addMarkerIconLayer("event", "point");
    this.addMarkerIconLayer("event", "cluster");
    this.addBadge("event", "cluster");

    // Turnouts
    this.addMagnitudeCircleLayer("turnout", "point");
    this.addMagnitudeCircleLayer("turnout", "cluster");
    this.addMarkerIconLayer("turnout", "point");
    this.addBadge("turnout", "point");
    this.addMarkerIconLayer("turnout", "cluster");
    this.addBadge("turnout", "cluster");
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

  async initializeMap(markers: Marker[]) {
    await this.loadResources(this.map);
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
