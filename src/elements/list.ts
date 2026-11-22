/**
 * List sections show a set of courses or blog posts instead of hand-placed cards. These are the settings a list can
 * have, and the rules that pick and order the records. Pure functions, so the builder preview and the public site
 * pick the same records.
 */
import type { BlogSource, CardSources, CourseSource } from "./sources";

export const LIST_SOURCES = ["courses", "blogs"] as const;
export type ListSource = (typeof LIST_SOURCES)[number];

export const LIST_MAX = 12;
export const PER_ROW = [2, 3, 4] as const;
export type PerRow = (typeof PER_ROW)[number];

/** Which courses are listed. */
export const COURSE_FILTERS = [
  { id: "all", label: "All published courses" },
  { id: "home", label: "Shown on the home page" },
  { id: "sale", label: "On sale (discounted)" },
] as const;

export const COURSE_SORTS = [
  { id: "order", label: "School's order" },
  { id: "name", label: "Name, A to Z" },
  { id: "price-low", label: "Price, low to high" },
  { id: "price-high", label: "Price, high to low" },
] as const;

export const BLOG_SORTS = [
  { id: "latest", label: "Latest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "title", label: "Title, A to Z" },
] as const;

/** The settings of one list section. `filter` applies to courses only; blog lists always show published posts. */
export type ListSettings = {
  source: ListSource;
  count: number;
  filter: string;
  sort: string;
  perRow: PerRow;
};

export const DEFAULT_LIST: Record<ListSource, Omit<ListSettings, "source">> = {
  courses: { count: 3, filter: "all", sort: "order", perRow: 3 },
  blogs: { count: 3, filter: "all", sort: "latest", perRow: 3 },
};

/** The sort options a source offers. */
export function sortsFor(source: ListSource) {
  return source === "courses" ? COURSE_SORTS : BLOG_SORTS;
}

/** Courses that match the list's filter, in its sort order, cut to its count. */
export function pickCourses(courses: CourseSource[], list: ListSettings): CourseSource[] {
  const matching = courses.filter((c) => {
    if (list.filter === "home") return c.showOnHome;
    if (list.filter === "sale") return c.onSale;
    return true;
  });
  const ordered = [...matching].sort((a, b) => {
    switch (list.sort) {
      case "name":
        return a.title.localeCompare(b.title);
      case "price-low":
        return a.priceValue - b.priceValue || a.sort - b.sort;
      case "price-high":
        return b.priceValue - a.priceValue || a.sort - b.sort;
      default:
        return a.sort - b.sort || a.id - b.id;
    }
  });
  return ordered.slice(0, list.count);
}

/** Blog posts in the list's sort order, cut to its count. */
export function pickBlogs(blogs: BlogSource[], list: ListSettings): BlogSource[] {
  const ordered = [...blogs].sort((a, b) => {
    switch (list.sort) {
      case "oldest":
        return a.publishedAt.localeCompare(b.publishedAt);
      case "title":
        return a.title.localeCompare(b.title);
      default:
        return b.publishedAt.localeCompare(a.publishedAt);
    }
  });
  return ordered.slice(0, list.count);
}

/** The records a list section shows, for either source. */
export function pickRecords(sources: CardSources, list: ListSettings): { courses: CourseSource[]; blogs: BlogSource[] } {
  return list.source === "courses"
    ? { courses: pickCourses(sources.courses, list), blogs: [] }
    : { courses: [], blogs: pickBlogs(sources.blogs, list) };
}
