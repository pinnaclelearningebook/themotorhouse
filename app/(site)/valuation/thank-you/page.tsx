import type { Metadata } from "next";
import { Camera, Mail, PhoneCall, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextLink } from "@/components/ui/TextLink";
import { PROMISES } from "@/config/site";
import { readThankYouState } from "@/lib/thank-you-state";
import type { ContactMethod } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Offer request received",
  description: "Your offer request is in. A person will call you shortly.",
  robots: { index: false },
};

/**
 * What happens next, in the order it happens.
 *
 * **The first card names the channel the seller chose.** They were
 * asked at step 4, so answering "we will email you" when they picked
 * WhatsApp is a question we took the trouble to ask and then ignored.
 *
 * **It still says a person will call**, whatever they picked, because
 * that is the published promise: a person rings with a firm number.
 * Choosing email changes which channel opens the conversation, not how
 * the offer is made, and the card for that case says both.
 *
 * **The email card only appears when there is an email.** This page
 * used to tell everyone "we have emailed you a confirmation" and
 * "reply to that email with a few photos" while the seller
 * confirmation was being rejected by Resend on every submission. A
 * page that tells someone to watch an inbox nothing is coming to is
 * worse than one that says less: it is the first thing we do after
 * taking their details, and it is false. An unknown outcome is treated
 * as no email — claiming nothing is always safe.
 *
 * Every line is published elsewhere: the response time, the offer
 * standing, the photo request the confirmation email itself carries.
 * No new promise is made here.
 *
 * No CtaBand either. The seller has just submitted; a band inviting
 * them to start again is the sort of thing a funnel does.
 */
const FIRST_CARD: Record<ContactMethod, { title: string; body: string }> = {
  call: {
    title: `A call within ${PROMISES.offerWithinHours} hours`,
    body: "From a person who knows your car, with a firm number. Not a bot, not an estimate.",
  },
  whatsapp: {
    title: `A WhatsApp message within ${PROMISES.offerWithinHours} hours`,
    body: "From a person who knows your car. If it is easier to talk it through, they will call you on the same number.",
  },
  sms: {
    title: `A text within ${PROMISES.offerWithinHours} hours`,
    body: "From a person who knows your car. If it is easier to talk it through, they will call you on the same number.",
  },
  email: {
    title: `An email within ${PROMISES.offerWithinHours} hours`,
    body: "A person will also call you on the number you gave. The firm offer comes on the phone, whichever way we open.",
  },
};

const UNKNOWN_FIRST_CARD = {
  title: `Contact within ${PROMISES.offerWithinHours} hours`,
  body: "From a person who knows your car, with a firm number. Not a bot, not an estimate.",
};

const EMAIL_CARDS = [
  {
    icon: Mail,
    title: "A confirmation by email",
    body: "It repeats what you told us, so you can check we have it right before we get in touch.",
  },
  {
    icon: Camera,
    title: "Photos, if you have them",
    body: "Reply to that email with the outside from each corner and the interior. It helps us stand behind the number.",
  },
];

const NO_EMAIL_CARDS = [
  {
    icon: ShieldCheck,
    title: "The number does not change",
    body: "Describe the car honestly and the offer we make is the amount that lands in your account.",
  },
  {
    icon: Camera,
    title: "Photos help, when we speak",
    body: "The outside from each corner and the interior. Have them to hand and the offer is one we can stand behind.",
  },
];

export default async function ThankYouPage() {
  const { method, confirmation } = await readThankYouState();
  const first = method ? FIRST_CARD[method] : UNKNOWN_FIRST_CARD;
  const next = [
    { icon: PhoneCall, ...first },
    ...(confirmation === "sent" ? EMAIL_CARDS : NO_EMAIL_CARDS),
  ];

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
