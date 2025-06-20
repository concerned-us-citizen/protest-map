import type { Bounds } from "$lib/store/RegionModel";
import type { LngLatBoundsLike, LngLatBounds } from "maplibre-gl";

export type BBox2D = [number, number, number, number];

export function boundsEqual(a: Bounds, b: Bounds, epsilon = 1e-6): boolean {
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
