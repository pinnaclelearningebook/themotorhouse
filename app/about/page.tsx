import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { AutoDealerJsonLd } from "@/components/seo/AutoDealerJsonLd";
import { PlateForm } from "@/components/ui/PlateForm";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "About us",
  description:
    "A specialist car buying service, not a lead-gen funnel. Why we exist, how we work, and why our offers on young premium SUVs are stronger.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main>
      <AutoDealerJsonLd />
      <Section ground="paper" labelledBy="about-heading">
        <div className="max-w-3xl">
          <h1 id="about-heading" className="font-display text-display-2">
            About {SITE.name}
          </h1>
          <p className="mt-6 text-lg">
            We buy cars. Not as a marketplace, not as a middleman passing
            your details to dealers — we buy them ourselves, with our own
            money, and the offer we make is the offer we pay.
          </p>
          <p className="mt-4 max-w-prose">
            The business exists because of a pattern most owners of a good
            car will recognise: an appealing number online, a long drive to a
            retail park, and a smaller number in person. Selling privately
            avoids that but brings strangers, test drives and payment risk
            to your door instead. We think there should be a way to sell a
            car properly — a firm number from someone who knows the car,
            free collection, payment before the car moves. So that is the
            entire service.
          </p>
        </div>
      </Section>

      <Section ground="ink" labelledBy="specialism-heading">
        <div className="max-w-3xl">
          <h2 id="specialism-heading" className="font-display text-display-3">
            Where we are strongest
          </h2>
          <p className="mt-6 text-paper/80">
            We buy anything, but we actively look for young premium SUVs —
            Range Rover, Evoque, Velar, Discovery Sport, Defender, Lexus,
            Mercedes GLE. On those, we also sell to exporters we work
            with, into a market where right-hand drive is the local
            standard and a good one is worth more than a UK retail buyer
            will pay. That demand flows straight into what we can offer
            you.
          </p>
        </div>
      </Section>

      <Section ground="paper" labelledBy="people-heading">
        <div className="max-w-3xl">
          <h2 id="people-heading" className="font-display text-display-3">
            The people behind it
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            <AwaitingInfo label="Founder name and photograph" />
            <AwaitingInfo label="Founder bio — why this business exists" />
          </div>
        </div>
      </Section>

      <Section ground="ink" labelledBy="about-cta-heading">
        <h2 id="about-cta-heading" className="font-display text-display-3">
          See what we would pay for yours.
        </h2>
        <div className="mt-8">
          <PlateForm id="about-reg" />
        </div>
      </Section>
    </main>
  );
}
