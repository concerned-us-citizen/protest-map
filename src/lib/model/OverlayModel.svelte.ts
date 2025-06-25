const overlayProps = [
  "filterVisible",
  "helpVisible",
  "navigationVisible",
  "shareVisible",
  "menuVisible",
] as const;

type OverlayProp = (typeof overlayProps)[number];

export class OverlayModel {
  #filterVisible = $state(false);
  #helpVisible = $state(false);
  #navigationVisible = $state(false);
  #shareVisible = $state(false);
  #menuVisible = $state(false);

  get filterVisible() {
    return this.#filterVisible;
  }
  set filterVisible(value: boolean) {
    if (value === true) {
      this.closeAll();
    }
    this.#filterVisible = value;
  }

  get helpVisible() {
    return this.#helpVisible;
  }
  set helpVisible(value: boolean) {
    if (value === true) {
      this.closeAll();
    }
    this.#helpVisible = value;
  }

  get navigationVisible() {
    return this.#navigationVisible;
  }
  set navigationVisible(value: boolean) {
    if (value === true) {
      this.closeAll();
    }
    this.#navigationVisible = value;
  }

  get shareVisible() {
    return this.#shareVisible;
  }
  set shareVisible(value: boolean) {
    if (value === true) {
      this.closeAll();
    }
    this.#shareVisible = value;
  }

  get menuVisible() {
    return this.#menuVisible;
  }
  set menuVisible(value: boolean) {
    if (value === true) {
      // Special case - don't close the filter when opening the menu
      const filterWasVisible = this.filterVisible;
      this.closeAll();
      this.filterVisible = filterWasVisible;
    }
    this.#menuVisible = value;
  }

  closeAll() {
    for (const overlayProp of overlayProps) {
      this[overlayProp as OverlayProp] = false;
    }
  }

  #toggle(propertyName: OverlayProp) {
    this[propertyName] = !this[propertyName];
  }

  toggleFilterVisible() {
    this.#toggle("filterVisible");
  }

  toggleHelpVisible() {
    this.#toggle("helpVisible");
  }

  toggleNavigationVisible() {
    this.#toggle("navigationVisible");
  }

  toggleShareVisible() {
    this.#toggle("shareVisible");
  }

  toggleMenuVisible() {
    this.#toggle("menuVisible");
  }

  showingDialog = $derived.by(() => {
    const helpVisible = this.helpVisible;
    const navigationVisible = this.navigationVisible;
    const shareVisible = this.shareVisible;

    return helpVisible || navigationVisible || shareVisible;
  });
}
