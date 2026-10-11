import { Hero } from "@/components/sections/Hero";
import { AssuranceStrip } from "@/components/sections/AssuranceStrip";
import { OfferPromise } from "@/components/sections/Promise";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhatWeBuy } from "@/components/sections/WhatWeBuy";
import { WhyOffersDiffer } from "@/components/sections/WhyOffersDiffer";
import { Comparison } from "@/components/sections/Comparison";
import { RecentlyPurchased } from "@/components/sections/RecentlyPurchased";
import { FaqTeaser } from "@/components/sections/FaqTeaser";
import { FromTheBlog } from "@/components/sections/FromTheBlog";
import { CtaBand } from "@/components/sections/CtaBand";
import { AutoDealerJsonLd } from "@/components/seo/AutoDealerJsonLd";

/**
 * The order is the argument, and the grounds carry it.
 *
 * paper · ink · oxblood · paper · paper-warm · ink · paper · paper-warm ·
 * paper · ink. No two touching sections share a ground, and oxblood is
 * spent once, on the promise, because a colour used twice stops being
 * a signal.
 *
 * The order is the argument.
 *
 * Certainty first and twice — the hero states it, the strip evidences it,
 * the promise section says it in the largest type on the page. Only then
 * the process, then what we buy, then the reason our number can be
 * higher, then the honest comparison. The two teasers are there to be
 * useful rather than to harvest a click, and the band at the end puts
 * the registration input back in front of someone who has read the lot.
 *
 * "Why sellers choose us" is not a section. It is the strip and the
 * promise, which say the same four things the brand is built on; a
 * separate section would have said them a third time, more weakly.
 */
export default function HomePage() {
  return (
    <main>
      <AutoDealerJsonLd />
      <Hero />
      <AssuranceStrip />
      <OfferPromise />
      <HowItWorks />
      <WhatWeBuy />
      <WhyOffersDiffer />
      <Comparison />
      <RecentlyPurchased />
      <FaqTeaser />
      <FromTheBlog />
      <CtaBand />
    </main>
  );
}
