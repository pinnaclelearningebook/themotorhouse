import { Container } from "@/components/ui/Container";
import { PlateForm } from "@/components/ui/PlateForm";
import { Photo } from "@/components/ui/Photo";
import { HeroHeadline } from "@/components/sections/HeroHeadline";
import { PHOTOGRAPHY } from "@/config/photography";
import { PROMISES } from "@/config/site";

/**
 * The home hero.
 *
 * The photograph is the LCP element: fetched eagerly, never animated,
 * and nothing in the first viewport fades in. Section 6 has caught
 * this project twice — once on the headline and once on the paragraph
 * underneath it — so everything here uses `rise-in-solid`, which moves
 * without fading.
 *
 * The scrim runs left to right rather than bottom to top. The image is
 * a bright overcast sky over a dark car, the type sits on the left,
 * and a vertical gradient would have put white text over the brightest
 * part of the frame.
 *
 * The image is generated and illustrative. The alt text describes the
 * scene and claims nothing about whose car it is.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="on-ink relative isolate flex min-h-[78svh] items-center overflow-hidden bg-ink pt-32 pb-16 text-paper md:min-h-[82svh] md:pb-24"
    >
      <Photo
        slot={PHOTOGRAPHY.homeHero}
        priority
        quality={62}
        sizes="100vw"
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/85 to-ink/40"
      />
      <Container className="relative z-10">
        <div className="max-w-2xl">
          <p className="text-caption font-semibold tracking-[0.16em] text-paper/75 uppercase">
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
            className="rise-in-solid mt-6 max-w-xl text-lg leading-relaxed text-paper/85"
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
      </Container>
    </section>
  );
}
