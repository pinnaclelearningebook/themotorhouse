import type { Metadata } from "next";
import { Banknote, Handshake, MapPin, ShieldCheck } from "lucide-react";
import { CtaBand } from "@/components/sections/CtaBand";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { Card } from "@/components/ui/Card";
import { IconList } from "@/components/ui/IconList";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PHOTOGRAPHY } from "@/config/photography";
import { MODELS } from "@/config/models";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "About us",
  description:
    "A specialist car buying service, not a lead-gen funnel. Why we exist, how we work, and why our offers on young premium SUVs are stronger.",
  alternates: { canonical: "/about" },
};

/**
 * The four things the service is. Every line restates a promise that
 * is already published on /how-it-works or in the FAQ — this page
 * explains the business, it does not add to what the business owes.
 */
const principles = [
  {
    icon: Banknote,
    title: "We buy with our own money",
    detail:
      "Not a marketplace, not a middleman passing your details to dealers. The offer comes from the person who pays it.",
  },
  {
    icon: ShieldCheck,
    title: "The number does not move",
    detail:
      "We do not inspect the car at collection and start finding deductions. Describe it honestly and the offer stands.",
  },
  {
    icon: MapPin,
    title: "We come to you",
    detail:
      "Free collection anywhere in mainland UK. There is no depot to drive to and no collection charge.",
  },
  {
    icon: Handshake,
    title: "Paid before the car moves",
    detail:
      "The transfer goes while we are on your drive. You watch it arrive before the transporter leaves.",
  },
];

export default function AboutPage() {
  return (
    <main>

      <PageHero
        eyebrow="About us"
        heading={`${SITE.name} buys cars. That is the whole business.`}
        intro="Not as a marketplace, not as a middleman passing your details to dealers — we buy them ourselves, with our own money, and the offer we make is the offer we pay."
        image={PHOTOGRAPHY.aboutRoad}
        crumbs={[{ name: "About", path: "/about" }]}
      />

      <Section ground="paper" labelledBy="why-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16">
          <SectionHeader
            id="why-heading"
            eyebrow="Why it exists"
            heading="A pattern most owners of a good car will recognise"
            intro="An appealing number online, a long drive to a retail park, and a smaller number in person."
          />
          <p className="max-w-prose leading-relaxed text-ink/80 lg:pt-20">
            Selling privately avoids that but brings strangers, test drives and
            payment risk to your door instead. We think there should be a way
            to sell a car properly — a firm number from someone who knows the
            car, free collection, payment before the car moves. So that is the
            entire service.
          </p>
        </div>
        <IconList entries={principles} className="mt-14" />
      </Section>

      <Section ground="ink" labelledBy="specialism-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,24rem)] lg:gap-16">
          <SectionHeader
            id="specialism-heading"
            eyebrow="Where we are strongest"
            heading="We buy anything, and we actively look for some things"
            tone="dark"
            intro="On young premium SUVs we also sell to exporters we work with, into a market where right-hand drive is the local standard and a good one is worth more than a UK retail buyer will pay. That demand flows straight into what we can offer you."
          />
          <Card tone="ink" className="self-start">
            <p className="text-caption font-semibold tracking-[0.16em] text-paper/60 uppercase">
              Actively looking for
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {MODELS.map((model) => (
                // Model names are product names, not vehicle data, so
                // they take the body face. Mono is for the registration,
                // the mileage, the price (CLAUDE.md section 5).
                <li key={model.slug} className="text-paper/85">
                  {model.name}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-paper/65">
              Everything else is bought on the same terms, by the same people,
              with the same offer that does not change.
            </p>
          </Card>
        </div>
      </Section>

      <Section ground="paper-warm" labelledBy="people-heading">
        <SectionHeader
          id="people-heading"
          eyebrow="The people behind it"
          heading="Who you will actually speak to"
          intro="A person prices your car and a person rings you. This page will say who, by name, once that is settled."
        />
        <div className="mt-10 flex max-w-xl flex-col gap-3">
          <AwaitingInfo label="Founder name and photograph" />
          <AwaitingInfo label="Founder bio — why this business exists" />
        </div>
      </Section>

      <CtaBand heading="See what we would pay for yours." />
    </main>
  );
}
