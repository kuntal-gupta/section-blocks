import { sanitizeRichText } from "./sanitize";

/**
 * Admin-authored HTML (course descriptions, blog bodies, CMS text blocks), sanitized here before it is rendered.
 * `tone="light"` is for text on a dark background.
 */
export function RichHtml({ html, tone = "default", className = "" }: { html: unknown; tone?: "default" | "light"; className?: string }) {
  if (typeof html !== "string" || html.trim() === "") return null;
  const classes = ["rich-text", tone === "light" ? "rich-text-light" : "", className].filter(Boolean).join(" ");
  return <div className={classes} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
