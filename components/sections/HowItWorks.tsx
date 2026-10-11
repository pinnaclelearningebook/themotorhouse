import { ClipboardList, PhoneCall, Truck, Banknote } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StepTimeline } from "@/components/sections/StepTimeline";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Tell us about the car",
    body: "Registration, mileage, and how to reach you. It takes about a minute.",
  },
  {
    icon: PhoneCall,
    title: "A firm offer within two hours",
    body: "A person who knows your model calls with a number that doesn't move.",
  },
  {
    icon: Truck,
    title: "We collect, free",
    body: "Anywhere in mainland UK, at a time that suits you. No dropping the car at a retail park.",
  },
  {
    icon: Banknote,
    title: "Paid before the car leaves",
    body: "The money is in your account before the transporter pulls away.",
  },
];

export function HowItWorks() {
  return (
    <Section ground="paper" labelledBy="how-heading">
      <SectionHeader
        eyebrow="Start to finish"
        id="how-heading"
        heading="How it works"
        intro="Four steps, about a minute of typing, and a person on the phone."
      />
      <StepTimeline steps={STEPS} ground="paper" />
    </Section>
  );
}
