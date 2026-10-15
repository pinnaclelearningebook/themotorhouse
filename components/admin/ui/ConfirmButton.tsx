"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A destructive action, behind one deliberate second step.
 *
 * A native `confirm()` would do the job and look like 1998; a modal
 * library would be 30KB for one dialog. This is a `<dialog>`: focus
 * is trapped by the platform, Escape closes it by the platform, and
 * the backdrop is a pseudo-element rather than a div nobody can see.
 *
 * The confirm button is the destructive one and is *not* autofocused —
 * an operator who hits Return out of habit should not have deleted
 * something. Cancel takes focus.
 */
export function ConfirmButton({
  children,
  title,
  body,
  confirmLabel,
  onConfirm,
  className = "",
  pending = false,
}: {
  children: React.ReactNode;
  title: string;
  /** What will happen, and what cannot be undone. */
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      cancel.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className={className}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-auto max-w-sm rounded border border-line bg-paper p-6 text-ink backdrop:bg-ink/60"
      >
        <h2 className="font-display text-xl">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/80">{body}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            ref={cancel}
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center rounded border border-line px-4 text-sm transition-colors duration-200 hover:border-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            className="inline-flex min-h-11 items-center rounded bg-oxblood px-4 text-sm font-medium text-paper transition-colors duration-200 hover:bg-oxblood-lt"
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
