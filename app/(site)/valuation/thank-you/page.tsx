import type { Metadata } from "next";
import { Camera, Mail, PhoneCall, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextLink } from "@/components/ui/TextLink";
import { PROMISES } from "@/config/site";
import { readSellerConfirmation } from "@/lib/seller-confirmation";

export const metadata: Metadata = {
  title: "Offer request received",
  description: "Your offer request is in. A person will call you shortly.",
  robots: { index: false },
};

/**
 * What happens next, in the order it happens.
 *
 * **The email card only appears when there is an email.** This page
 * used to say "we have emailed you a confirmation" and "reply to that
 * email with a few photos" to everyone, while the seller confirmation
 * was being rejected by Resend on every single submission. A page that
 * tells someone to watch an inbox nothing is coming to is worse than
 * one that says less: it is the first thing we do after taking their
 * details, and it is false.
 *
 * So the copy is keyed to what actually happened for this lead, and
 * the unknown case is treated as "no email" — claiming nothing is
 * always safe, claiming an email is only safe when Resend took it.
 *
 * Every line is published elsewhere: the two-hour response, the offer
 * standing for seven days, and the photo request that the confirmation
 * email itself carries. No new promise is made here.
 *
 * No CtaBand either. The seller has just submitted; a band inviting
 * them to start again is the sort of thing a funnel does.
 */
const CALL = {
  icon: PhoneCall,
  title: `A call within ${PROMISES.offerWithinHours} hours`,
  body: "From a person who knows your car, with a firm number. Not a bot, not an estimate.",
};

const EMAILED = [
  CALL,
  {
    icon: Mail,
    title: "A confirmation by email",
    body: "It repeats what you told us, so you can check we have it right before the call.",
  },
  {
    icon: Camera,
    title: "Photos, if you have them",
    body: "Reply to that email with the outside from each corner and the interior. It helps us stand behind the number.",
  },
];

const NOT_EMAILED = [
  CALL,
  {
    icon: ShieldCheck,
    title: "The number does not change",
    body: "Describe the car honestly and the offer we make is the amount that lands in your account.",
  },
  {
    icon: Camera,
    title: "Photos help, when we call",
    body: "The outside from each corner and the interior. Have them to hand and the offer is one we can stand behind.",
  },
];

export default async function ThankYouPage() {
  const confirmation = await readSellerConfirmation();
  const next = confirmation === "sent" ? EMAILED : NOT_EMAILED;

  return (
    <main>
      <section
        aria-labelledby="thanks-heading"
        className="on-ink bg-ink pt-32 pb-16 text-paper md:pt-40 md:pb-24"
      >
        <Container>
          <div className="max-w-2xl">
            <p className="text-caption font-semibold tracking-[0.16em] text-paper/70 uppercase">
              Received
            </p>
            <h1
              id="thanks-heading"
              className="rise-in-solid mt-4 font-display text-display-3 md:text-display-1"
            >
              That is everything we need.
            </h1>
            <p className="rise-in-solid mt-6 text-lg leading-relaxed text-paper/85">
              You will hear from a person within {PROMISES.offerWithinHours}{" "}
              hours — a firm offer from someone who knows your car, and no
              obligation to accept it.
            </p>
          </div>
        </Container>
      </section>

      <Section ground="paper" labelledBy="next-heading">
        <SectionHeader
          id="next-heading"
          eyebrow="What happens next"
          heading="Three things, in this order"
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {next.map((item) => {
            const Icon = item.icon;
            return (
              <Card as="li" key={item.title} tone="warm">
                <Icon
                  aria-hidden="true"
                  size={24}
                  strokeWidth={1.5}
                  className="text-oxblood"
                />
                <h2 className="mt-5 font-display text-xl">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">
                  {item.body}
                </p>
              </Card>
            );
          })}
        </ul>
        <p className="mt-12">
          <TextLink href="/">Back to the home page</TextLink>
        </p>
      </Section>
    </main>
  );
}
