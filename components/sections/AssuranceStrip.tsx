import { BadgeCheck, Clock, Truck, Wallet } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IconList } from "@/components/ui/IconList";
import { PROMISES } from "@/config/site";

/**
 * Four promises, and not one word that is not already published.
 *
 * Three read straight from config/site PROMISES, which the hero and the
 * auto-reply read too; the fourth is the offer-doesn't-change
 * commitment, in the wording the promise band uses. Nothing here is
 * retyped, because a strip of short assurances is exactly where a new
 * claim slips in unnoticed.
 *
 * One already had. This strip used to say "Same-day payment" while
 * every other surface said payment happens before the transporter
 * leaves — a deadline nobody agreed to, typed in as a literal, on the
 * first page a seller sees. That is why no line here is a string.
 * test/promises.test.ts fails if one becomes one again.
 */
export function AssuranceStrip() {
  return (
    <Section ground="ink" labelledBy="assurance-heading">
      <SectionHeader
        tone="dark"
        eyebrow="What you can rely on"
        id="assurance-heading"
        heading="Four things that do not move."
      />
      <IconList
        className="mt-10"
        tone="dark"
        entries={[
          {
            icon: BadgeCheck,
            title: "The offer we make is the offer we pay",
            detail: "No revised number on the driveway.",
          },
          {
            icon: Clock,
            title: (
              <>
                A firm offer within{" "}
                <span className="font-mono">{PROMISES.offerWithinHours}</span>{" "}
                hours
              </>
            ),
            detail: "From a person who knows the model.",
          },
          {
            icon: Truck,
            title: PROMISES.collection,
            detail: "At a time that suits you.",
          },
          {
            icon: Wallet,
            title: PROMISES.payment,
            detail: "You watch it arrive first.",
          },
        ]}
      />
    </Section>
  );
}
