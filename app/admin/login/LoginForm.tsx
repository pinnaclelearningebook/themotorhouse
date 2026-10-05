"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { sendMagicLink } from "./actions";

/**
 * Magic-link sign-in.
 *
 * The Supabase call happens in the Server Action, not here, so the
 * browser never needs the project keys and there is one set of
 * environment variable names rather than a public and a private pair.
 *
 * The response is deliberately identical whether or not the address is
 * on the allow-list: confirming which addresses are admins to anyone who
 * can load the page would be a gift to someone enumerating them.
 */
export function LoginForm({ linkFailed = false }: { linkFailed?: boolean }) {
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
      await sendMagicLink(email);
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
      {linkFailed && (
        <p role="alert" className="mb-4 text-sm font-medium text-oxblood">
          That link has expired or had already been used. Ask for another.
        </p>
      )}
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
