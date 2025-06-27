import { deviceInfo } from "./model/DeviceInfo.svelte";
import type { PageState } from "./model/PageState.svelte";

export function onKeyDown(event: KeyboardEvent, pageState: PageState) {
  // Ignore modifiers by themselves
  const modifierKeys = ["Control", "Shift", "Alt", "Meta"];
  if (modifierKeys.includes(event.key)) return;

  // All shortcuts begin with ctrl-option-cmd
  if (!(event.ctrlKey && event.altKey && event.metaKey)) return;

  const code = event.code;

  // Spacebar always toggles playback
  if (code === "Space") {
    pageState.toggleAutoplay();
    event.preventDefault();
    return;
  }

  // Events Filter (F)
  if (code === "KeyF") {
    pageState.overlayModel.toggleFilterVisible();
    event.preventDefault();
    return;
  }

  // Help (I/H)
  if (code === "KeyI" || code === "KeyH") {
    pageState.overlayModel.toggleHelpVisible();
    event.preventDefault();
    return;
  }

  // Jump to Region (J)
  if (code === "KeyJ") {
    pageState.overlayModel.navigationVisible = true;
    event.preventDefault();
    return;
  }

  // Escape
  if (code === "Escape") {
    pageState.overlayModel.helpVisible = false;
    pageState.overlayModel.filterVisible = false;
    event.preventDefault();
    return;
  }

  // Toggle Menu
  if (code === "KeyM") {
    if (deviceInfo.isSmall) {
      pageState.overlayModel.toggleMenuVisible();
    }
  }

  // ArrowLeft
  if (code === "ArrowLeft") {
    pageState.filter.selectPreviousDate();
    pageState.filter.startDateRepeat("prev");
    event.preventDefault();
    return;
  }

  // ArrowRight
  if (code === "ArrowRight") {
    pageState.filter.selectNextDate();
    pageState.filter.startDateRepeat("next");
    event.preventDefault();
    return;
  }

  if (code === "Equal" || code === "KeyZ") {
    event.preventDefault();
    pageState.mapModel.zoomIn();
    return;
  }

  if (code === "Minus" || (code == "KeyZ" && event.shiftKey)) {
    event.preventDefault();
    pageState.mapModel.zoomOut();
    return;
  }

  // Unzoom to last level (U, R, B)
  if (code === "KeyU" || code === "KeyR" || code === "KeyB") {
    event.preventDefault();
    if (pageState.mapModel.canPopBounds) {
      pageState.mapModel.popBounds();
    }
    return;
  }
}

export function onKeyUp(event: KeyboardEvent, pageState: PageState) {
  // All shortcuts begin with shift-option-cmd
  if (!(event.shiftKey && event.altKey && event.metaKey && !event.ctrlKey))
    return;

  const left = "ArrowLeft";
  const right = "ArrowRight";

  if (
    event.key === left ||
    event.code === left ||
    event.key === right ||
    event.code === right
  ) {
    pageState.filter.stopDateRepeat();
  }
}
