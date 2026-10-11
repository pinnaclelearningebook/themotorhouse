import type { LucideIcon } from "lucide-react";

export interface IconListEntry {
  icon: LucideIcon;
  title: React.ReactNode;
  detail?: React.ReactNode;
}

/**
 * An icon, a title and a line. The shape the four promises take, and
 * anything else that is a short list of distinct things.
 *
 * Icons are decorative and marked so: the title says the same thing,
 * and a screen reader reading "circle check, the offer we make is the
 * offer we pay" is worse than reading the sentence.
 */
export function IconList({
  entries,
  tone = "light",
  columns = 4,
  className = "",
}: {
  entries: IconListEntry[];
  tone?: "light" | "dark";
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const dark = tone === "dark";
  const grid = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <ul className={`grid gap-px ${grid} ${dark ? "bg-line-dark" : "bg-line"} ${className}`}>
      {entries.map((entry, index) => {
        const Icon = entry.icon;
        return (
          <li
            key={index}
            className={`flex flex-col gap-4 p-6 md:p-7 ${dark ? "bg-ink" : "bg-paper"}`}
          >
            <Icon
              aria-hidden="true"
              strokeWidth={1.5}
              size={26}
              className={dark ? "text-paper/70" : "text-oxblood"}
            />
            <div>
              <p className="font-medium">{entry.title}</p>
              {entry.detail && (
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    dark ? "text-paper/70" : "text-ink/70"
                  }`}
                >
                  {entry.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
