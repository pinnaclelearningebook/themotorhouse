import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { DevConfigBanner } from "@/components/ui/DevConfigBanner";
import { ValuationForm } from "@/components/forms/ValuationForm";
import { PROMISES } from "@/config/site";

export const metadata: Metadata = {
  title: "Get my offer",
  description:
    "Tell us about your car. A firm offer within two hours — the number we give is the number we pay.",
};

export default async function ValuationPage({
  searchParams,
}: {
  searchParams: Promise<{ reg?: string }>;
}) {
  const { reg } = await searchParams;

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
            Six questions, then a person calls you with a firm offer within{" "}
            {PROMISES.offerWithinHours} hours. The number we give is the
            number we pay.
          </p>
          <div className="mt-12">
            <ValuationForm initialReg={reg} />
          </div>
        </div>
      </Section>
    </main>
  );
}
