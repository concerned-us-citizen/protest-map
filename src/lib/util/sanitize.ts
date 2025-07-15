import { browser } from "$app/environment";
import DOMPurify from "dompurify";
import linkifyHtml from "linkify-html";

export function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function safelyBold(text: string, query: string): string {
  if (!text || !query) return escapeHtml(text ?? "");

  const safeExp = new RegExp(escapeRegex(query), "gi");

  // 1 escape everything
  const escaped = escapeHtml(text);

  // 2 wrap matches
  const withMarkup = escaped.replace(safeExp, (m) => `<strong>${m}</strong>`);

  // 3 belt-and-braces: allow only <strong>
  return DOMPurify.sanitize(withMarkup, {
    ALLOWED_TAGS: ["strong"],
    ALLOWED_ATTR: [],
  });
}

export function safelyAddMarkdownAndLinkify(text: string) {
  if (!browser) return "";

  // 1 escape everything
  let html = escapeHtml(text);

  // 2 basic markdown: **bold** and *italic*
  html = html
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 4 wrap naked URLs in <a>
  html = linkify(html);

  // 5 belt-and-braces sanitise
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong", "em", "a", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

export function linkify(text: string) {
  const linkifyOpts = {
    defaultProtocol: "https",
    attributes: {
      target: "_blank",
      rel: "noopener ugc",
    },
  };

  return linkifyHtml(text, linkifyOpts);
}
