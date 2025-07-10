export function togglePopover(id: string) {
  const popover = document.getElementById(id);
  popover?.togglePopover();
}

export function showPopover(id: string) {
  const popover = document.getElementById(id);
  popover?.showPopover();
}

export function isPopoverVisible(id: string): boolean {
  const popover = document.getElementById(id);

  if (!popover) {
    return false;
  }

  // Check if element has popover attribute and is open
  return popover.hasAttribute("popover") && popover.matches(":popover-open");
}
