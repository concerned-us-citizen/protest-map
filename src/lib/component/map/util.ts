import type { ExpressionSpecification } from "maplibre-gl";

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
