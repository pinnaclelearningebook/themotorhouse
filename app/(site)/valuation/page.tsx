import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { DevConfigBanner } from "@/components/ui/DevConfigBanner";
import { ValuationFormV2 } from "@/components/forms/ValuationFormV2";
import { PROMISES } from "@/config/site";
import { agentAccess } from "@/lib/agent/access";

export const metadata: Metadata = {
  title: "Get my offer",
  description:
    "Tell us about your car. A firm offer within two hours — the number we give is the number we pay.",
  alternates: { canonical: "/valuation" },
};

export default async function ValuationPage({
  searchParams,
}: {
  searchParams: Promise<{ reg?: string }>;
}) {
  const { reg } = await searchParams;
  // Resolved server-side so a seller is never offered an assistant that
  // would immediately fail, and so the page and the endpoints agree on
  // one answer. agent_enabled seeds false, which leaves "off" for a
  // seller and "preview" for a signed-in admin.
  const { mode } = await agentAccess();

  return (
    <main>
      <Section ground="paper" labelledBy="valuation-heading">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 empty:hidden">
            <DevConfigBanner />
          </div>
          <h1 id="valuation-heading" className="font-display text-display-2">
            Get my offer
          </h1>
          <p className="mt-4 max-w-prose text-lg">
            Start with the registration. A person calls you with a firm
            offer within {PROMISES.offerWithinHours} hours, and the number
            we give is the number we pay.
          </p>
          <div className="mt-12">
            <ValuationFormV2
              initialReg={reg}
              agentEnabled={mode !== "off"}
              agentPreview={mode === "preview"}
            />
          </div>
        </div>
      </Section>
    </main>
  );
}
