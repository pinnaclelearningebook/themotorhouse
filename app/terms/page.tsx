import type { Metadata } from "next";
import { LegalArticle } from "@/components/ui/LegalArticle";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms on which we make offers, collect cars and pay sellers — including the seven-day offer validity and the no-deductions commitment.",
};

export default function TermsPage() {
  return (
    <LegalArticle
      title="Terms of service"
      updated="2026-08-29"
      labelledBy="terms-heading"
    >
      <h2>Who we are</h2>
      <p>
        These terms cover selling your car to {SITE.name}. They are written
        to be read, not skimmed past — they say what we promise and what we
        ask of you.
      </p>
      <p className="flex flex-wrap gap-2">
        <AwaitingInfo label="Registered company name" />
        <AwaitingInfo label="Company registration number" />
        <AwaitingInfo label="Registered office address" />
      </p>

      <h2>The offer</h2>
      <ul>
        <li>
          Our offer is a firm amount, not an estimate. It is the amount we
          pay on collection.
        </li>
        <li>
          The offer stands for <span className="font-mono">7</span> days
          from the date we send it, provided the mileage has not materially
          increased and the car&apos;s condition is as you described it.
        </li>
        <li>
          We do not reduce the offer at collection. If the car matches what
          you told us and we misjudged something, we absorb the difference.
        </li>
        <li>
          If the car is materially different from how it was described —
          significantly higher mileage, or damage or faults we were not told
          about — we may make a revised offer or decline to buy. You are
          free to refuse a revised offer at no cost.
        </li>
      </ul>

      <h2>What we ask of you</h2>
      <ul>
        <li>
          That the information you give us about the car is accurate and
          honest, to the best of your knowledge.
        </li>
        <li>
          That you own the car, or are authorised to sell it, and that you
          tell us about any outstanding finance.
        </li>
        <li>
          That at handover you can provide the V5C logbook in your name, the
          keys, and the service records you told us about.
        </li>
      </ul>

      <h2>Collection and payment</h2>
      <ul>
        <li>
          We collect the car free of charge anywhere in mainland UK, at a
          time agreed with you.
        </li>
        <li>
          Payment is made by bank transfer, in full, before the car leaves
          with the transporter.
        </li>
        <li>
          If the car has outstanding finance, we pay the settlement amount
          directly to your finance company and the balance to you. If the
          settlement exceeds our offer, the difference is payable by you
          before collection.
        </li>
        <li>Ownership of the car passes to us when payment is made.</li>
      </ul>

      <h2>Changing your mind</h2>
      <p>
        Nothing is binding on you until handover. You can decline the offer
        or withdraw at any point before the car is collected, without charge.
      </p>

      <h2>Liability and law</h2>
      <p>
        Nothing in these terms limits any right you have under law that
        cannot be limited. These terms are governed by the law of England
        and Wales, and any dispute is subject to the jurisdiction of the
        courts of England and Wales.
      </p>
    </LegalArticle>
  );
}
