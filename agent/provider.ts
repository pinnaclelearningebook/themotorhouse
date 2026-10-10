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

export async function complete(opts: {
  system: string;
  messages: WireMessage[];
  model: string;
  maxTokens: number;
  tools?: readonly unknown[];
  /** Milliseconds this call may take. Defaults to MODEL_TIMEOUT_MS. */
  timeoutMs?: number;
}): Promise<ModelReply> {
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
