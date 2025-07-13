import { regionNavigationDialogId } from "./component/dialog/RegionNavigationDialog.svelte";
import type { PageState } from "./model/PageState.svelte";
import { togglePopover } from "./component/popover";
import { protestMapTourId } from "./component/dialog/ProtestMapTour.svelte";

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

  // Toggle Filter (Q)
  if (code === "KeyQ") {
    pageState.toggleFilterVisible();
    event.preventDefault();
    return;
  }

  // Toggle Navigation (F)
  if (code === "KeyF") {
    togglePopover(regionNavigationDialogId);
    event.preventDefault();
    return;
  }

  // View entire US (C)
  if (code === "KeyC") {
    pageState.filter.clearAllFilters();
    pageState.mapModel.navigateToUS();
  }

  // Help (I)
  if (code === "KeyI") {
    pageState.toggleInfoPanelsVisible();
    event.preventDefault();
    return;
  }

  // Help (H)
  if (code === "KeyH") {
    togglePopover(protestMapTourId);
    event.preventDefault();
    return;
  }

  // Toggle Toolbar Visible
  if (code === "KeyM") {
    pageState.toggleToolbarVisible();
  }

  // ArrowLeft
  if (code === "ArrowLeft") {
    pageState.filter.selectPreviousDate();
    if (event.repeat) {
      pageState.filter.startDateRepeat("prev");
    }
    event.preventDefault();
    return;
  }

  // ArrowRight
  if (code === "ArrowRight") {
    pageState.filter.selectNextDate();
    if (event.repeat) {
      pageState.filter.startDateRepeat("next");
    }
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

  // Unzoom to last level (U, B)
  if (code === "KeyU" || code === "KeyB") {
    event.preventDefault();
    if (pageState.mapModel.canPopBounds) {
      pageState.mapModel.popBounds();
    }
    return;
  }
}
