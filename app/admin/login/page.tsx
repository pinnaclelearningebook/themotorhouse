import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { CODE_SIGN_IN_AVAILABLE, isAdminConfigured } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-display-3">Sign in</h1>
      <p className="mt-3 text-sm text-structure">
        A link arrives by email. Only addresses on the allow-list can get in;
        anyone else receives nothing.
      </p>
      {!isAdminConfigured() && (
        <p
          role="alert"
          className="mt-6 rounded border border-oxblood bg-oxblood p-4 text-sm text-paper"
        >
          ADMIN_ALLOWLIST is not set, so nobody can sign in. See
          PENDING-INFO.md.
        </p>
      )}
      <div className="mt-8">
        <LoginForm
          linkFailed={error === "link"}
          codeSignIn={CODE_SIGN_IN_AVAILABLE}
        />
      </div>
    </main>
  );
}
