import type { Metadata } from "next";
import { LegalArticle } from "@/components/ui/LegalArticle";
import { ManageConsentButton } from "@/components/consent/ManageConsentButton";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "What this site stores in your browser — which is very little — and the choice you have over it.",
};

export default function CookiesPage() {
  return (
    <LegalArticle
      title="Cookie policy"
      updated="2026-08-29"
      labelledBy="cookies-heading"
    >
      <h2>The short version</h2>
      <p>
        This site currently sets no advertising cookies and no analytics
        cookies. The only thing stored in your browser is the record of
        your own cookie choice, kept in your browser&apos;s local storage
        so we do not ask you again on every visit.
      </p>

      <h2>Essential storage</h2>
      <ul>
        <li>
          <span className="font-mono">tmh-consent</span> — remembers whether
          you allowed analytics. Stored locally in your browser, never sent
          to us, kept until you clear it or change your choice.
        </li>
      </ul>

      <h2>Analytics</h2>
      <p>
        We plan to add privacy-respecting analytics to understand how the
        site is used. When we do, it will load only if you have chosen to
        allow it — nothing non-essential runs before that choice — and this
        page will name the provider and exactly what it sets.
      </p>

      <h2>Your choice</h2>
      <p>
        You can change your mind at any time. This button clears your
        stored choice and brings the banner back:
      </p>
      <p>
        <ManageConsentButton />
      </p>
    </LegalArticle>
  );
}
