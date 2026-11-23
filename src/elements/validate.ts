/**
 * Checks a layout before it is saved (and before it is shown). Unknown fields are dropped, every value is checked for
 * type and length, and links and images must be of an allowed kind, so the public site can draw the layout as it is.
 */
import {
  ALIGN,
  BUTTON_RADIUS,
  BUTTON_VARIANTS,
  DEVICES,
  STACK_ON,
  VERTICAL_ALIGN,
  GRADIENT_DIRECTIONS,
  LIMITS,
  SIZES,
  SPACING,
  WIDGET_SPECS,
  WIDGET_TYPES,
  type Gradient,
  type Layout,
  type Section,
  type SectionButton,
  type Widget,
  type Column,
} from "./model";
import { COURSE_FILTERS, DEFAULT_LIST, LIST_MAX, LIST_SOURCES, PER_ROW, sortsFor, type ListSettings, type PerRow } from "./list";
import { sanitizeRichText } from "../render/sanitize";

export type LayoutResult = { ok: true; value: Layout } | { ok: false; error: string };

const COLOR = /^#[0-9a-fA-F]{6}$/;
const LINK = /^(\/(?!\/)|#|https:\/\/|mailto:|tel:)/;
const IMAGE = /^(https:\/\/|\/(?!\/))/;
const ID = /^[a-z0-9]{1,40}$/i;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const pick = <T extends string>(value: unknown, options: readonly T[]): T | undefined => (options as readonly string[]).includes(value as string) ? (value as T) : undefined;

class Fail extends Error {}
function fail(message: string): never {
  throw new Fail(message);
}

function checkId(value: unknown, where: string): string {
  if (typeof value !== "string" || !ID.test(value)) fail(`${where} has no valid id.`);
  return value as string;
}

function checkColor(value: unknown, where: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !COLOR.test(value)) fail(`${where} must be a colour like #1e3a5f.`);
  return value as string;
}

function checkStyle(value: unknown, where: string, allowed: { align?: boolean; color?: boolean; background?: boolean; size?: boolean; variant?: boolean; radius?: boolean; paddingY?: boolean; gap?: boolean; headingGap?: boolean }) {
  const source = isObj(value) ? value : {};
  const out: Obj = {};
  if (allowed.align) out.align = pick(source.align, ALIGN);
  if (allowed.color) out.color = checkColor(source.color, `${where} text colour`);
  if (allowed.background) out.background = checkColor(source.background, `${where} background`);
  if (allowed.size) out.size = pick(source.size, SIZES);
  if (allowed.variant) out.variant = pick(source.variant, BUTTON_VARIANTS);
  if (allowed.radius) out.radius = pick(source.radius, BUTTON_RADIUS);
  if (allowed.paddingY) out.paddingY = pick(source.paddingY, SPACING) ?? "md";
  if (allowed.gap) out.gap = pick(source.gap, SPACING) ?? "md";
  if (allowed.headingGap) out.headingGap = pick(source.headingGap, SPACING) ?? "lg";
  for (const key of Object.keys(out)) if (out[key] === undefined) delete out[key];
  return out;
}

function checkText(value: unknown, where: string, max: number, required: boolean): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) fail(`${where} is empty.`);
  if (text.length > max) fail(`${where} is longer than ${max} characters.`);
  return text;
}

function checkWidget(raw: unknown, where: string): Widget {
  if (!isObj(raw)) fail(`${where} is not valid.`);
  const type = pick(raw.type, WIDGET_TYPES);
  if (!type) fail(`${where} has an unknown type.`);
  const spec = WIDGET_SPECS[type];
  const id = checkId(raw.id, where);
  const name = `${spec.label} ${where}`;
  const settings: Record<string, string | number | boolean> = { ...spec.defaults };
  const given = isObj(raw.settings) ? raw.settings : {};
  for (const field of spec.settings) {
    const value = given[field.key];
    if (field.kind === "text") {
      settings[field.key] = checkText(value, `${name} "${field.label}"`, field.max, Boolean(field.required));
    } else if (field.kind === "link") {
      const href = typeof value === "string" ? value.trim() : "";
      if (field.required && !href) fail(`${name} "${field.label}" is empty.`);
      if (href && (href.length > LIMITS.link || !LINK.test(href))) fail(`${name} link must start with /, #, https://, mailto: or tel:.`);
      settings[field.key] = href;
    } else if (field.kind === "url") {
      const url = typeof value === "string" ? value.trim() : "";
      if (field.required && !url) fail(`${name} "${field.label}" is empty.`);
      if (url && (url.length > LIMITS.link || !url.startsWith("https://"))) fail(`${name} "${field.label}" must be a full https:// address.`);
      settings[field.key] = url;
    } else if (field.kind === "image") {
      const src = typeof value === "string" ? value.trim() : "";
      if (src && (src.length > LIMITS.image || !IMAGE.test(src))) fail(`${name} image must be an uploaded image or a site path such as /assets/….`);
      settings[field.key] = src;
    } else if (field.kind === "rich") {
      // Formatted text is cleaned here, so only safe HTML is ever stored or drawn.
      const html = typeof value === "string" ? sanitizeRichText(value).trim() : "";
      if (html.length > LIMITS.rich) fail(`${name} "${field.label}" is too long.`);
      settings[field.key] = html;
    } else if (field.kind === "record") {
      // An id from the database. Anything that is not a whole number above zero means "none chosen".
      const id = typeof value === "number" ? value : Number(value);
      settings[field.key] = Number.isInteger(id) && id > 0 ? id : 0;
    } else if (field.kind === "choice") {
      const choice = typeof value === "string" ? value : undefined;
      settings[field.key] = choice && (field.options as readonly string[]).includes(choice) ? choice : String(spec.defaults[field.key] ?? field.options[0]);
    }
  }
  const style = checkStyle(raw.style, name, spec.style);
  return { id, type, settings, style };
}

/**
 * A column. `nestable` is false inside an inner section: those can hold widgets but not inner sections of their own.
 */
function checkColumn(raw: unknown, where: string, nestable: boolean): Column {
  if (!isObj(raw)) fail(`${where} is not valid.`);
  const id = checkId(raw.id, where);
  const width = typeof raw.width === "number" && raw.width >= 5 && raw.width <= 100 ? Math.round(raw.width * 100) / 100 : 100;
  const widgets = Array.isArray(raw.widgets) ? raw.widgets : [];
  if (widgets.length > LIMITS.widgetsPerColumn) fail(`${where} can hold at most ${LIMITS.widgetsPerColumn} widgets.`);
  const inner = Array.isArray(raw.innerSections) ? raw.innerSections : [];
  if (inner.length > 0 && !nestable) fail(`${where} cannot hold a section inside an inner section. Nesting goes one level deep.`);
  if (inner.length > LIMITS.innerSectionsPerColumn) fail(`${where} can hold at most ${LIMITS.innerSectionsPerColumn} inner sections.`);
  const innerSections = inner.map((s, i) => checkSection(s, `${where} inner section ${i + 1}`, false));
  const align = pick(raw.align, ALIGN);
  const verticalAlign = pick(raw.verticalAlign, VERTICAL_ALIGN);
  // Known screen sizes only, each once, in a fixed order.
  const hidden = Array.isArray(raw.hideOn) ? DEVICES.filter((d) => (raw.hideOn as unknown[]).includes(d)) : [];
  return {
    id,
    width,
    widgets: widgets.map((w, i) => checkWidget(w, `${where} widget ${i + 1}`)),
    ...(innerSections.length > 0 ? { innerSections } : {}),
    ...(align ? { align } : {}),
    ...(verticalAlign && verticalAlign !== "top" ? { verticalAlign } : {}),
    ...(hidden.length > 0 ? { hideOn: hidden } : {}),
  };
}

/** A list section's settings. Anything unknown falls back to the list's defaults; the source itself must be known. */
function checkList(value: unknown, where: string): ListSettings | undefined {
  if (!isObj(value)) return undefined;
  const source = pick(value.source, LIST_SOURCES);
  if (!source) fail(`${where} list must show courses or blog posts.`);
  const defaults = DEFAULT_LIST[source];
  const count = typeof value.count === "number" && Number.isInteger(value.count) ? Math.min(LIST_MAX, Math.max(1, value.count)) : defaults.count;
  const sort = pick(value.sort, sortsFor(source).map((s) => s.id)) ?? defaults.sort;
  const filter = source === "courses" ? pick(value.filter, COURSE_FILTERS.map((f) => f.id)) ?? defaults.filter : "all";
  const perRow = (PER_ROW as readonly number[]).includes(Number(value.perRow)) ? (Number(value.perRow) as PerRow) : defaults.perRow;
  return { source, count, filter, sort, perRow };
}

function checkSection(raw: unknown, where: string, nestable: boolean): Section {
  if (!isObj(raw)) fail(`${where} is not valid.`);
  const id = checkId(raw.id, where);
  const columns = Array.isArray(raw.columns) ? raw.columns : [];
  if (columns.length < 1 || columns.length > LIMITS.columnsPerSection) fail(`${where} needs 1 to ${LIMITS.columnsPerSection} columns.`);
  const style = checkStyle(raw.style, where, { background: true, paddingY: true, gap: true, headingGap: true });
  const title = checkText(raw.title, `${where} heading`, LIMITS.line, false);
  const subtitle = checkText(raw.subtitle, `${where} subheading`, 400, false);
  const list = checkList(raw.list, where);
  const gradient = checkGradient(isObj(raw.style) ? raw.style.gradient : undefined, where);
  const button = checkSectionButton(raw.button, where);
  const rawStyle = isObj(raw.style) ? raw.style : {};
  const stackOn = pick(rawStyle.stackOn, STACK_ON);
  const responsive = {
    ...(stackOn && stackOn !== "phone" ? { stackOn } : {}),
    ...(rawStyle.reverseStacked === true ? { reverseStacked: true } : {}),
  };
  return {
    id,
    style: { ...(style as Section["style"]), ...(gradient ? { gradient } : {}), ...responsive },
    columns: columns.map((c, i) => checkColumn(c, `${where} column ${i + 1}`, nestable)),
    title,
    subtitle,
    ...(list ? { list } : {}),
    ...(button ? { button } : {}),
  };
}

/** A two-colour background. Incomplete gradients (one colour missing) are dropped. */
function checkGradient(value: unknown, where: string): Gradient | undefined {
  if (!isObj(value)) return undefined;
  const from = checkColor(value.from, `${where} gradient start colour`);
  const to = checkColor(value.to, `${where} gradient end colour`);
  if (!from || !to) return undefined;
  return { from, to, direction: pick(value.direction, GRADIENT_DIRECTIONS) ?? "down" };
}

/** The button under a section's content. No label means no button. */
function checkSectionButton(value: unknown, where: string): SectionButton | undefined {
  if (!isObj(value)) return undefined;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  if (!label) return undefined;
  if (label.length > LIMITS.label) fail(`${where} button text is longer than ${LIMITS.label} characters.`);
  const href = typeof value.href === "string" ? value.href.trim() : "";
  if (!href || href.length > LIMITS.link || !LINK.test(href)) {
    fail(`${where} button link must start with /, #, https://, mailto: or tel:.`);
  }
  const background = checkColor(value.background, `${where} button colour`);
  const color = checkColor(value.color, `${where} button text colour`);
  return {
    label,
    href,
    variant: pick(value.variant, BUTTON_VARIANTS) ?? "solid",
    radius: pick(value.radius, BUTTON_RADIUS) ?? "rounded",
    ...(background ? { background } : {}),
    ...(color ? { color } : {}),
  };
}

/** Checks a whole layout. Returns the cleaned layout, or the first problem found. */
export function validateLayout(value: unknown): LayoutResult {
  try {
    if (!Array.isArray(value)) fail("The layout must be a list of sections.");
    if (value.length > LIMITS.sections) fail(`Use at most ${LIMITS.sections} sections on a page.`);
    return { ok: true, value: value.map((s, i) => checkSection(s, `Section ${i + 1}`, true)) };
  } catch (error) {
    if (error instanceof Fail) return { ok: false, error: error.message };
    throw error;
  }
}
