"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";

export interface AccordionItem {
  question: string;
  answer: React.ReactNode;
}

/**
 * Questions collapsed, answers on click.
 *
 * Built on buttons and `aria-expanded` rather than `<details>`, because
 * the heading has to stay a heading for a screen-reader's heading list
 * and `<summary>` is not one. Keyboard support is whatever a button
 * already has, which is the right amount.
 *
 * One divider between items, never two: each row carries a top border
 * and the list carries the last one. Doubling them was what made the
 * old FAQ look like a spreadsheet.
 *
 * Answers are `text-ink/85`, not a pale grey. An answer nobody can read
 * comfortably is a question we have not answered.
 */
export function Accordion({
  items,
  className = "",
}: {
  items: AccordionItem[];
  className?: string;
}) {
  const base = useId();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={`border-b border-line ${className}`}>
      {items.map((item, index) => {
        const isOpen = open === index;
        const panel = `${base}-panel-${index}`;
        const control = `${base}-control-${index}`;
        return (
          <div key={item.question} className="border-t border-line">
            <h3>
              <button
                type="button"
                id={control}
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-start justify-between gap-6 py-5 text-left transition-colors duration-200 hover:text-oxblood"
              >
                <span className="font-display text-xl md:text-2xl">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-oxblood"
                >
                  {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                </span>
              </button>
            </h3>
            <div
              id={panel}
              role="region"
              aria-labelledby={control}
              hidden={!isOpen}
              className="pb-6"
            >
              <p className="max-w-prose text-ink/85">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
