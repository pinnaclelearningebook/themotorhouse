# PENDING-INFO.md

Everything the site needs that isn't known yet. Each item appears in the codebase as an `AWAITING_RESPONSE` marker or an `<AwaitingInfo />` component. Delete a line here when you fill it in.

Grouped by how badly it blocks launch.

---

## Blocks launch

These must exist before the site can be publicly live.

- [ ] **Domain name**
- [ ] **Business phone number** — the one sellers will actually call
- [ ] **Business email address**
- [ ] **Registered company name** (exact, as at Companies House)
- [ ] **Company registration number**
- [ ] **Registered office address**
- [ ] **VAT number** (if VAT registered)
- [ ] **Trading address** — where cars are handled, if different from registered office
- [ ] **ICO data protection registration number** — likely required as a data controller
- [ ] **Operator alert destination** — email address, and later a WhatsApp or Telegram webhook
- [ ] **Resend API key + verified sending domain** — for the seller auto-reply
- [ ] **Airtable base ID + API key** — for submission storage

---

## Blocks credibility

The site can launch without these, but it will feel thin until they land.

- [ ] **Logo** — wordmark at minimum. SVG.
- [ ] **Favicon / app icons**
- [ ] **Real names and photographs** of the people behind the business, for `/about`
- [ ] **Short founder bio** — 60–100 words, why this business exists
- [ ] **Collection area** — how far from base do we collect for free, and is there a limit
- [ ] **Payment method and timing** — confirm the exact promise we can make ("faster payment before the transporter leaves"?)
- [ ] **Response time promise** — the site currently says two hours. Confirm this is deliverable, including weekends.
- [ ] **Opening hours**
- [ ] **Hero photography** — one strong daylight shot of a real car we bought. No stock.
- [ ] **Recently purchased cars** — model, year, mileage, photos, for the proof section. Empty until car 1.

---

## Blocks SEO reach

- [ ] **Google Business Profile** — needs a verified address
- [ ] **Social profiles** — Instagram, Facebook, LinkedIn URLs for `Organization` schema `sameAs`
- [ ] **Google Search Console** verification
- [ ] **Analytics choice** — Plausible or GA4
- [ ] **Catchment cities** — the 12 largest towns/cities we'll collect from, for local landing pages. Do not build these until confirmed.

---

## Nice to have / later

- [ ] **Seller photo upload flow** — the form currently asks sellers to reply to the confirmation email with photos. A proper upload (Vercel Blob client upload + token) replaces that later.
- [ ] **Plate typeface decision** — the registration input uses letter-spaced condensed bold as the sanctioned fallback. Decide whether to license a Charles Wright lookalike face.
- [ ] **DVLA Vehicle Enquiry Service API key** — free, register at the DVLA developer portal. Enables reg → make/model/year/fuel on the form.
- [ ] **DVSA MOT History API key** — free. Enables mileage history and advisory data.
- [ ] **HPI or Experian AutoCheck account** — for the provenance report we promise sellers
- [ ] **Valuation data feed** — CAP HPI, Glass's, or a cheaper aggregator. Only needed if we move to instant indicative ranges.
- [ ] **Insurance details** — motor trade policy number, if we want to display it as a trust signal
- [ ] **Real seller feedback** — only after real transactions. Never write these ourselves.

---

## Decisions needed, not information

Things only you can decide, which change what gets built:

- [ ] Do we publish an indicative price range on the site, or only give firm offers by phone? (Recommendation: firm offers only. It protects the no-deductions promise.)
- [ ] Do we accept part-exchange, or purchase only?
- [ ] Do we buy non-runners and Category N/S cars? The FAQ needs a definite answer either way.
- [ ] Is the two-hour response promise realistic seven days a week? If not, change it to a promise we can always keep. Breaking it once undermines the entire positioning.
