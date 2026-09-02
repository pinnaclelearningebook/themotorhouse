# CLAUDE.md

Project instructions. Read this file at the start of every session before writing code.

---

## 1. What this is

A car buying service for the UK market. Sellers submit their car, we come back with a firm offer, we collect and pay. We buy anything, but we actively target young premium SUVs (Range Rover, Evoque, Velar, Discovery Sport, Defender, Lexus, Mercedes GLE) because those go into an export pipeline to Cyprus and the EU, which lets us pay more for them than a general buyer can.

**The site has one job: convert a car owner into a submitted enquiry, fast.** Everything else is secondary.

**Audience:** UK owners of premium cars, typically 35–60, often affluent, frequently sceptical. Many have had a bad experience with a large buying service (online valuation, then a reduced offer on arrival). They are not price-naive and they respond badly to being marketed at.

**This is not a marketplace.** We buy cars as principal. There is no listing feature, no buyer accounts, no checkout. Do not build marketplace scaffolding.

**Positioning:** a specialist that pays properly and behaves professionally, not a volume lead-gen funnel. Every design and copy decision should serve that.

---

## 2. Stack

- **Next.js (App Router), TypeScript, React Server Components by default**
- **Tailwind CSS** with a custom theme mapped to the tokens in section 5. Do not use arbitrary hex values in components — every colour comes from the theme.
- **Motion** (`motion/react`) for animation. **Lenis** for smooth scroll.
- **MDX in-repo for the blog.** No CMS. Posts live in `content/blog/*.mdx` with frontmatter. This is deliberate: zero cost, git-versioned, and posts can be written directly in the repo.
- **Server Actions** for form handling. No API routes unless there's a reason.
- **Resend** for transactional email, **Airtable** as the submissions store to start. Abstract both behind `lib/submissions.ts` so the store can be swapped for Postgres later without touching the form.
- **Vercel** for hosting.
- **Zod** for all form validation, shared between client and server.

Conventions:
- `app/` routes, `components/ui/` primitives, `components/sections/` page sections, `lib/` logic, `content/` MDX.
- Server Components unless the component needs state or animation. Mark client components explicitly and keep them small and leaf-level.
- No `any`. No unused exports. No commented-out code left in place.

---

## 3. Placeholder convention — read this carefully

A lot of real-world information is not available yet. **Never invent it.** Do not make up a phone number, an address, a company registration number, a review, a customer name, a statistic, or a number of cars bought.

Where real data is missing, use this exact pattern so it is greppable and visually obvious:

```tsx
// In config
export const CONTACT = {
  phone: "AWAITING_RESPONSE: business phone number",
  email: "AWAITING_RESPONSE: business email",
  // ...
}
```

```tsx
// In JSX
<AwaitingInfo label="Company registration number" />
```

Build a small `<AwaitingInfo />` component that renders a visible dashed-outline chip in development and an empty fragment in production, so nothing embarrassing ships if a page goes live early.

All placeholders live in **`config/site.ts`** as the single source of truth. Never hardcode contact details in a component.

Maintain **`PENDING-INFO.md`** at the repo root. Every time you add a placeholder, add a line to that file. Every time one gets filled in, remove it. That file is the checklist the client works through.

**Do not write fake testimonials, fake review counts, fake "cars bought this month" counters, or fake trust badges.** If a section needs social proof that doesn't exist yet, build the section, wire it to an empty data array, and let it render an honest empty state or not render at all. Fabricated proof is both an ASA problem and the exact thing this brand is positioned against.

---

## 4. Seller psychology — the spine of the whole site

This section drives copy and layout more than the design system does. Read it before writing any page.

**What the seller is actually feeling.** They own a car worth £20k–£60k. Selling it privately means strangers at their house, test drives with people they don't know, payment fraud risk, and weeks of timewasters. Selling to a big buying service means an online figure they don't believe, followed by a reduced offer once they've driven to a retail park. Part-exchange means they know they're being underpaid but it's easy. They are choosing between three unappealing options and looking for a fourth.

**The eight levers, and where each one is used:**

1. **Certainty over optimism.** The single strongest lever in this category is the promise that the offer does not change. Not "up to £X" — a firm number that gets paid. This is the primary message, stated on the home hero, repeated on `/how-it-works`, and given its own block on every model page. Never dilute it with hedging language.

2. **Loss framing, gently.** A premium SUV loses value every month it sits on the drive unsold, and the owner is insuring and taxing a car they've decided to get rid of. State this once, factually, without pressure. Never use countdown timers, fake scarcity, or "prices drop soon" — this audience reads that as a tell.

3. **Reciprocity — give before asking.** Free valuation, free collection, free HPI provenance report shared with the seller regardless of whether they sell. Lead with what they get, not what we want.

4. **Effort escalation.** The first ask is one field: a registration. Trivially low commitment. Every subsequent question comes *after* they've already engaged. Never front-load a long form.

5. **The reason why.** People accept a claim far more readily when a reason is attached. Our reason is true and specific: export demand for young premium SUVs means we can pay above UK retail-buyer level for certain models. This is the argument that makes a strong offer believable instead of suspicious. It belongs on the home page, the `/export` page, and every model page.

6. **Status congruence.** The seller must feel this is a specialist service for a good car, not a scrappage scheme. This is carried by restraint: whitespace, quiet type, no shouting, no clip art, no orange. If the page could plausibly be selling a £900 Corsa, it's wrong.

7. **Anticipated regret reversal.** Name the alternatives honestly and let the comparison do the work: private sale (weeks, strangers, fraud risk), part-exchange (convenient, materially less money), big buying service (the number changes). Do not disparage competitors by name — describe the experience and let recognition do it.

8. **Authority through specificity.** Generic competence claims are worthless. Model-specific knowledge is not. "The timing chain question is the 2.0 four-cylinder, not the D300 straight-six — if someone told you otherwise they've confused the two" is worth more than any trust badge. Correcting a misconception the seller has been given elsewhere is the strongest form of this. Every model page must contain at least one detail only someone who actually trades that model would know, and every external claim must be sourced in SOURCES.md.

**Copy rules that follow from the above:**
- No exclamation marks anywhere on the site.
- No urgency mechanics: no countdowns, no "3 people are viewing", no fake scarcity.
- Never say "free quote" — say "firm offer".
- Never say "up to" before a number.
- Active voice. Buttons name the outcome: `Get my offer`, not `Submit`.
- The same words persist through a flow: `Get my offer` → "Offer request received" → "Your offer".
- Sentence case everywhere except the registration plate.
- Short sentences. A seller scanning on a phone at 9pm should get the point in six words.

---

## 5. Design system

### Direction

**"The specialist's file."** The premium signal in car selling is not gloss, it's paperwork done properly — the V5C logbook, the HPI certificate, the stamped service book. Precise, documentary, unhurried. Confidence expressed through restraint.

**Explicitly avoid:** orange (WeBuyAnyCar), blue/purple (Motorway), turquoise (Cazoo), black-and-red independent-dealer template, stock photos of handshakes or people holding keys, glassmorphism, neon gradients, generic hero-with-gradient-blob. If a choice would look at home on any SaaS landing page, it's wrong for this project.

### Colour tokens

```
--ink:        #12140F   Deep near-black, green cast. Dark sections, headlines
--ink-soft:   #1F231C   Raised surfaces within dark sections
--paper:      #F5F4F0   Primary page ground. Document paper, cool not cream
--paper-warm: #EDEBE4   Alternate section band
--oxblood:    #5C1A1F   PRIMARY ACCENT. Buttons, links, active states
--oxblood-lt: #7A2B31   Hover state
--plate:      #F5D000   Number plate yellow. USED IN EXACTLY ONE PLACE
--structure:  #6B6F6B   Secondary text, labels
--line:       #DEDBD4   Hairlines on paper
--line-dark:  #2C302A   Hairlines on ink
```

Oxblood is the deliberate choice — it's the V5C logbook red, reads as official and British, and no competitor has claimed it.

**The plate yellow is used on the registration input and nowhere else on the entire site.** Not on buttons, not on badges, not on hover states. Its scarcity is what makes it work.

Sections alternate between `paper` and `ink` down the page. That alternation is the primary rhythm device — no other section-level decoration is needed.

### Typography

Three roles. The third is the differentiator.

| Role | Face | Use |
|---|---|---|
| Display | **Newsreader** (Google Fonts) | Headlines only. Weights 400 and 500. Never below 24px. |
| Body | **Inter Tight** (Google Fonts) | All running text, buttons, labels, nav. |
| Data | **Geist Mono** | **Registrations, mileage, prices, dates, VINs, years, phone numbers.** |

The mono-for-data rule is the signature typographic decision. Vehicle data should read as data. Apply it consistently — a mileage figure in a blog post gets mono the same as one in the hero. It is a small thing that makes the site feel built by someone who handles cars rather than someone who handles leads.

Scale: 72 / 56 / 36 / 24 / 18 / 16 / 13. Generous line height on body (1.7), tight on display (1.05). Display headlines get slight negative tracking (-0.02em).

### Layout

- Max content width 1200px, text measure capped at 68 characters.
- Generous vertical rhythm — 120px+ between major sections on desktop. Space is the premium signal; do not compress to fit more in.
- 8px spacing base.
- `border-radius: 4px` on most things. Nothing more rounded than 8px. Sharp corners read as document, rounded corners read as consumer app.
- Hairline borders at 1px, never thicker.

### Signature element

**The registration input is a UK number plate.** Yellow ground, black Charles Wright-style lettering (use a licensed or free plate-lookalike face, or letter-spaced condensed bold as a fallback), correct proportions, blue GB flash on the left edge. On focus it gets a subtle scale and a soft oxblood glow, nothing more.

This is the one loud object on the site. Everything around it stays quiet. Spend the boldness here and nowhere else.

### Photography

Real cars we actually bought, shot in daylight on real UK ground. One calm hero image, never a collage. Until real photography exists, **use no photograph at all** — a strong type-led hero with a deep ink ground beats a generic stock image. Add `<AwaitingInfo label="Hero photography" />` in the slot.

---

## 6. Motion

Motion should feel like weight and confidence, not playfulness. Heavy objects moving deliberately.

**Global**
- Lenis smooth scroll, `lerp: 0.08`, subtle. It should be felt, not noticed.
- Standard easing: `cubic-bezier(0.16, 1, 0.3, 1)`. Standard duration 600–800ms for entrances, 200ms for interactive feedback.
- Everything respects `prefers-reduced-motion`. Wrap all non-essential motion; reduced motion gets instant states, never broken layout.

**Page load (home only)**
An orchestrated sequence, not scattered fades. Headline lines rise and fade in with 80ms stagger, then the plate input scales up from 0.96, then the supporting line. Total under 1.2s. Runs once per session — store a flag so returning navigation doesn't replay it.

**Scroll**
- Section entrances: 24px rise + opacity, triggered at 20% viewport, 100ms stagger between children. Once only, never re-trigger on scroll up.
- Display headlines: line-by-line mask reveal (clip-path or overflow-hidden with translateY). This is the one place to be slightly showy.
- Hero imagery: subtle parallax, max 12% travel. Any more looks cheap.
- Dark/light section transitions: the background colour interpolates over ~400ms as the boundary crosses mid-viewport. This is the most premium-feeling effect on the site and it costs almost nothing.

**Micro-interactions**
- Buttons: background shifts oxblood → oxblood-lt over 200ms, plus a 1px lift. No scale bounce.
- Plate input focus: scale 1.02 over 250ms, soft glow.
- Links: underline draws left-to-right over 250ms.
- Form step transition: outgoing step fades and slides up 12px, incoming slides in from 12px below.

**Never:** bounce or elastic easing, spinning loaders (use a slim determinate bar), typewriter text, auto-playing carousels, confetti, parallax on text, anything that delays the seller reaching the form.

**Performance is not negotiable.** Animate only `transform` and `opacity`. Lighthouse performance ≥ 90 on mobile. LCP under 2.0s. If an animation costs the LCP budget, cut the animation.

---

## 7. Routes

```
/                              Home
/sell-my-range-rover           ┐
/sell-my-range-rover-evoque    │
/sell-my-range-rover-velar     │  Model landing pages.
/sell-my-discovery-sport       │  One template, genuinely distinct content.
/sell-my-land-rover-defender   │
/sell-my-lexus                 │
/sell-my-mercedes-gle          ┘
/how-it-works
/export                        Why our offers on certain models are stronger
/about
/faq
/recently-purchased            Real cars only; 404s while the array is empty
/valuation                     The full form flow (also embedded on every page)
/valuation/thank-you
/blog
/blog/[slug]
/blog/category/[category]
/privacy
/terms
/cookies
```

Model pages are generated from a typed config array in `config/models.ts`, but **each entry carries its own hand-written copy**. Do not template-spin the same paragraph seven ways with the model name swapped — that is thin content, it reads as spam to sellers, and Google treats it as doorway pages.


## 7a. Header and navigation

A persistent header exists on every page.

Layout: wordmark left · nav links centre-right · `Get my offer` button
far right. Ink text on paper ground, thin, quiet, 1px bottom hairline
in --line. No shadow, no blur, no background transparency effects.

Links (desktop): How it works · About · FAQ. Model pages and /export
join this list at Milestone 3 — at that point How it works, About and
FAQ move to the footer and the header carries the commercial routes
instead, since navigation should serve the seller's decision, not our
sitemap.

Mobile (below 768px): wordmark and `Get my offer` only. No hamburger,
no drawer. The nav links live in the footer. On a conversion-focused
page the header's job on a phone is to keep the form one tap away,
not to offer a menu.

Behaviour: static at the top of the page, then sticky once the user
scrolls past the hero, so the CTA is always reachable. Slide in over
250ms, standard easing. Respects prefers-reduced-motion.

The footer carries the full sitemap: all content pages, all model
pages, legal links, and company details.

---

## 8. Page briefs

### `/` Home

| Section | Ground | Content |
|---|---|---|
| Hero | ink | Headline, sub-line, plate input, `Get my offer`. Fully above fold on mobile. |
| Assurance strip | ink | Three items, no icons, mono where numeric: firm offer in 2 hours · free UK collection · same-day payment |
| The promise | paper | The offer-doesn't-change commitment as a standalone statement. Largest type on the page after the hero. |
| How it works | paper | Four numbered steps. Numbers are legitimate here — it's a real sequence. |
| Why our offers differ | ink | The export reason. Two short paragraphs, link to `/export`. |
| What we buy | paper | Seven model cards → model pages, plus "and everything else" → `/valuation`. |
| Comparison | paper-warm | Private sale vs part-exchange vs us. Honest, unnamed competitors, three columns. |
| Recently purchased | paper | Real cars only. Renders nothing if the array is empty. |
| From the blog | paper | Three latest posts. |
| Final CTA | ink | Plate input again. |
| Footer | ink | Company details, nav, legal. |

### Model pages

H1 `Sell your [model]` · model-specific opener on why we want this car and what affects its value · **export eligibility block** where the model qualifies (under 5 years) · at least one genuinely specialist detail about the model · what we look for in spec and condition · model-specific FAQ, 4 questions, with FAQPage schema · plate input · links to three sibling model pages.

### `/export`

The most differentiated page on the site and the one that makes everything else credible. Explain plainly: we supply buyers in Cyprus and the EU who want young, high-spec, right-hand-drive premium SUVs; those markets pay a premium the UK doesn't; that's why our offer on certain cars beats a general buyer's; that's also why the export route only applies to cars under five years old. Because it's true, it holds up under scrutiny.

### `/how-it-works`

Four steps, one paragraph each: tell us about the car · firm offer within two hours · we collect free anywhere in mainland UK · payment before the transporter leaves. Then the no-deductions policy in its own block, largest type on the page.

### `/faq`

Minimum 15 questions with FAQPage schema. Must cover: outstanding finance, part-exchange, collection area and cost, payment timing and method, cars with damage, non-runners, missing service history, category N/S write-offs, what documents are needed, how the offer is calculated, whether the offer can change (no), what happens to the car afterwards.

---

## 9. Form

**Step 1 — six fields, nothing more.** Registration (plate input) · mileage · postcode · name · phone · email.

**Step 2 — only after step 1 submits.** Outstanding finance (yes/no/unsure) · service history (full/partial/none) · previous keepers · damage or warning lights (textarea) · photo upload (up to 8) · **when are you looking to sell (asap / this month / next few months / just researching)**.

That last field is the most commercially valuable input on the site. "Just researching" is not a dead lead — it is a follow-up date. Never remove it and never make it optional.

Step 1 must be submittable and stored on its own. If the user abandons at step 2, we still have a usable lead. Persist step 1 immediately, then patch the record.

**Data model** (`lib/types.ts`):

```
id, createdAt, reg, make, model, derivative, year, mileage,
postcode, name, phone, email,
financeOutstanding, serviceHistory, keepers, conditionNotes, photos,
sellTimeline,
indicativeOffer, firmOffer, offerSentAt,
exportEligible,      // derived: under 5 years + target model
outcome,             // bought | declined | lost | no-response | researching
nextContactDate,     // the commercially important field
notes
```

**On submit:** validate with Zod → write to store → send operator alert (email now, webhook-ready for WhatsApp later) → send seller confirmation within seconds: *"Got it. You'll hear from a person within two hours."* → redirect to `/valuation/thank-you`.

The instant auto-reply does more for conversion than the entire visual design. Treat it as a P0 feature, not a nicety.

**Later (build the interface now, stub the implementation):** DVLA Vehicle Enquiry Service API for make/model/year/fuel from a registration, and the DVSA MOT History API for mileage history. Both are free UK government APIs. Put them behind `lib/vehicle-lookup.ts` returning a typed result, with a stub that returns `null` until keys exist. Add both keys to `PENDING-INFO.md`.

---

## 10. SEO

This site must rank. Treat SEO as an architectural requirement, not a later pass.

**Technical**
- Static generation for every page that can be static. Blog and model pages fully SSG.
- Next.js Metadata API on every route. Unique title and description — no templated duplicates.
- `app/sitemap.ts` and `app/robots.ts` generated from real routes, including all blog posts.
- Canonical URLs on everything.
- OG images generated per-route with `next/og`, pulling the page title.
- Semantic HTML. One `h1` per page, no skipped heading levels.
- Images via `next/image`, AVIF/WebP, explicit dimensions, meaningful alt text.
- Core Web Vitals: LCP < 2.0s, CLS < 0.05, INP < 200ms. Check on mobile, not desktop.

**Structured data** — JSON-LD, one component per type in `components/seo/`:
- `AutoDealer` / `LocalBusiness` on home and about (fields pending real business details)
- `FAQPage` on `/faq` and every model page
- `BreadcrumbList` on all nested routes
- `BlogPosting` with author, dates, and image on every post
- `Organization` with `sameAs` for social profiles (pending)

**Keyword architecture.** Model pages target transactional intent (`sell my range rover`, `range rover buyer uk`). Blog posts target informational intent and link inward to the model pages. Every blog post must link to at least one model page and one other post.

**Local SEO** is significant for a collection-based service. Once the trading address exists, build `/sell-my-car/[city]` pages for the 12 largest catchment cities — each with genuinely local content, not a swapped city name. Do not build these with placeholder content. Add to `PENDING-INFO.md`.

---

## 11. Blog

`content/blog/*.mdx`. Frontmatter: `title, slug, description, category, publishedAt, updatedAt, author, image, keywords[], relatedModels[]`.

Categories: `valuations` · `selling-guides` · `model-guides` · `market-insight` · `ownership`

**Write these 12 posts as part of the initial build.** They're the SEO foundation and each targets real search demand from a motivated seller:

1. How much is my Range Rover worth in 2026 — pillar page, links to all model pages
2. Why Range Rover values have fallen — the theft and insurance story, told factually
3. Selling a car with outstanding finance in the UK — explains settlement figures end to end
4. Private sale vs part-exchange vs car buying service — honest comparison table
5. What is a Category N write-off and what does it do to value
6. Range Rover Sport buyer's guide — what affects resale value
7. Evoque, Velar or Discovery Sport — which holds value best
8. What documents you need to sell your car in the UK
9. Why UK cars are exported and what it means for your sale price — links to `/export`
10. How car buying services calculate an offer
11. Getting your car ready to sell — what actually adds value and what doesn't
12. Selling a Defender — why demand is different for this one

**Standards:** 1,200–2,000 words. Genuinely useful — a seller should get value even if they never contact us. Written in the brand voice: plain, specific, no filler, no exclamation marks. Where a factual claim is made, it must be verifiable; where a figure is needed and unknown, use `<AwaitingInfo>` rather than inventing one. Every post ends with a soft, non-pushy CTA to the valuation form.

---

## 12. Legal

- **UK GDPR.** Privacy policy covering what's collected, lawful basis, retention, and deletion requests. Explicit unticked consent checkbox on the form for marketing contact, separate from the enquiry itself.
- **Cookie consent** before any non-essential script fires. Analytics must not load until consent.
- **Companies Act footer requirements:** registered company name, company number, registered office address. All `AWAITING_RESPONSE` for now.
- **ICO registration** likely required as a data controller. Add to `PENDING-INFO.md`.
- **ASA/CAP compliance:** every claim on the site must be substantiable. No "best prices in the UK", no unevidenced superlatives, no invented statistics. This matters more than usual because our core promise is about honesty.

---

## 13. Build order

**Milestone 1 — the site works.** `config/site.ts` with placeholders, design tokens in Tailwind, `AwaitingInfo` component, home page, plate input, two-step form with Zod, submission storage, operator alert, seller auto-reply, thank-you page. Deployed. Nothing else matters until a submission reaches a phone in under 60 seconds.

**Milestone 2 — credibility.** How it works, About, FAQ with schema, Privacy, Terms, Cookies, cookie consent, footer.

**Milestone 3 — reach.** Seven model pages with distinct copy, `/export`, sitemap, robots, JSON-LD, OG images.

**Milestone 4 — content.** Blog infrastructure and all 12 posts.

**Milestone 5 — polish.** Full motion pass, Lighthouse tuning, accessibility audit, DVLA/MOT lookup wiring if keys have arrived.

---

## 14. Definition of done

Before calling any page complete:

- Renders correctly at 375px, 768px, 1440px
- Keyboard navigable, visible focus states, logical tab order
- `prefers-reduced-motion` respected and layout intact
- Colour contrast meets WCAG AA
- Lighthouse ≥ 90 performance, ≥ 95 accessibility, on mobile
- Unique title and meta description
- No fabricated data anywhere — every unknown is an `AWAITING_RESPONSE` marker with a matching line in `PENDING-INFO.md`
- No exclamation marks, no "up to", no "free quote", no urgency mechanics
- Would a Range Rover owner believe this was built by someone who actually buys Range Rovers?

That last question is the real bar. If a section could plausibly appear on a site selling a £900 Corsa, rebuild it.
