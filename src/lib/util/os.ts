export function isMac() {
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
