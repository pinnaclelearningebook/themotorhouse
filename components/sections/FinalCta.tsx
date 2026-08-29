import { Section } from "@/components/ui/Section";
import { PlateForm } from "@/components/ui/PlateForm";
import { PROMISES } from "@/config/site";

export function FinalCta() {
  return (
    <Section ground="ink" labelledBy="cta-heading">
      <div className="max-w-3xl">
        <h2 id="cta-heading" className="font-display text-display-3 md:text-display-2">
          Ready when you are.
        </h2>
        <p className="mt-4 text-paper/80">
          One registration, {PROMISES.offerWithinHours} hours, one firm
          number. No obligation to accept it.
        </p>
        <div className="mt-8">
          <PlateForm id="cta-reg" />
        </div>
      </div>
    </Section>
  );
}
