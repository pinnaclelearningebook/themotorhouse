import type { Metadata } from "next";

/**
 * Metadata only — deliberately no auth gate.
 *
 * The gate lives in (workspace)/layout.tsx so that /admin/login and the
 * auth callback sit outside it. Gating at this level would wrap the login
 * page in its own redirect to the login page.
 *
 * /admin is also disallowed in robots.ts and excluded from the sitemap;
 * noindex here is the belt to that braces.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
