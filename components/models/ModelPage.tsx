import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { PlateForm } from "@/components/ui/PlateForm";
import { Paragraphs, renderCopy } from "@/components/models/Prose";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { getModel, type ModelEntry } from "@/config/models";
import { EXPORT_MARKET } from "@/config/site";

/**
 * The single model page template. All copy comes from the entry in
 * config/models.ts — this file decides layout only, so no two model
 * pages can drift apart structurally while their content stays distinct.
 */
export function ModelPage({ model }: { model: ModelEntry }) {
  const siblings = model.siblings.map(getModel);

  return (
    <main>
      <FaqJsonLd entries={model.faqs} />
      <BreadcrumbJsonLd
        trail={[{ name: model.h1, path: `/${model.slug}` }]}
      />

      <Section ground="ink" labelledBy="model-heading">
        <div className="max-w-3xl">
          <h1 id="model-heading" className="font-display text-display-3 md:text-display-2">
            {model.h1}
          </h1>
          <div className="mt-6 flex flex-col gap-4 text-paper/80">
            <Paragraphs copy={model.opener} />
          </div>
          <div className="mt-10">
            <PlateForm id="model-hero-reg" />
          </div>
        </div>
      </Section>

      {/* The specialist detail — lever 8. Every model has exactly one. */}
      <Section ground="paper" labelledBy="specialist-heading">
        <div className="max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-structure uppercase">
            What we know about this car
          </p>
          <h2
            id="specialist-heading"
            className="mt-4 font-display text-display-3"
          >
            {model.specialist.heading}
          </h2>
          <div className="mt-6 flex flex-col gap-4">
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
        <div className="max-w-3xl">
          <h2 id="export-heading" className="font-display text-display-3">
            Under five years old? That is where our number gets stronger
          </h2>
          <div className="mt-6 flex flex-col gap-4 text-paper/80">
            <Paragraphs copy={model.exportNote} />
          </div>
          <p className="mt-6">
            <Link href="/export" className="link-draw font-medium text-paper">
              Why {EXPORT_MARKET} changes what we can pay
            </Link>
          </p>
        </div>
      </Section>

      <Section ground="paper" labelledBy="lookfor-heading">
        <div className="max-w-3xl">
          <h2 id="lookfor-heading" className="font-display text-display-3">
            What we ask about
          </h2>
          <p className="mt-4 max-w-prose text-structure">
            None of this is a test. It is what lets us give you a number
            that does not need revisiting.
          </p>
          <ul className="mt-8">
            {model.lookFor.map((item) => (
              <li key={item} className="border-t border-line py-4">
                {renderCopy(item)}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section ground="paper-warm" labelledBy="model-faq-heading">
        <div className="max-w-3xl">
          <h2 id="model-faq-heading" className="font-display text-display-3">
            {model.name} questions
          </h2>
          <dl className="mt-10">
            {model.faqs.map((faq) => (
              <div key={faq.question} className="border-t border-line py-6 first:border-t-0">
                <dt className="font-display text-2xl">{faq.question}</dt>
                <dd className="mt-2 max-w-prose">{renderCopy(faq.answer)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section ground="paper" labelledBy="siblings-heading">
        <h2 id="siblings-heading" className="font-display text-display-3">
          We also buy
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {siblings.map((sibling) => (
            <li key={sibling.slug}>
              <Link
                href={`/${sibling.slug}`}
                className="block h-full rounded border border-line p-6 transition-colors duration-200 hover:border-oxblood"
              >
                <span className="font-display text-2xl">{sibling.name}</span>
                <span className="mt-3 block text-sm font-medium text-oxblood">
                  Get my offer
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section ground="ink" labelledBy="model-cta-heading">
        <div className="max-w-3xl">
          <h2 id="model-cta-heading" className="font-display text-display-3">
            One registration is all we need to start.
          </h2>
          <div className="mt-8">
            <PlateForm id="model-cta-reg" />
          </div>
        </div>
      </Section>
    </main>
  );
}
