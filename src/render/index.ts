/**
 * The shared page renderer: the same code draws a page on the public site and in the admin's page builder preview.
 * Blocks come from ../index (field specs). Data (courses, blog posts, contact details) is passed in as RenderData.
 */
export { PageSections } from "./page-sections";
export type { BlogSummary, Course, RenderData } from "./types";
export { safeUrl, sanitizeRichText } from "./sanitize";
