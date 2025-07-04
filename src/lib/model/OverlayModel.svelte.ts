const overlayProps = [
  "drawerVisible",
  "helpVisible",
  "shareVisible",
  "toolbarVisible",
  "markerTypePickerVisible",
  "autocompleteVisible",
] as const;

type OverlayProp = (typeof overlayProps)[number];

export class OverlayModel {
  #drawerVisible = $state(false);
  #helpVisible = $state(false);
  #shareVisible = $state(false);
  #toolbarVisible = $state(false);
  #markerTypePickerVisible = $state(false);
  #autocompleteVisible = $state(false);

  get drawerVisible() {
    return this.#drawerVisible;
  }
  set drawerVisible(value: boolean) {
    if (value === true) {
      this.closeAll();
    }
    this.#drawerVisible = value;
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

  get shareVisible() {
    return this.#shareVisible;
  }
  set shareVisible(value: boolean) {
    if (value === true) {
      this.closeAll();
    }
    this.#shareVisible = value;
  }

  get toolbarVisible() {
    return this.#toolbarVisible;
  }
  set toolbarVisible(value: boolean) {
    if (value === true) {
      // Special case - don't close the filter when opening the menu
      const drawerWasVisible = this.drawerVisible;
      this.closeAll();
      this.drawerVisible = drawerWasVisible;
    }
    this.#toolbarVisible = value;
  }

  get markerTypePickerVisible() {
    return this.#markerTypePickerVisible;
  }
  set markerTypePickerVisible(value: boolean) {
    if (value === true) {
      // Special case - don't close the filter when opening the menu
      const drawerWasVisible = this.drawerVisible;
      this.closeAll();
      this.drawerVisible = drawerWasVisible;
    }
    this.#markerTypePickerVisible = value;
  }

  get autocompleteVisible() {
    return this.#autocompleteVisible;
  }
  set autocompleteVisible(value: boolean) {
    if (value === true) {
      // Special case - don't close the filter when opening the menu
      const drawerWasVisible = this.drawerVisible;
      this.closeAll();
      this.drawerVisible = drawerWasVisible;
    }
    this.#autocompleteVisible = value;
  }

  closeAll() {
    for (const overlayProp of overlayProps) {
      this[overlayProp as OverlayProp] = false;
    }
  }

  #toggle(propertyName: OverlayProp) {
    this[propertyName] = !this[propertyName];
  }

  toggleDrawerVisible() {
    this.#toggle("drawerVisible");
  }

  toggleHelpVisible() {
    this.#toggle("helpVisible");
  }

  toggleShareVisible() {
    this.#toggle("shareVisible");
  }

  toggleToolbarVisible() {
    this.#toggle("toolbarVisible");
  }

  toggleMarkerTypePickerVisible() {
    this.#toggle("markerTypePickerVisible");
  }

  toggleAutocompleteVisible() {
    this.#toggle("autocompleteVisible");
  }

  showingDialog = $derived.by(() => {
    const helpVisible = this.helpVisible;
    const shareVisible = this.shareVisible;

    return helpVisible || shareVisible;
  });
}
