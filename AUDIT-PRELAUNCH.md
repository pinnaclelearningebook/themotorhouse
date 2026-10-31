# Pre-launch audit — selltothemotorhouse.co.uk

**Date:** 31 October 2026 · **Auditor:** Claude Code · **Scope:** live site (`https://www.selltothemotorhouse.co.uk`) and repository at `main` = `c578346` (the commit production is serving). **Audit only — nothing was changed, no production or staging data was written, no secrets are printed.**

Evidence lives in the session scratchpad (`crawl.json` for 42 URLs, `browser.json` for 36 pages at 375 and 1440, six Lighthouse JSONs, screenshots) and is quoted inline below. Where something could not be checked it is marked **NOT VERIFIED** with the reason.

---

## ⚠️ Read first — two things that need a decision today

### 1. Production is running a Next.js version with a critical, applicable RCE advisory

`package.json` and `node_modules/next` are both at **16.3.3**. `npm audit` lists eleven advisories against it. Three are critical; this is which of them actually apply to this codebase:

| Advisory | Severity | Range | Applies here? |
|---|---|---|---|
| GHSA-vcvr-r3jv-pc5j — RCE in `next/og` `ImageResponse` | **critical** | ≥16.2.0 <16.3.6 | **Yes.** `ImageResponse` is used in `components/og/OgImage.tsx`, `app/icon.tsx`, `app/apple-icon.tsx`. All three routes are live and public (`/icon` 200, `/apple-icon` 200, every page's `og:image` 200). |
| GHSA-2464-fhr4-w9xw — RCE in Image Optimization via SVG | critical | ≤16.4.0 | Mitigated by default: `next.config.ts` does not set `dangerouslyAllowSVG`, so SVG optimisation is off. |
| GHSA-673q-mjm6-r5xr — RCE in `use cache` returning typed arrays | critical | ≤16.4.0 | No. `grep "use cache"` across `app lib components` finds nothing. |
| GHSA-cjq9-62q9-8jv4 — SSRF in Image Optimization | high | <16.3.8 | Yes — `next/image` is used site-wide. |
| GHSA-p3m5-59mp-jv5r — DoS via Server Actions | high | ≤16.4.0 | Yes — admin and the form use Server Actions. |

Fix available: `next@16.4.3` (current latest, no major bump) or `16.3.8` (same minor). Per your instruction I have **not** changed `package.json`. This is the first item in the blocker list and should be patched and deployed before anything else — it is one dependency bump, a test run and a deploy.

### 2. The staging Supabase project is paused

Management API: `themotorhouse-staging … status INACTIVE` (production is `ACTIVE_HEALTHY`). Free-tier projects pause after about a week idle. Until it is restored from the Supabase dashboard, Preview and Development builds will fail at their first database call. Nothing is lost; it needs a click, not a rebuild.

---

## Part 1 — What's done

Legend: ✅ live and verified · 🟡 built but not live / not fully verified · ❌ broken

### Public site
- ✅ 34 indexable URLs, all 200, each with a self-referencing canonical, exactly one `<h1>`, OG + Twitter tags, `lang="en-GB"` (`crawl.json`, all 34 rows).
- ✅ Home, 7 model pages, `/export`, `/how-it-works`, `/about`, `/faq`, `/valuation`, 12 guides, 5 category pages, 3 legal pages.
- ✅ Redirects: `http→https` 308, apex→www 308, `themotorhouse.vercel.app/*` → domain 308 (path preserved), trailing slash → no slash 308. No chains longer than two hops (`http://apex` → `https://apex` → `https://www`).
- ✅ Lighthouse mobile (simulated, 31 Oct): perf 94 / 99 / 100 / 99 / 99 / 95, accessibility **100** on all six, best-practices 100, SEO 100. Home LCP median of three runs **2.53 s** (2.51, 2.53, 2.89) — consistent with the 2.51 s accepted on 12 October (CLAUDE.md §14).
- ✅ No console errors on any of 36 pages at 375 or 1440 (only the expected 404 asset on the 404 page). No horizontal overflow at 375 on any page.
- ✅ Trademark phrase absent from all 34 live pages (fetched and grepped, any case); `test/trademark.test.ts` passing.
- ✅ Cookie consent: no cookie and no localStorage key set on first load of `/` or `/valuation` (`Set-Cookie: none`; browser pass `ls:[] ck:[]`). Banner renders, equal-weight "Essential only" / "Allow analytics" buttons, 44 px tall.
- 🟡 All 13 photographs are AI-generated (ChatGPT), logged in `SOURCES.md:270`, alt text scene-only. `/about` founder photo slot is `src: null` (renders nothing).
- 🟡 Footer business details block renders **nothing** — all five values are `AWAITING_RESPONSE` in `config/site.ts:12–24`.
- ❌ `/faq` renders **three questions with empty answers** (non-runners, Category N/S, part-exchange) — `app/(site)/faq/page.tsx:53` falls through to `<AwaitingInfo>` which is invisible in production. Live text confirms: `"Do you buy non-runners? Do you buy Category N or Category S write-offs? 03 Collection and payment Do you take a car in part-exchange? Where do you collect…"`.

### Valuation form
- ✅ Four-step flow live: registration → the car → the sale → how to contact you. Step 1 input labelled "Vehicle registration", `placeholder="YOUR REG"`, 283×64 at 375 px, submit "Find my car" 59 px tall.
- ✅ Keyboard: third Tab stop lands on "Open the menu" with a visible 2 px oxblood outline.
- 🟡 **Vehicle lookup runs with no DVLA or DVSA keys** in production (`vercel env ls production` lists neither; `.env.local` has all six empty). `app/api/vehicle/lookup/route.ts:59–61`: "No keys: the form proceeds on manual entry." Seller is asked to type make/model themselves — the "recognition" moment (CLAUDE.md §4 lever 9) does not happen today.
- ✅ Rate limited (`lib/rate-limit.ts`, applied in lookup, agent/chat, agent/session, photos/sign). `POST /api/vehicle/lookup {}` → 400, never 500.
- ✅ Thank-you page no longer claims an email was sent unless Resend accepted it (`lib/thank-you-state.ts`); live copy says "You will hear from a person within 2 hours".
- 🟡 Photo upload to Vercel Blob: `BLOB_READ_WRITE_TOKEN` present in production. **NOT VERIFIED end to end today** (would create a production lead).

### Emails
- ❌ **Seller confirmation does not send.** `EMAIL_FROM` is a `@gmail.com` address; Resend refuses unverified senders (403 recorded 15 Oct). DNS today: `resend._domainkey`, `send.` TXT/MX, root TXT, `_dmarc` — **no records**. The Resend API key is send-only (`GET /domains` → 401 "restricted to only send emails"), so domain status cannot be read via API; DNS absence is the evidence.
- 🟡 Operator alerts send from `onboarding@resend.dev` (stopgap, `lib/email.ts:62–76`) to **one** address — `OPERATOR_EMAILS` contains the owner's Gmail only. Alex's address is not in it.
- 🟡 Supabase auth email (magic link) uses Supabase's own sender, 2/hour. Template cannot carry the sign-in code on free tier; `CODE_SIGN_IN_AVAILABLE = false`.

### Admin
- ✅ Gate holds on every route signed out: `/admin`, `/inbox`, `/pipeline`, `/follow-ups`, `/comparables`, `/review`, `/settings`, `/leads/[id]` → 307 `/admin/login`; `/admin/search?q=x` → 401; `/api/cron/enrich` → 401; `/api/agent/llm` POST → 401.
- ✅ Dashboard, inbox (URL-state filters, 50/page, bulk status + follow-up with confirm and one audit row per lead), lead detail (5 tabs, `InternalOnly` wrapper), follow-ups, comparables, review, settings — all render on the staging-wired local server with no console errors (31 Oct screenshots `admin-*.png`; these are `ADMIN_DEV_BYPASS` **renders**, CLAUDE.md §17).
- ✅ Magic-link sign-in verified through a real session by the owner on 19 October (per the pipeline brief); not re-verified today.
- ✅ RLS enabled on all 15 tables; `revoke all … from anon`; `authenticated` reads only via `is_admin()` policies (`20261005120100_rls.sql`, `20261005210000_admin_users.sql`).
- ✅ Test leads (`admin-test`, `TE57VOX`) excluded from every listing; production holds 9 such rows and no sellers.

### Pipeline
- ✅ Live: kanban with select-and-submit moves, costs, sale recording, per-car actual P&L.
- 🟡 Drag-and-drop with server-enforced transition map, offer/reason/confirm dialogs, optimistic revert, mobile stage switcher — built, tested (28 tests), **on branch `pipeline`, 1 commit ahead of `main`, preview only.** Not in production.

### Maya (text + voice)
- 🟡 Text mode built with coded guards (`agent/guards.ts`), four tools, transcript on lead, Review page. **`agent_enabled = false` in production settings** (read 31 Oct). Launcher is therefore absent on every public page (browser pass `maya:-` ×36) — correct behaviour, so sellers currently get no assistant.
- 🟡 Voice: ElevenLabs agent "The Motor House – Maya" exists; custom LLM URL is `https://www.selltothemotorhouse.co.uk/api/agent/llm` (correct domain); `first_message` set. **`ELEVENLABS_WEBHOOK_SECRET` is not in production env**, so `app/api/agent/webhook/route.ts:24–27` returns 503 and post-call transcripts cannot land. Mic test never done (PENDING-INFO:105). Voice consent copy is draft pending legal (PENDING-INFO:108).
- **NOT VERIFIED:** ElevenLabs plan/credit — the API key lacks the `user_read` permission (401). Anthropic credit — no API endpoint exposes balance.

### SEO
- ✅ Phase 1 technical (15 Oct): canonicals on the real domain, vercel.app redirects, `@graph` AutoDealer+WebSite, BreadcrumbList, per-route OG images, FAQPage on `/faq` and all 7 model pages, BlogPosting on 12 guides, sitemap with content dates, robots.
- ✅ FAQPage schema matches visible text: `/faq` 14/14 questions and answers, `/sell-my-lexus` 4/4.
- 🟡 Phase 2 keyword map delivered as a report. **Phase 3 not started** — `git log --since=2026-10-15` on `config/models.ts`, `app/(site)/sell-my-*`, `content/` returns nothing; no `/sell-my-range-rover-sport`, no `/sell-my-discovery`, no V5C guide beyond the existing documents guide.
- ❌ Google Search Console / Bing: `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` are read by `app/layout.tsx:87–88` but **not set in any Vercel environment**; no verification meta in the live HTML. Sitemap not submitted (NOT VERIFIED directly — no GSC access — but verification is a prerequisite and is absent).

### Domain / hosting
- ✅ Live on `www.selltothemotorhouse.co.uk`, HSTS `max-age=63072000`, HTTP/2, Vercel.
- ❌ **Vercel team plan is `hobby`** (`vercel teams ls`). Hobby is non-commercial by Vercel's terms.
- ❌ No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` or `Permissions-Policy` headers (only HSTS; `next.config.ts` has no `headers()`; `vercel.json` carries only the cron).
- 🟡 Supabase production: `pitr_enabled: false`, `backups: []` via Management API. Plan tier not exposed by the API, but the auth-template refusal on 11 Oct said *"not available for free tier projects"* — production is on the free tier.

### Staging database
- ✅ Separate project, 10 migrations applied and ledgered, schema compared identical to production (187 columns, 42 enum values, 39 indexes, 15 RLS flags, 14 policies), 10 seeded leads, settings reconciled, own auth config with preview wildcard, admin allow-list synced. Vercel Preview + Development repointed; Production's four Supabase vars untouched (14 d old).
- ✅ Production guard proved: seeder refuses production on two independent rules; row counts unchanged.
- ❌ **Currently INACTIVE** (paused) — see top of document.

### Tests
- ✅ `main`: 480 passed, 12 skipped, 33 files (run 31 Oct). Lint `--max-warnings=0` and typecheck clean as of the last commit on each branch.

---

## Part 2 — What's left before launch

Effort: S < 1 h · M half a day · L a day or more.

### A. Launch blockers

| # | Item | Owner | Effort | Evidence |
|---|---|---|---|---|
| 1 | **Upgrade Next.js to 16.4.3**, run suite, deploy | Claude Code | S | `npm audit`: GHSA-vcvr-r3jv-pc5j applies (ImageResponse live) |
| 2 | **Vercel Pro** — Hobby is not licensed for commercial use | Sid | S | `vercel teams ls` → `hobby` |
| 3 | **Company details on the site** — registered name, number, registered office, contact email (Companies Act 2006 s.82 / Company, LLP and Business Names Regs 2015; E-Commerce Regs 2002 reg 6). All five are `AWAITING_RESPONSE`; footer renders nothing | Sid supplies → Claude Code wires | S | `config/site.ts:12–24`; live footer text has no address |
| 4 | **Privacy policy retention period** — the "How long we keep it" section is empty on the live page | Sid/Alex decide, solicitor confirms → Claude Code | S | `app/(site)/privacy/page.tsx:113–116`; live `/privacy` shows the heading with no body |
| 5 | **FAQ: three visible questions with no answer** (non-runners, Cat N/S, part-exchange). Either answer them or hide them until decided | Alex decides → Claude Code | S | live `/faq`; PENDING-INFO:42–43 |
| 6 | **Resend domain verified + `EMAIL_FROM` on it** — seller confirmation currently fails on every submission | Sid (DNS) → Claude Code | S | DNS: no `resend._domainkey`, no `send.` records |
| 7 | **Operator alerts to Alex's real address** — `OPERATOR_EMAILS` holds one Gmail; sender is `onboarding@resend.dev` | Sid supplies → Claude Code | S | `lib/email.ts:75–88`; production env |
| 8 | **ICO registration** — data controller, ~£40/yr; number goes in privacy policy | Sid | S | PENDING-INFO:27; `/privacy` has an empty ICO slot |
| 9 | **Solicitor review** of privacy, terms, cookie policy, voice consent wording, and the finance guide | solicitor | M | PENDING-INFO:31, 108–109 |
| 10 | **Decide the two-hour promise** — stated unconditionally on 30 of 34 pages ("One registration, 2 hours, one firm number") and on the thank-you page. Weekend/evening reality needs an answer before advertising | Alex | S decision | crawl phrase scan: `[30p]` |
| 11 | **Restore the staging project** (paused) — otherwise every preview breaks | Sid (dashboard click) | S | Management API `INACTIVE` |
| 12 | **Unpause-proof the staging project** or accept weekly pauses — free tier pauses after 7 days idle | Sid decision | S | same |
| 13 | **DVLA VES + DVSA MOT keys** — without them the form asks the seller to type their own car; the site's core "recognition" moment is missing | Sid (applied; chase) → Claude Code | S once keys land | `vercel env ls production`: neither present |
| 14 | **Google Search Console + Bing verification, sitemap submitted** — not done; without it there is no index coverage or CWV reporting from day one | Sid (account) → Claude Code (env var) | S | `app/layout.tsx:87–88`; no meta live |

### B. Should do before launch (not blocking)

| # | Item | Owner | Effort |
|---|---|---|---|
| 15 | Security headers: CSP (report-only first), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic for Maya voice only) | Claude Code | M |
| 16 | Fix `AutoDealer.image` in JSON-LD — points at `/opengraph-image` which 404s (real path is hashed) | Claude Code | S |
| 17 | Add `tmh-thank-you` to the cookie policy (httpOnly, 15 min, set by the form) — it is set but undisclosed | Claude Code | S |
| 18 | Merge `pipeline` (drag-and-drop) after your review on `tmh-staging` | Sid approves → Claude Code | S |
| 19 | Supabase: enable daily backups / PITR (paid add-on) before real seller data accumulates | Sid | S |
| 20 | `ELEVENLABS_WEBHOOK_SECRET` into production env so voice transcripts land; then mic test | Sid supplies → Claude Code; Sid tests | S |
| 21 | Breadcrumb and tag links are 16–20 px tall (below the 24 px WCAG 2.5.8 minimum, well below 44 px) on every inner page | Claude Code | S |
| 22 | Blog dates render as ISO `2026-09-03`; no "last updated"; author is the organisation | Claude Code | S |
| 23 | Home OG image is a 531 KB PNG (model pages 34 KB). Compress or switch to JPEG | Claude Code | S |
| 24 | Dependency hygiene: `@vercel/blob` (high, direct) and `zod` (high, direct — memory exhaustion on oversized collections; zod validates every public endpoint) | Claude Code | M |
| 25 | `/about`: founder name, bio, photograph (slots exist, render nothing) — E-E-A-T | Sid/Alex supply → Claude Code | S |
| 26 | Decide collection area, payment method/timing wording, offer validity (7 days is already on `/terms` and `/how-it-works`) | Alex | S decision |
| 27 | Skip-to-content link (none on any page) | Claude Code | S |
| 28 | `llms.txt` — recommended content in Part 4 | Claude Code | S |

### C. After launch

| # | Item | Owner |
|---|---|---|
| 29 | SEO Phase 3: 7 model page upgrades, `/sell-my-range-rover-sport`, `/sell-my-discovery`, V5C guide + 5 guides | Claude Code |
| 30 | Supabase custom SMTP via Resend → re-enable code sign-in (`CODE_SIGN_IN_AVAILABLE`) and lift the 2/hour auth email cap | Claude Code (after #6) |
| 31 | Turn Maya on in production (`agent_enabled`) after prompt approval and voice legal review | Sid/Alex |
| 32 | Analytics provider into `AnalyticsGate` (consent gate is built and empty) | Sid chooses → Claude Code |
| 33 | Real photography replacing the 13 AI images; `guide-market.jpg` first (reads as a dealer forecourt — PENDING-INFO:45) | Sid/Alex |
| 34 | Recently-purchased content (page 404s by design while empty) and real seller feedback | Alex |
| 35 | `target_models`: Evoque / Velar decision (currently not on the list) | Alex |
| 36 | Local landing pages once a trading address exists | Claude Code |
| 37 | Provenance (HPI/Experian) and valuation provider keys | Sid |
| 38 | Google Business Profile, social profiles for `sameAs` | Sid |

---

## Part 3 — SEO score

Scored strictly, with evidence. **Overall: 7 / 10** — technically very clean; held back by missing entity data (no address/phone anywhere), one schema 404, no Search Console, and content coverage that stops at the seven model pages.

### Technical

| Check | Score | Evidence |
|---|---|---|
| Status / canonical / title / description / H1 / indexability | **10** | All 34 sitemap URLs 200, canonical = URL, exactly one H1, titles 26–58 chars, descriptions 95–152. Noindex correctly on `/valuation/thank-you`, `/admin/login`, 404. Over-length: `/export` description 152, three guides at 151 — borderline, truncation only. |
| sitemap.xml | **9** | 34 URLs; excludes admin, api, thank-you, form-preview, recently-purchased (empty). `lastModified` is content-dated (`app/sitemap.ts:13`). −1: legal pages carry `2026-08-29` yet `privacy/page.tsx` last changed 15 Oct — the dates are hand-maintained and already drifting. |
| robots.txt | **10** | Allows all, disallows `/valuation/thank-you`, `/admin`, `/api`, `/form-preview`; sitemap declared. |
| Redirects | **10** | apex→www, http→https, vercel.app→domain (path kept), trailing slash. Max two hops. Uppercase paths 404 (acceptable). |
| Broken links / orphans | **10** | 0 internal links to non-200 paths; 0 sitemap pages without an inbound link; every model page has ≥2 inbound links from guides and 17 outbound guide links in total; 12/12 guides link to `/valuation`. External: 2 × 403 (bot-blocked news sites, fine), **1 × 404 — the ABI salvage code PDF linked from the Cat N guide**. |
| Structured data | **7** | Valid JSON on every page; `@graph` AutoDealer + WebSite, BreadcrumbList, FAQPage (matches visible text word for word), BlogPosting with dates and image. −3: `AutoDealer.image` → `/opengraph-image` **404**; AutoDealer has no `address`, `telephone`, `email` or `sameAs` (data not supplied — but it is what Google uses to disambiguate a local business); BlogPosting `author` is the organisation, not a person. |
| Core Web Vitals (mobile, simulated) | **9** | Home 94 (LCP 2.53 s median, CLS 0, TBT 10 ms); `/valuation` 99 (LCP 1.5 s); model pages 99–100 (LCP 1.0–1.7 s); guide 95 (LCP 2.7 s). Page weight 350–374 KB. −1: home and guide LCP are the AI hero image at 2.5–2.9 s — the documented exception, but still the slowest thing on the site. |
| Images | **9** | 13 unique images, all AVIF via `next/image`, 28–134 KB, every `<img>` has `alt`, four decorative with `alt=""`, width/height set (CLS 0). −1: home OG PNG 531 KB. |
| OG / Twitter | **10** | 10 OG + 8 Twitter tags on every page; per-route 1200×630 images, all 200. |
| hreflang / locale | **8** | `lang="en-GB"`, `og:locale` present, `inLanguage` in schema. No hreflang — correct for a single-locale site; −2 only because `Content-Language` header is absent. |

### Content

| Check | Score | Evidence |
|---|---|---|
| Keyword cluster coverage | **5** | "sell my [model]" ×7 ✓. Generic "sell my car": home H1 is "Sell your car for a firm offer that doesn't change" — serviceable, but no dedicated page and the phrase "sell my car" appears on no model page. "Range Rover Sport" has a guide but no selling page. "Discovery" (non-Sport) absent. Local intent: zero pages. |
| Thin / duplicate pages | **8** | Model pages 746–918 words; guides 1,349–1,721; `/valuation` 197 (a form — fine). Category pages 92–234 words (thin, but they are listings). 8-word shingle overlap between any two model pages below 25%; 63 shingles shared by all seven (shared CTA/FAQ chrome). Genuinely distinct copy. |
| Internal linking | **9** | Guides → model pages (17 links), model pages → guides (2–3 each), everything → `/valuation`, sibling links on model pages. Mega-menu + footer sitemap. |
| E-E-A-T | **4** | Process is explained well and every factual claim is sourced (`SOURCES.md`, 107 entries, six "deliberate gap" notes). But: no named person anywhere, no photo, no address, no phone, no company number, author = "The Motor House", all imagery AI. A reader cannot tell who is behind the site. |
| Phase 2 / 3 status | — | Phase 1 done 15 Oct. Phase 2 keyword map delivered. Phase 3 **not started** (no content commits since 15 Oct). |

---

## Part 4 — AEO score (AI answer engines)

**Overall: 6 / 10.** The FAQ is exactly what answer engines want — short, direct, schema-matched. The weaknesses are entity ambiguity (no address, no phone, no named people), three unanswered FAQ questions, and no freshness or `llms.txt` signals.

| Check | Score | Evidence |
|---|---|---|
| Direct Q&A blocks | **7** | `/faq`: 17 `<h3>` questions, 14 with one- or two-sentence direct answers ("Within two hours of your enquiry, from a person, not an algorithm"). Model pages each carry 4. `/how-it-works` answers "what do I need" directly. −3: **three FAQ questions render with no answer at all** — an answer engine quoting the page gets a question followed by the next question. |
| FAQPage schema ↔ visible text | **10** | `/faq` 14/14 and `/sell-my-lexus` 4/4 match on question and first 80 characters of answer. |
| Entity clarity | **4** | Name consistent across title, schema, footer. "What" is clear. **"Where" and "how to contact" are absent**: no address, phone or email on any page or in schema; `areaServed: United Kingdom` only. An engine cannot distinguish this business from any other "Motor House". |
| Quotable facts | **7** | Good: "firm offer within two hours", "free collection anywhere in mainland UK", "payment before the transporter leaves", "offer stands for seven days", sourced figures in guides (JLR £15m retrofit, 65,000 vehicles; Range Rover thefts −40%). Vague: "Where we pay more… usually stronger than a general buyer's" gives nothing citable; "Most of what we buy isn't on the list" is a claim about volume with no number. |
| Freshness | **4** | Guides show `<time>2026-09-03</time>` (ISO, machine-readable, not human-friendly), `datePublished` = `dateModified` on all 12, no `updatedAt` in frontmatter. Legal pages "Last updated 2026-08-29" while source changed 15 Oct. |
| `llms.txt` | **0** | `/llms.txt` → 404. Recommended content below. |
| AI-bot crawl access | — (your decision) | `robots.txt` has a single `User-Agent: *` block with `Allow: /`. **GPTBot, ClaudeBot, PerplexityBot, Google-Extended and CCBot are all allowed today** by default. No per-bot rules exist. |
| Comparison / how-to content | **8** | `/blog/private-sale-vs-part-exchange-vs-car-buying-service` is exactly the comparison engines favour; home has a three-way comparison block; `/how-it-works` is a numbered how-to; `/blog/what-documents-you-need-to-sell-your-car`. |

**Recommended `llms.txt` content** (do not create yet):

```
# The Motor House
> UK car buying service. We buy any car, any age, anywhere in mainland UK, as principal.
> Firm offer within two hours from a person; free collection; payment before the transporter leaves.

## Key pages
- How it works: https://www.selltothemotorhouse.co.uk/how-it-works
- FAQ: https://www.selltothemotorhouse.co.uk/faq
- Get an offer: https://www.selltothemotorhouse.co.uk/valuation
- Why offers on some models are stronger: https://www.selltothemotorhouse.co.uk/export

## Models we actively buy
- https://www.selltothemotorhouse.co.uk/sell-my-range-rover  (and 6 siblings)

## Guides
- Selling a car with outstanding finance: …/blog/selling-a-car-with-outstanding-finance
- Private sale vs part-exchange vs car buying service: …
- What documents you need: …

## Company
- Registered name, number, address, contact: [fill when supplied — currently placeholders]
```

**Five typical seller questions — which page answers, and is it quotable?**

| Question | Best page | Quotable? |
|---|---|---|
| How quickly will I get an offer? | `/faq` Q1 | ✅ "Within two hours of your enquiry, from a person, not an algorithm." |
| Can you buy my car if it has finance? | `/faq` "My car has outstanding finance…" + finance guide | ✅ Direct yes-with-mechanism; guide sourced to CCA 1974 and MoneyHelper. |
| What documents do I need? | `/faq` + `/how-it-works` "What to have ready" | ✅ V5C in your name, both keys, service records. |
| Do you collect, and is there a fee? | `/faq` "Where do you collect, and what does it cost?" | ✅ "We collect free anywhere in mainland UK, at a time you agree with us." |
| Will you buy a Cat N / damaged car? | `/faq` "Do you buy Category N or Category S write-offs?" | ❌ **The answer is empty on the live page.** The Cat N guide explains the category but does not say whether we buy them. |

---

## Part 5 — Page-by-page update list

Priority: **P0** launch blocker · **P1** before launch · **P2** after launch. Owner CC = Claude Code.

### Site-wide (applies to every public page)

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| S1 | Next.js 16.3.3 with an applicable critical RCE advisory (`ImageResponse`) | Bug / Security | **P0** | Bump to 16.4.3, run suite, deploy | CC |
| S2 | Footer renders no company name, number, registered office or contact email | Legal/compliance | **P0** | Supply the five values → `config/site.ts`; footer already wired | Sid → CC |
| S3 | "Firm offer within 2 hours" stated unconditionally on 30 pages, thank-you page, and in FAQ | Trust / Legal | **P0 decision** | Confirm it holds 7 days a week, or qualify ("within two hours, 8am–8pm, seven days") in one shared constant | Alex → CC |
| S4 | No CSP / X-Frame-Options / nosniff / Referrer-Policy / Permissions-Policy | Legal/compliance / Security | P1 | `headers()` in `next.config.ts`; CSP report-only first because of inline JSON-LD and the ElevenLabs widget | CC |
| S5 | `AutoDealer.image` in JSON-LD → 404 | SEO | P1 | Point at the hashed OG URL via `absoluteUrl` of the generated image, or at a static `/og-default.png` | CC |
| S6 | No skip-to-content link | Accessibility | P1 | One visually-hidden link before the header | CC |
| S7 | Breadcrumb links 16 px tall; guide tag/category links 20 px (all inner pages) | Accessibility / Mobile | P1 | Pad to ≥24 px hit area (WCAG 2.5.8), ideally 44 px | CC |
| S8 | No `telephone` / `address` / `sameAs` in AutoDealer schema | SEO / AEO | P1 (after S2) | Add once supplied | CC |
| S9 | Cookie banner occupies 145 px (18%) of a 375×812 viewport on first visit | Design/UX / Mobile | P2 | Single-line variant at narrow widths | CC |
| S10 | All 13 images AI-generated; `guide-market.jpg` reads as a dealer forecourt (appears on 5 pages) | Trust | P2 | Replace with real photography as it arrives; swap `guide-market` first | Sid/Alex |
| S11 | No `Content-Language` header | SEO | P2 | Add to headers | CC |
| S12 | No search-engine verification metas (env vars unset) | SEO | **P0** | Set `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` in production, submit sitemap | Sid → CC |

### `/` Home

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| H1 | LCP is the AI hero photo, 2.53 s median (accepted exception, CLAUDE.md §14) | Performance | P2 | Leave; revisit only as a design decision | — |
| H2 | OG image 531 KB PNG | Performance / SEO | P1 | Export as JPEG or reduce; model-page OGs are 34 KB | CC |
| H3 | "Most of what we buy isn't on the list below" — a volume claim with no basis yet (no purchases) | Trust / Content | P1 | Reword to intent ("We buy any make…") until there is a purchase history | CC |
| H4 | "Where we pay more… usually stronger than a general buyer's" — uncitable comparative | AEO / Content | P2 | Give the mechanism in one sentence (export demand on sub-5-year RHD stock) — already on `/export`; link it | CC |
| H5 | "Recently purchased" section renders nothing (correct while empty) | Content | P2 | Populate after first purchases | Alex |

### `/valuation` and form steps

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| V1 | No DVLA/DVSA keys → every seller types make/model manually; the confirm-your-car card never appears | Bug / Trust | **P0** | Add the six keys to production when issued | Sid → CC |
| V2 | Seller confirmation email fails (unverified sender) | Bug / Trust | **P0** | Verify domain, set `EMAIL_FROM` | Sid → CC |
| V3 | Step 2–4 and WhatsApp/SMS/call/email paths: **NOT VERIFIED today** (would create a production lead); last verified 15 Oct via one real submission | Forms | P1 | Re-run one end-to-end on **staging** after it is unpaused | CC |
| V4 | Step indicator shows "1 YOUR REG / 2 THE CAR / 3 THE SALE" — the fourth step ("You") is not in the visible indicator at 375 | Design/UX | P1 | Confirm all four steps are listed at all widths | CC |
| V5 | Photo upload **NOT VERIFIED** today | Forms | P1 | Test on staging | CC |
| V6 | `tmh-thank-you` cookie set by the form is not in the cookie policy | Legal/compliance | P1 | Add one line to `/cookies` | CC |

### `/valuation/thank-you`

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| T1 | Canonical points at `/` (page is noindex) | SEO | P2 | Drop canonical or self-reference | CC |
| T2 | "Contact within 2 hours" — same promise dependency as S3 | Trust | P0 decision | Shared constant | Alex → CC |

### Model pages (×7)

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| M1 | Phase 3 upgrades not started (one verified specialist detail each is present; 746–918 words) | SEO / Content | P2 | Phase 3 per approved plan | CC |
| M2 | Description lengths fine; no issues found in copy scan (no "up to", no "free quote", no exclamation marks, no trademark) | — | — | — | — |
| M3 | "Export demand" mentioned as a general reason for stronger offers — permitted (lever 5); **no page tells a seller their own car's channel, score or eligibility** (grep: `export-eligible`, `recommended channel`, `score` absent from all public HTML) | — | ✅ | — | — |
| M4 | No "sell my Range Rover Sport" / "sell my Discovery" pages; RR Sport only covered inside `/sell-my-range-rover` | SEO | P2 | Phase 3 | CC |

### `/export`

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| E1 | Meta description 152 chars | SEO | P2 | Trim to ≤155 safely, ideally ≤150 | CC |
| E2 | External link to DriveClick Cyprus rendered 16 px tall | Accessibility | P1 | Covered by S7 | CC |
| E3 | Names Cyprus (deliberate, CLAUDE.md §8) | — | ✅ | — | — |

### `/how-it-works`

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| W1 | "The offer stands for seven days" and "paid… while we are still on your drive" — commitments pending Alex's confirmation (PENDING-INFO:128–129) | Trust / Legal | P1 decision | Confirm or amend in one place | Alex → CC |

### `/about`

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| A1 | No founder name, bio or photograph (two `AwaitingInfo` slots render nothing) | Trust / E-E-A-T | P1 | Supply | Sid/Alex → CC |
| A2 | "We also sell to exporters we work with" — fine; no address/phone on the page | Trust | P0 (via S2) | — | — |

### `/faq`

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| F1 | **Three questions with empty answers live** (non-runners; Cat N/S; part-exchange) | Bug / Trust / AEO | **P0** | Answer (needs Alex's decision) or hide unanswered entries in production | Alex → CC |
| F2 | FAQPage schema includes 14 of 17 visible questions — the three empty ones are excluded, so schema and page disagree in count | SEO | P1 | Resolved by F1 | CC |

### Guides (`/blog`, 12 posts, 5 categories)

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| B1 | Date shown as `2026-09-03` (ISO); no "last updated" | AEO / Design | P1 | Human format + `updatedAt` frontmatter → `dateModified` | CC |
| B2 | Author is "The Motor House" on all 12 | E-E-A-T | P2 | Named author once a person is public | Alex → CC |
| B3 | ABI salvage-code PDF link **404** in `/blog/what-is-a-category-n-write-off` | Bug / Trust | P1 | Re-source the current ABI code of practice URL; update `SOURCES.md` | CC |
| B4 | Three posts carry `AwaitingInfo` value slots (render nothing) — Range Rover values, Cat N value impact, Evoque/Velar/DS residuals | Content | P2 | Fill only with a valuation feed, per `SOURCES.md` gap notes | — |
| B5 | Category pages 92–234 words | SEO | P2 | Short intro per category | CC |
| B6 | 6–10 sub-24 px tap targets per post (tags, breadcrumbs, category) | Accessibility / Mobile | P1 | Covered by S7 | CC |
| B7 | Four guides have 151-char descriptions | SEO | P2 | Trim | CC |

### `/privacy`

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| L1 | "How long we keep it" has **no content** | Legal/compliance | **P0** | Retention period decision → copy | Sid/Alex → solicitor → CC |
| L2 | No controller name, company number, registered office, ICO number, or contact email for requests ("Contact us" with no means) | Legal/compliance | **P0** | S2 + ICO | Sid → CC |
| L3 | Does not mention the preferred-contact-method field or that WhatsApp/SMS may be used to reach the seller | Legal/compliance | P1 | One sentence under "What we collect" / "Why" | solicitor → CC |
| L4 | Photo retention not covered (PENDING-INFO:67) | Legal/compliance | P1 | Include in L1 | — |
| L5 | "Last updated 2026-08-29" while the source changed 15 Oct | Trust | P1 | Update the date when L1–L3 land | CC |
| L6 | Voice section present and accurate to the build; consent wording still draft | Legal/compliance | P1 | Solicitor | solicitor |

### `/terms`

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| L7 | "These terms cover selling your car to The Motor House ." — placeholder gap renders as a stray space before the full stop | Bug / Legal | **P0** | S2 | Sid → CC |
| L8 | No company identity block | Legal/compliance | **P0** | S2 | Sid → CC |
| L9 | Collection "anywhere in mainland UK", "payment by bank transfer before the car leaves", "offer stands 7 days", "settlement difference payable before collection" — all need Alex's sign-off as operating commitments | Legal / Trust | P1 decision | Confirm | Alex → solicitor |

### `/cookies`

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| L10 | `tmh-thank-you` not listed | Legal/compliance | P1 | Add | CC |
| L11 | Otherwise accurate: names `tmh-consent`, `tmh_agent`, `tmh_leads`, `tmh_agent_dismissed`; verified nothing non-essential is set before consent | — | ✅ | — | — |

### 404 page

| # | Issue | Category | Priority | Suggested fix | Owner |
|---|---|---|---|---|---|
| N1 | Carries `canonical` → `/` and full OG set | SEO | P2 | Omit canonical on not-found | CC |
| N2 | Returns correct 404 status, noindex, has H1 and CTA | — | ✅ | — | — |

### Routes that 404 by design

`/recently-purchased` (array empty), `/form-preview` (production-gated), `/contact` (no such page — consider adding once details exist; every "Contact us" phrase in the privacy policy has nowhere to point).

### Admin (rendered on the staging-wired local server under `ADMIN_DEV_BYPASS`; renders, not verifications)

| # | Page | Issue | Category | Priority | Owner |
|---|---|---|---|---|---|
| AD1 | all | No plate yellow anywhere (computed-style scan negative on four pages; test exists) | — | ✅ | — |
| AD2 | `/admin/follow-ups`, `/comparables`, `/review` | Empty states render correctly on seeded data | — | ✅ | — |
| AD3 | `/admin/settings` | Landed-cost rows empty by design; Decision panel on leads shows "not calculated" until filled | Content | P2 decision | Alex |
| AD4 | `/admin/pipeline` | Production still has select-only board; drag-and-drop on branch `pipeline` | — | P1 (merge) | Sid → CC |
| AD5 | `/admin/login` | Code box hidden (free-tier template); 2 auth emails/hour | UX | P2 | After SMTP |
| AD6 | all | Real-session verification last done 19 Oct by the owner; not repeated today | — | — | Sid |

---

## Part 6 — Security & data

| Check | Result | Evidence |
|---|---|---|
| RLS on every table | ✅ 15/15 enabled; `anon` and `authenticated` revoked from all tables; `authenticated` re-granted only through `is_admin()` policies on each table | `20261005120100_rls.sql`, `20261005210000_admin_users.sql`, `actuals.sql`, `agent.sql` |
| Anything readable/writable by anon | ✅ Nothing. Public writes go through server routes with the service role, rate-limited | lookup / photos / agent routes |
| service_role client-side | ✅ Not shipped. Only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are read server-side; `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel but unused by code | grep `process.env.*SUPABASE` |
| Secrets in repo / history | ✅ None. Only `.env.example` ever committed; `.gitignore` covers `.env*`; the `xi-api-key` hits are header names | `git log --all --name-only`, `git grep` |
| Admin gate | ✅ Every `/admin/**` page 307 → login; `/admin/search` 401; server actions call `currentAdmin()` (`inbox/actions.ts:60`, `pipeline/actions.ts:20`, `leads/[id]/actions.ts:22`) | live curl |
| Rate limiting / spam | ✅ Postgres-backed windows on lookup, agent chat, agent session, photo signing. **No CAPTCHA/Turnstile on the form** — acceptable for launch volume; revisit if spam appears | `lib/rate-limit.ts` |
| Security headers | ❌ HSTS only. No CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy | `curl -sI /` |
| Dependencies (high/critical) | ❌ 30 (2 critical, 28 high). Direct: `next` (critical, **applies**), `@vercel/blob` (high), `zod` (high), `vercel` CLI (dev). Most of the rest are transitive via the `vercel` CLI | `npm audit --json` |
| Cron endpoint | ✅ `/api/cron/enrich` 401 without `CRON_SECRET` | live curl |
| ElevenLabs LLM endpoint | ✅ POST without the bearer → 401 (`AGENT_LLM_SECRET` present) | live curl |
| ElevenLabs post-call webhook | 🟡 503 because `ELEVENLABS_WEBHOOK_SECRET` is absent — fails closed, which is the right failure | `app/api/agent/webhook/route.ts:24` |
| Backups | ❌ PITR off, no backups listed; production on free tier | Management API |

---

## What was not verified, and why

- End-to-end form submission, photo upload and each contact-method path on production — would create a production lead; staging is paused. Last real submission 15 Oct.
- Resend domain status via API — the key is send-only. DNS used instead.
- ElevenLabs plan / credit — key lacks `user_read`.
- Anthropic credit — no API.
- Supabase plan tier — not exposed by Management API; free-tier inferred from the auth-template refusal message.
- Search Console / Bing submission — no account access; verification metas confirmed absent.
- Real-session admin verification — not repeated today.
- Colour-contrast beyond Lighthouse's automated check (100/100 on six pages).
