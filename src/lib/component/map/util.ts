import { markerColor } from "$lib/colors";
import type { ExpressionSpecification } from "maplibre-gl";
import type { Feature, GeoJsonProperties, Point } from "geojson";
import { nearlyEqual } from "$lib/util/number";

/**
 * Returns true if all Point features are nearly at the same coordinates,
 * using a custom `nearlyEqual(a, b)` function.
 */
export function areFeaturesCoLocated(features: Feature<Point>[]): boolean {
  if (features.length <= 1) return true;

  const [lng0, lat0] = features[0].geometry.coordinates;

  return features.every(({ geometry }) => {
    const [lng, lat] = geometry.coordinates;
    return nearlyEqual(lng, lng0) && nearlyEqual(lat, lat0);
  });
}

export function isPointFeature(
  f: Feature
): f is Feature<Point, GeoJsonProperties> {
  return f.geometry?.type === "Point";
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

export type ClusterOrPoint = "cluster" | "point";

export function buildColorExpression(
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

/**
 * Create a linear-interpolate expression whose pixel sizes are evenly spaced
 * between `minRadius` and `maxRadius`, one stop per `threshold`.
 *
 * @param thresholds  Ascending array of count break-points (e.g. [1, 1 001, …]).
 * @param minRadius   Radius (px) to use at the first threshold.
 * @param maxRadius   Radius (px) to use at the last threshold.
 * @param prop        Name of the property that contains the count. Default "count".
 */
export function buildLinearRadiusExpr(
  thresholds: number[],
  minRadius: number,
  maxRadius: number
): ExpressionSpecification {
  if (thresholds.length < 2)
    throw new Error("Need at least two thresholds (min & max).");

  // Make sure thresholds are strictly ascending
  const sorted = [...new Set(thresholds)].sort((a, b) => a - b);
  if (sorted.length !== thresholds.length)
    console.warn("Duplicate values were removed from thresholds.");

  const n = sorted.length;
  const span = maxRadius - minRadius;

  const expr: (string | number | unknown)[] = [
    "interpolate",
    ["linear"],
    ["get", "count"],
  ];

  sorted.forEach((t, i) => {
    const radius = minRadius + (i / (n - 1)) * span; // even spacing
    expr.push(t, radius);
  });

  return expr as ExpressionSpecification;
}

export function getTerseLabelExpr(prop: string): ExpressionSpecification {
  return [
    "case",

    /* ─────  ≥ 1 000 000  →  #.# M  ───── */
    [">=", ["get", prop], 1_000_000],
    [
      "concat",
      [
        // round(value / 100 000) / 10  ⇒ one decimal place
        "to-string",
        ["/", ["round", ["/", ["*", ["get", prop], 10], 1_000_000]], 10],
      ],
      "M",
    ],

    /* ─────  ≥ 1 000  →  # K, no decimals  ───── */
    [">=", ["get", prop], 1_000],
    ["concat", ["to-string", ["round", ["/", ["get", prop], 1_000]]], "K"],

    /* ─────  < 1 000  →  integer  ───── */
    ["to-string", ["round", ["get", prop]]],
  ] as ExpressionSpecification;
}
