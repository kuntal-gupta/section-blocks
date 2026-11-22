/**
 * The page layout model (phase 1 of the Elementor-style builder): sections hold columns, columns hold widgets.
 * Every node has an id. Settings are plain values, checked by validate.ts before they are saved or shown.
 */

import { DEFAULT_LIST, type ListSettings } from "./list";

export const WIDGET_TYPES = [
  "heading",
  "text",
  "image",
  "button",
  "spacer",
  "divider",
  "video",
  "map",
  "icon-box",
  "testimonial",
  "stats",
  "faq",
  "course-card",
  "blog-card",
  "review-card",
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const SPACING = ["none", "sm", "md", "lg", "xl"] as const;
export type Spacing = (typeof SPACING)[number];

export const ALIGN = ["left", "center", "right"] as const;
export type Align = (typeof ALIGN)[number];

export const SIZES = ["sm", "md", "lg", "xl"] as const;
export type Size = (typeof SIZES)[number];

/** How a button is drawn: filled with its colour, or an outline. */
export const BUTTON_VARIANTS = ["solid", "outline"] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/** Corner shape of a button. */
export const BUTTON_RADIUS = ["square", "rounded", "pill"] as const;
export type ButtonRadius = (typeof BUTTON_RADIUS)[number];

/** Which way a gradient runs. */
export const GRADIENT_DIRECTIONS = ["down", "right", "diagonal", "diagonal-up"] as const;
export type GradientDirection = (typeof GRADIENT_DIRECTIONS)[number];

/** A two-colour background. */
export type Gradient = { from: string; to: string; direction: GradientDirection };

export type WidgetStyle = {
  align?: Align;
  color?: string;
  background?: string;
  size?: Size;
  /** Buttons only. */
  variant?: ButtonVariant;
  radius?: ButtonRadius;
};
export type SectionStyle = {
  background?: string;
  /** Takes the place of `background` when set. */
  gradient?: Gradient;
  paddingY?: Spacing;
  gap?: Spacing;
  headingGap?: Spacing;
};
export type Widget = { id: string; type: WidgetType; settings: Record<string, string | number | boolean>; style: WidgetStyle };
/**
 * A column holds widgets, and may also hold inner sections (each with its own columns). Inner sections cannot hold
 * inner sections of their own: nesting stops one level down.
 */
export type Column = { id: string; width: number; widgets: Widget[]; innerSections?: Section[] };

/** A button shown centred below a section's content. Left out when it has no label. */
export type SectionButton = {
  label: string;
  href: string;
  variant: ButtonVariant;
  radius: ButtonRadius;
  background?: string;
  color?: string;
};

/** `title` and `subtitle` are an optional heading and subheading shown above the columns. */
export type Section = {
  id: string;
  style: SectionStyle;
  columns: Column[];
  title?: string;
  subtitle?: string;
  /** A list section shows courses or blog posts from the database instead of its columns. */
  list?: ListSettings;
  /** A centred button below the content. */
  button?: SectionButton;
};
export type Layout = Section[];

/** Limits enforced on save. */
export const LIMITS = {
  sections: 40,
  innerSectionsPerColumn: 10,
  columnsPerSection: 4,
  widgetsPerColumn: 40,
  text: 5000,
  line: 200,
  label: 60,
  link: 500,
  image: 500,
} as const;

/** Field kinds for widget settings, shown in the Content tab. */
export type SettingField =
  | { key: string; kind: "text"; label: string; required?: boolean; multiline?: boolean; max: number }
  | { key: string; kind: "image"; label: string }
  | { key: string; kind: "link"; label: string; required?: boolean }
  | { key: string; kind: "url"; label: string; required?: boolean }
  | { key: string; kind: "choice"; label: string; options: readonly string[] }
  /** A course or blog picked from the database. The value is its id, 0 for none. */
  | { key: string; kind: "record"; label: string; source: "courses" | "blogs" };

export type WidgetCategory = "basic" | "media" | "content";
export const CATEGORIES: { id: WidgetCategory; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "media", label: "Media" },
  { id: "content", label: "Content" },
];

export type WidgetSpec = {
  label: string;
  category: WidgetCategory;
  /** A short glyph shown in the sidebar. */
  icon: string;
  settings: SettingField[];
  /** Which style options the Style tab offers for this widget. */
  style: { align?: boolean; color?: boolean; background?: boolean; size?: boolean; variant?: boolean; radius?: boolean };
  defaults: Record<string, string | number | boolean>;
};

export const WIDGET_SPECS: Record<WidgetType, WidgetSpec> = {
  heading: {
    label: "Heading",
    category: "basic",
    icon: "H",
    settings: [
      { key: "text", kind: "text", label: "Heading", required: true, max: LIMITS.line },
      { key: "level", kind: "choice", label: "Level", options: ["h1", "h2", "h3", "h4"] },
    ],
    style: { align: true, color: true, background: true, size: true },
    defaults: { text: "Your heading", level: "h2" },
  },
  text: {
    label: "Text",
    category: "basic",
    icon: "¶",
    settings: [{ key: "text", kind: "text", label: "Text (blank line between paragraphs)", multiline: true, required: true, max: LIMITS.text }],
    style: { align: true, color: true, background: true, size: true },
    defaults: { text: "Write your text here." },
  },
  image: {
    label: "Image",
    category: "media",
    icon: "▣",
    settings: [
      { key: "src", kind: "image", label: "Image" },
      { key: "alt", kind: "text", label: "Description (for screen readers)", max: LIMITS.line },
    ],
    style: { align: true, background: true },
    defaults: { src: "", alt: "" },
  },
  button: {
    label: "Button",
    category: "basic",
    icon: "▭",
    settings: [
      { key: "label", kind: "text", label: "Button text", required: true, max: LIMITS.label },
      { key: "href", kind: "link", label: "Link", required: true },
    ],
    style: { align: true, color: true, background: true, size: true, variant: true, radius: true },
    defaults: { label: "Click here", href: "/" },
  },
  spacer: {
    label: "Spacer",
    category: "basic",
    icon: "↕",
    settings: [{ key: "height", kind: "choice", label: "Height", options: ["sm", "md", "lg", "xl"] }],
    style: {},
    defaults: { height: "md" },
  },
  divider: {
    label: "Divider",
    category: "basic",
    icon: "—",
    settings: [],
    style: { color: true },
    defaults: {},
  },
  video: {
    label: "Video",
    category: "media",
    icon: "▶",
    settings: [{ key: "url", kind: "url", label: "Video link (YouTube or Vimeo)", required: true }],
    style: { align: true },
    defaults: { url: "" },
  },
  map: {
    label: "Map",
    category: "media",
    icon: "⌖",
    settings: [
      { key: "address", kind: "text", label: "Address to show on the map", required: true, max: LIMITS.line },
      { key: "height", kind: "choice", label: "Height", options: ["sm", "md", "lg"] },
    ],
    style: {},
    defaults: { address: "", height: "md" },
  },
  "icon-box": {
    label: "Icon box",
    category: "content",
    icon: "★",
    settings: [
      { key: "icon", kind: "text", label: "Icon (an emoji)", max: 8 },
      { key: "title", kind: "text", label: "Title", required: true, max: LIMITS.line },
      { key: "text", kind: "text", label: "Text", multiline: true, max: 500 },
    ],
    style: { align: true, color: true, background: true },
    defaults: { icon: "★", title: "Feature title", text: "A short description of this feature." },
  },
  testimonial: {
    label: "Testimonial",
    category: "content",
    icon: "❝",
    settings: [
      { key: "quote", kind: "text", label: "Quote", multiline: true, required: true, max: 800 },
      { key: "author", kind: "text", label: "Name", required: true, max: 120 },
      { key: "role", kind: "text", label: "Role or town", max: 120 },
    ],
    style: { align: true, color: true, background: true },
    defaults: { quote: "Great course, easy to follow.", author: "A student", role: "" },
  },
  stats: {
    label: "Stats",
    category: "content",
    icon: "#",
    settings: [
      { key: "value", kind: "text", label: "Number", required: true, max: 20 },
      { key: "label", kind: "text", label: "Label", required: true, max: 120 },
    ],
    style: { align: true, color: true, background: true },
    defaults: { value: "5,000+", label: "Students" },
  },
  faq: {
    label: "FAQ item",
    category: "content",
    icon: "?",
    settings: [
      { key: "question", kind: "text", label: "Question", required: true, max: 200 },
      { key: "answer", kind: "text", label: "Answer", multiline: true, required: true, max: 1000 },
    ],
    style: { color: true, background: true },
    defaults: { question: "Your question?", answer: "Your answer." },
  },
  "course-card": {
    label: "Course card",
    category: "content",
    icon: "🎓",
    settings: [{ key: "recordId", kind: "record", label: "Course (from your courses)", source: "courses" }],
    style: { color: true, background: true },
    defaults: { recordId: 0 },
  },
  "blog-card": {
    label: "Blog card",
    category: "content",
    icon: "✎",
    settings: [{ key: "recordId", kind: "record", label: "Blog post (from your blog)", source: "blogs" }],
    style: { color: true, background: true },
    defaults: { recordId: 0 },
  },
  "review-card": {
    label: "Review card",
    category: "content",
    icon: "★",
    settings: [
      { key: "rating", kind: "choice", label: "Stars", options: ["1", "2", "3", "4", "5"] },
      { key: "quote", kind: "text", label: "Review", multiline: true, required: true, max: 800 },
      { key: "author", kind: "text", label: "Name", required: true, max: 120 },
      { key: "role", kind: "text", label: "Town or course taken", max: 120 },
    ],
    style: { color: true, background: true },
    defaults: { rating: "5", quote: "Great course, easy to follow.", author: "A student", role: "" },
  },
};

/** Column width presets for a new section, as percentages of the row. */
export const COLUMN_PRESETS: Record<number, number[]> = {
  1: [100],
  2: [50, 50],
  3: [33.33, 33.33, 33.34],
  4: [25, 25, 25, 25],
};

let counter = 0;
/** A short id, unique within the page. */
export function newId(prefix = "n"): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newWidget(type: WidgetType): Widget {
  return { id: newId("w"), type, settings: { ...WIDGET_SPECS[type].defaults }, style: {} };
}

export function newColumn(width: number): Column {
  return { id: newId("c"), width, widgets: [] };
}

export function newSection(columns: number): Section {
  const widths = COLUMN_PRESETS[columns] ?? COLUMN_PRESETS[1];
  return { id: newId("s"), style: { paddingY: "md" }, columns: widths.map((w) => newColumn(w)) };
}

/** A ready-made section: its columns, widgets and colours are set up, ready to edit. */
export type SectionPreset = { id: string; label: string; description: string; build: () => Section };

function widget(type: WidgetType, settings: Record<string, string | number | boolean> = {}, style: WidgetStyle = {}): Widget {
  const base = newWidget(type);
  return { ...base, settings: { ...base.settings, ...settings }, style };
}

function column(width: number, widgets: Widget[]): Column {
  return { ...newColumn(width), widgets };
}

function section(columns: Column[], style: SectionStyle = { paddingY: "md" }): Section {
  return { id: newId("s"), style, columns };
}

export const SECTION_PRESETS: SectionPreset[] = [
  {
    id: "hero",
    label: "Hero",
    description: "A big heading, text and a button",
    build: () =>
      section(
        [
          column(100, [
            widget("heading", { text: "Your main message", level: "h1" }, { align: "center", size: "xl" }),
            widget("text", { text: "One line that explains what you offer." }, { align: "center" }),
            widget("button", { label: "Get started", href: "/" }, { align: "center" }),
          ]),
        ],
        { paddingY: "lg", background: "#f8fafc" },
      ),
  },
  {
    id: "cta",
    label: "Call to action",
    description: "A dark band with a heading and a button",
    build: () =>
      section(
        [
          column(100, [
            widget("heading", { text: "Ready to start?", level: "h2" }, { align: "center", color: "#ffffff" }),
            widget("button", { label: "Sign up", href: "/" }, { align: "center", background: "#ffffff", color: "#0f172a" }),
          ]),
        ],
        { paddingY: "lg", background: "#0f172a" },
      ),
  },
  {
    id: "text-image",
    label: "Text and image",
    description: "Text on the left, an image on the right",
    build: () =>
      section([
        column(50, [
          widget("heading", { text: "A heading for this section", level: "h2" }),
          widget("text", { text: "Explain the idea in a few sentences." }),
          widget("button", { label: "Read more", href: "/" }),
        ]),
        column(50, [widget("image", { src: "", alt: "" })]),
      ]),
  },
  {
    id: "features",
    label: "3 features",
    description: "Three icon boxes side by side",
    build: () =>
      section([
        column(33.33, [widget("icon-box", { icon: "★", title: "First feature", text: "What this gives visitors." })]),
        column(33.33, [widget("icon-box", { icon: "✔", title: "Second feature", text: "Why it matters." })]),
        column(33.34, [widget("icon-box", { icon: "⚑", title: "Third feature", text: "How it helps." })]),
      ]),
  },
  {
    id: "testimonials",
    label: "2 testimonials",
    description: "Two student quotes side by side",
    build: () =>
      section([
        column(50, [widget("testimonial", { quote: "The lessons were clear and easy to fit around work.", author: "A student", role: "Irving" })]),
        column(50, [widget("testimonial", { quote: "I passed the first time. Thank you.", author: "Another student", role: "Dallas" })]),
      ]),
  },
  {
    id: "stats",
    label: "4 stats",
    description: "Four numbers with labels",
    build: () =>
      section([
        column(25, [widget("stats", { value: "5,000+", label: "Students" }, { align: "center" })]),
        column(25, [widget("stats", { value: "20+", label: "Years teaching" }, { align: "center" })]),
        column(25, [widget("stats", { value: "100%", label: "Online" }, { align: "center" })]),
        column(25, [widget("stats", { value: "TDLR", label: "Approved" }, { align: "center" })]),
      ]),
  },
  {
    id: "faq",
    label: "FAQ",
    description: "A heading and three questions",
    build: () =>
      section([
        column(100, [
          widget("heading", { text: "Questions", level: "h2" }),
          widget("faq", { question: "Who can take this course?", answer: "Anyone who meets the age requirement." }),
          widget("faq", { question: "How long does it take?", answer: "It depends on your pace." }),
          widget("faq", { question: "Can I pay later?", answer: "Please contact us to discuss options." }),
        ]),
      ]),
  },
  {
    id: "reviews",
    label: "3 reviews",
    description: "Three student review cards side by side",
    build: () =>
      section([
        column(33.33, [widget("review-card", { rating: "5", quote: "Replace with a real student review.", author: "Student name", role: "" })]),
        column(33.33, [widget("review-card", { rating: "5", quote: "Replace with a real student review.", author: "Student name", role: "" })]),
        column(33.34, [widget("review-card", { rating: "5", quote: "Replace with a real student review.", author: "Student name", role: "" })]),
      ]),
  },
  {
    id: "courses-list",
    label: "Course cards",
    description: "A list of your courses, with a heading",
    build: () => ({ ...section([column(100, [])]), list: { source: "courses", ...DEFAULT_LIST.courses } }),
  },
  {
    id: "blogs-list",
    label: "Blog cards",
    description: "A list of your latest blog posts",
    build: () => ({ ...section([column(100, [])]), list: { source: "blogs", ...DEFAULT_LIST.blogs } }),
  },
  {
    id: "contact",
    label: "Contact and map",
    description: "Contact text on the left, a map on the right",
    build: () =>
      section([
        column(50, [
          widget("heading", { text: "Visit us", level: "h2" }),
          widget("text", { text: "Call or visit during opening hours." }),
        ]),
        column(50, [widget("map", { address: "Irving, TX", height: "md" })]),
      ]),
  },
];

/** Heading and subheading a preset starts with. Editable in the section settings; empty means none shown. */
const PLACEHOLDER_HEADING = { title: "Section heading", subtitle: "Add a short subheading here." };
const PRESET_HEADINGS: Record<string, { title: string; subtitle: string }> = {
  features: PLACEHOLDER_HEADING,
  testimonials: PLACEHOLDER_HEADING,
  stats: PLACEHOLDER_HEADING,
  faq: PLACEHOLDER_HEADING,
  reviews: PLACEHOLDER_HEADING,
  "courses-list": PLACEHOLDER_HEADING,
  "blogs-list": PLACEHOLDER_HEADING,
};

/** A preset as a section, with its starting heading. */
export function presetSection(preset: SectionPreset): Section {
  const built = preset.build();
  const heading = PRESET_HEADINGS[preset.id];
  return heading ? { ...built, ...heading } : built;
}
