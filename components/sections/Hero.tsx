import { Container } from "@/components/ui/Container";
import { PlateForm } from "@/components/ui/PlateForm";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { PROMISES } from "@/config/site";

/**
 * Type-led hero on ink — deliberately no photograph until real
 * photography of a car we bought exists. The restrained CSS entrance
 * here is replaced by the orchestrated Motion sequence in Milestone 5.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="on-ink bg-ink pt-24 pb-20 text-paper md:pt-36 md:pb-28">
      <Container>
        <div className="max-w-4xl">
          <h1
            id="hero-heading"
            className="rise-in font-display text-display-2 md:text-display-1"
          >
            Sell your car for a firm offer that doesn&apos;t change.
          </h1>
          <p
            className="rise-in mt-6 max-w-2xl text-lg text-paper/80"
            style={{ animationDelay: "120ms" }}
          >
            Tell us the registration. A firm number within{" "}
            {PROMISES.offerWithinHours} hours, free collection anywhere in
            mainland UK, and payment before the transporter leaves.
          </p>
          <div className="rise-in mt-10" style={{ animationDelay: "240ms" }}>
            <PlateForm id="hero-reg" />
          </div>
          <div className="mt-8">
            <AwaitingInfo label="Hero photography" />
          </div>
        </div>
      </Container>
    </section>
  );
}
