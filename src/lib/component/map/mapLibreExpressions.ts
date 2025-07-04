import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";

const colorClusterProperties = {
  red: ["+", ["case", ["<", ["coalesce", ["get", "pct"], 0], 0], 1, 0]],
  blue: ["+", ["case", [">", ["coalesce", ["get", "pct"], 0], 0], 1, 0]],
  unavail: ["+", ["case", ["!", ["has", "pct"]], 1, 0]],
};

export const colorsAndCountClusterProperties = {
  ...colorClusterProperties,
  count: ["+", ["get", "count"]],
};

export const countRadiusExpr: DataDrivenPropertyValueSpecification<number> = [
  "+",
  4,
  ["*", 0.045, ["sqrt", ["get", "count"]]],
];
