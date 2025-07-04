import type { MarkerType } from "$lib/types";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";

function getTerseLabelExpr(prop: string) {
  return [
    "case",

    /* ≥ 1 000 000  →  #.# M  */
    [">=", ["get", prop], 1_000_000],
    [
      "concat",
      [
        "number-format",
        ["/", ["get", prop], 1_000_000],
        { "max-fraction-digits": 1 },
      ],
      "M",
    ],

    /* ≥ 1 000      →  #K or #.# K  */
    [">=", ["get", prop], 1_000],
    [
      "concat",
      [
        "number-format",
        ["/", ["get", prop], 1_000],
        {
          "min-fraction-digits": 0,
          "max-fraction-digits": ["case", [">=", ["get", prop], 10_000], 1, 0],
        },
      ],
      "K",
    ],

    /* < 1 000      →  plain integer */
    ["number-format", ["get", prop], {}], // ← empty options object is required
  ] as ExpressionSpecification;
}

export function addClusterMarkerLayers(
  map: maplibregl.Map,
  prefix: MarkerType
) {
  // cluster background marker
  map.addLayer({
    id: `${prefix}-cluster-icon`,
    type: "symbol",
    source: "markers",
    filter: ["has", "point_count"],
    layout: {
      "icon-image": [
        "case",
        [
          "all",
          [">", ["coalesce", ["get", "red"], 0], 0],
          [">", ["coalesce", ["get", "blue"], 0], 0],
        ],
        `${prefix}-marker-purple`,
        [
          "all",
          [">", ["coalesce", ["get", "blue"], 0], 0],
          ["==", ["coalesce", ["get", "red"], 0], 0],
        ],
        `${prefix}-marker-blue`,
        [
          "all",
          [">", ["coalesce", ["get", "red"], 0], 0],
          ["==", ["coalesce", ["get", "blue"], 0], 0],
        ],
        `${prefix}-marker-red`,
        `${prefix}-marker-unavailable`,
      ],
      "icon-size": 0.5,
      "icon-allow-overlap": true,
    },
  });

  // white badge background
  map.addLayer({
    id: `${prefix}-cluster-badge`,
    type: "circle",
    source: "markers",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#fff",
      "circle-stroke-color": "#000",
      "circle-stroke-width": 1,

      // Make space for bigger numbers
      // 0–9 → 8 px, 10–99 → 10 px, 100-up → 12 px
      "circle-radius": [
        "step",
        ["get", "count"],
        8,
        10,
        10,
        100,
        12,
        1000,
        14,
        10000,
        16,
      ],

      // push it down & right ~12 px (tweak to taste)
      "circle-translate": [12, 12],
      "circle-translate-anchor": "viewport",
    },
  });

  // count label
  map.addLayer({
    id: `${prefix}-cluster-count`,
    type: "symbol",
    source: "markers",
    filter: ["has", "point_count"],
    layout: {
      "text-field": getTerseLabelExpr("count"),
      "text-font": ["Noto Sans Bold"],
      "text-size": 10,
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
}
