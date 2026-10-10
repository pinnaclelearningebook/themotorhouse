import "server-only";
import { complete, systemPrompt, type WireMessage } from "@/agent/provider";
import {
  TOOL_DEFINITIONS,
  toolSchemas,
  getVehicleContext,
  readFormState,
  setField,
  appendLeadNote,
  type AgentSession,
  type ToolName,
  type ToolResult,
} from "@/agent/tools";

/**
 * One turn, including any tool calls it needs along the way.
 *
 * The loop is capped. A model that keeps calling tools without answering
 * is a model spending money in a circle, and the seller is sitting in
 * front of a "typing" indicator the whole time, so a bounded number of
 * rounds is both a cost control and a UX one.
 *
 * Tool results are not seller-facing and are not guarded. Only the final
 * text goes through agent/guards.ts, in the route, before it is sent.
 */

const MAX_TOOL_ROUNDS = 4;

/**
 * The whole turn's budget, not one call's.
 *
 * Bounding each model call alone is not enough: five rounds of a tool
 * loop at thirty seconds each is two and a half minutes of a seller
 * watching a typing indicator, and on Vercel it is most of the function
 * budget. One deadline covers the turn however many rounds it takes.
 */
const TURN_BUDGET_MS = 45_000;

export interface TurnResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * No go_to_step and no trigger_photo_guide.
 *
 * Both existed and neither did anything: they set an effect, the chat
 * endpoint returned it, and no component read it. So she could call
 * "move the form", be told it worked, and tell the seller she had moved
 * them to a step that had not moved — the same failure as a claim of
 * having recorded something with nothing written, except nothing could
 * catch it because the tool really did return ok.
 *
 * They come back when the form consumes the effect, not before. CLAUDE.md
 * section 10 still lists them; see PENDING-INFO.
 */
async function runTool(
  session: AgentSession,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name as ToolName) {
    case "get_vehicle_context":
      return getVehicleContext(session);

    case "read_form_state":
      return readFormState(session);

    case "set_field": {
      const parsed = toolSchemas.set_field.safeParse(input);
      if (!parsed.success) return { ok: false, error: "invalid field" };
      return setField(session, parsed.data);
    }

    case "append_lead_note": {
      const parsed = toolSchemas.append_lead_note.safeParse(input);
      if (!parsed.success) return { ok: false, error: "invalid note" };
      return appendLeadNote(session, parsed.data);
    }

    default:
      return { ok: false, error: "unknown tool" };
  }
}

export async function runTurn(opts: {
  session: AgentSession;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  vehicle: Parameters<typeof systemPrompt>[0]["vehicle"];
  formState: string;
  model: string;
  maxTokens: number;
}): Promise<TurnResult> {
  const system = systemPrompt({
    vehicle: opts.vehicle,
    formState: opts.formState,
  });

  const messages: WireMessage[] = [
    ...opts.history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user" as const, content: opts.message },
  ];

  let inputTokens = 0;
  let outputTokens = 0;
  const deadline = Date.now() + TURN_BUDGET_MS;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(`turn exceeded ${TURN_BUDGET_MS}ms`);
    }

    const reply = await complete({
      system,
      messages,
      model: opts.model,
      maxTokens: opts.maxTokens,
      tools: TOOL_DEFINITIONS,
      timeoutMs: remaining,
    });

    inputTokens += reply.inputTokens;
    outputTokens += reply.outputTokens;

    if (reply.toolUses.length === 0) {
      return { text: reply.text, inputTokens, outputTokens };
    }

    messages.push({ role: "assistant", content: reply.content });

    const results = [];
    for (const use of reply.toolUses) {
      const result = await runTool(opts.session, use.name, use.input);
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: JSON.stringify(result),
        ...(result.ok ? {} : { is_error: true }),
      });
    }
    messages.push({ role: "user", content: results });
  }

  // Out of rounds. Saying so plainly beats a silent empty reply, and the
  // route still guards whatever is returned here.
  throw new Error(`tool loop exceeded ${MAX_TOOL_ROUNDS} rounds`);
}

/* ─── voice: streamed, with cumulative-prefix guarding ───────────────── */

import { completeStream, systemBlocks } from "@/agent/provider";
import { mentionsResponseTime, type GuardResult } from "@/agent/guards";
import { runGuards, sentences, type VehicleContext } from "@/agent/guards";

export interface ReleasedSentence {
  type: "sentence";
  text: string;
  /** Milliseconds from the start of the turn. */
  at: number;
}

export interface BlockedTurn {
  type: "blocked";
  rule: string;
  matched: string;
  /** The whole turn as the model wrote it, including what was released. */
  original: string;
  replacement: string;
  at: number;
}

export interface TurnFinished {
  type: "finished";
  /** Everything released to speech. */
  spoken: string;
  firstTokenAt: number | null;
  firstSentenceAt: number | null;
}

export type VoiceEvent = ReleasedSentence | BlockedTurn | TurnFinished;

/**
 * A spoken turn, released sentence by sentence.
 *
 * Each time a sentence completes, the guards run over **everything said so
 * far in this turn** — every sentence already released plus the new one —
 * rather than the new sentence alone. That is what catches a price split
 * across a boundary: "It's worth about." passes on its own and means
 * nothing, but once "Twenty eight thousand." arrives the prefix reads
 * "It's worth about. Twenty eight thousand." and the number is caught
 * before that sentence is spoken.
 *
 * Earlier sentences have already been spoken by then and cannot be
 * recalled. That is the real cost of streaming at all, and it is why the
 * check is cumulative: the most a leak can be is a fragment that was
 * harmless until the next one completed it, and the sentence carrying the
 * number never goes out.
 */
/** At most this many sentences are spoken in one voice turn. */
const VOICE_SENTENCE_CAP = 2;

/**
 * A spoken turn: streamed, guarded, capped, and without tools.
 *
 * No tools. Everything about the car is already in the system context,
 * loaded once by lib/agent/voice-context.ts, so there is no second model
 * round-trip in the middle of a conversation. Anything worth recording
 * out of what the seller said is written afterwards, beside the reply,
 * by lib/agent/notes.ts.
 *
 * Because nothing waits for a tool, sentences go out as they complete.
 * Each one is checked against everything released so far in the turn, so
 * a price split across a boundary — "It's worth about." then "Twenty
 * eight thousand." — is caught by the sentence that completes it.
 *
 * One rule is judged against the whole turn instead: the response time.
 * Its two sentences qualify each other, so a sentence mentioning it is
 * held back until the turn is finished and can be judged entire. Holding
 * one sentence holds every sentence after it, or speech would come out
 * in the wrong order.
 */
export async function* streamVoiceTurn(opts: {
  session: AgentSession;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  contextText: string;
  guardContext: VehicleContext;
  model: string;
  maxTokens: number;
}): AsyncGenerator<VoiceEvent> {
  const startedAt = Date.now();
  const since = () => Date.now() - startedAt;

  const system = voiceSystemBlocks(opts.contextText);
  const messages: WireMessage[] = [
    ...opts.history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user" as const, content: opts.message },
  ];

  let firstTokenAt: number | null = null;
  let firstSentenceAt: number | null = null;
  let released = "";
  let pending = "";
  let turnText = "";
  let spokenCount = 0;

  // Once a sentence is held, everything after it waits too.
  const held: string[] = [];
  let holding = false;

  const blockOn = (verdict: Exclude<GuardResult, { ok: true }>): BlockedTurn => ({
    type: "blocked",
    rule: verdict.rule,
    matched: verdict.matched,
    original: turnText,
    replacement: verdict.replacement,
    at: since(),
  });

  for await (const event of completeStream({
    system,
    messages,
    model: opts.model,
    maxTokens: opts.maxTokens,
    timeoutMs: TURN_BUDGET_MS,
  })) {
    if (event.type !== "text" || !event.text) continue;
    if (firstTokenAt === null) firstTokenAt = since();

    turnText += event.text;
    pending += event.text;

    const parts = sentences(pending);
    while (parts.length > 1 && spokenCount + held.length < VOICE_SENTENCE_CAP) {
      const candidate = parts.shift() as string;
      const consumed = pending.indexOf(candidate) + candidate.length;
      pending = pending.slice(consumed);

      const prefix = `${released}${released ? " " : ""}${candidate}`;
      const verdict = runGuards(prefix, opts.guardContext, {
        sellerMessage: opts.message,
      });

      // The response-time rule needs the whole turn; hold and decide later.
      if (holding || mentionsResponseTime(candidate)) {
        if (!verdict.ok && verdict.rule !== "unqualified-promise") {
          yield blockOn(verdict);
          return;
        }
        holding = true;
        held.push(candidate);
        released = prefix;
        continue;
      }

      if (!verdict.ok) {
        yield blockOn(verdict);
        return;
      }

      released = prefix;
      spokenCount += 1;
      if (firstSentenceAt === null) firstSentenceAt = since();
      yield { type: "sentence", text: candidate, at: since() };
    }

    // Two sentences is the cap. Stop generating rather than paying for
    // words nobody will hear; returning closes the upstream stream.
    if (spokenCount + held.length >= VOICE_SENTENCE_CAP) break;
  }

  // Anything still unsaid, if there is room for it.
  const remainder = pending.trim();
  if (remainder && spokenCount + held.length < VOICE_SENTENCE_CAP) {
    const prefix = `${released}${released ? " " : ""}${remainder}`;
    const verdict = runGuards(prefix, opts.guardContext, {
      sellerMessage: opts.message,
    });
    if (!verdict.ok && !(holding && verdict.rule === "unqualified-promise")) {
      yield blockOn(verdict);
      return;
    }
    released = prefix;
    if (holding || mentionsResponseTime(remainder)) held.push(remainder);
    else {
      spokenCount += 1;
      if (firstSentenceAt === null) firstSentenceAt = since();
      yield { type: "sentence", text: remainder, at: since() };
    }
  }

  // Now the turn is complete, so the response time can be judged entire.
  if (held.length) {
    const verdict = runGuards(released, opts.guardContext, {
      sellerMessage: opts.message,
    });
    if (!verdict.ok) {
      yield blockOn(verdict);
      return;
    }
    for (const sentence of held) {
      if (firstSentenceAt === null) firstSentenceAt = since();
      yield { type: "sentence", text: sentence, at: since() };
    }
  }

  yield { type: "finished", spoken: released, firstTokenAt, firstSentenceAt };
}

/**
 * The system prompt for a spoken turn.
 *
 * The prompt and knowledge are identical on every request and marked for
 * caching; the car and the conversation go in a second block that is not.
 */
function voiceSystemBlocks(contextText: string): unknown[] {
  return [
    ...systemBlocks({ vehicle: null, formState: "" }).slice(0, 1),
    { type: "text", text: `# This car\n\n${contextText}` },
  ];
}
