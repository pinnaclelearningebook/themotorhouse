import { Section } from "@/components/ui/Section";
import { PlateForm } from "@/components/ui/PlateForm";
import { Reveal } from "@/components/motion/Reveal";
import { MaskReveal } from "@/components/motion/MaskReveal";
import { PROMISES } from "@/config/site";

export function FinalCta() {
  return (
    <Section ground="ink" labelledBy="cta-heading">
      <div className="max-w-3xl">
        <MaskReveal
          onView
          as="h2"
          id="cta-heading"
          lines={["Ready when you are."]}
          className="font-display text-display-3 md:text-display-2"
        />
        <Reveal delay={0.1}>
          <p className="mt-5 text-lg text-paper/80">
            One registration, {PROMISES.offerWithinHours} hours, one firm
            number. No obligation to accept it.
          </p>
        </Reveal>
        <Reveal delay={0.2} className="mt-10">
          <PlateForm id="cta-reg" />
        </Reveal>
      </div>
    </Section>
  );
}
