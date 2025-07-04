import maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon } from "geojson";

// Usage: for debugging specific rects, put this into the onMount() method
// addDebugRectangles(safeMap, [
//   {
//     xmin: -176.69228269495915,
//     ymin: 12.243896977924578,
//     xmax: -59.307717305039034,
//     ymax: 70.94777181706402,
//   },
//   {
//     xmin: -174.81111978806948,
//     ymin: 13.648410237882132,
//     xmax: -61.18888021192912,
//     ymax: 70.47169403678646,
//   },
// ]);

export type Bounds = {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
};

export function addDebugRectangles(
  map: maplibregl.Map,
  rectangles: Bounds[],
  sourceId = "bounds-rectangles",
  layerId = "bounds-rectangles-fill"
) {
  const features: Feature<Polygon>[] = rectangles.map((b, i) => ({
    type: "Feature",
    id: i,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [b.xmin, b.ymin],
          [b.xmax, b.ymin],
          [b.xmax, b.ymax],
          [b.xmin, b.ymax],
          [b.xmin, b.ymin],
        ],
      ],
    },
    properties: {},
  }));

  const geojson: FeatureCollection<Polygon> = {
    type: "FeatureCollection",
    features,
  };

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource(sourceId, {
      type: "geojson",
      data: geojson,
    });

    map.addLayer({
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "red",
        "fill-opacity": 0.3,
      },
    });
  }
}
