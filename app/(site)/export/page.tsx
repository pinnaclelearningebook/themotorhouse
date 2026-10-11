import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBand } from "@/components/sections/CtaBand";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MODELS } from "@/config/models";
import { PHOTOGRAPHY } from "@/config/photography";
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

      <PageHero
        eyebrow="Why we pay more"
        heading="Why we can pay more for some cars than a UK buyer can"
        intro="Any buyer who tells you they pay more than everyone else should be able to explain why. Here is our reason, in full, so you can judge whether it holds up."
        image={PHOTOGRAPHY.exportCoast}
        id="export-heading"
      />

      <Section ground="paper" labelledBy="cyprus-heading">
        <SectionHeader
          id="cyprus-heading"
          eyebrow="The market"
          heading={`We supply buyers in ${EXPORT_MARKET}`}
        />
        <div className="mt-8 max-w-3xl">
          <p className="max-w-prose">
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
        <SectionHeader
          id="why-more-heading"
          eyebrow="What it means for you"
          heading="Why that turns into a bigger number for you"
        />
        <div className="mt-8 max-w-3xl">
          <p className="max-w-prose">
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
        <SectionHeader
          id="five-years-heading"
          eyebrow="The limit"
          heading="Why it only applies to cars under five years old"
          tone="dark"
        />
        <div className="mt-8 max-w-3xl">
          <p className="max-w-prose text-paper/80">
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
        <SectionHeader
          id="models-heading"
          eyebrow="The models"
          heading="Where this makes the biggest difference"
        />
        <div className="mt-8 max-w-3xl">
          <p className="max-w-prose">
            To be clear about what this page is: we buy cars of any age
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
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODELS.map((model) => (
            <Card as="li" key={model.slug} tone="paper" hover className="p-0">
              <Link
                href={`/${model.slug}`}
                className="flex h-full flex-col justify-between gap-6 p-6"
              >
                <span className="font-display text-2xl">{model.name}</span>
                <span className="flex items-center gap-2 text-sm font-medium text-oxblood">
                  Get my offer
                  <ArrowRight aria-hidden="true" size={16} />
                </span>
              </Link>
            </Card>
          ))}
        </ul>
      </Section>

      {/*
        * No `intro` here. This band used to end "We will tell you
        * honestly whether yours is an export car or a UK trade car",
        * which is the one thing CLAUDE.md section 11 says a seller is
        * never told: the channel is how the business works, not
        * something the seller is asked to care about. The standard
        * line says what they actually get.
        */}
      <CtaBand id="export-cta-heading" heading="Find out what yours is worth." />

    </main>
  );
}
