/**
 * Page block definitions shared by the admin app (validates and edits blocks) and the public site (renders them).
 * Change a block here, in one place. Both apps import this package; neither keeps its own copy of the field list.
 *
 * Rules:
 * - A page's `sections` is a list of objects, each with a string `type`.
 * - Known types are checked against their field spec below. Unknown types are kept as they are, so a newer public
 *   site can add blocks before the admin knows them.
 * - Fields are either at the top of the block or inside `content` (the front reads both).
 * - Nested blocks (`custom`, `columns`) are checked recursively, up to MAX_DEPTH.
 */

export const MAX_SECTIONS = 500;
export const MAX_SECTIONS_BYTES = 1_000_000;
export const MAX_DEPTH = 4;
export const MAX_TEXT = 500;
export const MAX_HTML = 20_000;

/**
 * "strings": a list of plain text lines (trust points, audience points). "link": one button, { label, href }. "block-lists": the columns of a columns block, each column a list of blocks.
 * These match the shape the public site reads and the shape already stored on pages.
 */
export type FieldKind = "text" | "html" | "url" | "image" | "number" | "enum" | "boolean" | "list" | "blocks" | "block-lists" | "link" | "strings" | "devices";

/**
 * Screen sizes a block can be shown or hidden on. The front maps them to its breakpoints:
 * phone < 768px, tablet 768–1023px, desktop 1024px and up.
 */
export const DEVICES = ["phone", "tablet", "desktop"] as const;
export type Device = (typeof DEVICES)[number];
export const DEVICE_LABELS: Record<Device, string> = { phone: "Phone", tablet: "Tablet", desktop: "Desktop" };

export type FieldSpec = {
  key: string;
  kind: FieldKind;
  label: string;
  required?: boolean;
  /** Max length for text and html, max count for list, max value for number. */
  max?: number;
  /** Allowed values for enum fields. */
  options?: readonly string[];
  /** Shape of each item for list fields: the fields of one item. */
  item?: readonly FieldSpec[];
};

export type BlockSpec = {
  type: string;
  label: string;
  fields: readonly FieldSpec[];
};

const text = (key: string, label: string, required = false, max = MAX_TEXT): FieldSpec => ({ key, kind: "text", label, required, max });
const html = (key: string, label: string, required = false): FieldSpec => ({ key, kind: "html", label, required, max: MAX_HTML });
/** Links can be long (Google Maps links); the front accepts up to 2000 characters, so the same limit applies here. */
const MAX_URL = 2000;
const url = (key: string, label: string, required = false): FieldSpec => ({ key, kind: "url", label, required, max: MAX_URL });
const image = (key: string, label: string, required = false): FieldSpec => ({ key, kind: "image", label, required, max: MAX_TEXT });
const level = (): FieldSpec => ({ key: "level", kind: "enum", label: "Heading level", options: ["h1", "h2", "h3", "h4"] });
const alignment = (): FieldSpec => ({ key: "alignment", kind: "enum", label: "Alignment", options: ["left", "center"] });
const bgClass = (): FieldSpec => ({ key: "bgClass", kind: "enum", label: "Background", options: [] });
const intro: FieldSpec[] = [text("heading", "Heading"), text("subtitle", "Subtitle"), html("description", "Description")];
/** On every block: the devices it is hidden on. Empty or missing means shown everywhere. */
const hideOn = (): FieldSpec => ({ key: "hide", kind: "devices", label: "Hide on", options: DEVICES });

const linkItem: readonly FieldSpec[] = [text("label", "Label", true), url("href", "Link", true)];

/** Every block type the public site renders today. Keep in step with alodrivingschool-front/src/components/page-sections.tsx. */
const BASE_BLOCKS: readonly BlockSpec[] = [
  { type: "hero", label: "Hero band", fields: [text("badge", "Badge"), text("heading", "Heading", true), text("subtitle", "Subtitle"), html("description", "Description"), image("image", "Image"), bgClass(), { key: "primaryCta", kind: "link", label: "Primary button" }, { key: "secondaryCta", kind: "link", label: "Secondary button" }] },
  { type: "heading", label: "Heading", fields: [text("text", "Text", true), level(), alignment()] },
  { type: "paragraph", label: "Paragraph", fields: [text("text", "Text", true, MAX_HTML)] },
  { type: "text", label: "Rich text", fields: [html("html", "Content", true)] },
  { type: "image", label: "Image", fields: [image("src", "Image", true), text("alt", "Alt text"), text("caption", "Caption")] },
  { type: "spacer", label: "Spacer", fields: [{ key: "height", kind: "enum", label: "Height", options: ["sm", "md", "lg", "xl"] }] },
  { type: "divider", label: "Divider", fields: [] },
  { type: "button", label: "Buttons", fields: [{ key: "buttons", kind: "list", label: "Buttons", max: 4, item: linkItem }] },
  { type: "custom", label: "Group of blocks", fields: [bgClass(), { key: "blocks", kind: "blocks", label: "Blocks" }] },
  { type: "columns", label: "Columns", fields: [{ key: "stack", kind: "enum", label: "Stack into one column on", options: ["phone", "tablet", "never"] }, { key: "columns", kind: "block-lists", label: "Columns", max: 4 }] },
  { type: "grid", label: "Card grid", fields: [...intro, { key: "columns", kind: "enum", label: "Columns", options: ["2", "3", "4"] }, { key: "mobileColumns", kind: "enum", label: "Columns on phones", options: ["1", "2"] }, { key: "items", kind: "list", label: "Cards", max: 24, item: [text("title", "Title"), html("description", "Text"), image("icon", "Icon")] }] },
  { type: "benefits", label: "Benefits", fields: [...intro, { key: "items", kind: "list", label: "Benefits", max: 12, item: [text("title", "Title", true), html("description", "Text")] }] },
  { type: "trust", label: "Trust bar", fields: [...intro, { key: "items", kind: "strings", label: "Items", max: 12 }, { key: "showContact", kind: "boolean", label: "Show contact details" }] },
  { type: "audience", label: "Who it's for", fields: [...intro, image("image", "Image"), { key: "items", kind: "strings", label: "Points", max: 12 }] },
  { type: "process", label: "Steps", fields: [...intro, { key: "steps", kind: "list", label: "Steps", max: 12, item: [text("title", "Title", true), html("description", "Text")] }] },
  { type: "faq", label: "FAQ", fields: [...intro, { key: "items", kind: "list", label: "Questions", max: 50, item: [text("question", "Question", true), html("answer", "Answer", true)] }] },
  { type: "course-cards", label: "Course cards", fields: [...intro, { key: "limit", kind: "number", label: "How many", max: 12 }, { key: "showOnHome", kind: "boolean", label: "Only courses shown on home" }] },
  { type: "car-lessons-booking", label: "Car lessons booking", fields: [text("bookingHeading", "Heading")] },
  { type: "road-test-booking", label: "Road test booking", fields: [text("bookingHeading", "Heading")] },
  // Blocks from the old app's block builder (custom sections), ported with the same fields.
  { type: "icon-card", label: "Icon cards", fields: [...intro, { key: "layout", kind: "enum", label: "Columns", options: ["grid-2", "grid-3", "grid-4"] }, { key: "items", kind: "list", label: "Cards", max: 12, item: [text("icon", "Icon (emoji)"), text("title", "Title", true), html("description", "Text")] }] },
  { type: "quote", label: "Quote", fields: [html("text", "Quote", true), text("author", "Author")] },
  { type: "testimonial", label: "Testimonials", fields: [{ key: "layout", kind: "enum", label: "Layout", options: ["single", "grid-2", "grid-3"] }, { key: "items", kind: "list", label: "Testimonials", max: 12, item: [text("quote", "Quote", true, MAX_HTML), text("author", "Author", true), text("role", "Role or title"), image("avatar", "Photo")] }] },
  { type: "stats", label: "Stats", fields: [{ key: "layout", kind: "enum", label: "Columns", options: ["2-col", "3-col", "4-col"] }, { key: "items", kind: "list", label: "Stats", max: 12, item: [text("value", "Number", true), text("suffix", "Suffix (e.g. +, K, %)"), text("label", "Label", true)] }] },
  { type: "callout", label: "Callout", fields: [{ key: "variant", kind: "enum", label: "Type", options: ["info", "warning", "success", "error"] }, text("title", "Title"), html("html", "Content", true)] },
  { type: "contact-info", label: "Contact details", fields: [text("address", "Address"), text("phone", "Phone"), text("email", "Email"), text("hours", "Hours")] },
  { type: "map-embed", label: "Map", fields: [url("url", "Google Maps embed link"), text("address", "Address (if no embed link)"), text("height", "Height in pixels")] },
  { type: "video", label: "Video", fields: [url("url", "Video link (YouTube, Vimeo or video file)", true), { key: "alignment", kind: "enum", label: "Alignment", options: ["left", "center", "right"] }, { key: "width", kind: "enum", label: "Width", options: ["full", "half", "third"] }] },
  { type: "pricing", label: "Pricing table", fields: [text("title", "Table title"), html("note", "Note"), { key: "items", kind: "list", label: "Prices", max: 30, item: [text("label", "Label", true), text("price", "Price", true)] }] },
  { type: "blog-cards", label: "Blog posts", fields: [...intro, { key: "limit", kind: "number", label: "How many", max: 12 }] },
  // From the old app's section builder: Google reviews, with an optional link to the business's reviews on Google.
  { type: "google-reviews", label: "Google reviews", fields: [text("title", "Title"), text("subtitle", "Subtitle"), { key: "reviews", kind: "list", label: "Reviews", max: 24, item: [text("reviewerName", "Reviewer name"), text("review", "Review", true, MAX_HTML), { key: "rating", kind: "number", label: "Stars (1 to 5)", max: 5 }] }, url("googleBusinessUrl", "Google business reviews link"), text("buttonLabel", "Button text")] },
];

/** Every block type, each with the shared "Hide on" setting added to its own fields. */
export const BLOCKS: readonly BlockSpec[] = BASE_BLOCKS.map((b) => ({ ...b, fields: [...b.fields, hideOn()] }));

const BY_TYPE = new Map(BLOCKS.map((b) => [b.type, b]));

export function blockSpec(type: string): BlockSpec | undefined {
  return BY_TYPE.get(type);
}

export type Section = { type: string; [key: string]: unknown };
export type ValidResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Checks one value against a field spec. Returns an error message, or null when it is fine. */
function checkField(spec: FieldSpec, value: unknown, path: string, depth: number): string | null {
  if (value === undefined || value === null || value === "") {
    return spec.required ? `${path} is required.` : null;
  }
  switch (spec.kind) {
    case "text":
    case "html":
    case "url":
    case "image":
      if (typeof value !== "string") return `${path} must be text.`;
      if (spec.max && value.length > spec.max) return `${path} is too long (max ${spec.max} characters).`;
      return null;
    case "number":
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return `${path} must be a whole number of 1 or more.`;
      if (spec.max && value > spec.max) return `${path} must be at most ${spec.max}.`;
      return null;
    case "boolean":
      return typeof value === "boolean" ? null : `${path} must be true or false.`;
    case "enum":
      if (typeof value !== "string") return `${path} must be text.`;
      return spec.options && spec.options.length > 0 && !spec.options.includes(value) ? `${path} must be one of: ${spec.options.join(", ")}.` : null;
    case "list": {
      if (!Array.isArray(value)) return `${path} must be a list.`;
      if (spec.max && value.length > spec.max) return `${path} can have at most ${spec.max} items.`;
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${path} item ${i + 1}`;
        if (!isObject(value[i])) return `${itemPath} must be an object.`;
        const err = checkFields(spec.item ?? [], value[i] as Record<string, unknown>, itemPath, depth + 1);
        if (err) return err;
      }
      return null;
    }
    case "blocks":
      return Array.isArray(value) ? checkBlocks(value, path, depth + 1) : `${path} must be a list of blocks.`;
    case "block-lists": {
      if (!Array.isArray(value)) return `${path} must be a list.`;
      if (spec.max && value.length > spec.max) return `${path} can have at most ${spec.max} columns.`;
      for (let i = 0; i < value.length; i++) {
        if (!Array.isArray(value[i])) return `${path} column ${i + 1} must be a list of blocks.`;
        const err = checkBlocks(value[i] as unknown[], `${path} column ${i + 1}`, depth + 1);
        if (err) return err;
      }
      return null;
    }
    case "strings": {
      if (!Array.isArray(value)) return `${path} must be a list.`;
      if (spec.max && value.length > spec.max) return `${path} can have at most ${spec.max} items.`;
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== "string") return `${path} item ${i + 1} must be text.`;
        if ((value[i] as string).length > MAX_TEXT) return `${path} item ${i + 1} is too long (max ${MAX_TEXT} characters).`;
      }
      return null;
    }
    case "link": {
      if (!isObject(value)) return `${path} must be an object with a label and a link.`;
      for (const key of ["label", "href"]) {
        if (value[key] !== undefined && typeof value[key] !== "string") return `${path} ${key} must be text.`;
        if (typeof value[key] === "string" && value[key].length > MAX_TEXT) return `${path} ${key} is too long (max ${MAX_TEXT} characters).`;
      }
      return null;
    }
    case "devices": {
      if (!Array.isArray(value)) return `${path} must be a list.`;
      const allowed = spec.options ?? [];
      const seen = new Set<unknown>();
      for (const d of value) {
        if (typeof d !== "string" || !allowed.includes(d)) return `${path} can only contain: ${allowed.join(", ")}.`;
        if (seen.has(d)) return `${path} lists "${d}" twice.`;
        seen.add(d);
      }
      return null;
    }
  }
}

function checkFields(fields: readonly FieldSpec[], data: Record<string, unknown>, path: string, depth: number): string | null {
  for (const spec of fields) {
    const err = checkField(spec, data[spec.key], `${path} "${spec.label}"`, depth);
    if (err) return err;
  }
  return null;
}

/** Checks one block: must be an object with a type; known types get their fields checked, nested blocks recursively. */
function checkBlock(block: unknown, path: string, depth: number): string | null {
  if (!isObject(block)) return `${path} must be an object in curly braces.`;
  if (typeof block.type !== "string" || !block.type) return `${path} needs a "type", for example "type": "hero".`;
  if (depth > MAX_DEPTH) return `${path} is nested too deeply (max ${MAX_DEPTH} levels).`;
  const spec = blockSpec(block.type);
  if (!spec) return null; // unknown types are kept as they are
  // A field may sit at the top of the block or inside `content`.
  const merged = { ...block, ...(isObject(block.content) ? block.content : {}) };
  return checkFields(spec.fields, merged, `${path} (${spec.label})`, depth);
}

function checkBlocks(blocks: unknown[], path: string, depth: number): string | null {
  for (let i = 0; i < blocks.length; i++) {
    const err = checkBlock(blocks[i], `${path} block ${i + 1}`, depth);
    if (err) return err;
  }
  return null;
}

/** Validates an already-parsed sections value. Returns the sections, or the first problem found. */
export function validateSections(value: unknown): ValidResult<Section[]> {
  if (!Array.isArray(value)) return { ok: false, error: "Sections must be a list (an array of blocks) in square brackets." };
  if (value.length > MAX_SECTIONS) return { ok: false, error: `Use at most ${MAX_SECTIONS} blocks on a page.` };
  const err = checkBlocks(value, "Sections", 1);
  return err ? { ok: false, error: err } : { ok: true, value: value as Section[] };
}

/** Parses the JSON text from the editor and validates it. */
export function parseSections(text: string): ValidResult<Section[]> {
  if (Buffer.byteLength(text) > MAX_SECTIONS_BYTES) return { ok: false, error: "The sections are too large (over 1 MB)." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const detail = e instanceof SyntaxError ? e.message.replace(/^JSON\.parse: /, "") : "invalid JSON";
    return { ok: false, error: `Sections must be valid JSON (${detail}).` };
  }
  return validateSections(parsed);
}

/** Count of each block type, most common first, for the summary on the edit page. */
export function summarizeSections(sections: unknown): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  if (Array.isArray(sections)) {
    for (const block of sections) {
      const type = isObject(block) && typeof block.type === "string" ? block.type : "(no type)";
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

export * from "./site";

/** Devices a block is shown on. Missing or empty "hide" means every device. */
export function visibleOn(block: Record<string, unknown>): Device[] {
  const hidden = Array.isArray(block.hide) ? block.hide : [];
  return DEVICES.filter((d) => !hidden.includes(d));
}

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Plain-language suggestions for one block, for the editor to show next to it. These never block a save; they point at
 * things that will look wrong on some device or are hard to use. Nested blocks get their own advice when edited.
 */
export function blockAdvice(block: Record<string, unknown>): string[] {
  const out: string[] = [];
  const content = { ...block, ...asObj(block.content) };
  const hidden = Array.isArray(block.hide) ? block.hide : [];
  if (DEVICES.every((d) => hidden.includes(d))) out.push("Hidden on every device, so visitors never see it.");
  switch (block.type) {
    case "grid": {
      const cols = Number(content.columns ?? 3);
      if (cols >= 3 && content.mobileColumns !== "1") out.push("On phones, 3 or 4 columns get very narrow. Set \"Columns on phones\" to 1 to keep the text readable.");
      break;
    }
    case "columns": {
      const count = Array.isArray(content.columns) ? content.columns.length : 0;
      if (count >= 3 && content.stack === "never") out.push("This never stacks, so 3 or more columns stay side by side even on phones.");
      break;
    }
    case "image":
      if (!content.src) break;
      if (!content.alt) out.push("Add alt text so screen readers can describe the image.");
      break;
  }
  return out;
}

