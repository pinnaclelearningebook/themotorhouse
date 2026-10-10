import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENT, PROMISES } from "@/config/site";
import { knowledgeAsText } from "@/agent/knowledge";

/**
 * The model behind Maya, behind an interface.
 *
 * ARCHITECTURE.md section 6 keeps the agent logic in-repo so the provider
 * is swappable, and section 9 records why our own server is the brain:
 * the guards have to see every turn before the seller does, which a
 * hosted widget talking browser-to-provider would prevent. When voice
 * arrives, ElevenLabs calls this same path as a custom LLM, so the guards
 * cover both modes without being written twice.
 *
 * Unconfigured behaves like the paid adapters: a clear reason, never a
 * silent fallback to something that sounds plausible.
 */

export function isAgentConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function agentUnavailableReason(): string | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "ANTHROPIC_API_KEY is not set. See PENDING-INFO.md, Phase D.";
  }
  return null;
}

export interface VehicleFacts {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  colour?: string | null;
  fuel?: string | null;
}

/** The prompt, templated. Read once per process. */
let cached: string | null = null;

export function systemPrompt(opts: {
  vehicle: VehicleFacts | null;
  formState: string;
}): string {
  if (cached === null) {
    cached = readFileSync(join(process.cwd(), "agent/prompt.md"), "utf8");
  }

  const vehicle = opts.vehicle
    ? Object.entries(opts.vehicle)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
    : "none yet";

  return cached
    .replace(/\{\{AGENT_NAME\}\}/g, AGENT.name)
    .replace(/\{\{DISCLOSURE\}\}/g, AGENT.disclosure)
    .replace(/\{\{OFFER_HOURS\}\}/g, String(PROMISES.offerWithinHours))
    .replace(/\{\{VEHICLE_CONTEXT\}\}/g, vehicle)
    .replace(/\{\{FORM_STATE\}\}/g, opts.formState)
    .concat("\n\n---\n\n# Knowledge\n\n", knowledgeAsText());
}

/**
 * The system prompt as cacheable blocks.
 *
 * The first block — the prompt file and the knowledge base — is identical
 * on every request, so it is marked for caching and read back rather than
 * re-sent. It is also by far the larger of the two. The second block
 * carries this car and this form state, which change per conversation and
 * must not be cached.
 */
export function systemBlocks(opts: {
  vehicle: VehicleFacts | null;
  formState: string;
}): unknown[] {
  const vehicle = opts.vehicle
    ? Object.entries(opts.vehicle)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
    : "none yet";

  return [
    {
      type: "text",
      text: staticPrompt(),
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: `# This conversation\n\nVehicle context: ${vehicle}\n\nForm state: ${opts.formState}`,
    },
  ];
}

/** The invariant half: the prompt file plus the knowledge base. */
function staticPrompt(): string {
  if (cached === null) {
    cached = readFileSync(join(process.cwd(), "agent/prompt.md"), "utf8");
  }
  return cached
    .replace(/\{\{AGENT_NAME\}\}/g, AGENT.name)
    .replace(/\{\{DISCLOSURE\}\}/g, AGENT.disclosure)
    .replace(/\{\{OFFER_HOURS\}\}/g, String(PROMISES.offerWithinHours))
    .concat("\n\n---\n\n# Knowledge\n\n", knowledgeAsText());
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ModelReply {
  text: string;
  /** The assistant turn verbatim, to echo back when continuing a tool loop. */
  content: unknown[];
  toolUses: ToolUse[];
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
}

/** A turn in the wire format, which may carry tool results. */
export type WireMessage = {
  role: "user" | "assistant";
  content: unknown;
};

/**
 * One completion. Deliberately not streamed: the guards must see the whole
 * turn before any of it reaches the seller, and a half-emitted price
 * cannot be recalled (ARCHITECTURE.md section 9).
 */
/**
 * How long one model call may take before it is abandoned.
 *
 * fetch has no default timeout. A hung upstream call was observed holding
 * a request open for sixty minutes before the socket gave up — on Vercel
 * that spends the whole function budget, and the seller watches a typing
 * indicator the entire time. Thirty seconds is already far beyond a
 * healthy turn, which runs in three to ten.
 */
const MODEL_TIMEOUT_MS = 30_000;

/**
 * A scripted model reply, for proving the guard path end to end.
 *
 * The guards are tested against fixtures and the model has never tripped
 * one in live use, so the path from a blocked turn to the review log had
 * never actually run. This lets a test put a known-bad sentence where the
 * model's output goes and watch the real endpoint block it, replace it
 * and log it.
 *
 * Guarded by NODE_ENV like ADMIN_DEV_BYPASS and AGENT_DEV_FORCE_ON. Next
 * sets NODE_ENV to "production" for every build, so this is dead code in
 * any deployed environment and cannot be switched on from Vercel.
 * test/constraints.test.ts asserts the guard stays.
 */
function scriptedReplyForTests(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const scripted = process.env.AGENT_TEST_SCRIPTED_REPLY;
  return scripted && scripted.length > 0 ? scripted : null;
}

export interface StreamEvent {
  type: "text" | "tool_use" | "done";
  text?: string;
  toolUse?: ToolUse;
  stopReason?: string;
}

/**
 * The same call, streamed.
 *
 * Voice uses this so speech can begin before the whole turn exists. The
 * guarding that makes that safe lives in lib/agent/run.ts: each completed
 * sentence is checked against everything said so far in the turn, not on
 * its own, so a price split across a boundary is caught by the sentence
 * that completes it.
 */
export async function* completeStream(opts: {
  system: unknown[];
  messages: WireMessage[];
  model: string;
  maxTokens: number;
  tools?: readonly unknown[];
  timeoutMs?: number;
}): AsyncGenerator<StreamEvent> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error(agentUnavailableReason() ?? "not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    signal: AbortSignal.timeout(opts.timeoutMs ?? MODEL_TIMEOUT_MS),
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      thinking: { type: "between_tools" },
      system: opts.system,
      messages: opts.messages,
      stream: true,
      ...(opts.tools ? { tools: opts.tools } : {}),
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`stream failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let stopReason = "unknown";

  /**
   * Stop reading when the consumer stops listening.
   *
   * Voice caps a turn at two sentences and breaks out of the loop. Without
   * cancelling, the rest of the completion keeps arriving and being paid
   * for with nobody to hear it.
   */
  try {

  // Tool calls arrive as a block id and name, then their arguments in
  // fragments of JSON that have to be reassembled before parsing.
  const building = new Map<number, { id: string; name: string; json: string }>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue;
      }

      const type = event.type as string;

      if (type === "content_block_start") {
        const block = event.content_block as Record<string, unknown>;
        if (block?.type === "tool_use") {
          building.set(event.index as number, {
            id: block.id as string,
            name: block.name as string,
            json: "",
          });
        }
      } else if (type === "content_block_delta") {
        const d = event.delta as Record<string, unknown>;
        if (d?.type === "text_delta") {
          yield { type: "text", text: d.text as string };
        } else if (d?.type === "input_json_delta") {
          const partial = building.get(event.index as number);
          if (partial) partial.json += (d.partial_json as string) ?? "";
        }
      } else if (type === "content_block_stop") {
        const partial = building.get(event.index as number);
        if (partial) {
          let input: Record<string, unknown> = {};
          try {
            input = partial.json ? JSON.parse(partial.json) : {};
          } catch {
            input = {};
          }
          yield {
            type: "tool_use",
            toolUse: { id: partial.id, name: partial.name, input },
          };
          building.delete(event.index as number);
        }
      } else if (type === "message_delta") {
        const d = event.delta as Record<string, unknown>;
        if (d?.stop_reason) stopReason = d.stop_reason as string;
      }
    }
  }

    yield { type: "done", stopReason };
  } finally {
    await reader.cancel().catch(() => {
      // Already closed; nothing to release.
    });
  }
}

export async function complete(opts: {
  system: string;
  messages: WireMessage[];
  model: string;
  maxTokens: number;
  tools?: readonly unknown[];
  /** Milliseconds this call may take. Defaults to MODEL_TIMEOUT_MS. */
  timeoutMs?: number;
}): Promise<ModelReply> {
  const scripted = scriptedReplyForTests();
  if (scripted !== null) {
    // Stands in for the model, nothing else. The reply still passes
    // through the guards and the logging in the route exactly as a real
    // one does — that is the whole point of injecting it here rather than
    // stubbing further up.
    return {
      text: scripted,
      content: [{ type: "text", text: scripted }],
      toolUses: [],
      stopReason: "end_turn",
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error(agentUnavailableReason() ?? "not configured");

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      signal: AbortSignal.timeout(opts.timeoutMs ?? MODEL_TIMEOUT_MS),
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        // Thinking off. On this model thinking is on by default and its
        // tokens come out of the same max_tokens budget, so a long system
        // prompt plus a modest ceiling spent the whole allowance before
        // any text was produced — the seller got a blank message and the
        // endpoint still returned 200. Maya writes two sentences and the
        // hard rules are enforced by agent/guards.ts rather than by
        // reasoning, so there is nothing here for thinking to buy.
        thinking: { type: "between_tools" },
        system: opts.system,
        messages: opts.messages,
        ...(opts.tools ? { tools: opts.tools } : {}),
      }),
    });
  } catch (error) {
    // AbortSignal.timeout raises TimeoutError; a dropped socket raises
    // something else. Both mean the same thing to the caller.
    throw new Error(
      `model call did not complete within ${opts.timeoutMs ?? MODEL_TIMEOUT_MS}ms: ${
        error instanceof Error ? error.name : String(error)
      }`,
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`model call failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    content: {
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }[];
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = body.content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  const toolUses: ToolUse[] = body.content
    .filter((part) => part.type === "tool_use")
    .map((part) => ({
      id: part.id ?? "",
      name: part.name ?? "",
      input: part.input ?? {},
    }));

  const stopReason = body.stop_reason ?? "unknown";

  // An empty completion must never reach the seller as a blank message.
  // Treating it as a failure means the widget says she has dropped out,
  // which is true and recoverable, instead of showing an empty bubble.
  // A turn that is only tool calls is not empty — the loop continues.
  if (!text && toolUses.length === 0) {
    throw new Error(`model returned no text (stop_reason: ${stopReason})`);
  }

  return {
    text,
    content: body.content,
    toolUses,
    stopReason,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  };
}
