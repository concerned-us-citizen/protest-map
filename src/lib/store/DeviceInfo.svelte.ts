export class DeviceInfo {
  #width = $state(typeof window !== "undefined" ? window.innerWidth : 0);
  #height = $state(typeof window !== "undefined" ? window.innerHeight : 0);
  #isTouchDevice = $state(false);

  static wideBreakpoint = 768;
  static tallBreakpoint = 600;

  readonly isWide = $derived(this.#width >= DeviceInfo.wideBreakpoint);
  readonly isTall = $derived(this.#height >= DeviceInfo.tallBreakpoint);
  readonly isTouchDevice = $derived(this.#isTouchDevice);

  get width() {
    return this.#width;
  }
  get height() {
    return this.#height;
  }

  _update(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  constructor() {
    if (typeof window !== "undefined") {
      // Detect touch device
      this.#isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      const handleResize = () =>
        this._update(window.innerWidth, window.innerHeight);
      window.addEventListener("resize", handleResize);
      handleResize();
    }
  }
}

export const deviceInfo = new DeviceInfo();
