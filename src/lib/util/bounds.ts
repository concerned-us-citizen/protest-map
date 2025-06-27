import type { Bounds } from "$lib/model/RegionModel.svelte";
import type { LngLatBoundsLike, LngLatBounds } from "maplibre-gl";
import type { Polygon } from "geojson";

export type BBox2D = [number, number, number, number];

export function boundsEqual(
  a: Bounds | undefined,
  b: Bounds | undefined,
  epsilon = 1e-6
): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.xmin - b.xmin) < epsilon &&
    Math.abs(a.ymin - b.ymin) < epsilon &&
    Math.abs(a.xmax - b.xmax) < epsilon &&
    Math.abs(a.ymax - b.ymax) < epsilon
  );
}

export function boundsToLngLatBoundsLike(bounds: Bounds): LngLatBoundsLike {
  return [
    [bounds.xmin, bounds.ymin],
    [bounds.xmax, bounds.ymax],
  ];
}

export function boundsFromLngLatBounds(mbBounds: LngLatBounds): Bounds {
  return {
    xmin: mbBounds.getWest(),
    ymin: mbBounds.getSouth(),
    xmax: mbBounds.getEast(),
    ymax: mbBounds.getNorth(),
  };
}

export function bboxToBounds(bboxValue: BBox2D) {
  return {
    xmin: bboxValue[0],
    ymin: bboxValue[1],
    xmax: bboxValue[2],
    ymax: bboxValue[3],
  };
}

export function boundsToPolygon(b: Bounds): Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [b.xmin, b.ymin],
        [b.xmax, b.ymin],
        [b.xmax, b.ymax],
        [b.xmin, b.ymax],
        [b.xmin, b.ymin], // close the ring
      ],
    ],
  };
}
