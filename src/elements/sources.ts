/**
 * Records the course and blog cards and list sections show. The builder loads them from the database and hands them to
 * the renderer, so a layout only stores ids and list settings. All text here is plain text.
 */
export type CourseSource = {
  id: number;
  title: string;
  slug: string;
  image: string;
  /** The price visitors pay, formatted, for example "$35.00". */
  price: string;
  /** The price before a discount, formatted. Empty when there is no discount. */
  oldPrice: string;
  /** The price visitors pay as a number, for sorting. */
  priceValue: number;
  /** True when a discount is set, so the course is on sale. */
  onSale: boolean;
  /** The discount as a whole percentage, for a badge such as "70% OFF". 0 when there is no discount. */
  discountPercent: number;
  /** A short line under the title, from the course description. */
  subtitle: string;
  /** The checklist points from the course description, without their tick marks. */
  points: string[];
  /** True when the course is marked to show on the home page. */
  showOnHome: boolean;
  /** The order the school set for its courses. Lower comes first. */
  sort: number;
  duration: string;
  summary: string;
};

export type BlogSource = {
  id: number;
  title: string;
  slug: string;
  image: string;
  /** The publish date, formatted for reading, for example "May 3, 2026". */
  date: string;
  /** The publish time as an ISO string, for sorting. */
  publishedAt: string;
  summary: string;
};

export type CardSources = {
  courses: CourseSource[];
  blogs: BlogSource[];
  /**
   * The public site's address with no trailing slash, for example "https://www.example.com". Card links are built from
   * it, so they work from the builder's preview too. Empty means links are relative to the page that shows them.
   */
  siteUrl: string;
};

export const EMPTY_SOURCES: CardSources = { courses: [], blogs: [], siteUrl: "" };
