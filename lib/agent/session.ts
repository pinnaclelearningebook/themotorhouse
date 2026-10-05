import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { AgentSession } from "@/agent/tools";

/**
 * Proving a request owns the conversation it names.
 *
 * The endpoint is reachable by anyone who can load /valuation, so the
 * conversation id is not a credential — ids leak into logs, screenshots
 * and shared links. The server issues a random token, keeps it on the row
 * and puts it in an httpOnly cookie, and every turn and tool call is
 * checked against the pair.
 */

const COOKIE = "tmh_agent";

export async function createSession(opts: {
  leadId: string | null;
  vehicleId: string | null;
}): Promise<{ conversationId: string } | null> {
  const token = randomBytes(32).toString("hex");

  const { data, error } = await db()
    .from("conversations")
    .insert({
      lead_id: opts.leadId,
      vehicle_id: opts.vehicleId,
      mode: "text",
      provider: "anthropic",
      session_token: token,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) return null;

  const store = await cookies();
  store.set(COOKIE, `${data.id}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return { conversationId: data.id as string };
}

/** The session this request owns, or null. Never trusts a body parameter. */
export async function resolveSession(): Promise<
  (AgentSession & { turnCount: number }) | null
> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;

  const separator = raw.indexOf(".");
  if (separator < 1) return null;
  const conversationId = raw.slice(0, separator);
  const token = raw.slice(separator + 1);
  if (!token) return null;

  const { data } = await db()
    .from("conversations")
    .select("id, lead_id, vehicle_id, session_token, turn_count, ended_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (!data || data.ended_at) return null;
  // Compared in full rather than by prefix; a token is useless truncated.
  if (data.session_token !== token) return null;

  return {
    conversationId: data.id as string,
    leadId: (data.lead_id as string) ?? null,
    vehicleId: (data.vehicle_id as string) ?? null,
    turnCount: (data.turn_count as number) ?? 0,
  };
}
