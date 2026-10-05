import "server-only";
import { db } from "@/lib/db";

/**
 * The switches governing Maya, read fresh per request.
 *
 * agent_enabled is the kill switch and it fails closed: if the row is
 * missing, unreadable, or anything other than exactly true, she is off.
 * A kill switch that defaults to on when the database hiccups is not a
 * kill switch.
 */

export interface AgentSettings {
  enabled: boolean;
  model: string;
  maxTurns: number;
  maxOutputTokens: number;
}

const FALLBACK: AgentSettings = {
  enabled: false,
  model: "claude-sonnet-5-5",
  maxTurns: 30,
  maxOutputTokens: 400,
};

export async function agentSettings(): Promise<AgentSettings> {
  const { data, error } = await db()
    .from("settings")
    .select("key, value")
    .in("key", [
      "agent_enabled",
      "agent_model",
      "agent_max_turns",
      "agent_max_output_tokens",
    ]);

  if (error || !data) return FALLBACK;

  const map = new Map(data.map((row) => [row.key as string, row.value]));
  return {
    enabled: map.get("agent_enabled") === true,
    model:
      typeof map.get("agent_model") === "string"
        ? (map.get("agent_model") as string)
        : FALLBACK.model,
    maxTurns:
      typeof map.get("agent_max_turns") === "number"
        ? (map.get("agent_max_turns") as number)
        : FALLBACK.maxTurns,
    maxOutputTokens:
      typeof map.get("agent_max_output_tokens") === "number"
        ? (map.get("agent_max_output_tokens") as number)
        : FALLBACK.maxOutputTokens,
  };
}
