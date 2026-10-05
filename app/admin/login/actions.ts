"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowlisted, supabaseServer } from "@/lib/admin/auth";

/**
 * Send a magic link.
 *
 * Two things matter here.
 *
 * First, the allow-list is checked before Supabase is called at all.
 * signInWithOtp creates an auth user for any address that asks, so
 * calling it unconditionally would let anyone with the URL fill the auth
 * table and spend our email quota. Nobody off the list reaches Supabase.
 *
 * Second, the return value is the same either way. Telling the caller
 * whether an address is an admin would hand an enumerator the list, so
 * the page says "if that address is on the allow-list" and means it.
 * Failures are logged for us and invisible to them.
 */
export async function sendMagicLink(email: string): Promise<void> {
  const address = email.trim().toLowerCase();
  if (!address) return;
  if (!isAllowlisted(address)) return;

  // The link must come back to the deployment the request came from, so
  // preview deployments work without being hardcoded anywhere.
  const head = await headers();
  const host = head.get("host");
  const proto = head.get("x-forwarded-proto") ?? "https";
  if (!host) return;

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: {
      emailRedirectTo: `${proto}://${host}/admin/auth/callback`,
      // Safe because of the allow-list check above: an admin's auth user
      // has to be created on their first sign-in, and nobody else gets
      // this far. Without it there would be no way to bootstrap the
      // first admin outside the Supabase dashboard.
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("[admin] magic link failed to send:", error.message);
  }
}

/**
 * Sign in with the 6-digit code instead of the link.
 *
 * Supabase puts both in the same email. The code exists because the link
 * does not always survive the journey: Outlook's SafeLinks and similar
 * scanners follow URLs before a human does, and a magic link is single
 * use, so by the time the admin clicks it the token can already be spent.
 * A code cannot be consumed by a scanner reading the message.
 *
 * verifyOtp establishes the session by writing cookies, which is why this
 * is a Server Action and not something the browser does. Whether the
 * session may see anything is still decided by currentAdmin() and by the
 * is_admin() row policies.
 */
export async function verifyCode(
  email: string,
  code: string,
): Promise<{ error: string } | undefined> {
  const address = email.trim().toLowerCase();
  const token = code.replace(/\s+/g, "");

  // Same gate as sending, for the same reason: an address that could
  // never have been sent a code has no business being verified either.
  if (!address || !isAllowlisted(address)) {
    return { error: "That code did not work. Ask for another link." };
  }
  if (!/^\d{6}$/.test(token)) {
    return { error: "The code is six digits." };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    email: address,
    token,
    type: "email",
  });

  if (error) {
    console.error("[admin] code verification failed:", error.message);
    return { error: "That code did not work. Ask for another link." };
  }

  redirect("/admin");
}
