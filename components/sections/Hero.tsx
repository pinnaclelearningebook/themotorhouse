import { Container } from "@/components/ui/Container";
import { PlateForm } from "@/components/ui/PlateForm";
import { Photo } from "@/components/ui/Photo";
import { HeroHeadline } from "@/components/sections/HeroHeadline";
import { PHOTOGRAPHY } from "@/config/photography";
import { PROMISES } from "@/config/site";

/**
 * Full-bleed hero.
 *
 * The photograph is the LCP element, so it is fetched eagerly and never
 * animated — CLAUDE.md section 6 forbids animating the LCP element from
 * opacity 0, and it was a real regression in M1. The mask reveal belongs
 * to the headline over it, which is not the LCP element and can afford
 * to arrive.
 *
 * Nothing in here is a client component. The hero is the first thing
 * painted and the animation library is not on its critical path: the
 * reveal is CSS, so the type is moving before the bundle has arrived.
 *
 * It is behind a heavy ink scrim on purpose. The image is texture and
 * depth, not a subject: it is a licensed photograph of somebody else's
 * car, so it must never read as "here is a car we bought". Legibility of
 * the headline comes first and the picture earns whatever is left.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="on-ink relative isolate flex min-h-[88svh] items-end overflow-hidden bg-ink pt-32 pb-16 text-paper md:min-h-[92svh] md:pb-24"
    >
      <Photo
        slot={PHOTOGRAPHY.homeHero}
        priority
        // Behind an 85% scrim, so detail is thrown away before anyone
        // sees it. A phone is served roughly half the pixels it would
        // ask for at face value, because at this opacity nobody can
        // tell and it is the largest-contentful element on the site.
        quality={40}
        sizes="(max-width: 768px) 480px, 100vw"
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-gradient-to-t from-ink via-ink/85 to-ink/45"
      />

      <Container className="relative z-10">
        <div className="max-w-4xl">
          <HeroHeadline
            id="hero-heading"
            lines={["Sell your car for a firm", "offer that doesn't change."]}
            className="font-display text-[2rem] leading-[1.08] tracking-[-0.02em] sm:text-display-2 md:text-display-1"
          />
          <p
            className="rise-in mt-6 max-w-2xl text-lg text-paper/80"
            style={{ animationDelay: "220ms" }}
          >
            Tell us the registration. A firm number within{" "}
            {PROMISES.offerWithinHours} hours, free collection anywhere in
            mainland UK, and payment before the transporter leaves.
          </p>
          <div className="rise-in mt-10" style={{ animationDelay: "340ms" }}>
            <PlateForm id="hero-reg" />
          </div>
        </div>
      </Container>
    </section>
  );
}
