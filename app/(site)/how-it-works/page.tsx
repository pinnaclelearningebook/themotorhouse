import type { Metadata } from "next";
import { Banknote, ClipboardList, PhoneCall, Truck } from "lucide-react";
import { CtaBand } from "@/components/sections/CtaBand";
import { StepTimeline, type Step } from "@/components/sections/StepTimeline";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { Photo } from "@/components/ui/Photo";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PHOTOGRAPHY } from "@/config/photography";
import { PROMISES } from "@/config/site";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Tell us about the car, get a firm offer within two hours, free collection anywhere in mainland UK, payment before the transporter leaves.",
  alternates: { canonical: "/how-it-works" },
};

const steps: Step[] = [
  {
    icon: ClipboardList,
    title: "Tell us about the car",
    body: "Start with your registration and mileage, and how to reach you. It takes about a minute, and you can add detail afterwards — service history, condition, anything you would want a buyer to know. The more you tell us, the firmer the ground under the number we give you.",
  },
  {
    icon: PhoneCall,
    title: "A firm offer within two hours",
    body: "A person who trades your kind of car calls you with a number. Not an estimate, not a range, not a figure that gets revisited later — the amount we will pay. The offer stands for seven days, provided the mileage has not materially increased and the condition is as you described.",
  },
  {
    icon: Truck,
    title: "We collect, free, anywhere in mainland UK",
    body: "You choose the time and we come to you. There is no dropping the car at a depot and no collection charge, wherever you are on the mainland. Handover usually takes under half an hour: documents, keys, done.",
  },
  {
    icon: Banknote,
    title: "Paid before the transporter leaves",
    body: "The full amount goes to your account by bank transfer while we are still on your drive. You watch it arrive before the car goes anywhere. If there is outstanding finance we settle the lender directly and pay you the balance.",
  },
];

/**
 * What to have ready.
 *
 * Every line is the published FAQ answer to "What documents do I need
 * to sell my car?", split into its four clauses and nothing added. A
 * page like this is where a helpful-sounding new promise appears
 * without anyone approving it, so the rule here is that the list may
 * rearrange published copy and may not extend it.
 */
const bring = [
  {
    title: "The V5C logbook",
    body: "In your name.",
  },
  {
    title: "Both sets of keys",
    body: "If a set is missing, say so — most gaps can be worked around.",
  },
  {
    title: "Whatever service records you have",
    body: "A stamped book, a folder of invoices, or nothing at all.",
  },
  {
    title: "A finance settlement letter",
    body: "Only if there is outstanding finance on the car.",
  },
];

export default function HowItWorksPage() {
  return (
    <main>
      <PageHero
        eyebrow="How it works"
        heading="Four steps, and no surprises at any of them."
        intro="From the registration to the money in your account, this is the whole of it. There is no stage where the number changes."
        image={PHOTOGRAPHY.handover}
        crumbs={[{ name: "How it works", path: "/how-it-works" }]}
      />

      <Section ground="paper" labelledBy="steps-heading">
        <SectionHeader
          id="steps-heading"
          eyebrow="The process"
          heading="What actually happens"
          intro="Most of it happens without you doing anything. The part that needs you takes about a minute."
        />
        <StepTimeline steps={steps} />
      </Section>

      {/*
       * The no-deductions policy: its own band, largest type on the
       * page, and the only oxblood ground here. CLAUDE.md section 8.
       */}
      <Section ground="oxblood" labelledBy="policy-heading">
        <div className="max-w-4xl">
          <p className="text-caption font-semibold tracking-[0.16em] text-paper/70 uppercase">
            The part that matters
          </p>
          <h2
            id="policy-heading"
            className="mt-5 font-display text-display-3 md:text-display-1"
          >
            No deductions. Not at collection, not ever.
          </h2>
          <p className="mt-7 max-w-prose text-lg leading-relaxed text-paper/90">
            The industry habit is an attractive number online and a smaller one
            on the day. We do not work that way. Describe the car honestly and
            the offer we make is the amount that lands in your account — if we
            misjudged something you told us about truthfully, we absorb it.
          </p>
        </div>
      </Section>

      <Section ground="paper-warm" labelledBy="bring-heading">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-16">
          <div>
            <SectionHeader
              id="bring-heading"
              eyebrow="Before collection"
              heading="What to have ready"
              intro="If something is missing, tell us. Most gaps can be worked around, and it is better said before the offer than after."
            />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {bring.map((item) => (
                <Card as="li" key={item.title} tone="paper">
                  <h3 className="font-display text-xl">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/75">
                    {item.body}
                  </p>
                </Card>
              ))}
            </ul>
          </div>
          <Photo
            slot={PHOTOGRAPHY.paperwork}
            sizes="(min-width: 1024px) 22rem, 100vw"
            quality={72}
            className="h-full w-full rounded object-cover lg:aspect-[3/4]"
          />
        </div>
      </Section>

      <CtaBand
        heading={`A firm number within ${PROMISES.offerWithinHours} hours.`}
      />
    </main>
  );
}
