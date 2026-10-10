"use client";

import { useState } from "react";
import { AGENT } from "@/config/site";
import { createVoiceTestLead } from "./actions";
import { VoiceConsent } from "@/components/agent/VoiceConsent";

/**
 * Talk to {@link AGENT.name} without turning her on for sellers.
 *
 * The same consent panel a seller sees, then the same admin test path:
 * a conversation flagged admin_test, which /api/agent/llm will serve for
 * thirty minutes while agent_enabled stays false. Nothing here changes
 * what a seller gets, which is still nothing.
 */
export function VoiceTest({ testReg }: { testReg: string }) {
  const [stage, setStage] = useState<"idle" | "consent" | "live" | "failed">("idle");
  const [pending, setPending] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{ endSession: () => Promise<void> } | null>(null);

  async function seed() {
    setPending(true);
    setDetail(null);
    try {
      await createVoiceTestLead();
      setDetail(`Seeded a test lead for ${testReg}.`);
    } catch {
      setDetail("Could not seed the test lead.");
    } finally {
      setPending(false);
    }
  }

  async function start() {
    setPending(true);
    try {
      const response = await fetch("/api/agent/voice-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reg: testReg }),
      });
      if (!response.ok) {
        setDetail(`Could not start a session (${response.status}).`);
        setStage("failed");
        return;
      }
      const { signedUrl, conversationId } = (await response.json()) as {
        signedUrl: string;
        conversationId: string;
      };

      const { Conversation } = await import("@elevenlabs/client");
      const session = await Conversation.startSession({
        signedUrl,
        extraBody: { conversationId },
        onError: () => setStage("failed"),
        onDisconnect: () => setStage("idle"),
      });
      setConversation(session);
      setDetail(`Talking. Conversation ${conversationId}.`);
      setStage("live");
    } catch {
      setDetail("Could not connect.");
      setStage("failed");
    } finally {
      setPending(false);
    }
  }

  async function stop() {
    await conversation?.endSession().catch(() => {});
    setConversation(null);
    setStage("idle");
  }

  return (
    <section className="mt-8 rounded border border-line p-5">
      <h2 className="font-display text-2xl">Test {AGENT.name} (voice)</h2>
      <p className="mt-2 max-w-2xl text-sm text-structure">
        Talks to the live production endpoint using the admin test path, so
        she stays switched off for sellers. The conversation is marked as a
        test and excluded from the counts above. Seed the car first if{" "}
        <span className="data-inline font-mono">{testReg}</span> is not there
        yet.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void seed()}
          disabled={pending || stage === "live"}
          className="rounded border border-line px-4 py-2 text-sm transition-colors duration-200 hover:border-oxblood disabled:opacity-60"
        >
          Seed the test car
        </button>
        {stage === "live" ? (
          <button
            type="button"
            onClick={() => void stop()}
            className="rounded bg-oxblood px-4 py-2 text-sm text-paper transition-colors duration-200 hover:bg-oxblood-lt"
          >
            Stop talking
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStage("consent")}
            disabled={pending}
            className="rounded bg-oxblood px-4 py-2 text-sm text-paper transition-colors duration-200 hover:bg-oxblood-lt disabled:opacity-60"
          >
            Start a voice test
          </button>
        )}
      </div>

      {stage === "consent" && (
        <div className="mt-5 max-w-xl">
          <VoiceConsent
            onAccept={() => void start()}
            onDecline={() => setStage("idle")}
            pending={pending}
          />
        </div>
      )}

      {detail && <p className="mt-4 text-caption text-structure">{detail}</p>}
    </section>
  );
}
