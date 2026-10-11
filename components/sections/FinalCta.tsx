import { Container } from "@/components/ui/Container";
import { PlateForm } from "@/components/ui/PlateForm";
import { Reveal } from "@/components/motion/Reveal";
import { MaskReveal } from "@/components/motion/MaskReveal";
import { Transporter } from "@/components/illustration/Transporter";
import { PROMISES } from "@/config/site";

/**
 * The last word, and the registration input back in front of someone
 * who has read the lot.
 *
 * Two columns rather than one, because a single left-aligned block on
 * a full-width ink band leaves half the screen empty and the band
 * reads as a gap rather than a close.
 */
export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="on-ink bg-ink py-16 text-paper md:py-24"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-16">
          <div>
            <MaskReveal
              as="h2"
              id="cta-heading"
              lines={["Ready when you are."]}
              className="font-display text-display-3 md:text-display-2"
            />
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper/85">
                One registration, {PROMISES.offerWithinHours} hours, one firm
                number. No obligation to accept it.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="mt-9">
              <PlateForm id="cta-reg" />
            </Reveal>
          </div>
          <Reveal delay={0.25} className="hidden lg:block">
            <Transporter className="h-auto w-full text-paper/60" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
