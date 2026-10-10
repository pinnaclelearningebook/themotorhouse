"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AGENT } from "@/config/site";
import { VoiceConsent } from "./VoiceConsent";
import {
  dismissAgent,
  subscribeToDismissal,
  getDismissalSnapshot,
  getDismissalServerSnapshot,
} from "./dismissal";

/**
 * {@link AGENT.name} as a floating launcher beside the form.
 *
 * Silent by default and opt-in, per CLAUDE.md section 10: a seller who
 * wants nothing to do with this must be able to fill the form without
 * being spoken to. Nothing opens by itself, nothing makes a sound, and
 * "Just the form" persists for the session — once dismissed, nothing
 * re-offers it.
 *
 * She floats rather than sitting in the page flow because the form is
 * four steps tall and she belongs to all of them. In the flow she moved
 * with whichever step was showing and left the conversation somewhere
 * below the fold.
 *
 * Notes buffer while there is no lead. She appears when the car is
 * identified, and the lead is created at the phone field, so anything the
 * seller says in between would otherwise have nowhere to go. The buffer
 * replays once a lead id arrives (ARCHITECTURE.md section 9).
 */

const STALL_MS = 30_000;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Shown to an admin previewing her on the public site, in the launcher's
 * own tooltip row and in the panel, so neither can be read as what a
 * seller is being shown.
 */
const previewLabel = (
  <p className="max-w-56 rounded border border-dashed border-structure bg-paper px-3 py-1.5 font-mono text-caption text-structure sm:max-w-none">
    Admin preview — {AGENT.name} is off for the public
  </p>
);

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.2-4.2A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

export function AgentWidget({
  leadId,
  reg,
  preview = false,
}: {
  leadId: string | null;
  /** The server resolves the vehicle from this; no ids cross the wire. */
  reg: string;
  /**
   * An admin is looking at her on the public site while agent_enabled is
   * false. Labelled, because the whole point of previewing on the real
   * page is that it looks like the real page — and an operator who
   * forgets which of the two they are reading is the person most likely
   * to believe Maya is live to sellers when she is not (CLAUDE.md
   * section 17). Display only: what the endpoints allow is decided
   * server-side in lib/agent/access and never from this prop.
   */
  preview?: boolean;
}) {
  const dismissal = useSyncExternalStore(
    subscribeToDismissal,
    getDismissalSnapshot,
    getDismissalServerSnapshot,
  );
  /** "launcher" is the closed button. Nothing moves this but a click. */
  const [view, setView] = useState<"launcher" | "panel">("launcher");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Set only once the session cookie exists. Anything that needs the
  // session must wait for this, not for the panel being open.
  const [sessionReady, setSessionReady] = useState(false);
  // Voice is off until the seller accepts the consent panel. Nothing
  // connects, and no microphone permission is requested, before that.
  const [voice, setVoice] = useState<"off" | "consent" | "live">("off");
  const [voicePending, setVoicePending] = useState(false);
  /** Shown in the panel when something fails in a way the seller should see. */
  const [error, setError] = useState<string | null>(null);
  const conversation = useRef<{ endSession: () => Promise<void> } | null>(null);
  const started = useRef(false);
  const buffered = useRef<string[]>([]);
  const linked = useRef(false);
  const draftRef = useRef<HTMLInputElement | null>(null);
  const log = useRef<HTMLDivElement | null>(null);

  // Stall detection. Listening at the document means the form needs no
  // knowledge of this component. Thirty seconds on one field, once per
  // field, and only while the panel is already open — an unopened widget
  // interrupting someone is exactly what section 10 forbids.
  useEffect(() => {
    if (view !== "panel") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const helped = new Set<string>();

    function onFocusIn(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      const name = target?.getAttribute?.("name");
      if (!name || helped.has(name)) return;
      timer = setTimeout(() => {
        helped.add(name);
        void send(`I've been sitting on the "${name}" field for a while.`, true);
      }, STALL_MS);
    }
    function onFocusOut() {
      if (timer) clearTimeout(timer);
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      if (timer) clearTimeout(timer);
    };
    // send is stable enough for this: it only reads refs and setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Escape minimises rather than ending: the seller reaching for a way
  // out of the panel has not asked to throw the conversation away.
  useEffect(() => {
    if (view !== "panel") return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setView("launcher");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view]);

  /**
   * Attach the conversation to the lead, and flush anything said before
   * the lead existed.
   *
   * This runs whenever a lead id is available and the conversation has
   * not been linked yet — not only when there is something buffered. An
   * earlier version only fired when the buffer had contents, so opening
   * Maya *after* the phone field (the common case) left the conversation
   * permanently unlinked and every append_lead_note failing.
   */
  useEffect(() => {
    if (!leadId || !sessionReady || linked.current) return;
    linked.current = true;
    const pendingNotes = buffered.current.splice(0);
    void fetch("/api/agent/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId, notes: pendingNotes }),
    })
      .then((response) => {
        // A 401 or 403 is not a thrown error. Without this check a failed
        // link looked identical to a successful one and never retried.
        if (!response.ok) throw new Error(String(response.status));
      })
      .catch(() => {
        // Losing the link must not break the form. Put the notes back and
        // allow another attempt. The transcript still holds the
        // conversation and the operator reads that.
        buffered.current.unshift(...pendingNotes);
        linked.current = false;
      });
  }, [leadId, sessionReady]);

  // Keep the newest turn in view without stealing the page's scroll.
  useEffect(() => {
    const node = log.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [turns, pending]);

  // The seller clicked to open this, so the thing they came to use gets
  // the caret. Minimising returns focus to nothing in particular, which
  // is the browser's business.
  useEffect(() => {
    if (view === "panel") draftRef.current?.focus();
  }, [view]);

  async function open() {
    setView("panel");
    if (started.current) return;
    started.current = true;

    const response = await fetch("/api/agent/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reg }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setUnavailable(true);
      return;
    }

    // The cookie is set by now, so anything needing the session may run.
    setSessionReady(true);

    /**
     * The opening line comes from the server, which has already written
     * it into the transcript as the first assistant turn. Composing it
     * here meant the conversation on our side began with the seller's
     * first message, so the model — told to disclose in its own first
     * sentence — introduced itself again, and the same greeting appeared
     * above and below the seller's question.
     */
    const { opening } = (await response.json().catch(() => ({}))) as {
      opening?: string;
    };
    if (opening) setTurns([{ role: "assistant", content: opening }]);
  }

  function minimise() {
    setView("launcher");
  }

  /** Ends the conversation. The launcher stays, ready to start a new one. */
  async function end() {
    await stopVoice();
    setView("launcher");
    setTurns([]);
    setError(null);
    setUnavailable(false);
    setSessionReady(false);
    started.current = false;
    linked.current = false;
    // Marks ended_at, so resolveSession stops honouring the cookie. A
    // reset that only cleared the screen would leave the old
    // conversation answering for the next one.
    await fetch("/api/agent/session", { method: "DELETE" }).catch(() => null);
  }

  function dismiss() {
    setView("launcher");
    dismissAgent();
  }

  /**
   * Start talking, after consent.
   *
   * The signed URL is fetched only once the seller has accepted, because
   * ElevenLabs speaks its configured opening line the instant a session
   * opens — before our server is part of the exchange. Fetching the URL
   * earlier would mean a seller could hear a voice they had not agreed
   * to, and no amount of care in this component could prevent it.
   */
  async function startVoice() {
    setVoicePending(true);
    try {
      const response = await fetch("/api/agent/voice-session", {
        method: "POST",
      });
      if (!response.ok) {
        setError("Voice isn't available right now. Typing still works.");
        setVoice("off");
        return;
      }

      const { signedUrl, conversationId } = (await response.json()) as {
        signedUrl: string;
        conversationId: string;
      };

      const { Conversation } = await import("@elevenlabs/client");
      conversation.current = await Conversation.startSession({
        signedUrl,
        /**
         * Echoed back on every custom-LLM call so the turn can be tied to
         * this conversation on our side, which is the only thing that
         * authorises it: /api/agent/llm is called by ElevenLabs and
         * carries no cookie.
         *
         * The option is customLlmExtraBody. It was extraBody, which the
         * SDK ignores in silence — and startSession is generic over its
         * options, so TypeScript raises no excess-property error. The
         * result was every spoken turn failing with
         * "custom_llm generation failed" while
         * conversation_initiation_client_data showed
         * custom_llm_extra_body as {}.
         */
        customLlmExtraBody: { conversationId },
        onMessage: ({ message, source }: { message: string; source: string }) => {
          setTurns((prior) => [
            ...prior,
            { role: source === "user" ? "user" : "assistant", content: message },
          ]);
        },
        onError: () => {
          setError("The call dropped. Typing still works.");
          setVoice("off");
        },
        onDisconnect: () => setVoice("off"),
      });
      setVoice("live");
    } catch {
      setError("Voice isn't available right now. Typing still works.");
      setVoice("off");
    } finally {
      setVoicePending(false);
    }
  }

  async function stopVoice() {
    await conversation.current?.endSession().catch(() => {});
    conversation.current = null;
    setVoice("off");
  }

  async function send(message: string, silentUser = false) {
    if (!message.trim() || pending) return;
    setPending(true);
    if (!silentUser) {
      setTurns((prior) => [...prior, { role: "user", content: message }]);
      setDraft("");
    }
    if (!leadId) buffered.current.push(message);

    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setTurns((prior) => [
        ...prior,
        {
          role: "assistant",
          content:
            "I've dropped out for a moment. The form works without me, and a person will still call you.",
        },
      ]);
      setPending(false);
      return;
    }

    const body = (await response.json()) as { reply?: string };
    setTurns((prior) => [
      ...prior,
      { role: "assistant", content: body.reply ?? "" },
    ]);
    setPending(false);
  }

  // "pending" is the server snapshot: render nothing until the client
  // knows whether this seller already dismissed her.
  if (dismissal !== "offered") return null;

  if (view === "launcher") {
    return (
      <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6">
        {preview && previewLabel}
        <button
          type="button"
          onClick={() => void open()}
          aria-label={`Chat with ${AGENT.name} (AI assistant)`}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-oxblood text-paper shadow-[0_2px_10px_rgba(18,20,15,0.25)] transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-oxblood-lt"
        >
          <ChatIcon />
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={`Chat with ${AGENT.name}`}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col rounded-t border border-line bg-paper shadow-[0_2px_24px_rgba(18,20,15,0.25)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-h-[70vh] sm:w-96 sm:rounded"
    >
      <header className="border-b border-line px-4 py-3">
        {preview && <div className="mb-3">{previewLabel}</div>}
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">
            {AGENT.name}
            <span className="ml-2 font-normal text-caption text-structure">
              {AGENT.disclosure}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={minimise}
              aria-label="Minimise the chat"
              title="Minimise"
              className="flex h-7 w-7 items-center justify-center rounded text-structure transition-colors duration-200 hover:bg-paper-warm hover:text-ink"
            >
              <span aria-hidden="true" className="text-base leading-none">
                &minus;
              </span>
            </button>
            <button
              type="button"
              onClick={() => void end()}
              aria-label={`End the chat with ${AGENT.name}`}
              title="End the chat"
              className="flex h-7 w-7 items-center justify-center rounded text-structure transition-colors duration-200 hover:bg-paper-warm hover:text-ink"
            >
              <span aria-hidden="true" className="text-base leading-none">
                &times;
              </span>
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4">
          {voice === "live" ? (
            <button
              type="button"
              onClick={() => void stopVoice()}
              className="text-caption text-oxblood underline"
            >
              Stop talking
            </button>
          ) : (
            voice === "off" && (
              <button
                type="button"
                onClick={() => setVoice("consent")}
                className="text-caption text-structure underline hover:text-oxblood"
              >
                Talk instead
              </button>
            )
          )}
          <button
            type="button"
            onClick={dismiss}
            className="text-caption text-structure underline hover:text-oxblood"
          >
            Just the form
          </button>
        </div>
      </header>

      {voice === "consent" && (
        <div className="border-b border-line p-4">
          <VoiceConsent
            onAccept={() => void startVoice()}
            onDecline={() => setVoice("off")}
            pending={voicePending}
          />
        </div>
      )}

      <div
        ref={log}
        /**
         * grow with an auto basis, not flex-1.
         *
         * flex-1 sets the basis to 0, and the panel is sized by its
         * content rather than given a height, so there is no free space
         * to distribute and the log collapsed to nothing. The opening
         * line was in the DOM and none of it was on screen.
         */
        className="min-h-0 grow basis-auto overflow-y-auto px-4 py-4"
      >
        {unavailable ? (
          <p className="text-sm text-structure">
            {AGENT.name} isn&apos;t available right now. The form works
            exactly the same without her.
          </p>
        ) : (
          <ul className="space-y-3">
            {turns.map((turn, index) => (
              <li
                key={index}
                className={turn.role === "user" ? "text-right" : ""}
              >
                <span
                  className={`inline-block max-w-[85%] rounded px-3 py-2 text-sm ${
                    turn.role === "user"
                      ? "bg-paper-warm text-left"
                      : "border border-line"
                  }`}
                >
                  {turn.content}
                </span>
              </li>
            ))}
            {pending && (
              <li className="text-caption text-structure" role="status">
                {AGENT.name} is typing
              </li>
            )}
          </ul>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="border-t border-line px-4 py-2 text-caption text-oxblood"
        >
          {error}
        </p>
      )}

      {!unavailable && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
          className="flex gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
        >
          <label className="sr-only" htmlFor="agent-draft">
            Message {AGENT.name}
          </label>
          <input
            id="agent-draft"
            ref={draftRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about anything"
            className="min-w-0 flex-1 rounded border border-line bg-paper px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="rounded border border-line px-3 py-2 text-sm transition-colors duration-200 enabled:hover:border-oxblood disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
