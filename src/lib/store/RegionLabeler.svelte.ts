import maplibregl from "maplibre-gl";
import {
  prettifyRegionName,
  type Bounds,
  type BoundsType,
  type RegionModel,
} from "./RegionModel";
import { debounce } from "$lib/util/misc";

export class RegionLabeler {
  #name = $state<string | undefined>(undefined);
  #type = $state<BoundsType>("unnamed");

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

  readonly visibleRegionName = $derived.by(() => {
    if (!this.#name) return "US";
    return prettifyRegionName(this.#name, this.#type);
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

    const region = await this.#regionModel.getMatchingRegion(visibleBounds);

    this.#name = region?.name;
    this.#type = region?.type ?? "unnamed";
    console.log(`Viewport matches ${this.#name}, ${this.#type}`);
  };
}
