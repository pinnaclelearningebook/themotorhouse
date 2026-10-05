/**
 * Whether the seller has said "just the form".
 *
 * Follows the same shape as components/consent/consent.ts, for the same
 * reason: reading browser storage during render or in an effect either
 * breaks hydration or flashes the widget at someone who already dismissed
 * it. useSyncExternalStore with a "pending" server snapshot means the
 * component renders nothing until the client knows the real answer.
 *
 * sessionStorage, not localStorage. A dismissal applies to this visit; a
 * seller who comes back a week later is not still refusing.
 */

const KEY = "tmh_agent_dismissed";
export const DISMISS_EVENT = "tmh-agent-dismiss";

export type Dismissal = "dismissed" | "offered" | "pending";

export function dismissAgent(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Private mode or blocked storage: the in-memory state still holds
    // for this page, which is the common case anyway.
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

export function subscribeToDismissal(onChange: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DISMISS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getDismissalSnapshot(): Dismissal {
  try {
    return window.sessionStorage.getItem(KEY) === "1"
      ? "dismissed"
      : "offered";
  } catch {
    return "offered";
  }
}

export function getDismissalServerSnapshot(): Dismissal {
  return "pending";
}
