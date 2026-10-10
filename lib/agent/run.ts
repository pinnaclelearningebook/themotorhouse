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
