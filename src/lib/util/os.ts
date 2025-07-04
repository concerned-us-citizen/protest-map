import { browser } from "$app/environment";

export function isMac() {
  if (!browser) return false;
  return (
    navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
    navigator.platform.toUpperCase().indexOf("IPAD") >= 0 || // iPads often mimic Mac for some APIs
    navigator.platform.toUpperCase().indexOf("IPHONE") >= 0
  );
}

export function getShortcutPrefix(): string {
  if (isMac()) {
    // macOS glyphs:
    // ⌘ (Command) - Unicode U+2318
    // ⌥ (Option / Alt) - Unicode U+2325
    // ⌃ (Control) - Unicode U+2303
    // ⇧ (Shift) - Unicode U+21E7
    return "⌘⌥⌃ "; // Cmd + Option + Control +
  } else {
    // PC (Windows/Linux)
    return "Ctrl+Alt+Shift+"; // If you literally need all three
    // Or if your shortcut is actually Ctrl+Alt+J
    // return "Ctrl+Alt+";
  }
}

export async function safeCopyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback using older execCommand API
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  } catch (err) {
    console.error("Copy failed:", err);
  }
}
