import type { LucideIcon } from "lucide-react";

/**
 * What will appear here, and what has to happen first.
 *
 * Not "No data". An empty admin screen is the normal state of a new
 * business and the operator needs to know whether they are looking at
 * a bug, a filter, or a quiet Tuesday. Every one of these says which.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  /** What will fill it, in a sentence. */
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-dashed border-line bg-paper-warm px-6 py-10 text-center">
      {Icon && (
        <Icon
          aria-hidden="true"
          size={22}
          strokeWidth={1.5}
          className="mx-auto text-structure"
        />
      )}
      <p className="mt-3 font-display text-lg">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-structure">
        {children}
      </p>
    </div>
  );
}
