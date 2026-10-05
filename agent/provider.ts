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

export interface ModelReply {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * One completion. Deliberately not streamed: the guards must see the whole
 * turn before any of it reaches the seller, and a half-emitted price
 * cannot be recalled (ARCHITECTURE.md section 9).
 */
export async function complete(opts: {
  system: string;
  messages: ChatTurn[];
  model: string;
  maxTokens: number;
}): Promise<ModelReply> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error(agentUnavailableReason() ?? "not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: opts.messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`model call failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    content: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = body.content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return {
    text,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  };
}
