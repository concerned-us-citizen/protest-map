import maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon } from "geojson";

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
