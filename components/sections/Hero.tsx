import { Container } from "@/components/ui/Container";
import { PlateForm } from "@/components/ui/PlateForm";
import { HeroHeadline } from "@/components/sections/HeroHeadline";
import { Suv } from "@/components/illustration/Suv";
import { PROMISES } from "@/config/site";

/**
 * The hero: light, split, and drawn rather than photographed.
 *
 * The previous version was a full-bleed photograph of a black car at
 * night behind an 85% scrim, and the note on it was fair — it read as
 * murk, and it did not say "car". The honest fix is not a lighter
 * scrim on the same picture. It is to stop pretending we have
 * photography: the drawing says "large estate car" unambiguously,
 * belongs to us, carries no badge and no licence, and sits on paper
 * where the type can breathe.
 *
 * Nothing here is a client component and **nothing in the first
 * viewport animates from opacity zero**. Everything uses
 * `rise-in-solid`, which moves without fading.
 *
 * That is CLAUDE.md section 6 and it has now caught this project
 * twice. The sub-paragraph was on `rise-in`, which does fade, and
 * Lighthouse named `p.rise-in` as the largest-contentful element with
 * an element render delay of 999ms — the 220ms delay plus the 700ms
 * fade, almost exactly. The rule is not about the headline. It is
 * about whichever element turns out to be the largest, and on a light
 * hero that can be a paragraph.
 *
 * The illustration is inline SVG, so there is no image request on the
 * critical path at all.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="border-b border-line bg-paper pt-28 pb-16 md:pt-36 md:pb-24"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16">
          <div>
            <p className="text-caption font-semibold tracking-[0.16em] text-oxblood uppercase">
              UK car buying service
            </p>
            <HeroHeadline
              id="hero-heading"
              lines={[
                "Sell your car for a",
                "firm offer that",
                "doesn't change.",
              ]}
              className="mt-5 font-display text-[2rem] leading-[1.06] tracking-[-0.02em] sm:text-[2.75rem] lg:text-display-2"
            />
            <p
              className="rise-in-solid mt-6 max-w-xl text-lg leading-relaxed text-ink/80"
              style={{ animationDelay: "220ms" }}
            >
              Tell us the registration. A firm number within{" "}
              {PROMISES.offerWithinHours} hours, free collection anywhere in
              mainland UK, and payment before the transporter leaves.
            </p>
            <div className="rise-in-solid mt-9" style={{ animationDelay: "340ms" }}>
              <PlateForm id="hero-reg" />
            </div>
          </div>

          <div
            className="rise-in hidden lg:block"
            style={{ animationDelay: "420ms" }}
          >
            <Suv className="h-auto w-full text-ink/85" />
          </div>
        </div>
      </Container>
    </section>
  );
}
