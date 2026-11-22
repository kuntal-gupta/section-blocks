/**
 * Server-side HTML sanitizer for CMS content, with no dependencies. It does not try to clean the original markup.
 * It rebuilds the output from an allowlist: unknown tags are dropped (their text is kept), script, style and similar
 * elements are removed with their content, comments are dropped, and each attribute is written again from a per-tag
 * allowlist with its value checked. A "<" that does not start a valid tag is escaped as text.
 *
 * Only use it on the server (it is plain string work, so it is safe in server components and route handlers).
 */

const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "caption", "col", "colgroup", "div", "em", "figcaption", "figure", "h1", "h2", "h3",
  "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "s", "small", "span", "strong", "sub", "sup", "table", "tbody",
  "td", "tfoot", "th", "thead", "tr", "u", "ul",
]);
const VOID_TAGS = new Set(["br", "col", "hr", "img"]);
/** Elements whose content is dropped with them, because their text is code or hidden fallback. */
const DROP_WITH_CONTENT = new Set([
  "applet", "audio", "canvas", "embed", "frame", "frameset", "head", "iframe", "math", "noframes", "noscript", "object",
  "script", "select", "style", "svg", "template", "textarea", "title", "video",
]);

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", apos: "'", colon: ":", gt: ">", lt: "<", newline: "\n", nbsp: " ", num: "#", period: ".", quot: '"', sol: "/", tab: "\t",
};

const STYLE_RULES: Record<string, RegExp> = {
  "background-color": /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.,%\s]+\)|[a-z]{3,20})$/i,
  color: /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.,%\s]+\)|[a-z]{3,20})$/i,
  "font-size": /^\d{1,3}(\.\d{1,2})?(px|pt|em|rem|%)$/i,
  "font-style": /^(normal|italic)$/i,
  "font-weight": /^(normal|bold|[1-9]00)$/i,
  "text-align": /^(left|right|center|justify)$/i,
  "text-decoration": /^(none|underline|line-through)$/i,
};

/** Decodes the entities an attribute value can hide a scheme or markup in, so the checks see the real value. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * A URL that is safe to put in an href (`link`) or src (`image`), or null. Allowed: http(s), relative paths and,
 * for links only, mailto and tel. Everything else (javascript:, data:, protocol-relative URLs) is refused.
 */
export function safeUrl(value: unknown, kind: "link" | "image"): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.length > 2000) return null;
  // Browsers ignore tabs, newlines and control characters inside a scheme, so strip them before checking.
  const compact = v.replace(/[\u0000- \u007f-\u009f]/g, "");
  if (compact.startsWith("//") || compact.startsWith("\\")) return null;
  if (compact.startsWith("#")) return kind === "link" ? v : null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (scheme) {
    const s = scheme[1].toLowerCase();
    if (s === "http" || s === "https") return v;
    if (kind === "link" && (s === "mailto" || s === "tel")) return v;
    return null;
  }
  return v; // a relative path, such as "/courses" or "images/logo.png"
}

function cleanStyle(value: string): string | null {
  const declarations: string[] = [];
  for (const part of value.split(";")) {
    const at = part.indexOf(":");
    if (at < 0) continue;
    const prop = part.slice(0, at).trim().toLowerCase();
    const val = part.slice(at + 1).trim();
    const rule = STYLE_RULES[prop];
    if (rule && rule.test(val)) declarations.push(`${prop}: ${val}`);
  }
  return declarations.length > 0 ? declarations.join("; ") : null;
}

const digits = (value: string) => (/^\d{1,4}$/.test(value.trim()) ? value.trim() : null);

/** The checked value for one attribute of one tag, or null to drop it. `value` is already entity-decoded. */
function attrValue(tag: string, name: string, value: string): string | null {
  if (name === "style") return cleanStyle(value);
  if (tag === "a") {
    if (name === "href") return safeUrl(value, "link");
    if (name === "title") return value;
    if (name === "target") return value.trim().toLowerCase() === "_blank" ? "_blank" : null;
  }
  if (tag === "img") {
    if (name === "src") return safeUrl(value, "image");
    if (name === "alt" || name === "title") return value;
    if (name === "width" || name === "height") return digits(value);
  }
  if (tag === "td" || tag === "th") {
    if (name === "colspan" || name === "rowspan") return digits(value);
    if (tag === "th" && name === "scope") return /^(row|col)$/.test(value) ? value : null;
  }
  if ((tag === "col" || tag === "colgroup") && name === "span") return digits(value);
  return null;
}

function renderAttrs(tag: string, raw: string): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const m of raw.matchAll(ATTR)) {
    const name = m[1].toLowerCase();
    if (seen.has(name)) continue;
    const value = attrValue(tag, name, decodeEntities(m[2] ?? m[3] ?? m[4] ?? ""));
    if (value === null) continue;
    seen.add(name);
    parts.push(`${name}="${escapeAttr(value)}"`);
  }
  if (tag === "a" && seen.has("target")) parts.push('rel="noopener noreferrer"');
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

/** Sanitizes CMS HTML for display. The result is safe to pass to dangerouslySetInnerHTML. */
export function sanitizeRichText(input: string): string {
  const html = String(input ?? "");
  let out = "";
  let i = 0;
  while (i < html.length) {
    if (html[i] !== "<") {
      const next = html.indexOf("<", i);
      const end = next === -1 ? html.length : next;
      out += html.slice(i, end);
      i = end;
      continue;
    }
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[i + 1] === "!" || html[i + 1] === "?") {
      const end = html.indexOf(">", i);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    TAG.lastIndex = i;
    const m = TAG.exec(html);
    if (!m) {
      out += "&lt;";
      i++;
      continue;
    }
    i = TAG.lastIndex;
    const closing = m[1] === "/";
    const name = m[2].toLowerCase();

    if (!closing && DROP_WITH_CONTENT.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, "ig");
      close.lastIndex = i;
      const end = close.exec(html);
      i = end ? close.lastIndex : html.length;
      continue;
    }
    if (!ALLOWED_TAGS.has(name)) continue; // dropped, its text stays
    if (closing) {
      if (!VOID_TAGS.has(name)) out += `</${name}>`;
      continue;
    }
    out += `<${name}${renderAttrs(name, m[3])}>`;
  }
  return out;
}
