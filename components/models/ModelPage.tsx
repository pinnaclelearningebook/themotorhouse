import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CtaBand } from "@/components/sections/CtaBand";
import { Accordion } from "@/components/ui/Accordion";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PlateForm } from "@/components/ui/PlateForm";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Paragraphs, renderCopy } from "@/components/models/Prose";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { getModel, type ModelEntry } from "@/config/models";
import { TextLink } from "@/components/ui/TextLink";

/**
 * The single model page template. All copy comes from the entry in
 * config/models.ts — this file decides layout only, so no two model
 * pages can drift apart structurally while their content stays distinct.
 *
 * **No photograph, deliberately.** Every image on the site is
 * generated and illustrative, and one placed under the word "Velar"
 * stops being illustrative: it becomes a claim about which car that
 * is. The page opens on type and the registration plate instead, which
 * is the loud object anyway.
 */
export function ModelPage({ model }: { model: ModelEntry }) {
  const siblings = model.siblings.map(getModel);

  return (
    <main>
      <FaqJsonLd entries={model.faqs} />
      <BreadcrumbJsonLd
        trail={[{ name: model.h1, path: `/${model.slug}` }]}
      />

      <section
        aria-labelledby="model-heading"
        className="on-ink bg-ink pt-32 pb-16 text-paper md:pt-40 md:pb-24"
      >
        <Container>
          <div className="max-w-3xl">
            <p className="text-caption font-semibold tracking-[0.16em] text-paper/70 uppercase">
              {model.name}
            </p>
            <h1
              id="model-heading"
              className="rise-in-solid mt-4 font-display text-display-3 md:text-display-1"
            >
              {model.h1}
            </h1>
            <div className="rise-in-solid mt-7 flex flex-col gap-4 text-lg leading-relaxed text-paper/85">
              <Paragraphs copy={model.opener} />
            </div>
            <div className="mt-10">
              <PlateForm id="model-hero-reg" />
            </div>
          </div>
        </Container>
      </section>

      {/* The specialist detail — lever 8. Every model has exactly one. */}
      <Section ground="paper" labelledBy="specialist-heading">
        <SectionHeader
          id="specialist-heading"
          eyebrow="What we know about this car"
          heading={model.specialist.heading}
        />
        <div className="mt-8 max-w-3xl">
          <div className="flex flex-col gap-4 leading-relaxed text-ink/85">
            <Paragraphs copy={model.specialist.body} />
          </div>
          <div className="mt-8 border-t border-line pt-4">
            <p className="text-caption text-structure">
              Sources for the figures above:{" "}
              {model.specialist.sources.map((source, index) => (
                <span key={source.url}>
                  {index > 0 && " · "}
                  <a
                    href={source.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="link-draw text-oxblood"
                  >
                    {source.label}
                  </a>
                </span>
              ))}
            </p>
          </div>
        </div>
      </Section>

      <Section ground="ink" labelledBy="export-heading">
        <SectionHeader
          id="export-heading"
          eyebrow="Why our number can be stronger"
          heading="Where the number gets stronger"
          tone="dark"
        />
        <div className="mt-8 max-w-3xl">
          <div className="flex flex-col gap-4 leading-relaxed text-paper/85">
            <Paragraphs copy={model.exportNote} />
          </div>
          <p className="mt-8">
            <TextLink href="/export" tone="dark">
              Why export demand changes what we can pay
            </TextLink>
          </p>
        </div>
      </Section>

      <Section ground="paper" labelledBy="lookfor-heading">
        <SectionHeader
          id="lookfor-heading"
          eyebrow="On the call"
          heading="What we ask about"
          intro="None of this is a test. It is what lets us give you a number that does not need revisiting."
        />
        <ul className="mt-10 grid gap-x-10 gap-y-1 md:grid-cols-2">
          {model.lookFor.map((item) => (
            <li
              key={item}
              className="flex items-start gap-4 border-t border-line py-5"
            >
              <Check
                aria-hidden="true"
                size={18}
                strokeWidth={1.75}
                className="mt-1 shrink-0 text-oxblood"
              />
              <span className="leading-relaxed text-ink/85">
                {renderCopy(item)}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section ground="paper-warm" labelledBy="model-faq-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-16">
          <SectionHeader
            id="model-faq-heading"
            eyebrow="Questions"
            heading={`${model.name} questions`}
            className="lg:sticky lg:top-28 lg:self-start"
          />
          <Accordion
            items={model.faqs.map((faq) => ({
              question: faq.question,
              answer: renderCopy(faq.answer),
            }))}
          />
        </div>
      </Section>

      <Section ground="paper" labelledBy="siblings-heading">
        <SectionHeader
          id="siblings-heading"
          eyebrow="Also on the list"
          heading="We also buy"
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {siblings.map((sibling) => (
            <Card as="li" key={sibling.slug} tone="paper" hover className="p-0">
              <Link
                href={`/${sibling.slug}`}
                className="flex h-full flex-col justify-between gap-6 p-6"
              >
                <span className="font-display text-2xl">{sibling.name}</span>
                <span className="flex items-center gap-2 text-sm font-medium text-oxblood">
                  Get my offer
                  <ArrowRight aria-hidden="true" size={16} />
                </span>
              </Link>
            </Card>
          ))}
        </ul>
      </Section>

      <CtaBand
        id="model-cta-heading"
        heading="One registration is all we need to start."
      />

    </main>
  );
}
