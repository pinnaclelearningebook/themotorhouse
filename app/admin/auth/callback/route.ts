import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/admin/auth";

/**
 * Where the magic link lands.
 *
 * @supabase/ssr uses PKCE, so the link returns a short-lived code rather
 * than a session. It has to be exchanged here, server-side, because that
 * exchange is what writes the session cookies — a route handler can set
 * them, a Server Component cannot. Without this route the link would
 * arrive at /admin carrying a code nobody reads, no cookie would be set,
 * and the gate would bounce the admin straight back to the login page.
 *
 * The exchange only proves the address owns that inbox. Whether it may
 * see anything is decided by currentAdmin() and, independently, by the
 * is_admin() row policies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    const reason = searchParams.get("error_description") ?? "missing";
    console.error("[admin] auth callback without a usable code:", reason);
    return NextResponse.redirect(`${origin}/admin/login?error=link`);
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Expired or already used — both are ordinary and both mean "ask for
    // another link", so the page says that rather than naming the cause.
    console.error("[admin] code exchange failed:", error.message);
    return NextResponse.redirect(`${origin}/admin/login?error=link`);
  }

  return NextResponse.redirect(`${origin}/admin`);
}
