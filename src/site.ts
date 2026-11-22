/**
 * Site settings: the header, footer, contact details, branding and announcement bar. Stored as one JSON document
 * (one row in `site_settings`), edited in the admin and read by the public site's layout. The admin validates saves
 * with `validateSiteSettings`; the front falls back to `DEFAULT_SITE_SETTINGS` when the API can't be reached.
 */
import type { ValidResult } from "./index";

/** `target` is optional. "_blank" opens the link in a new tab; leave it out for the same tab. */
export type SiteLink = { label: string; href: string; target?: "_blank" };

/** Link targets the menu editor can set. */
export const LINK_TARGETS = ["_self", "_blank"] as const;

export type SiteSettings = {
  branding: { name: string; legalName: string; tdlrLicense: string };
  contact: { phone: string; phoneHref: string; email: string; address: string; studentPortalUrl: string };
  header: { nav: SiteLink[]; cta: SiteLink | null; showStudentLogin: boolean };
  footer: { description: string; columns: { title: string; links: SiteLink[] }[]; legalLinks: SiteLink[] };
  announcement: { enabled: boolean; text: string; href: string };
};

/** The values the public site shipped with before settings moved to the database. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  branding: { name: "Alo Driving School", legalName: "1-A Alo Driving School LLC", tdlrLicense: "C-2376" },
  contact: {
    phone: "214-862-6365",
    phoneHref: "tel:+12148626365",
    email: "alodrivingschool@gmail.com",
    address: "1221 W Airport Fwy, Suite #217, Irving, TX 75062",
    studentPortalUrl: "https://student.alodrivingschool.com/login",
  },
  header: {
    nav: [
      { label: "Road Test Schedule", href: "/road-test-schedule" },
      { label: "Adult Driver Online Course", href: "/adult-driver-ed" },
      { label: "Parent Taught Online Course", href: "/parent-taught-teenage-drivers-ed" },
      { label: "Defensive Driving Online Course", href: "/texas-defensive-driving" },
      { label: "Teenage Driving Classroom", href: "/teenage-driving-courses" },
      { label: "Curso de Español para Adultos", href: "/spanish-driving-course" },
      { label: "In-car Lesson", href: "/car-lessons" },
      { label: "How to get a new driver's license?", href: "/how-to-get-new-drivers-license" },
      { label: "Impact Texas", href: "https://impacttexasdrivers.dps.texas.gov/", target: "_blank" },
    ],
    cta: { label: "Enroll now", href: "/courses/texas-six-hours-adult-course/purchase" },
    showStudentLogin: true,
  },
  footer: {
    description: "A driving school provides individuals with the knowledge and skills needed to obtain a driver's license and become a safe and responsible driver.",
    columns: [
      {
        title: "Useful Links",
        links: [
          { label: "Home", href: "/" },
          { label: "Blogs", href: "/blogs" },
          { label: "Road Test Schedule", href: "/road-test-schedule" },
          { label: "Car Lessons", href: "/car-lessons" },
          { label: "Sitemap", href: "/sitemap" },
        ],
      },
    ],
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-and-conditions" },
    ],
  },
  announcement: { enabled: false, text: "", href: "" },
};

const MAX_NAV = 12;
const MAX_COLUMNS = 4;
const MAX_LINKS = 10;
const MAX_LEGAL = 6;

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** Same rule as the public site: a site path, an https link, or a tel:/mailto: link. Anything else is refused. */
export function isAllowedHref(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//") && !/[\s\\]/.test(value);
  if (value.startsWith("https://")) return /^https:\/\/[^\s]+$/.test(value);
  if (value.startsWith("tel:") || value.startsWith("mailto:")) return /^[^\s]+$/.test(value);
  return false;
}

function text(value: unknown, path: string, max: number, required = true): ValidResult<string> {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") return { ok: false, error: `${path} must be text.` };
  const trimmed = value.trim();
  if (required && !trimmed) return { ok: false, error: `${path} is required.` };
  if (trimmed.length > max) return { ok: false, error: `${path} is too long (max ${max} characters).` };
  return { ok: true, value: trimmed };
}

function href(value: unknown, path: string, required = true): ValidResult<string> {
  const t = text(value, path, 300, required);
  if (!t.ok || !t.value) return t;
  return isAllowedHref(t.value) ? t : { ok: false, error: `${path} must start with "/", "https://", "tel:" or "mailto:".` };
}

function links(value: unknown, path: string, max: number): ValidResult<SiteLink[]> {
  if (!Array.isArray(value)) return { ok: false, error: `${path} must be a list.` };
  if (value.length > max) return { ok: false, error: `${path} can have at most ${max} items.` };
  const out: SiteLink[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!isObject(item)) return { ok: false, error: `${path} item ${i + 1} must be an object.` };
    const label = text(item.label, `${path} item ${i + 1} label`, 80);
    if (!label.ok) return label;
    const url = href(item.href, `${path} item ${i + 1} link`);
    if (!url.ok) return url;
    if (item.target !== undefined && item.target !== null && item.target !== "" && !LINK_TARGETS.includes(item.target as (typeof LINK_TARGETS)[number])) {
      return { ok: false, error: `${path} item ${i + 1} target must be "_self" or "_blank".` };
    }
    out.push(item.target === "_blank" ? { label: label.value, href: url.value, target: "_blank" } : { label: label.value, href: url.value });
  }
  return { ok: true, value: out };
}

/** Validates a settings document from the admin form or the database. Returns a clean copy or the first problem. */
export function validateSiteSettings(input: unknown): ValidResult<SiteSettings> {
  if (!isObject(input)) return { ok: false, error: "Site settings must be an object." };
  const b = isObject(input.branding) ? input.branding : {};
  const c = isObject(input.contact) ? input.contact : {};
  const h = isObject(input.header) ? input.header : {};
  const f = isObject(input.footer) ? input.footer : {};
  const a = isObject(input.announcement) ? input.announcement : {};

  const name = text(b.name, "Site name", 80);
  if (!name.ok) return name;
  const legalName = text(b.legalName, "Legal name", 120);
  if (!legalName.ok) return legalName;
  const tdlr = text(b.tdlrLicense, "TDLR license number", 40, false);
  if (!tdlr.ok) return tdlr;

  const phone = text(c.phone, "Phone", 40);
  if (!phone.ok) return phone;
  const phoneHref = href(c.phoneHref, "Phone link");
  if (!phoneHref.ok) return phoneHref;
  if (!phoneHref.value.startsWith("tel:")) return { ok: false, error: "Phone link must start with tel:." };
  const email = text(c.email, "Email", 120);
  if (!email.ok) return email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return { ok: false, error: "Email must look like an address." };
  const address = text(c.address, "Address", 200, false);
  if (!address.ok) return address;
  const portal = href(c.studentPortalUrl, "Student portal link");
  if (!portal.ok) return portal;

  const nav = links(h.nav ?? [], "Header menu", MAX_NAV);
  if (!nav.ok) return nav;
  let cta: SiteLink | null = null;
  if (isObject(h.cta) && (h.cta.label || h.cta.href)) {
    const ctaLabel = text(h.cta.label, "Button label", 40);
    if (!ctaLabel.ok) return ctaLabel;
    const ctaHref = href(h.cta.href, "Button link");
    if (!ctaHref.ok) return ctaHref;
    cta = { label: ctaLabel.value, href: ctaHref.value };
  }

  const description = text(f.description, "Footer description", 400, false);
  if (!description.ok) return description;
  if (!Array.isArray(f.columns ?? [])) return { ok: false, error: "Footer columns must be a list." };
  const columnsIn = (f.columns ?? []) as unknown[];
  if (columnsIn.length > MAX_COLUMNS) return { ok: false, error: `Use at most ${MAX_COLUMNS} footer columns.` };
  const columns: SiteSettings["footer"]["columns"] = [];
  for (let i = 0; i < columnsIn.length; i++) {
    const col = columnsIn[i];
    if (!isObject(col)) return { ok: false, error: `Footer column ${i + 1} must be an object.` };
    const title = text(col.title, `Footer column ${i + 1} title`, 60);
    if (!title.ok) return title;
    const colLinks = links(col.links ?? [], `Footer column "${title.value}" links`, MAX_LINKS);
    if (!colLinks.ok) return colLinks;
    columns.push({ title: title.value, links: colLinks.value });
  }
  const legalLinks = links(f.legalLinks ?? [], "Footer legal links", MAX_LEGAL);
  if (!legalLinks.ok) return legalLinks;

  const enabled = a.enabled === true;
  const announcementText = text(a.text, "Announcement text", 200, false);
  if (!announcementText.ok) return announcementText;
  const announcementHref = a.href ? href(a.href, "Announcement link") : { ok: true as const, value: "" };
  if (!announcementHref.ok) return announcementHref;
  if (enabled && !announcementText.value) return { ok: false, error: "Announcement text is required when the announcement is on." };

  return {
    ok: true,
    value: {
      branding: { name: name.value, legalName: legalName.value, tdlrLicense: tdlr.value },
      contact: { phone: phone.value, phoneHref: phoneHref.value, email: email.value, address: address.value, studentPortalUrl: portal.value },
      header: { nav: nav.value, cta, showStudentLogin: h.showStudentLogin !== false },
      footer: { description: description.value, columns, legalLinks: legalLinks.value },
      announcement: { enabled, text: announcementText.value, href: announcementHref.value },
    },
  };
}
