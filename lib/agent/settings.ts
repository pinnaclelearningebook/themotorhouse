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
  /** What this process acts on, including any development override. */
  enabled: boolean;
  /**
   * What the settings table actually says, which is what production acts
   * on. The review page reports this: a dashboard that showed "on"
   * because of a local flag would tell an operator Maya was live when she
   * was not, which is the dev-bypass mistake in CLAUDE.md section 17
   * wearing a different hat.
   */
  storedEnabled: boolean;
  model: string;
  maxTurns: number;
  maxOutputTokens: number;
}

/**
 * Local testing only.
 *
 * The settings table lives in one Supabase project shared by local and
 * production, so flipping agent_enabled to true to test her locally would
 * turn her on for production in the same instant. This allows a local
 * session to run her while the stored setting — and therefore production
 * — stays false.
 *
 * The NODE_ENV check is not a convention here. Next sets NODE_ENV to
 * "production" for every build, so this branch is dead code in any
 * deployed environment and cannot be switched on by setting the variable
 * in Vercel. test/constraints.test.ts asserts the guard stays, exactly as
 * it does for ADMIN_DEV_BYPASS.
 */
function forcedOnForDevelopment(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.AGENT_DEV_FORCE_ON === "1"
  );
}

const FALLBACK: AgentSettings = {
  enabled: false,
  storedEnabled: false,
  model: "claude-sonnet-5-5",
  maxTurns: 30,
  maxOutputTokens: 400,
};

export async function agentSettings(): Promise<AgentSettings> {
  const forced = forcedOnForDevelopment();
  const { data, error } = await db()
    .from("settings")
    .select("key, value")
    .in("key", [
      "agent_enabled",
      "agent_model",
      "agent_max_turns",
      "agent_max_output_tokens",
    ]);

  if (error || !data) {
    return { ...FALLBACK, enabled: forced, storedEnabled: false };
  }

  const map = new Map(data.map((row) => [row.key as string, row.value]));
  return {
    enabled: forced || map.get("agent_enabled") === true,
    storedEnabled: map.get("agent_enabled") === true,
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
