import "server-only";
import { cookies } from "next/headers";
import { adminDevBypass, currentAdmin } from "@/lib/admin/auth";
import { agentSettings, type AgentSettings } from "@/lib/agent/settings";

/**
 * Who Maya is running for, on this request.
 *
 * There are three answers and they are not the same thing:
 *
 *   live     agent_enabled is true. Everyone gets her, and the
 *            conversation is a real one.
 *   preview  agent_enabled is false and the viewer is a signed-in,
 *            allow-listed admin. They get her on the public site exactly
 *            as a seller would, and the conversation is marked
 *            admin_test so it never counts as a seller turn.
 *   off      everyone else. No widget, and every endpoint refuses.
 *
 * This exists because "is Maya on?" was being answered independently in
 * five places — the valuation page and four endpoints — each reading
 * settings.enabled on its own. Adding a second way to be allowed meant
 * either changing all five in step or leaving a hole, and the hole that
 * matters is a seller reaching an endpoint the page never offered them.
 * One decision, read once per request.
 */

export type AgentMode = "live" | "preview" | "off";

export interface AgentAccess {
  mode: AgentMode;
  /** True only for preview. Written to conversations.admin_test. */
  adminTest: boolean;
  /** Who is previewing, for the server log. Null in live and off. */
  adminEmail: string | null;
  /** The settings this decision was made from, so callers need not re-read. */
  settings: AgentSettings;
}

/**
 * The decision itself, with nothing to mock.
 *
 * Kept pure and exported so the truth table can be asserted directly —
 * in particular the row that matters, which is that a visitor who is not
 * an admin gets nothing while the switch is false. A test that has to
 * stub cookies and Postgres to check that is a test nobody trusts.
 */
export function decideAgentMode(opts: {
  enabled: boolean;
  isAdmin: boolean;
}): AgentMode {
  if (opts.enabled) return "live";
  if (opts.isAdmin) return "preview";
  return "off";
}

/**
 * Could this request possibly be an admin's?
 *
 * A cheap negative. /valuation is a public page on the critical path, and
 * currentAdmin() costs a Supabase getUser() plus an admin_users lookup —
 * two round trips added to every anonymous visit, for an answer that is
 * no every time. No Supabase auth cookie means no session, so there is
 * nothing to check. Presence of the cookie proves nothing; it only earns
 * the real check.
 */
async function mightBeAdmin(): Promise<boolean> {
  // The dev bypass sets no cookie, so without this the preview would be
  // invisible on localhost. adminDevBypass() is dead code in any build.
  if (adminDevBypass()) return true;
  const store = await cookies();
  return store.getAll().some((cookie) => /^sb-.+-auth-token/.test(cookie.name));
}

export async function agentAccess(): Promise<AgentAccess> {
  const settings = await agentSettings();

  // Only ask who they are when the answer can change anything.
  const admin =
    settings.enabled || !(await mightBeAdmin()) ? null : await currentAdmin();

  const mode = decideAgentMode({
    enabled: settings.enabled,
    isAdmin: admin !== null,
  });

  return {
    mode,
    adminTest: mode === "preview",
    adminEmail: mode === "preview" ? (admin?.email ?? null) : null,
    settings,
  };
}
