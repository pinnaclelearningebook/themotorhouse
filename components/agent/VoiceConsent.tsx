"use client";

import { AGENT } from "@/config/site";

/**
 * Consent, before the microphone and before the session.
 *
 * The session is what matters here. ElevenLabs speaks its configured
 * first message the moment a conversation opens, before our server is
 * part of the exchange, so a seller who had not agreed would hear a voice
 * anyway. Nothing opens until Accept is pressed, and the server will not
 * issue the signed URL until it has written the consent.
 *
 * AWAITING_RESPONSE: the wording below is placeholder and must be
 * replaced by the solicitor's copy before launch — PENDING-INFO.md,
 * Phase D. It states the three things the ICO guidance expects a person
 * to be told before a recording starts: that this is not a person, that
 * audio is processed to run the conversation, and what is kept.
 */

export function VoiceConsent({
  onAccept,
  onDecline,
  pending,
}: {
  onAccept: () => void;
  onDecline: () => void;
  pending: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-consent-heading"
      className="rounded border border-line bg-paper p-5"
    >
      <h3 id="voice-consent-heading" className="font-display text-xl">
        Before we start talking
      </h3>

      <ul className="mt-4 space-y-2 text-sm">
        <li>
          {AGENT.name} is an assistant, not a person. You are not speaking to
          one of our buyers.
        </li>
        <li>
          Your microphone audio is sent to our speech provider to run the
          conversation.
        </li>
        <li>
          A written transcript is kept on your enquiry so the person who calls
          you has the context. The audio is not kept by us.
        </li>
        <li>
          You can stop at any point, and the form works perfectly well without
          this.
        </li>
      </ul>

      <p className="mt-4 text-caption text-structure">
        Draft wording, pending legal review.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAccept}
          disabled={pending}
          className="rounded bg-oxblood px-4 py-2 text-sm text-paper transition-colors duration-200 hover:bg-oxblood-lt disabled:opacity-60"
        >
          {pending ? "Connecting…" : "I agree, start talking"}
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="rounded border border-line px-4 py-2 text-sm transition-colors duration-200 hover:border-oxblood"
        >
          Keep typing
        </button>
      </div>
    </div>
  );
}
