import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/ui/LegalArticle";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What we collect when you ask for an offer, why we collect it, how long we keep it, and the rights you have over it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalArticle
      title="Privacy policy"
      updated="2026-08-29"
      labelledBy="privacy-heading"
    >
      <h2>Who we are</h2>
      <p>
        {SITE.name} buys cars from private sellers across the UK. For the
        purposes of UK data protection law, we are the controller of the
        personal information described in this policy.
      </p>
      <p className="flex flex-wrap gap-2">
        <AwaitingInfo label="Registered company name" />
        <AwaitingInfo label="Company registration number" />
        <AwaitingInfo label="Registered office address" />
        <AwaitingInfo label="ICO registration number" />
        <AwaitingInfo label="Contact email for privacy requests" />
      </p>

      <h2>What we collect</h2>
      <p>When you ask us for an offer, we collect:</p>
      <ul>
        <li>
          Contact details — your name, phone number, email address and
          postcode.
        </li>
        <li>
          Vehicle details — registration, mileage, service history, previous
          keepers, condition notes and anything else you tell us about the
          car.
        </li>
        <li>
          Whether you consented to marketing, and the record of when your
          enquiry was made.
        </li>
      </ul>
      <p>
        Our hosting provider also keeps short-lived technical logs (such as
        IP addresses) for security and reliability, as almost every website
        does. We do not run advertising trackers.
      </p>

      <h2>Why we collect it</h2>
      <ul>
        <li>
          To prepare your offer and contact you about it. Legal basis: taking
          steps at your request before entering a contract.
        </li>
        <li>
          To follow up on your enquiry at a time you told us suited you.
          Legal basis: our legitimate interest in responding to people who
          asked us for an offer.
        </li>
        <li>
          To send occasional market updates, only if you ticked the separate
          consent box. Legal basis: consent, which you can withdraw at any
          time by replying to any email or contacting us.
        </li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        We use a small number of service providers to run the service, each
        acting under our instructions: Supabase (enquiry storage), Resend
        (transactional email), Vercel (website hosting and photo storage),
        and — only if you choose to use the assistant described below —
        Anthropic (the assistant&apos;s replies) and ElevenLabs (speech, if
        you choose to talk rather than type). If your car has outstanding
        finance, we share what is needed with your finance company to settle
        it. We do not sell your information, and we do not pass your details
        to other car buyers or dealers.
      </p>

      <h2>The assistant</h2>
      <p>
        You can choose to use an assistant while you fill in the form. It is
        software, not a person, and it says so before it says anything else.
        Using it is optional, it is silent until you ask for it, and the form
        works exactly the same without it.
      </p>
      <p>
        What you type to it is sent to Anthropic to produce a reply, and a
        written record of the conversation is kept on your enquiry so the
        person who calls you has the context. The assistant never quotes a
        price, and what it writes is checked by our own software before you
        see it.
      </p>
      <p>
        If you choose to talk rather than type, your microphone audio is sent
        to ElevenLabs to turn speech into text and text into speech. We ask
        before the microphone opens and nothing is recorded before you agree.
        We keep the written transcript on your enquiry. We do not keep the
        audio.{" "}
        <AwaitingInfo label="Voice consent wording — solicitor review" />
      </p>

      <h2>How long we keep it</h2>
      <p>
        <AwaitingInfo label="Data retention period policy" />
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us for a copy of the information we hold about you, ask
        us to correct it, delete it, restrict how we use it, or object to
        our use of it. Contact us and we will respond within one month. If
        you are unhappy with how we handle your information, you can
        complain to the Information Commissioner&apos;s Office at{" "}
        <a href="https://ico.org.uk" rel="noopener noreferrer">
          ico.org.uk
        </a>
        .
      </p>

      <h2>Cookies</h2>
      <p>
        See our <Link href="/cookies">cookie policy</Link> for what the site
        stores in your browser and the choice you have over it.
      </p>
    </LegalArticle>
  );
}
