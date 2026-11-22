/* eslint-disable @next/next/no-img-element -- CMS images come from the admin's upload storage, so they are not known at build time */
import { Fragment, type ReactNode } from "react";
import { CourseCard } from "./course-card";
import { RichHtml } from "./rich-html";
import { btn, btnOutline, card, container, muted, section } from "./ui";
import { safeUrl } from "./sanitize";
import type { RenderData } from "./types";
import { BLOCKS, visibleOn, type Device, type Section } from "../index";

/** Plain anchor: links in the page work the same in the public site and in the admin's preview. */
function Link({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <a href={href} className={className}>{children}</a>;
}

/** Block types the shared package defines. The renderer below must handle each of them. */
const SPEC_TYPES = new Set(BLOCKS.map((b) => b.type));

/**
 * Renders a CMS page's blocks. The admin stores blocks as loose JSON, so every field is checked here:
 * text goes through React (escaped), HTML goes through sanitizeRichText, URLs through safeUrl, and class names come
 * only from the fixed maps below (Tailwind only generates classes it can see in this source). Unknown block types
 * render nothing. Top-level blocks are full-width bands; `hero` and `custom` are handled as bands too.
 */

type Obj = Record<string, unknown>;
type Level = "h1" | "h2" | "h3" | "h4";

const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
/** A block's fields: the nested `content` object when there is one, otherwise the block itself. */
const fields = (block: unknown): Obj => {
  const b = obj(block);
  return { ...b, ...obj(b.content) };
};
const headingLevel = (v: unknown): Level => (v === "h3" || v === "h4" ? v : "h2");

/** Background bands the admin can pick. Keys are the admin's bgClass values; anything else gets no background. */
const BANDS: Record<string, { classes: string; dark: boolean }> = {
  "bg-linear-to-br from-amber-200 via-orange-100 to-yellow-200": { classes: "bg-linear-to-br from-amber-200 via-orange-100 to-yellow-200", dark: false },
  "bg-linear-to-br from-amber-100 via-orange-50 to-yellow-100": { classes: "bg-linear-to-br from-amber-100 via-orange-50 to-yellow-100", dark: false },
  "bg-linear-to-br from-emerald-200 via-teal-100 to-cyan-200": { classes: "bg-linear-to-br from-emerald-200 via-teal-100 to-cyan-200", dark: false },
  "bg-linear-to-br from-rose-100 via-pink-50 to-fuchsia-100": { classes: "bg-linear-to-br from-rose-100 via-pink-50 to-fuchsia-100", dark: false },
  "bg-linear-to-br from-rose-200 via-pink-100 to-fuchsia-200": { classes: "bg-linear-to-br from-rose-200 via-pink-100 to-fuchsia-200", dark: false },
  "bg-linear-to-br from-blue-50 via-indigo-50 to-violet-50": { classes: "bg-linear-to-br from-blue-50 via-indigo-50 to-violet-50", dark: false },
  "bg-gray-50": { classes: "bg-gray-50", dark: false },
  "bg-linear-to-br from-gray-900 via-darkblue to-gray-800": { classes: "bg-linear-to-br from-gray-900 via-blue-950 to-gray-800 text-white", dark: true },
};

const SPACER: Record<string, string> = { sm: "h-4", md: "h-8", lg: "h-12", xl: "h-16" };
/**
 * Columns: one column until the "stack" size, then the block's column count. "phone" stacks below 768px (the default),
 * "tablet" stacks below 1024px, "never" keeps every column side by side. Class names are written out in full so
 * Tailwind can find them.
 */
const COLUMNS: Record<string, Record<string, string>> = {
  phone: { "2": "md:grid-cols-2", "3": "md:grid-cols-3", "4": "md:grid-cols-2 lg:grid-cols-4" },
  tablet: { "2": "lg:grid-cols-2", "3": "lg:grid-cols-3", "4": "lg:grid-cols-4" },
  never: { "2": "grid-cols-2", "3": "grid-cols-3", "4": "grid-cols-4" },
};
const GRID: Record<string, string> = { "2": "md:grid-cols-2", "3": "md:grid-cols-3", "4": "md:grid-cols-2 lg:grid-cols-4" };
/** Grid cards on phones: one column by default, two when the block asks for it. */
const GRID_PHONE: Record<string, string> = { "1": "", "2": "grid-cols-2" };

/** "hide" on a block: the classes that hide it on each size (phone under 768px, tablet 768-1023px, desktop 1024px+). */
const HIDE_ON: Record<Device, string> = { phone: "max-md:hidden", tablet: "md:max-lg:hidden", desktop: "lg:hidden" };
const HEADING_SIZE: Record<Level, string> = {
  h1: "text-3xl font-bold tracking-tight sm:text-4xl",
  h2: "text-2xl font-bold tracking-tight sm:text-3xl",
  h3: "text-xl font-semibold",
  h4: "text-lg font-semibold",
};

/** `edit` names the field the text belongs to, so the builder canvas can edit it in place. */
function Heading({ level, dark, className = "", edit, children }: { level: Level; dark: boolean; className?: string; edit?: string; children: ReactNode }) {
  const Tag = level;
  return <Tag data-edit={edit} className={`${HEADING_SIZE[level]} ${dark ? "text-white" : "text-slate-900"} ${className}`}>{children}</Tag>;
}

/** Heading, subtitle and description shared by most blocks. */
function Intro({ f, dark, align = "center" }: { f: Obj; dark: boolean; align?: "center" | "left" }) {
  const heading = str(f.heading);
  const subtitle = str(f.subtitle) || str(f.accentText);
  const description = str(f.description) ? f.description : undefined;
  if (!heading && !subtitle && !description) return null;
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {heading && <Heading level="h2" dark={dark} edit="heading">{heading}</Heading>}
      {subtitle && <p data-edit={str(f.subtitle) ? "subtitle" : "accentText"} className={`mt-3 text-lg ${dark ? "text-slate-200" : "text-slate-600"}`}>{subtitle}</p>}
      <RichHtml html={description} tone={dark ? "light" : "default"} className="mt-4" />
    </div>
  );
}

/** A link or button. Relative paths use the router; anything else is a plain link. Bad URLs render nothing. */
function Action({ href, label, className }: { href: unknown; label: unknown; className: string }) {
  const url = safeUrl(href, "link");
  const name = str(label);
  if (!url || !name) return null;
  if (url.startsWith("/")) {
    return (
      <Link href={url} className={className}>
        {name}
      </Link>
    );
  }
  return (
    <a href={url} className={className}>
      {name}
    </a>
  );
}

const outlineFor = (dark: boolean) => (dark ? "inline-flex items-center justify-center rounded-lg border border-white/60 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" : btnOutline);

function Img({ src, alt, caption, className = "" }: { src: unknown; alt: unknown; caption?: unknown; className?: string }) {
  const url = safeUrl(src, "image");
  if (!url) return null;
  const note = str(caption);
  return (
    <figure className={className}>
      <img src={url} alt={str(alt)} loading="lazy" className="h-auto w-full rounded-2xl object-cover" />
      {note && <figcaption className="mt-2 text-sm text-slate-500">{note}</figcaption>}
    </figure>
  );
}

function Panel({ dark, className = "", children }: { dark: boolean; className?: string; children: ReactNode }) {
  return <div className={`${dark ? "rounded-2xl border border-white/15 bg-white/5 p-6" : card} ${className}`}>{children}</div>;
}

const CALLOUT: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
};
const CARD_COLS: Record<string, string> = { "grid-2": "md:grid-cols-2", "grid-3": "md:grid-cols-3", "grid-4": "md:grid-cols-2 lg:grid-cols-4" };
const TESTIMONIAL_COLS: Record<string, string> = { single: "max-w-3xl mx-auto", "grid-2": "md:grid-cols-2", "grid-3": "md:grid-cols-3" };
const STATS_COLS: Record<string, string> = { "2-col": "md:grid-cols-2", "3-col": "md:grid-cols-3", "4-col": "md:grid-cols-2 lg:grid-cols-4" };
const VIDEO_ALIGN: Record<string, string> = { left: "justify-start", center: "justify-center", right: "justify-end" };
const VIDEO_WIDTH: Record<string, string> = { full: "", half: "md:w-1/2", third: "md:w-1/3" };

function IconCards({ f, dark }: { f: Obj; dark: boolean }) {
  const items = list(f.items).map(obj).filter((x) => str(x.title) || str(x.icon));
  if (items.length === 0) return null;
  return (
    <>
      <Intro f={f} dark={dark} />
      <div className={`grid gap-6 ${CARD_COLS[str(f.layout)] ?? CARD_COLS["grid-3"]}`}>
        {items.map((x, i) => (
          <Panel key={i} dark={dark}>
            {str(x.icon) && <span aria-hidden="true" className="text-3xl">{str(x.icon)}</span>}
            {str(x.title) && <h3 className={`mt-3 text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.title)}</h3>}
            <RichHtml html={x.description} tone={dark ? "light" : "default"} className="mt-2" />
          </Panel>
        ))}
      </div>
    </>
  );
}

function Testimonials({ f, dark }: { f: Obj; dark: boolean }) {
  const items = list(f.items).map(obj).filter((x) => str(x.quote));
  if (items.length === 0) return null;
  return (
    <div className={`grid gap-6 ${TESTIMONIAL_COLS[str(f.layout)] ?? TESTIMONIAL_COLS["single"]}`}>
      {items.map((x, i) => (
        <Panel key={i} dark={dark}>
          <p className={`leading-relaxed ${dark ? "text-slate-100" : "text-slate-800"}`}>&ldquo;{str(x.quote)}&rdquo;</p>
          <div className="mt-4 flex items-center gap-3">
            {str(x.avatar) && <Img src={x.avatar} alt={str(x.author)} className="size-12 rounded-full object-cover" />}
            <div>
              {str(x.author) && <p className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.author)}</p>}
              {str(x.role) && <p className={`text-sm ${dark ? "text-slate-300" : muted}`}>{str(x.role)}</p>}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Stats({ f, dark }: { f: Obj; dark: boolean }) {
  const items = list(f.items).map(obj).filter((x) => str(x.value));
  if (items.length === 0) return null;
  return (
    <div className={`grid gap-6 text-center ${STATS_COLS[str(f.layout)] ?? STATS_COLS["3-col"]}`}>
      {items.map((x, i) => (
        <div key={i}>
          <p className={`text-4xl font-bold ${dark ? "text-white" : "text-site-700"}`}>
            {str(x.value)}
            {str(x.suffix)}
          </p>
          {str(x.label) && <p className={`mt-1 text-sm ${dark ? "text-slate-200" : muted}`}>{str(x.label)}</p>}
        </div>
      ))}
    </div>
  );
}

function ContactInfo({ f, dark }: { f: Obj; dark: boolean }) {
  const rows: [string, string][] = [
    ["Address", str(f.address)],
    ["Phone", str(f.phone)],
    ["Email", str(f.email)],
    ["Hours", str(f.hours)],
  ];
  const shown = rows.filter(([, value]) => value);
  if (shown.length === 0) return null;
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {shown.map(([label, value]) => (
        <div key={label}>
          <dt className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{label}</dt>
          <dd className={dark ? "text-slate-200" : muted}>
            {label === "Phone" ? <a href={`tel:${value.replace(/[^\d+]/g, "")}`} className="hover:underline">{value}</a>
              : label === "Email" ? <a href={`mailto:${value}`} className="hover:underline">{value}</a>
              : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Only Google Maps embed links, or an address turned into a Google Maps embed. Nothing else is framed. */
function MapEmbed({ f }: { f: Obj }) {
  const url = str(f.url);
  const address = str(f.address);
  const src = url.startsWith("https://www.google.com/maps/embed") ? url : address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null;
  if (!src) return null;
  const h = Number.parseInt(str(f.height), 10);
  const height = Number.isInteger(h) && h >= 150 && h <= 800 ? h : 400;
  return <iframe src={src} title={address || "Map"} height={height} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full rounded-xl border-0" />;
}

/** YouTube and Vimeo links are framed with their privacy-friendly player; a direct video file plays in the page. */
function VideoBlock({ f }: { f: Obj }) {
  const url = str(f.url);
  const youtube = url.match(/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{6,20})/) ?? url.match(/^https:\/\/youtu\.be\/([\w-]{6,20})/);
  const vimeo = url.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  const file = /^https:\/\/[^\s]+\.(mp4|webm|ogg)(\?[^\s]*)?$/i.test(url);
  if (!youtube && !vimeo && !file) return null;
  const align = VIDEO_ALIGN[str(f.alignment)] ?? VIDEO_ALIGN["center"];
  const width = `w-full ${VIDEO_WIDTH[str(f.width)] ?? ""}`;
  return (
    <div className={`flex ${align}`}>
      <div className={`${width} aspect-video overflow-hidden rounded-xl`}>
        {youtube ? (
          <iframe src={`https://www.youtube-nocookie.com/embed/${youtube[1]}`} title="Video" loading="lazy" allowFullScreen className="size-full border-0" />
        ) : vimeo ? (
          <iframe src={`https://player.vimeo.com/video/${vimeo[1]}`} title="Video" loading="lazy" allowFullScreen className="size-full border-0" />
        ) : (
          <video src={url} controls className="size-full" />
        )}
      </div>
    </div>
  );
}

function Pricing({ f, dark }: { f: Obj; dark: boolean }) {
  const items = list(f.items).map(obj).filter((x) => str(x.label) || str(x.price));
  if (items.length === 0) return null;
  return (
    <div className={`overflow-hidden rounded-xl border ${dark ? "border-white/15" : "border-slate-200"}`}>
      {str(f.title) && <h3 className={`px-5 py-3 font-semibold ${dark ? "bg-white/5 text-white" : "bg-slate-50 text-slate-900"}`}>{str(f.title)}</h3>}
      <ul className={`divide-y ${dark ? "divide-white/10" : "divide-slate-100"}`}>
        {items.map((x, i) => (
          <li key={i} className={`flex justify-between gap-4 px-5 py-3 text-sm ${dark ? "text-slate-100" : "text-slate-800"}`}>
            <span>{str(x.label)}</span>
            <span className="font-semibold">{str(x.price)}</span>
          </li>
        ))}
      </ul>
      {str(f.note) && <RichHtml html={f.note} tone={dark ? "light" : "default"} className="px-5 py-3 text-xs" />}
    </div>
  );
}

function BlogCards({ f, dark, blogs: all }: { f: Obj; dark: boolean; blogs: RenderData["blogs"] }) {
  const limit = typeof f.limit === "number" && Number.isInteger(f.limit) && f.limit > 0 ? Math.min(f.limit, 12) : 3;
  const blogs = all.slice(0, limit);
  if (blogs.length === 0) return null;
  return (
    <>
      <Intro f={f} dark={dark} />
      <div className={`grid gap-6 ${GRID["3"]}`}>
        {blogs.map((b) => (
          <Link key={b.slug} href={`/blog/${b.slug}`} className="block">
            <Panel dark={dark} className="h-full">
              {b.image && <Img src={b.image} alt={b.title} className="mb-4 h-40 w-full rounded-lg object-cover" />}
              <h3 className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{b.title}</h3>
              {b.excerpt && <p className={`mt-2 text-sm ${dark ? "text-slate-200" : muted}`}>{b.excerpt}</p>}
            </Panel>
          </Link>
        ))}
      </div>
    </>
  );
}

/** Reviews from Google: stars, text and reviewer name, with an optional link to all reviews on Google. */
function GoogleReviews({ f, dark }: { f: Obj; dark: boolean }) {
  const reviews = list(f.reviews).map(obj).filter((x) => str(x.review));
  if (reviews.length === 0) return null;
  const url = safeUrl(f.googleBusinessUrl, "link");
  const stars = (value: unknown) => Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
  return (
    <>
      <div className="mx-auto max-w-3xl text-center">
        <p className={`text-xs font-extrabold uppercase tracking-[0.14em] ${dark ? "text-slate-200" : "text-slate-800"}`}>
          <span className="font-black text-[#4285f4]">G</span> Google Reviews
        </p>
        {str(f.title) && <h2 className={`mt-4 text-3xl font-black tracking-tight md:text-4xl ${dark ? "text-white" : "text-slate-950"}`}>{str(f.title)}</h2>}
        {str(f.subtitle) && <p className={`mt-3 text-base leading-relaxed ${dark ? "text-slate-200" : muted}`}>{str(f.subtitle)}</p>}
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((x, i) => {
          const rating = stars(x.rating);
          return (
            <Panel key={i} dark={dark} className="flex flex-col">
              <p className="text-amber-400" aria-label={`${rating} out of 5 stars`}>
                {"★".repeat(rating)}
                <span className="text-slate-300">{"★".repeat(5 - rating)}</span>
              </p>
              <blockquote className={`mt-4 text-sm leading-relaxed ${dark ? "text-slate-100" : "text-slate-600"}`}>&ldquo;{str(x.review)}&rdquo;</blockquote>
              <p className={`mt-auto pt-5 text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.reviewerName) || "Google reviewer"}</p>
            </Panel>
          );
        })}
      </div>
      {url && (
        <div className="mt-10 text-center">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-extrabold text-[#24484b] hover:underline">
            {str(f.buttonLabel) || "See all reviews on Google"} <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </>
  );
}

function CallToBook({ dark, contact }: { dark: boolean; contact: RenderData["contact"] }) {
  return (
    <div className={`${dark ? "text-slate-200" : muted} rounded-2xl border border-dashed p-6 text-center ${dark ? "border-white/30" : "border-slate-300"}`}>
      <p>
        To book, call{" "}
        <a href={contact.phoneHref} className="font-semibold underline">
          {contact.phone}
        </a>{" "}
        or email{" "}
        <a href={`mailto:${contact.email}`} className="font-semibold underline">
          {contact.email}
        </a>
        .
      </p>
    </div>
  );
}

/** Phone and address line for the trust bar. */
function TrustContact({ dark, contact }: { dark: boolean; contact: RenderData["contact"] }) {
  return (
    <p className={`text-center ${dark ? "text-slate-200" : muted}`}>
      Call{" "}
      <a href={contact.phoneHref} className="font-semibold underline">
        {contact.phone}
      </a>{" "}
      · {contact.address}
    </p>
  );
}

/** Course cards from the course list, optionally only the ones marked for the home page. Fails quietly. */
function CourseCards({ f, dark, courses }: { f: Obj; dark: boolean; courses: RenderData["courses"] }) {
  const limit = typeof f.limit === "number" && Number.isInteger(f.limit) && f.limit > 0 ? Math.min(f.limit, 12) : 6;
  const shown = (f.showOnHome === true ? courses.filter((c) => c.showOnHome) : courses).slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <>
      <Intro f={f} dark={dark} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </>
  );
}

/** Wraps a rendered block in the classes that hide it on the sizes its "hide" list names. */
function withVisibility(block: unknown, node: ReactNode): ReactNode {
  if (node === null) return null;
  const shown = visibleOn(obj(block));
  const hidden = (["phone", "tablet", "desktop"] as const).filter((d) => !shown.includes(d)).map((d) => HIDE_ON[d]);
  if (hidden.length === 0) return node;
  return <div className={hidden.join(" ")}>{node}</div>;
}

/** One block, at any depth (a block can sit inside a column or a custom group). `dark` is set on dark bands. */
/** A block inside another block. Marked so the builder doesn't edit its text as if it belonged to the outer block. */
function renderBlock(block: unknown, dark: boolean, data: RenderData): ReactNode {
  return <div className="contents" data-nested="" data-key={obj(block)._key as string | undefined}>{withVisibility(block, renderBlockContent(block, dark, data))}</div>;
}

function renderBlockContent(block: unknown, dark: boolean, data: RenderData): ReactNode {
  const type = str(obj(block).type);
  const f = fields(block);
  const b = obj(block);

  switch (type) {
    case "heading": {
      const text = str(f.text);
      if (!text) return null;
      return (
        <Heading level={headingLevel(f.level)} dark={dark} edit="text" className={str(f.alignment) === "center" ? "text-center" : ""}>
          {text}
        </Heading>
      );
    }
    case "paragraph": {
      const text = str(f.text);
      return text ? <p data-edit="text" className={`${dark ? "text-slate-200" : muted} leading-relaxed`}>{text}</p> : null;
    }
    case "text":
      return <RichHtml html={f.html} tone={dark ? "light" : "default"} />;
    case "image":
      return <Img src={f.src} alt={f.alt} caption={f.caption} />;
    case "spacer":
      return <div aria-hidden="true" className={SPACER[str(f.height)] ?? "h-8"} />;
    case "divider":
      return <hr className={dark ? "border-white/20" : "border-slate-200"} />;
    case "button":
      return (
        <div className="flex flex-wrap gap-3">
          {list(f.buttons).map((item, i) => {
            const x = obj(item);
            return <Action key={i} href={x.href} label={x.label} className={x.variant === "outline" ? outlineFor(dark) : btn} />;
          })}
        </div>
      );
    case "icon-card":
      return <IconCards f={f} dark={dark} />;
    case "quote":
      return (
        <figure className="mx-auto max-w-3xl">
          <blockquote className={`text-xl italic leading-relaxed ${dark ? "text-white" : "text-slate-800"}`}>
            <RichHtml html={f.text} tone={dark ? "light" : "default"} />
          </blockquote>
          {str(f.author) && <figcaption className={`mt-4 text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>— {str(f.author)}</figcaption>}
        </figure>
      );
    case "testimonial":
      return <Testimonials f={f} dark={dark} />;
    case "stats":
      return <Stats f={f} dark={dark} />;
    case "callout": {
      const variant = str(f.variant);
      return (
        <div className={`rounded-xl border p-5 ${CALLOUT[variant] ?? CALLOUT.info}`}>
          {str(f.title) && <p className="font-semibold">{str(f.title)}</p>}
          <RichHtml html={f.html} tone="default" className="mt-2" />
        </div>
      );
    }
    case "contact-info":
      return <ContactInfo f={f} dark={dark} />;
    case "map-embed":
      return <MapEmbed f={f} />;
    case "video":
      return <VideoBlock f={f} />;
    case "pricing":
      return <Pricing f={f} dark={dark} />;
    case "blog-cards":
      return <BlogCards f={f} dark={dark} blogs={data.blogs} />;
    case "google-reviews":
      return <GoogleReviews f={f} dark={dark} />;
    case "custom":
      // A group is a drop zone in the builder canvas (data-drop); its empty state is styled only there.
      return (
        <div className="grid gap-6" data-drop="" data-field="blocks">
          {list(b.blocks).map((child, i) => <Fragment key={i}>{renderBlock(child, dark, data)}</Fragment>)}
        </div>
      );
    case "columns": {
      const stack = str(f.stack);
      const stackKey = stack === "tablet" || stack === "never" ? stack : "phone";
      const columnCount = list(f.columns).length;
      return (
        <div className={`grid gap-8 ${COLUMNS[stackKey][String(columnCount)] ?? ""}`}>
          {list(f.columns).map((column, i) => (
            <div key={i} className="grid min-w-0 content-start gap-6">
              {list(column).map((child, j) => <Fragment key={j}>{renderBlock(child, dark, data)}</Fragment>)}
            </div>
          ))}
        </div>
      );
    }
    case "grid":
      return (
        <div className="grid gap-6">
          <div className={`grid gap-6 ${GRID_PHONE[str(f.mobileColumns) === "2" ? "2" : "1"]} ${GRID[String(f.columns)] ?? "md:grid-cols-2 lg:grid-cols-3"}`}>
            {list(f.items).map((item, i) => {
              const x = obj(item);
              const icon = safeUrl(x.icon, "image");
              return (
                <Panel key={i} dark={dark} className="flex flex-col">
                  {icon && <img src={icon} alt="" className="mb-4 h-12 w-12 object-contain" />}
                  {str(x.title) && <h3 className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.title)}</h3>}
                  <RichHtml html={x.description} tone={dark ? "light" : "default"} className="mt-3" />
                </Panel>
              );
            })}
          </div>
        </div>
      );
    case "benefits":
      return (
        <>
          <Intro f={f} dark={dark} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list(f.items).map((item, i) => {
              const x = obj(item);
              return (
                <Panel key={i} dark={dark}>
                  <h3 className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.title)}</h3>
                  <RichHtml html={x.description} tone={dark ? "light" : "default"} className="mt-2" />
                </Panel>
              );
            })}
          </div>
        </>
      );
    case "trust":
      return (
        <>
          <Intro f={f} dark={dark} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list(f.items).map((item, i) => (
              <li key={i} className={`flex gap-3 rounded-xl p-4 ${dark ? "bg-white/5 text-white" : "bg-white text-slate-800 shadow-sm"}`}>
                <span aria-hidden="true" className="text-site-500">✔</span>
                <span className="font-medium">{str(item)}</span>
              </li>
            ))}
          </ul>
          {f.showContact === true && <TrustContact dark={dark} contact={data.contact} />}
        </>
      );
    case "audience":
      return (
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="grid gap-4">
            <Intro f={f} dark={dark} align="left" />
            {list(f.items).length > 0 && (
              <ul className={`list-disc space-y-2 pl-6 ${dark ? "text-slate-200" : "text-slate-700"}`}>
                {list(f.items).map((item, i) => <li key={i}>{str(item)}</li>)}
              </ul>
            )}
          </div>
          <Img src={f.image} alt={f.heading} />
        </div>
      );
    case "process":
      return (
        <>
          <Intro f={f} dark={dark} />
          <div className="grid gap-4 md:grid-cols-2">
            {list(f.steps).map((step, i) => {
              const x = obj(step);
              return (
                <Panel key={i} dark={dark}>
                  <h3 className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.title)}</h3>
                  {str(x.description) && <p className={`mt-2 leading-relaxed ${dark ? "text-slate-200" : muted}`}>{str(x.description)}</p>}
                </Panel>
              );
            })}
          </div>
        </>
      );
    case "faq":
      return (
        <>
          <Intro f={f} dark={dark} />
          <div className="mx-auto grid w-full max-w-3xl gap-3">
            {list(f.items).map((item, i) => {
              const x = obj(item);
              return (
                <details key={i} className={`group rounded-xl border p-5 ${dark ? "border-white/15 bg-white/5" : "border-slate-200 bg-white"}`}>
                  <summary className={`cursor-pointer list-none font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.question)}</summary>
                  <RichHtml html={x.answer} tone={dark ? "light" : "default"} className="mt-3" />
                </details>
              );
            })}
          </div>
        </>
      );
    case "course-cards":
      return <CourseCards f={f} dark={dark} courses={data.courses} />;
    case "car-lessons-booking":
      return (
        <>
          <Intro f={f} dark={dark} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list(f.pricing).map((item, i) => {
              const x = obj(item);
              return (
                <Panel key={i} dark={dark}>
                  <p className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.hours)}</p>
                  <p className={`mt-2 text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.price)}</p>
                  {str(x.description) && <p className={`mt-2 text-sm ${dark ? "text-slate-200" : muted}`}>{str(x.description)}</p>}
                </Panel>
              );
            })}
          </div>
          {str(f.note) && <p className={`text-center text-sm ${dark ? "text-slate-200" : muted}`}>{str(f.note)}</p>}
          {str(f.bookingHeading) && <h3 className={`text-center text-xl font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(f.bookingHeading)}</h3>}
          <CallToBook dark={dark} contact={data.contact} />
        </>
      );
    case "road-test-booking":
      return (
        <>
          <Intro f={f} dark={dark} />
          <div className="grid gap-4 md:grid-cols-2">
            {list(f.documents).map((group, i) => {
              const x = obj(group);
              return (
                <Panel key={i} dark={dark}>
                  <h3 className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(x.title)}</h3>
                  <ul className={`mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed ${dark ? "text-slate-200" : "text-slate-700"}`}>
                    {list(x.items).map((item, j) => <li key={j}>{str(item)}</li>)}
                  </ul>
                </Panel>
              );
            })}
          </div>
          {str(f.bookingHeading) && <h3 className={`text-center text-xl font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{str(f.bookingHeading)}</h3>}
          <CallToBook dark={dark} contact={data.contact} />
        </>
      );
    default:
      if (SPEC_TYPES.has(type)) console.warn(`CMS block "${type}" is defined in @alo/blocks but the front does not render it yet.`);
      return null;
  }
}

function HeroBand({ f, first }: { f: Obj; first: boolean }) {
  const image = safeUrl(f.image, "image");
  const heading = str(f.heading);
  const badge = str(f.badge);
  const subtitle = str(f.subtitle);
  return (
    <section className="bg-site-navy text-white">
      <div className={`${container} grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20`}>
        <div className="grid gap-4">
          {badge && <p className="text-sm font-semibold uppercase tracking-wide text-site-200">{badge}</p>}
          {heading && <Heading level={first ? "h1" : "h2"} dark edit="heading">{heading}</Heading>}
          {subtitle && <p data-edit="subtitle" className="text-lg text-slate-200">{subtitle}</p>}
          <RichHtml html={f.description} tone="light" />
          <div className="flex flex-wrap gap-3">
            <Action href={obj(f.primaryCta).href} label={obj(f.primaryCta).label} className={btn} />
            <Action href={obj(f.secondaryCta).href} label={obj(f.secondaryCta).label} className={outlineFor(true)} />
          </div>
        </div>
        {image && <img src={image} alt="" className="h-auto w-full rounded-2xl object-cover shadow-lg" />}
      </div>
    </section>
  );
}

/** A top-level block as a full-width band. */
function renderTop(block: unknown, index: number, data: RenderData): ReactNode {
  const b = obj(block);
  if (b.type === "hero") return withVisibility(block, <HeroBand f={fields(block)} first={index === 0} />);

  const bandKey = str(b.bgClass) || str(fields(block).bgClass);
  const band = BANDS[bandKey];
  const dark = band?.dark ?? false;
  const content = renderBlockContent(block, dark, data);
  if (!content) return null;
  return withVisibility(
    block,
    <section className={`${band?.classes ?? ""} ${section}`}>
      <div className={`${container} grid gap-8`}>{content}</div>
    </section>,
  );
}

export function PageSections({ sections, data }: { sections: Section[]; data: RenderData }) {
  return renderSections(sections, data);
}

function renderSections(sections: Section[], data: RenderData) {
  if (sections.length === 0) {
    return (
      <section className={section}>
        <div className={container}>
          <p className={muted}>This page has no content yet.</p>
        </div>
      </section>
    );
  }
  return (
    <>
      {sections.map((block, i) => (
        // "contents" keeps the wrapper out of the layout; the builder canvas uses data-section to find a block when clicked.
        <div key={i} className="contents" data-section={i} data-key={obj(block)._key as string | undefined}>
          {renderTop(block, i, data)}
        </div>
      ))}
    </>
  );
}
