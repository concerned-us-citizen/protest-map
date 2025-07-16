import type { PageState } from "$lib/model/PageState.svelte";
import { type BBox2D, bboxToBounds, expandBounds } from "$lib/util/bounds";
import bbox from "@turf/bbox";
import { featureCollection, point } from "@turf/helpers";
import type {
  FilterSpecification,
  LngLatLike,
  MapMouseEvent,
  PointLike,
} from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { mount } from "svelte";
import MarkerPopup from "./MarkerPopup.svelte";
import {
  type ClusterOrPoint,
  buildColorExpression,
  getTerseLabelExpr,
  buildLinearRadiusExpr,
  areFeaturesCoLocated,
  isPointFeature,
} from "./util";
import { type Marker, type MarkerType } from "$lib/types";
import { markerColor } from "$lib/colors";
import type { Feature, MultiPolygon, Point, Polygon } from "geojson";

type MapMouseEventWithFeatures = MapMouseEvent & {
  features?: maplibregl.MapGeoJSONFeature[];
};

const innerRingRadius = 13;
const ringStroke = 2;
const clusterRingStroke = 1;
const ringSpacing = 1;
const outerRingRadius = innerRingRadius + ringStroke + ringSpacing;
const minHaloRadius = innerRingRadius - 4;
const maxHaloRadius = 30;

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
  sveltePopupContainer: HTMLDivElement | undefined;

  constructor(map: maplibregl.Map, pageState: PageState) {
    this.map = map;
    this.pageState = pageState;
    map.on("mousemove", this.onMouseMove.bind(this));
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
      const features = await (
        await source.getClusterLeaves(clusterId, Infinity, 0)
      ).filter(isPointFeature);
      if (areFeaturesCoLocated(features)) {
        this.showMarkersPopup(features);
      } else {
        const fc = featureCollection(
          features.map((f) => point((f.geometry as GeoJSON.Point).coordinates))
        );

        const bboxValue = bbox(fc) as BBox2D; // [minX, minY, maxX, maxY]
        this.pageState.mapModel.navigateTo(
          expandBounds(bboxToBounds(bboxValue), 15)
        );
      }
    } catch (error) {
      console.error("Error getting cluster leaves:", error);
    }
  };

  onMarkerClick = (e: MapMouseEventWithFeatures) => {
    const f = e.features?.[0];
    if (!f) return;
    this.showMarkersPopup([f]);
  };

  async showMarkersPopup(fc: Feature[]) {
    const safeFc = fc.filter(
      (f): f is Feature<Point> =>
        f.geometry?.type === "Point" && f.properties !== undefined
    );
    if (safeFc.length < 1) return;

    const lngLat: LngLatLike = safeFc[0].geometry.coordinates as [
      number,
      number,
    ];

    const populatedMarkers = safeFc
      .map((f) => {
        const props = f.properties!;
        return this.pageState.eventModel.getPopulatedMarker(
          props.id,
          props.type
        );
      })
      .filter((p) => p !== null);

    if (this.popup) this.popup.remove();

    const vOffset = 14;
    const hOffset = 16;
    const padding = this.pageState.mapModel.getMapPadding();

    // Step 1: Mount Svelte popup content
    const container = document.createElement("div");
    this.sveltePopupInstance = mount(MarkerPopup, {
      target: container,
      props: { populatedMarkers },
    });

    // Step 2: Create the popup
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
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(this.map);

    // Step 3: Wait for layout to finalize
    await new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0))
    );

    // Step 4: Measure popup position relative to map container
    const popupEl = this.popup.getElement();
    const popupRect = popupEl.getBoundingClientRect();
    const mapRect = this.map.getContainer().getBoundingClientRect();

    // Calculate how far popup sticks out of visible map area
    let dx = 0;
    let dy = 0;

    if (popupRect.left < mapRect.left + padding.left) {
      dx = popupRect.left - mapRect.left - padding.left;
    } else if (popupRect.right > mapRect.right - padding.right) {
      dx = popupRect.right - mapRect.right + padding.right;
    }

    if (popupRect.top < mapRect.top + padding.top) {
      dy = popupRect.top - mapRect.top - padding.top;
    } else if (popupRect.bottom > mapRect.bottom - padding.bottom) {
      dy = popupRect.bottom - mapRect.bottom + padding.bottom;
    }

    // Convert screen dx/dy into map coordinates
    if (dx !== 0 || dy !== 0) {
      const currentCenter = this.map.getCenter();
      const projectedCenter = this.map.project(currentCenter);

      const newCenter = this.map.unproject({
        x: projectedCenter.x + dx,
        y: projectedCenter.y + dy,
      } as PointLike);

      this.map.easeTo({ center: newCenter, duration: 300 });
    }

    this.sveltePopupContainer = container;
  }

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

  closePopup() {
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
    radiusExpression: maplibregl.ExpressionSpecification
  ) {
    const layerId = `${markerType}-${clusterOrPoint}-magnitude-halo`;
    this.map.addLayer({
      id: layerId,
      type: "circle",
      source: "markers",
      filter: clusterOrPointFilter(clusterOrPoint),
      paint: {
        "circle-color": buildColorExpression(clusterOrPoint),
        "circle-opacity": 0.3,
        "circle-radius": radiusExpression,
        "circle-stroke-width": 0,
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
        "icon-color": buildColorExpression(clusterOrPoint),
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
        "circle-stroke-color": buildColorExpression(clusterOrPoint),
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
          "circle-stroke-color": buildColorExpression(clusterOrPoint),
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
        "icon-text-fit-padding": [4, 4, 4, 4], // ↑ right ↓ left  (px)

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
    // Event points
    const eventRadiusExpression = buildLinearRadiusExpr(
      [1, 20, 50, 200, 100, 1000],
      minHaloRadius,
      maxHaloRadius
    );
    this.addMarkerRings("event", "point");
    this.addMarkerIconLayer("event", "point");

    // Event clusters
    this.addMagnitudeHaloLayer("event", "cluster", eventRadiusExpression);
    this.addMarkerRings("event", "cluster");
    this.addMarkerIconLayer("event", "cluster");
    this.addCountBadge("event", "cluster");

    // Turnout points
    const turnoutRadiusExpression = buildLinearRadiusExpr(
      [1, 1_000, 10_000, 100_000, 2_000_000],
      minHaloRadius,
      maxHaloRadius
    );
    this.addMagnitudeHaloLayer("turnout", "point", turnoutRadiusExpression);
    this.addMarkerRings("turnout", "point");
    this.addMarkerIconLayer("turnout", "point");
    this.addCountBadge("turnout", "point");

    // Turnout clusters
    this.addMagnitudeHaloLayer("turnout", "cluster", turnoutRadiusExpression);
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
