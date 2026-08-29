/**
 * Marks a spot where real information is still pending.
 * Renders a visible dashed chip in development so nothing gets
 * forgotten, and nothing at all in production so nothing
 * embarrassing ships if a page goes live early.
 */
export function AwaitingInfo({ label }: { label: string }) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return (
    <span className="inline-block rounded border border-dashed border-structure px-2 py-0.5 font-mono text-caption text-structure">
      Awaiting: {label}
    </span>
  );
}
