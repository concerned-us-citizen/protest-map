import type { RegionModel } from "../model/RegionModel";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
  Polygon,
} from "geojson";

const REGION_SOURCE_ID = "region-bounds";
const LABEL_SOURCE_ID = "region-label-points";

export async function addVisibleNamedRegions(
  map: maplibregl.Map,
  regionModel: RegionModel
) {
  const emptyFeatureCollection: FeatureCollection<Geometry> = {
    type: "FeatureCollection",
    features: [],
  };

  map.addSource(REGION_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection,
  });

  map.addSource(LABEL_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection,
  });

  map.addLayer({
    id: "region-fill",
    type: "fill",
    source: REGION_SOURCE_ID,
    paint: {
      "fill-color": "#088",
      "fill-opacity": 0.1,
    },
  });

  map.addLayer({
    id: "region-outline",
    type: "line",
    source: REGION_SOURCE_ID,
    paint: {
      "line-color": "#088",
      "line-width": 2,
    },
  });

  map.addLayer({
    id: "region-label-points",
    type: "symbol",
    source: LABEL_SOURCE_ID,
    layout: {
      "text-field": ["get", "label"],
      "text-anchor": "bottom-right",
      "text-offset": [0, -0.5],
      "text-size": 12,
    },
    paint: {
      "text-color": "#000",
      "text-halo-color": "#fff",
      "text-halo-width": 1,
    },
  });

  async function updateData() {
    const bounds = map.getBounds();
    const regions = await regionModel.getNamedRegionsWithin({
      xmin: bounds.getWest(),
      ymin: bounds.getSouth(),
      xmax: bounds.getEast(),
      ymax: bounds.getNorth(),
    });

    if (!regions) {
      return; // BOGUS? - won't clear when undefined, will it ever be undefined, or always empty collection?
    }

    const polygonFeatures: Feature<Polygon>[] = regions.map((region) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [region.xmin, region.ymin],
            [region.xmax, region.ymin],
            [region.xmax, region.ymax],
            [region.xmin, region.ymax],
            [region.xmin, region.ymin],
          ],
        ],
      },
      properties: {
        label: `${region.type}: ${region.name}`,
      },
    }));

    const labelFeatures: Feature<Point>[] = regions.map((region) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [region.xmax, region.ymin],
      },
      properties: {
        label: `${region.type}: ${region.name}`,
      },
    }));

    (map.getSource(REGION_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: polygonFeatures,
    });

    (map.getSource(LABEL_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: labelFeatures,
    });
  }

  map.on("moveend", updateData);
  updateData();
}
