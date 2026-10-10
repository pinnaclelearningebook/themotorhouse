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
 * {@link AGENT.name} beside the form, in text mode.
 *
 * Silent by default and opt-in, per CLAUDE.md section 10: a seller who
 * wants nothing to do with this must be able to fill the form without
 * being spoken to. "Just the form" persists for the session, and once
 * dismissed nothing re-offers it.
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

export function AgentWidget({
  leadId,
  reg,
  vehicleName,
}: {
  leadId: string | null;
  /** The server resolves the vehicle from this; no ids cross the wire. */
  reg: string;
  vehicleName: string | null;
}) {
  const dismissal = useSyncExternalStore(
    subscribeToDismissal,
    getDismissalSnapshot,
    getDismissalServerSnapshot,
  );
  const [opened, setOpened] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Set only once the session cookie exists. Anything that needs the
  // session must wait for this, not for the widget being open.
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

  // Stall detection. Listening at the document means the form needs no
  // knowledge of this component. Thirty seconds on one field, once per
  // field, and only while she is already open — an unopened widget
  // interrupting someone is exactly what section 10 forbids.
  useEffect(() => {
    if (!opened) return;
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
  }, [opened]);

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

  async function open() {
    setOpened(true);
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

    // Disclosure first, before anything else is said (section 10 legal).
    setTurns([
      {
        role: "assistant",
        content: `${AGENT.disclosure}. ${
          vehicleName
            ? `I can see the ${vehicleName} on your screen.`
            : "I'll have your car's details once the registration goes in."
        } Ask me anything about how this works.`,
      },
    ]);
  }

  function dismiss() {
    setOpened(false);
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
        // Echoed back on every custom-LLM call so the turn can be tied to
        // this conversation on our side.
        extraBody: { conversationId },
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
    try {
      await conversation.current?.endSession();
    } catch {
      // Already gone; nothing to do.
    }
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

  if (!opened) {
    return (
      <div className="mt-10 rounded border border-line p-4">
        <p className="text-sm">
          {AGENT.name} can talk you through this, or you can carry on
          alone. {AGENT.disclosure}.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={open}
            className="rounded bg-oxblood px-4 py-2 text-sm text-paper transition-colors duration-200 hover:bg-oxblood-lt"
          >
            Talk to {AGENT.name}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded border border-line px-4 py-2 text-sm transition-colors duration-200 hover:border-oxblood"
          >
            Just the form
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label={`Chat with ${AGENT.name}`}
      className="mt-10 rounded border border-line"
    >
      <header className="flex items-baseline justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-medium">
          {AGENT.name}
          <span className="ml-2 text-caption text-structure">
            {AGENT.disclosure}
          </span>
        </p>
        <div className="flex items-center gap-4">
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

      <div className="max-h-80 overflow-y-auto px-4 py-4">
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
          className="flex gap-2 border-t border-line px-4 py-3"
        >
          <label className="sr-only" htmlFor="agent-draft">
            Message {AGENT.name}
          </label>
          <input
            id="agent-draft"
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
    </section>
  );
}
