import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { FormPreview } from "./FormPreview";
import { agentSettings } from "@/lib/agent/settings";

/**
 * Development-only harness for reviewing form steps as they are built,
 * without switching the live flow over to a half-finished form.
 * 404s in production and is excluded from the sitemap and robots.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function FormPreviewPage() {
  const { enabled } = await agentSettings();
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main>
      <Section ground="paper" labelledBy="preview-heading">
        <div className="mx-auto max-w-2xl">
          <p className="mb-8 rounded border border-dashed border-structure px-4 py-2 font-mono text-caption text-structure">
            Development preview — not part of the live form
          </p>
          <h1 id="preview-heading" className="sr-only">
            Form step preview
          </h1>
          <FormPreview agentEnabled={enabled} />
        </div>
      </Section>
    </main>
  );
}
