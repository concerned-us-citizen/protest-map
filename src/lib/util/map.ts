import type { LatLngExpression } from "leaflet";

export function toLatLngLiteral(expr: LatLngExpression): {
  lat: number;
  lng: number;
} {
  if (Array.isArray(expr)) {
    // Leaflet's LatLngTuple: [lat, lng]
    return { lat: expr[0], lng: expr[1] };
  } else if ("lat" in expr && "lng" in expr) {
    // LatLng or LatLngLiteral
    return { lat: expr.lat, lng: expr.lng };
  }
  throw new Error("Invalid LatLngExpression");
}

export function latLngsMatch(
  a: LatLngExpression,
  b: LatLngExpression,
  tolerance = 2
) {
  const aa = toLatLngLiteral(a);
  const bb = toLatLngLiteral(b);
  return (
    Math.abs(aa.lat - bb.lat) < tolerance &&
    Math.abs(aa.lng - bb.lng) < tolerance
  );
}
