import type { Map as MapLibreMap } from "maplibre-gl";
import type { MultiPolygon, Polygon } from "geojson";
import type { NamedRegion } from "$lib/model/RegionModel";

const REGION_SOURCE_ID = "region-polygon";

export function createRegionPolygonLayer(map: MapLibreMap) {
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

export async function updateRegionPolygonLayer(
  map: MapLibreMap | undefined,
  namedRegion: NamedRegion | undefined,
  getPolygonForNamedRegion: (
    _namedRegion: NamedRegion
  ) => Promise<Polygon | MultiPolygon | undefined>
) {
  if (!map) return;

  const polygon = namedRegion
    ? await getPolygonForNamedRegion(namedRegion)
    : undefined;

  const source = map.getSource(REGION_SOURCE_ID) as maplibregl.GeoJSONSource;
  if (!source) return;

  source.setData({
    type: "FeatureCollection",
    features: polygon
      ? [{ type: "Feature", geometry: polygon, properties: {} }]
      : [],
  });
}
