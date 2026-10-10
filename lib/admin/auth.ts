import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

/**
 * Admin authentication.
 *
 * Two gates, deliberately. The session proves who someone is; the
 * allow-list proves they are allowed. Supabase magic-link auth will
 * issue a session to any email that asks for one, so the session alone
 * means almost nothing.
 *
 * The database enforces the same rule independently through the
 * admin_users table and the is_admin() policies, so a mistake here does
 * not expose lead data — see supabase/migrations/20261005210000.
 */

/**
 * Is the emailed sign-in code available?
 *
 * The code path works and is tested. The email is the problem: Supabase
 * refuses template writes to a free project using its own sender, so
 * `{{ .Token }}` cannot be put in the magic-link template and no code is
 * ever sent. `/admin/login` offered a box for a code that could not
 * arrive, and said so in writing, which is a live page telling an admin
 * something untrue.
 *
 * Flip this to true in the same change that gives Resend a verified
 * domain and runs `npm run configure-auth <url> --smtp sender@domain`.
 * Custom SMTP lifts the template restriction, and the template is what
 * puts the code in the email. Nothing else has to change: verifyCode and
 * its allow-list guard stay exactly as they are.
 */
export const CODE_SIGN_IN_AVAILABLE = false;

export interface AdminSession {
  email: string;
}

/**
 * Development only, for working on admin pages without a magic link in
 * the inbox. The NODE_ENV check is not a convention here — Next sets
 * NODE_ENV to "production" for every build, so this is dead code in any
 * deployed environment and cannot be switched on by setting the variable
 * in Vercel. test/constraints.test.ts asserts the guard stays.
 *
 * Exported because lib/agent/access needs the same answer: its cheap
 * pre-check looks for a Supabase auth cookie before paying for
 * currentAdmin(), and the bypass sets no cookie, so without this the
 * admin preview would be invisible on localhost for the one developer
 * most likely to be looking for it. One definition, not two.
 */
export function adminDevBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ADMIN_DEV_BYPASS === "1"
  );
}

/** Is this address on the env allow-list? Used before any auth call. */
export function isAllowlisted(email: string): boolean {
  return allowlist().includes(email.trim().toLowerCase());
}

function allowlist(): string[] {
  return (process.env.ADMIN_ALLOWLIST ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          try {
            for (const { name, value, options } of items) {
              store.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are readonly.
            // Middleware or the route handler refreshes the session instead.
          }
        },
      },
    },
  );
}

/** The signed-in admin, or null. Null means redirect to /admin/login. */
export async function currentAdmin(): Promise<AdminSession | null> {
  if (adminDevBypass()) {
    return { email: allowlist()[0] ?? "dev@localhost" };
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email) return null;

  // Env allow-list first: cheap, and the thing an operator edits.
  if (!isAllowlisted(email)) return null;

  // Then the table, which is what the database policies actually read.
  // If the two disagree the table wins, and sync-admins reconciles them.
  const { data } = await db()
    .from("admin_users")
    .select("email")
    .ilike("email", email)
    .maybeSingle();
  if (!data) return null;

  return { email };
}

export function isAdminConfigured(): boolean {
  return allowlist().length > 0;
}
