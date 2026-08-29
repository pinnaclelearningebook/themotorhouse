import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { PROMISES } from "@/config/site";

export const metadata: Metadata = {
  title: "Offer request received",
  description: "Your offer request is in. A person will call you shortly.",
  robots: { index: false },
};

export default function ThankYouPage() {
  return (
    <main>
      <Section ground="paper" labelledBy="thanks-heading">
        <div className="mx-auto max-w-2xl">
          <h1 id="thanks-heading" className="font-display text-display-2">
            Offer request received
          </h1>
          <p className="mt-6 text-lg">
            You&apos;ll hear from a person within {PROMISES.offerWithinHours}{" "}
            hours. Not a bot, not an estimate — a firm offer from someone who
            knows your car.
          </p>
          <p className="mt-4 max-w-prose">
            We&apos;ve emailed you a confirmation. If you can, reply to it
            with a few photos of the car — the outside from each corner and
            the interior. It helps us stand behind the number we give you.
          </p>
          <p className="mt-10">
            <Link href="/" className="link-draw font-medium text-oxblood">
              Back to the home page
            </Link>
          </p>
        </div>
      </Section>
    </main>
  );
}
