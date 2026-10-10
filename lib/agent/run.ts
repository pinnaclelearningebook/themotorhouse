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
  /** Side effects worth telling the widget about. */
  effects: { goToStep?: number; photoGuide?: boolean };
  inputTokens: number;
  outputTokens: number;
}

async function runTool(
  session: AgentSession,
  name: string,
  input: Record<string, unknown>,
  effects: TurnResult["effects"],
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

    case "go_to_step": {
      const parsed = toolSchemas.go_to_step.safeParse(input);
      if (!parsed.success) return { ok: false, error: "invalid step" };
      effects.goToStep = parsed.data.step;
      return { ok: true };
    }

    case "trigger_photo_guide":
      effects.photoGuide = true;
      return { ok: true };

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

  const effects: TurnResult["effects"] = {};
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
      return { text: reply.text, effects, inputTokens, outputTokens };
    }

    messages.push({ role: "assistant", content: reply.content });

    const results = [];
    for (const use of reply.toolUses) {
      const result = await runTool(opts.session, use.name, use.input, effects);
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
export async function* streamVoiceTurn(opts: {
  session: AgentSession;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  vehicle: Parameters<typeof systemBlocks>[0]["vehicle"];
  guardContext: VehicleContext;
  formState: string;
  model: string;
  maxTokens: number;
}): AsyncGenerator<VoiceEvent> {
  const startedAt = Date.now();
  const since = () => Date.now() - startedAt;

  const system = systemBlocks({
    vehicle: opts.vehicle,
    formState: opts.formState,
  });

  const messages: WireMessage[] = [
    ...opts.history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user" as const, content: opts.message },
  ];

  let firstTokenAt: number | null = null;
  let firstSentenceAt: number | null = null;
  let released = "";

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    let turnText = "";
    let pending = "";
    const toolUses = [];
    let stopReason = "unknown";

    for await (const event of completeStream({
      system,
      messages,
      model: opts.model,
      maxTokens: opts.maxTokens,
      tools: TOOL_DEFINITIONS,
      timeoutMs: TURN_BUDGET_MS,
    })) {
      if (event.type === "text" && event.text) {
        if (firstTokenAt === null) firstTokenAt = since();
        turnText += event.text;
        pending += event.text;
      } else if (event.type === "tool_use" && event.toolUse) {
        toolUses.push(event.toolUse);
      } else if (event.type === "done") {
        stopReason = event.stopReason ?? "unknown";
      }
    }

    /**
     * Text from a round that ends in tool calls is never spoken.
     *
     * With thinking set to between_tools the model writes a short update
     * before calling a tool — "I'll record that figure first. Then I'll
     * answer you." — and streaming it put that preamble in the seller's
     * ear. It is the model talking to itself. Only the round that
     * actually answers gets released, which is why the text is held until
     * the round is over rather than streamed as it arrives.
     *
     * This costs the latency streaming was supposed to buy. The
     * measurements say that was close to nothing anyway: the first
     * sentence was arriving at roughly the time the whole turn finished.
     */
    if (toolUses.length > 0) {
      turnText = "";
      pending = "";
    } else if (pending.trim()) {
      // The answering round. Release it sentence by sentence, each one
      // checked against everything released so far in this turn.
      const whole = pending.trim();
      // The published response time is two sentences: the promise, then
      // the evening clause that qualifies it. Checking the prefix fires
      // on the first before the second has arrived, which blocked her for
      // saying exactly the right thing. That rule is a property of the
      // turn, so it is judged against the turn.
      const wholeVerdict = runGuards(whole, opts.guardContext);
      const qualifierIsComing =
        wholeVerdict.ok || wholeVerdict.rule !== "unqualified-promise";

      for (const candidate of sentences(whole)) {
        const prefix = `${released}${released ? " " : ""}${candidate}`;
        const verdict = runGuards(prefix, opts.guardContext);
        if (
          !verdict.ok &&
          verdict.rule === "unqualified-promise" &&
          qualifierIsComing
        ) {
          // Harmless on its own and qualified before the turn ends.
          released = prefix;
          if (firstSentenceAt === null) firstSentenceAt = since();
          yield { type: "sentence", text: candidate, at: since() };
          continue;
        }
        if (!verdict.ok) {
          yield {
            type: "blocked",
            rule: verdict.rule,
            matched: verdict.matched,
            original: turnText,
            replacement: verdict.replacement,
            at: since(),
          };
          return;
        }
        released = prefix;
        if (firstSentenceAt === null) firstSentenceAt = since();
        yield { type: "sentence", text: candidate, at: since() };
      }
    }

    // Asking for a tool is the only condition that matters. Keying this
    // on stop_reason as well ended the turn after "I'll record that
    // figure first. Then I'll answer you." — the tools were requested,
    // the stop reason was not the expected one, and the answer never
    // came. The seller heard the preamble and nothing else.
    if (toolUses.length === 0) {
      yield { type: "finished", spoken: released, firstTokenAt, firstSentenceAt };
      return;
    }
    void stopReason;

    messages.push({
      role: "assistant",
      content: [
        ...(turnText ? [{ type: "text", text: turnText }] : []),
        ...toolUses.map((use) => ({
          type: "tool_use",
          id: use.id,
          name: use.name,
          input: use.input,
        })),
      ],
    });

    const effects: TurnResult["effects"] = {};
    const results = [];
    for (const use of toolUses) {
      const result = await runTool(opts.session, use.name, use.input, effects);
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: JSON.stringify(result),
        ...(result.ok ? {} : { is_error: true }),
      });
    }
    messages.push({ role: "user", content: results });
  }

  yield { type: "finished", spoken: released, firstTokenAt, firstSentenceAt };
}
