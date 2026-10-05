"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";

/**
 * Magic-link sign-in.
 *
 * The response is deliberately identical whether or not the address is
 * on the allow-list: confirming which addresses are admins to anyone who
 * can load the page would be a gift to someone enumerating them.
 */
export function LoginForm() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    if (!email) return;

    setPending(true);
    setError(null);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      );
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setSent(true);
    } catch {
      setError("Could not send the link. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p role="status" className="text-sm">
        If that address is on the allow-list, a sign-in link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <TextField label="Email" name="email" type="email" autoComplete="email" />
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-oxblood">
          {error}
        </p>
      )}
      <div className="mt-6">
        <Button disabled={pending}>
          {pending ? "Sending…" : "Send me a link"}
        </Button>
      </div>
    </form>
  );
}
