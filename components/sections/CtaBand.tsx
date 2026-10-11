import { Container } from "@/components/ui/Container";
import { PlateForm } from "@/components/ui/PlateForm";
import { Photo } from "@/components/ui/Photo";
import { PHOTOGRAPHY } from "@/config/photography";
import { PROMISES } from "@/config/site";

/**
 * The band that closes every page.
 *
 * One component rather than one per page, so the last thing a reader
 * sees is the same on all of them and the registration input is never
 * more than a scroll away. The photograph sits behind a scrim heavy
 * enough that the heading and the plate both stay legible.
 */
export function CtaBand({
  heading = "Ready when you are.",
  intro,
  id = "cta-heading",
}: {
  heading?: string;
  /** Replaces the standard line, for a page that closes on its own. */
  intro?: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className="on-ink relative isolate overflow-hidden bg-ink py-16 text-paper md:py-24"
    >
      <Photo
        slot={PHOTOGRAPHY.ctaDusk}
        sizes="100vw"
        quality={60}
        className="absolute inset-0 z-0 h-full w-full object-cover opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/88 to-ink/55"
      />
      <Container className="relative z-10">
        <div className="max-w-2xl">
          <h2 id={id} className="font-display text-display-3 md:text-display-2">
            {heading}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-paper/85">
            {intro ?? (
              <>
                One registration, {PROMISES.offerWithinHours} hours, one firm
                number. No obligation to accept it.
              </>
            )}
          </p>
          <div className="mt-9">
            <PlateForm id={`${id}-reg`} />
          </div>
        </div>
      </Container>
    </section>
  );
}
