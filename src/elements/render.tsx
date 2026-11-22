import { Fragment, type CSSProperties, type ReactNode } from "react";
import type {
  ButtonRadius,
  ButtonVariant,
  Column,
  GradientDirection,
  Layout,
  Section,
  SectionButton,
  SectionStyle,
  Size,
  Spacing,
  Widget,
  WidgetStyle,
} from "./model";
import { EMPTY_SOURCES, type BlogSource, type CardSources, type CourseSource } from "./sources";
import { pickRecords } from "./list";
import type { ListSettings } from "./list";

/**
 * Column widths on phones stack to full width. The column width comes from --w, set on each column.
 * List sections are a grid: one card per row on phones, up to the chosen number per row on wider screens.
 */
const CSS = `
.alo-row { display: flex; flex-wrap: nowrap; }
.alo-col { flex: 0 1 var(--w); min-width: 0; }
@media (max-width: 767px) {
  .alo-row { flex-wrap: wrap; }
  .alo-col { flex: 0 0 100%; }
}
.alo-list { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
@media (min-width: 640px) { .alo-list { grid-template-columns: repeat(min(var(--cols, 3), 2), minmax(0, 1fr)); } }
@media (min-width: 1024px) { .alo-list { grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); } }
`;

const PADDING: Record<Spacing, string> = { none: "0px", sm: "1rem", md: "2.5rem", lg: "4rem", xl: "6rem" };
const GAP: Record<Spacing, string> = { none: "0px", sm: "0.75rem", md: "1.5rem", lg: "2rem", xl: "3rem" };
const SPACER: Record<Size, string> = { sm: "16px", md: "32px", lg: "48px", xl: "64px" };
const TEXT_SIZE: Record<Size, string> = { sm: "text-base", md: "text-lg", lg: "text-2xl", xl: "text-4xl" };
const HEADING_SIZE: Record<string, string> = { h1: "text-4xl", h2: "text-3xl", h3: "text-2xl", h4: "text-xl" };

const str = (v: unknown) => (typeof v === "string" ? v : "");

function widgetBox(style: WidgetStyle): CSSProperties {
  return { textAlign: style.align, color: style.color, background: style.background };
}

const MAP_HEIGHT: Record<string, string> = { sm: "240px", md: "360px", lg: "480px" };

/** YouTube and Vimeo links play in their own privacy-friendly player. Anything else shows nothing. */
function VideoEmbed({ url }: { url: string }) {
  const youtube = url.match(/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{6,20})/) ?? url.match(/^https:\/\/youtu\.be\/([\w-]{6,20})/);
  const vimeo = url.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  if (!youtube && !vimeo) {
    return <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Video</div>;
  }
  const src = youtube ? `https://www.youtube-nocookie.com/embed/${youtube[1]}` : `https://player.vimeo.com/video/${vimeo?.[1]}`;
  return <div className="aspect-video w-full overflow-hidden rounded-lg"><iframe title="Video" src={src} loading="lazy" allowFullScreen className="size-full border-0" /></div>;
}

/** The box shared by the course and blog cards: a picture on top, text below, the whole card a link. */
function CardFrame({ href, image, style, children }: { href: string; image: string; style: WidgetStyle; children: ReactNode }) {
  const body = (
    <>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="aspect-video w-full object-cover" />
      ) : (
        <div className="grid aspect-video place-items-center bg-slate-100 text-sm text-slate-400">Picture</div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">{children}</div>
    </>
  );
  const boxStyle: CSSProperties = { color: style.color, background: style.background ?? "#ffffff" };
  return href ? (
    <a href={href} className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 no-underline" style={boxStyle}>
      {body}
    </a>
  ) : (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200" style={boxStyle}>
      {body}
    </div>
  );
}

/** Shown in place of a card whose course or blog post has not been chosen (or is no longer published). */
function RecordMissing({ label }: { label: string }) {
  return <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Choose a {label}</div>;
}

/**
 * Colours the course card uses. They are inline styles, not Tailwind classes, so they show on any site that renders
 * the layout, whether or not its CSS scans this package.
 */
const BRAND = {
  accent: "#fbbf24",
  ink: "#0f172a",
  subtitle: "#0ea5e9",
  link: "#db2777",
  oldPrice: "#dc2626",
  stars: "#f59e0b",
};

/**
 * A course card: a discount badge, the title, a blue subtitle, a checklist (the first four points, then "Show more"),
 * the price with any old price struck through, and an "Enroll now" button that goes to the course.
 */
function CourseCard({ course, style, siteUrl }: { course: CourseSource; style: WidgetStyle; siteUrl: string }) {
  const first = course.points.slice(0, 4);
  const rest = course.points.slice(4);
  const checklist = (items: string[]) => (
    <ul className="mt-4 grid gap-2.5 text-[15px] leading-snug text-slate-700">
      {items.map((point, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden="true">✔️</span>
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" style={{ color: style.color, background: style.background }}>
      {course.discountPercent > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide" style={{ background: BRAND.accent, color: BRAND.ink }}>
            {course.discountPercent}% OFF
          </span>
        </div>
      )}
      <h3 className="mt-4 text-2xl font-bold leading-tight text-slate-900">{course.title}</h3>
      {course.subtitle && <p className="mt-3 text-lg font-semibold" style={{ color: BRAND.subtitle }}>{course.subtitle}</p>}
      {first.length > 0 && checklist(first)}
      {rest.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer list-none text-sm font-semibold" style={{ color: BRAND.link }}>Show more</summary>
          {checklist(rest)}
        </details>
      )}
      <div className="mt-auto border-t border-slate-100 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            {course.oldPrice && <p className="text-sm font-semibold line-through" style={{ color: BRAND.oldPrice }}>{course.oldPrice}</p>}
            {course.price && <p className="text-4xl font-extrabold leading-none tracking-tight text-slate-900">{course.price}</p>}
          </div>
          {course.duration && <p className="pb-1 text-sm font-medium text-slate-500">{course.duration}</p>}
        </div>
        <a
          href={`${siteUrl}/courses/${encodeURIComponent(course.slug)}/purchase`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold tracking-wide no-underline"
          style={{ background: BRAND.accent, color: BRAND.ink, boxShadow: "0 8px 20px -8px rgba(251, 191, 36, 0.8)" }}
        >
          Enroll now
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}

/** A blog card: picture, date, title and a short summary. Links to the post. */
function BlogCard({ post, style, siteUrl }: { post: BlogSource; style: WidgetStyle; siteUrl: string }) {
  return (
    <CardFrame href={`${siteUrl}/blog/${encodeURIComponent(post.slug)}`} image={post.image} style={style}>
      {post.date && <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{post.date}</p>}
      <h3 className="text-lg font-semibold leading-snug">{post.title}</h3>
      {post.summary && <p className="text-sm leading-relaxed text-slate-600">{post.summary}</p>}
    </CardFrame>
  );
}

/** A list section's cards, picked from the database by its settings. */
function ListGrid({ list, sources }: { list: ListSettings; sources: CardSources }) {
  const picked = pickRecords(sources, list);
  const noun = list.source === "courses" ? "courses" : "blog posts";
  const cards: ReactNode[] =
    list.source === "courses"
      ? picked.courses.map((c) => <CourseCard key={c.id} course={c} style={{}} siteUrl={sources.siteUrl} />)
      : picked.blogs.map((b) => <BlogCard key={b.id} post={b} style={{}} siteUrl={sources.siteUrl} />);
  if (cards.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">No {noun} to show yet</div>
      </div>
    );
  }
  return (
    <div className="alo-list mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8" style={{ "--cols": list.perRow } as CSSProperties}>
      {cards}
    </div>
  );
}

function renderWidget(widget: Widget, sources: CardSources): ReactNode {
  const s = widget.settings;
  const style = widget.style;
  const box = widgetBox(style);
  const hasBox = Boolean(style.background);
  let content: ReactNode = null;

  switch (widget.type) {
    case "heading": {
      const Tag = (str(s.level) || "h2") as "h1" | "h2" | "h3" | "h4";
      const size = style.size ? TEXT_SIZE[style.size] : HEADING_SIZE[Tag];
      content = <Tag className={`${size} font-bold leading-tight`} style={{ color: style.color }}>{str(s.text)}</Tag>;
      break;
    }
    case "text": {
      const paragraphs = str(s.text).split(/\n\s*\n/).filter((p) => p.trim());
      const size = style.size ? TEXT_SIZE[style.size] : "text-base";
      content = (
        <div className={`${size} space-y-4 leading-relaxed text-slate-700`} style={{ color: style.color }}>
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">{p}</p>
          ))}
        </div>
      );
      break;
    }
    case "image": {
      const src = str(s.src);
      content = src ? (
        // Images come from the admin's upload storage or the site's own assets, so their size is not known here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={str(s.alt)} className="h-auto max-w-full rounded-lg" />
      ) : (
        <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Image</div>
      );
      break;
    }
    case "button": {
      const size = style.size ? TEXT_SIZE[style.size] : "text-sm";
      content = (
        <ButtonLink
          href={str(s.href) || "#"}
          label={str(s.label)}
          variant={style.variant}
          radius={style.radius}
          background={style.background}
          color={style.color}
          size={size}
        />
      );
      break;
    }
    case "spacer":
      content = <div aria-hidden="true" style={{ height: SPACER[(str(s.height) as Size) || "md"] ?? SPACER.md }} />;
      break;
    case "video":
      content = <VideoEmbed url={str(s.url)} />;
      break;
    case "map": {
      const address = str(s.address);
      const height = MAP_HEIGHT[str(s.height)] ?? MAP_HEIGHT.md;
      content = address ? (
        <iframe
          title={address}
          src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
          loading="lazy"
          style={{ height, width: "100%", border: 0, borderRadius: "0.5rem" }}
        />
      ) : (
        <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Map</div>
      );
      break;
    }
    case "icon-box":
      content = (
        <div style={{ color: style.color }}>
          {str(s.icon) && <div aria-hidden="true" className="mb-3 text-3xl">{str(s.icon)}</div>}
          <h3 className="text-lg font-semibold">{str(s.title)}</h3>
          {str(s.text) && <p className="mt-2 leading-relaxed text-slate-600 whitespace-pre-line" style={{ color: style.color }}>{str(s.text)}</p>}
        </div>
      );
      break;
    case "testimonial":
      content = (
        <figure className="m-0" style={{ color: style.color }}>
          <blockquote className="text-lg leading-relaxed italic">&ldquo;{str(s.quote)}&rdquo;</blockquote>
          <figcaption className="mt-3 text-sm font-semibold">
            {str(s.author)}
            {str(s.role) && <span className="font-normal text-slate-500"> · {str(s.role)}</span>}
          </figcaption>
        </figure>
      );
      break;
    case "stats":
      content = (
        <div style={{ color: style.color }}>
          <p className="text-4xl font-bold">{str(s.value)}</p>
          <p className="mt-1 text-sm text-slate-600" style={{ color: style.color }}>{str(s.label)}</p>
        </div>
      );
      break;
    case "faq":
      content = (
        <details className="rounded-lg border border-slate-200 p-4" style={{ color: style.color }}>
          <summary className="cursor-pointer font-semibold">{str(s.question)}</summary>
          <p className="mt-3 leading-relaxed text-slate-600 whitespace-pre-line">{str(s.answer)}</p>
        </details>
      );
      break;
    case "course-card": {
      const course = sources.courses.find((c) => c.id === Number(s.recordId));
      content = course ? <CourseCard course={course} style={style} siteUrl={sources.siteUrl} /> : <RecordMissing label="course" />;
      break;
    }
    case "blog-card": {
      const post = sources.blogs.find((b) => b.id === Number(s.recordId));
      content = post ? <BlogCard post={post} style={style} siteUrl={sources.siteUrl} /> : <RecordMissing label="blog post" />;
      break;
    }
    case "review-card": {
      const stars = Math.min(5, Math.max(1, Number(str(s.rating)) || 5));
      content = (
        <figure className="m-0 flex h-full flex-col gap-3 rounded-xl border border-slate-200 p-6" style={{ color: style.color, background: style.background }}>
          <p aria-label={`${stars} out of 5 stars`} className="text-lg tracking-wide" style={{ color: BRAND.stars }}>
            {"★".repeat(stars)}
            <span className="text-slate-300">{"★".repeat(5 - stars)}</span>
          </p>
          <blockquote className="flex-1 text-base leading-relaxed text-slate-700">&ldquo;{str(s.quote)}&rdquo;</blockquote>
          <figcaption className="text-sm font-semibold">
            {str(s.author)}
            {str(s.role) && <span className="font-normal text-slate-500"> · {str(s.role)}</span>}
          </figcaption>
        </figure>
      );
      break;
    }
    case "divider":
      content = <hr style={{ borderColor: style.color ?? "#e2e8f0" }} />;
      break;
  }

  return (
    <div data-key={widget.id} data-widget="" className={`min-w-0 ${hasBox ? "rounded-lg p-4" : ""}`} style={hasBox ? box : { textAlign: box.textAlign }}>
      {content}
    </div>
  );
}

function renderColumn(column: Column, sources: CardSources): ReactNode {
  return (
    <div
      key={column.id}
      data-key={column.id}
      data-column=""
      className="alo-col flex flex-col gap-4"
      style={{ "--w": `${column.width}%` } as CSSProperties}
    >
      {column.widgets.map((w) => (
        <Fragment key={w.id}>{renderWidget(w, sources)}</Fragment>
      ))}
      {column.innerSections?.map((s) => renderSection(s, sources, true))}
    </div>
  );
}

const GRADIENT_DIRECTION: Record<GradientDirection, string> = {
  down: "to bottom",
  right: "to right",
  diagonal: "to bottom right",
  "diagonal-up": "to top right",
};

const BUTTON_RADIUS_CLASS: Record<ButtonRadius, string> = { square: "rounded-none", rounded: "rounded-lg", pill: "rounded-full" };

/**
 * A button's colours. Solid is filled with the button colour; outline has a border in that colour and no fill. The
 * text colour defaults to white on a solid button and to the button colour on an outline.
 */
function buttonLook(variant: ButtonVariant | undefined, background: string | undefined, color: string | undefined): CSSProperties {
  const colour = background ?? "#0f172a";
  if (variant === "outline") {
    return { background: "transparent", color: color ?? colour, border: `2px solid ${colour}` };
  }
  return { background: colour, color: color ?? "#ffffff", border: "2px solid transparent" };
}

/** A link styled as a button: used by the button widget and by a section's button. */
function ButtonLink({
  href,
  label,
  variant,
  radius,
  background,
  color,
  size = "text-base",
}: {
  href: string;
  label: string;
  variant?: ButtonVariant;
  radius?: ButtonRadius;
  background?: string;
  color?: string;
  size?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center px-6 py-3 font-semibold no-underline ${BUTTON_RADIUS_CLASS[radius ?? "rounded"]} ${size}`}
      style={buttonLook(variant, background, color)}
    >
      {label}
    </a>
  );
}

function sectionStyle(style: SectionStyle): CSSProperties {
  return {
    background: style.gradient
      ? `linear-gradient(${GRADIENT_DIRECTION[style.gradient.direction]}, ${style.gradient.from}, ${style.gradient.to})`
      : style.background,
    paddingTop: PADDING[style.paddingY ?? "md"],
    paddingBottom: PADDING[style.paddingY ?? "md"],
  };
}

/** The optional heading and subheading above a section's columns. */
const HEADING_GAP: Record<Spacing, string> = { none: "0px", sm: "1rem", md: "2rem", lg: "3rem", xl: "4.5rem" };

function SectionHeading({ title, subtitle, gap }: { title?: string; subtitle?: string; gap: Spacing }) {
  if (!title && !subtitle) return null;
  return (
    <div className="w-full px-4 text-center sm:px-6" style={{ marginBottom: HEADING_GAP[gap] }}>
      {title && <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>}
      {subtitle && <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">{subtitle}</p>}
    </div>
  );
}

/** The button centred below a section's content. */
function SectionButtonView({ button }: { button: SectionButton }) {
  return (
    <div className="mt-10 flex justify-center px-4 sm:px-6">
      <ButtonLink
        href={button.href}
        label={button.label}
        variant={button.variant}
        radius={button.radius}
        background={button.background}
        color={button.color}
        size="text-base"
      />
    </div>
  );
}

/**
 * A section. A nested section sits inside its column, so it takes the column's width and skips the page margins.
 */
function renderSection(section: Section, sources: CardSources, nested = false): ReactNode {
  const frame = nested ? "w-full" : "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
  return (
    <section key={section.id} data-key={section.id} data-section="" style={sectionStyle(section.style)}>
      <SectionHeading title={section.title} subtitle={section.subtitle} gap={section.style.headingGap ?? "lg"} />
      {section.list ? (
        <ListGrid list={section.list} sources={sources} />
      ) : (
        <div className={`alo-row ${frame}`} style={{ gap: GAP[section.style.gap ?? "md"] }}>
          {section.columns.map((c) => renderColumn(c, sources))}
        </div>
      )}
      {section.button?.label && <SectionButtonView button={section.button} />}
    </section>
  );
}

/**
 * A page layout as visitors see it. The builder canvas draws the same thing, with its ids used for selection.
 * `sources` holds the courses and blog posts the course and blog cards show.
 */
export function LayoutView({ layout, sources = EMPTY_SOURCES }: { layout: Layout; sources?: CardSources }) {
  return (
    <>
      <style>{CSS}</style>
      {layout.map((s) => renderSection(s, sources))}
    </>
  );
}
