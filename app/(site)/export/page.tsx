import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { PlateForm } from "@/components/ui/PlateForm";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { MODELS } from "@/config/models";
import { EXPORT_MARKET } from "@/config/site";

export const metadata: Metadata = {
  title: "Why we pay more for some cars",
  description:
    "We supply buyers in Cyprus, where traffic drives on the left and UK right-hand-drive cars are the local standard. That is why our offers on young premium SUVs are stronger.",
  alternates: { canonical: "/export" },
};

export default function ExportPage() {
  return (
    <main>
      <BreadcrumbJsonLd
        trail={[{ name: "Why we pay more", path: "/export" }]}
      />

      <Section ground="ink" labelledBy="export-heading">
        <div className="max-w-3xl">
          <h1
            id="export-heading"
            className="font-display text-display-3 md:text-display-2"
          >
            Why we can pay more for some cars than a UK buyer can
          </h1>
          <p className="mt-6 text-lg text-paper/80">
            Any buyer who tells you they pay more than everyone else should
            be able to explain why. Here is our reason, in full, so you can
            judge whether it holds up.
          </p>
        </div>
      </Section>

      <Section ground="paper" labelledBy="cyprus-heading">
        <div className="max-w-3xl">
          <h2 id="cyprus-heading" className="font-display text-display-3">
            We supply buyers in {EXPORT_MARKET}
          </h2>
          <p className="mt-6 max-w-prose">
            Cyprus drives on the left. Right-hand-drive cars are not a
            curiosity there, they are the standard, and because the island
            has a small domestic market almost everything is imported. The
            UK is one of the main sources, for the obvious reason that our
            cars are already the right way round and there are plenty of
            them.
          </p>
          <p className="mt-4 max-w-prose">
            So a well-kept, high-specification, right-hand-drive premium SUV
            is not a difficult car to sell in Cyprus. It is exactly what the
            market is looking for. That demand is real and it is steady, and
            it is what sits behind our offers.
          </p>
          <p className="mt-4 max-w-prose">
            Cyprus is the market we currently supply. We would rather name
            one market we actually sell into than list a continent we do
            not.
          </p>
          <p className="mt-6 text-caption text-structure">
            Background on the Cyprus market and its reliance on UK
            right-hand-drive imports:{" "}
            <a
              href="https://driveclick.cy/blog/right-hand-drive-cars-in-cyprus"
              rel="noopener noreferrer"
              target="_blank"
              className="link-draw text-oxblood"
            >
              DriveClick Cyprus
            </a>
            .
          </p>
        </div>
      </Section>

      <Section ground="paper-warm" labelledBy="why-more-heading">
        <div className="max-w-3xl">
          <h2 id="why-more-heading" className="font-display text-display-3">
            Why that turns into a bigger number for you
          </h2>
          <p className="mt-6 max-w-prose">
            A UK trade buyer prices your car against what a UK retail buyer
            will pay for it, minus what they need to make. That is a
            perfectly reasonable way to run a business, and it is why most
            offers land in a similar place.
          </p>
          <p className="mt-4 max-w-prose">
            We are not pricing against the same buyer. When a car is going
            to Cyprus, the relevant question is what it is worth there, not
            here. On the models that market wants, that is a higher number,
            and the difference is what lets us pay above what a general
            buyer can justify.
          </p>
          <p className="mt-4 max-w-prose">
            It is also why we are specific about which cars we chase. We buy
            anything, but we do not pretend every car benefits from this.
            Most do not.
          </p>
        </div>
      </Section>

      <Section ground="ink" labelledBy="five-years-heading">
        <div className="max-w-3xl">
          <h2 id="five-years-heading" className="font-display text-display-3">
            Why it only applies to cars under five years old
          </h2>
          <p className="mt-6 max-w-prose text-paper/80">
            The economics only work on younger cars. Once a car is past
            about five years, the cost of moving it stops being justified by
            what it fetches at the other end, and the export route closes.
          </p>
          <p className="mt-4 max-w-prose text-paper/80">
            That is worth saying plainly, because it sets your expectations
            correctly. If your car is older, we will still buy it and we
            will still collect it free and pay before it leaves. The offer
            will simply be priced against the UK trade, like anyone
            else&apos;s — we will not dress it up as something it is not.
          </p>
        </div>
      </Section>

      <Section ground="paper" labelledBy="models-heading">
        <div className="max-w-3xl">
          <h2 id="models-heading" className="font-display text-display-3">
            Where this makes the biggest difference
          </h2>
          <p className="mt-4 max-w-prose">
            To be clear about what this page is: we buy any car, of any age
            and in any condition, and most of what we buy has nothing to do
            with export. This page explains why the offer on{" "}
            <em>some</em> cars is stronger. It is not a list of what we
            accept.
          </p>
          <p className="mt-4 max-w-prose text-structure">
            These are the models the exporters we work with ask for. Younger
            examples in good specification are where our offers are
            strongest.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODELS.map((model) => (
            <li key={model.slug}>
              <Link
                href={`/${model.slug}`}
                className="block h-full rounded border border-line p-6 transition-colors duration-200 hover:border-oxblood"
              >
                <span className="font-display text-2xl">{model.name}</span>
                <span className="mt-3 block text-sm font-medium text-oxblood">
                  Get my offer
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section ground="ink" labelledBy="export-cta-heading">
        <div className="max-w-3xl">
          <h2 id="export-cta-heading" className="font-display text-display-3">
            Find out where your car lands.
          </h2>
          <p className="mt-4 text-paper/80">
            We will tell you honestly whether yours is an export car or a UK
            trade car, and price it accordingly.
          </p>
          <div className="mt-8">
            <PlateForm id="export-reg" />
          </div>
        </div>
      </Section>
    </main>
  );
}
