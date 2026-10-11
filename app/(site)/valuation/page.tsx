import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { DevConfigBanner } from "@/components/ui/DevConfigBanner";
import { ValuationFormV2 } from "@/components/forms/ValuationFormV2";
import { ValuationReassurance } from "@/components/forms/ValuationReassurance";
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
    <main className="bg-paper pt-28 pb-16 md:pt-36 md:pb-24">
      <Container>
        <div className="mb-8 empty:hidden">
          <DevConfigBanner />
        </div>
        <div className="max-w-2xl">
          <p className="text-caption font-semibold tracking-[0.16em] text-oxblood uppercase">
            Your car
          </p>
          <h1
            id="valuation-heading"
            className="mt-4 font-display text-display-3 md:text-display-2"
          >
            Get my offer
          </h1>
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink/80">
            A person calls you with a firm offer within{" "}
            {PROMISES.offerWithinHours} hours, and the number we give is the
            number we pay.
          </p>
        </div>

        {/*
         * The form first in the source order, so a phone and a screen
         * reader both reach the registration input before the panel
         * explaining why it is worth filling in.
         */}
        <div className="mt-12 grid items-start gap-10 lg:mt-16 lg:grid-cols-[minmax(0,36rem)_minmax(0,22rem)] lg:gap-16">
          {/*
            * The wrapper is load-bearing. ValuationFormV2 returns a
            * fragment — the progress indicator and the step beside it —
            * and a fragment's children become grid items in their own
            * right, which put the progress bar in one column and the
            * step in the other.
            */}
          <div>
            <ValuationFormV2
              initialReg={reg}
              agentEnabled={mode !== "off"}
              agentPreview={mode === "preview"}
            />
          </div>
          <div className="lg:sticky lg:top-28">
            <ValuationReassurance />
          </div>
        </div>
      </Container>
    </main>
  );
}
