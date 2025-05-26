import type { Action } from "svelte/action";

export const clickOutside: Action<HTMLElement, () => void> = (
  node,
  callback
) => {
  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    // Check if clicked outside the node, and not default prevented
    if (node && !node.contains(target) && !event.defaultPrevented) {
      // Walk up ancestors from event.target, checking for attribute
      let el = target;
      while (el) {
        if (el.hasAttribute && el.hasAttribute("data-suppress-click-outside")) {
          return; // Suppress click outside behavior
        }
        el = el.parentElement;
      }
      callback();
    }
  };

  document.addEventListener("click", handleClick, true);

  return {
    destroy() {
      document.removeEventListener("click", handleClick, true);
    },
  };
};
