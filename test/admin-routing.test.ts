import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Where the admin auth gate is allowed to live.
 *
 * This exists because of a real bug. The gate was on app/admin/layout.tsx,
 * which in the App Router wraps every child — including the login page it
 * redirects to. /admin/login therefore redirected to itself forever and
 * admin sign-in was completely unreachable. Typecheck, lint and the whole
 * suite passed, because nothing about it is a type error.
 *
 * The rule: the gate belongs to the (workspace) group. Anything a signed
 * out admin must be able to reach — the login page, the auth callback —
 * stays outside it.
 */

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const GATE = /currentAdmin\s*\(/;

describe("admin route structure", () => {
  it("does not gate the layout that wraps the login page", () => {
        const layout = read("app/admin/layout.tsx");
    expect(
      GATE.test(layout),
      "app/admin/layout.tsx wraps /admin/login, so gating here redirects " +
        "the login page to itself. Put the gate in (workspace) instead.",
    ).toBe(false);
  });

  it("gates the workspace group", () => {
    const layout = read("app/admin/(workspace)/layout.tsx");
    expect(GATE.test(layout)).toBe(true);
    expect(layout).toMatch(/redirect\(["']\/admin\/login["']\)/);
  });

  it("keeps the login page and auth callback outside the gated group", () => {
    for (const path of [
      "app/admin/login/page.tsx",
      "app/admin/auth/callback/route.ts",
    ]) {
      expect(existsSync(join(ROOT, path)), `${path} must exist`).toBe(true);
      expect(
        path.includes("(workspace)"),
        `${path} must not sit inside the gated group`,
      ).toBe(false);
    }
  });

  it("exchanges the magic-link code in a route handler, not a page", () => {
    // Only a route handler can write the session cookies the gate reads.
    const route = read("app/admin/auth/callback/route.ts");
    expect(route).toMatch(/exchangeCodeForSession/);
    expect(route).toMatch(/export async function GET/);
  });

  it("checks the allow-list before asking Supabase for a link", () => {
    // signInWithOtp creates a user for any address, so an ungated call
    // lets anyone fill the auth table and spend the email quota.
    const action = read("app/admin/login/actions.ts");
    // Anchor both ends on real code. The bare names appear in the import
    // line and in this file's own doc comment, and matching those made an
    // earlier version of this assertion pass whatever the order was.
    const gateAt = action.search(/if\s*\(!isAllowlisted\(/);
    const sendAt = action.search(/supabase\.auth\.signInWithOtp\(/);
    expect(gateAt, "no early-return allow-list guard found").toBeGreaterThan(-1);
    expect(sendAt, "no signInWithOtp call found").toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(sendAt);
  });

  it("checks the allow-list before verifying a code too", () => {
    // The code path is a second way in, so it needs the same gate. An
    // address that could never have been sent a code has no business
    // being verified either.
    const action = read("app/admin/login/actions.ts");
    const gateAt = action.search(/!isAllowlisted\(address\)\)\s*\{/);
    const verifyAt = action.search(/supabase\.auth\.verifyOtp\(/);
    expect(gateAt, "no allow-list guard in verifyCode").toBeGreaterThan(-1);
    expect(verifyAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(verifyAt);
  });

  it("keeps Supabase keys out of the browser bundle", () => {
    // One set of env names. A NEXT_PUBLIC_ pair drifted out of sync once
    // already: the names the login form read existed nowhere at all.
    const form = read("app/admin/login/LoginForm.tsx");
    expect(form).not.toMatch(/NEXT_PUBLIC_SUPABASE/);
    expect(form).not.toMatch(/createBrowserClient/);
  });
});
