"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { sendMagicLink, verifyCode } from "./actions";

/**
 * Magic-link sign-in, with the emailed code as a fallback.
 *
 * The Supabase calls happen in Server Actions, not here, so the browser
 * never needs the project keys and there is one set of environment
 * variable names rather than a public and a private pair.
 *
 * The response to sending is deliberately identical whether or not the
 * address is on the allow-list: confirming which addresses are admins to
 * anyone who can load the page would be a gift to someone enumerating
 * them. The code form is shown either way, for the same reason.
 */
export function LoginForm({ linkFailed = false }: { linkFailed?: boolean }) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    if (!address) return;

    setPending(true);
    setError(null);
    try {
      await sendMagicLink(address);
      setEmail(address);
      setSent(true);
    } catch {
      setError("Could not send the link. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    if (!code) return;

    setPending(true);
    setError(null);
    try {
      // On success this redirects, so nothing after it runs.
      const result = await verifyCode(email, code);
      if (result?.error) setError(result.error);
    } catch {
      setError("That did not work. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div>
        <p role="status" className="text-sm">
          If that address is on the allow-list, a sign-in link is on its way.
        </p>

        <form onSubmit={verify} className="mt-8" noValidate>
          <p className="text-sm text-structure">
            The same email carries a sign-in code. Use it if the link does
            not work — some email scanners open links before you do, which
            spends them.
          </p>
          <div className="mt-4">
            <TextField
              label="Sign-in code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              mono
            />
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-oxblood">
              {error}
            </p>
          )}
          <div className="mt-6">
            <Button disabled={pending}>
              {pending ? "Checking…" : "Sign in with code"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={send} noValidate>
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
