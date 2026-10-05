import { Hero } from "@/components/sections/Hero";
import { AssuranceStrip } from "@/components/sections/AssuranceStrip";
import { OfferPromise } from "@/components/sections/Promise";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhyOffersDiffer } from "@/components/sections/WhyOffersDiffer";
import { WhatWeBuy } from "@/components/sections/WhatWeBuy";
import { Comparison } from "@/components/sections/Comparison";
import { RecentlyPurchased } from "@/components/sections/RecentlyPurchased";
import { FromTheBlog } from "@/components/sections/FromTheBlog";
import { FinalCta } from "@/components/sections/FinalCta";
import { AutoDealerJsonLd } from "@/components/seo/AutoDealerJsonLd";

export default function HomePage() {
  return (
    <main>
      <AutoDealerJsonLd />
      <Hero />
      <AssuranceStrip />
      <OfferPromise />
      <HowItWorks />
      <WhyOffersDiffer />
      <WhatWeBuy />
      <Comparison />
      <RecentlyPurchased />
      <FromTheBlog />
      <FinalCta />
    </main>
  );
}
