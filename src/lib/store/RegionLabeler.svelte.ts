import maplibregl from "maplibre-gl";
import {
  prettifyNamedRegion,
  type Bounds,
  type RegionModel,
  type NamedRegion,
} from "./RegionModel";
import { debounce } from "$lib/util/misc";

export class RegionLabeler {
  #namedRegion = $state<NamedRegion>();

  #map: maplibregl.Map | undefined = undefined;
  #debouncedMoveEnd: () => void;

  #regionModel: RegionModel;

  constructor(
    regionModel: RegionModel,
    private readonly _getPadding: () => maplibregl.PaddingOptions = () => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }),
    debounceMs = 150
  ) {
    this.#regionModel = regionModel;
    this.#debouncedMoveEnd = debounce(this.#onMoveEnd, debounceMs);
  }

  setMapInstance(map: maplibregl.Map) {
    this.#map = map;
    this.#map.on("moveend", this.#debouncedMoveEnd);
  }

  readonly visibleNamedRegion = $derived.by(() => {
    const namedRegion = this.#namedRegion;
    if (!namedRegion) return undefined;

    return prettifyNamedRegion(namedRegion);
  });

  #onMoveEnd = async () => {
    const map = this.#map;
    if (!map) return;

    const padding = this._getPadding();
    const canvas = map.getCanvas();
    const width = canvas.width;
    const height = canvas.height;

    const topLeft = map.unproject([padding.left, padding.top]);
    const bottomRight = map.unproject([
      width - padding.right,
      height - padding.bottom,
    ]);

    const visibleBounds: Bounds = {
      xmin: topLeft.lng,
      ymin: bottomRight.lat,
      xmax: bottomRight.lng,
      ymax: topLeft.lat,
    };

    this.#namedRegion =
      await this.#regionModel.getMatchingNamedRegion(visibleBounds);
    console.log(
      `Viewport matches ${this.#namedRegion?.name}, ${this.#namedRegion?.type}`
    );
  };
}
