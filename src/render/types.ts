/**
 * Data the renderer needs. The apps supply it: the front site from the admin API, the admin's page builder from the
 * database. Shapes match what the admin's public routes return.
 */
import type { SiteSettings } from "../site";

export type Course = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  price: string;
  discountPrice: string;
  duration: string;
  image: string | null;
  showOnHome: boolean;
};

export type BlogSummary = {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  excerpt: string | null;
  createdAt: string;
};

export type RenderData = {
  courses: Course[];
  blogs: BlogSummary[];
  contact: SiteSettings["contact"];
};
