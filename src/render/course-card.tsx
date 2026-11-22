import type { Course } from "./types";
import { coursePrice, stripHtml } from "./format";
import { btn, card } from "./ui";

/** A course in a course grid. The link goes to the public course page (the apps' own course URLs). */
export function CourseCard({ course }: { course: Course }) {
  const price = coursePrice(course.price, course.discountPrice);
  return (
    <article className={`${card} flex h-full flex-col`}>
      {price.percentOff > 0 && (
        <span className="mb-3 w-fit rounded-full bg-site-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-site-700">
          {price.percentOff}% off
        </span>
      )}
      <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
      {course.duration && <p className="mt-1 text-sm text-slate-500">{course.duration}</p>}
      {course.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{stripHtml(course.description)}</p>}

      <div className="mt-auto flex items-end justify-between gap-4 pt-6">
        <div>
          {price.original && <p className="text-sm text-slate-400 line-through">{price.original}</p>}
          <p className="text-2xl font-bold text-slate-900">{price.current}</p>
        </div>
        <a href={`/courses/${course.slug}`} className={btn}>
          View course
        </a>
      </div>
    </article>
  );
}
