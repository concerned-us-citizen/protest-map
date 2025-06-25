export class DeviceInfo {
  #width = $state(typeof window !== "undefined" ? window.innerWidth : 0);
  #height = $state(typeof window !== "undefined" ? window.innerHeight : 0);
  #isTouchDevice = $state(false);

  /*
   * TODO need a better strategy for sharing breakpoints. They aren't currently, since
   * media queries can't use css variables, and we can't dynamically set the width from a TS variable unless
   * we want to use svelte:head.  So when making changes to the below, search for BREAKPOINT.
   */
  static wideBreakpoint = 768;
  static tallBreakpoint = 600;
  static shortBreakpoint = 400;

  readonly isWide = $derived(this.#width >= DeviceInfo.wideBreakpoint);
  readonly isNarrow = $derived(this.#width <= DeviceInfo.wideBreakpoint);
  readonly isTall = $derived(this.#height >= DeviceInfo.tallBreakpoint);
  readonly isShort = $derived(this.height <= DeviceInfo.shortBreakpoint);
  readonly isTouchDevice = $derived(this.#isTouchDevice);
  readonly isSmall = $derived(this.isShort || !this.isWide);

  readonly tapOrClick = $derived(this.#isTouchDevice ? "tap" : "click");
  readonly tappingOrClicking = $derived(
    this.#isTouchDevice ? "tapping" : "clicking"
  );

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
