# PENDING-INFO.md

Everything the build needs that isn't known yet. Each item appears in the codebase as an `AWAITING_RESPONSE` marker, an `<AwaitingInfo />` component, or an absent environment variable. Delete a line here when the value lands.

**Restructured 5 October 2026 for CLAUDE.md v2.** Grouped by the phase that needs it (CLAUDE.md section 13), so nothing is chased earlier than it has to be. Within each phase, launch blockers come first.

Phases: **A** ship what exists · **B** live vehicle data + storage · **C** form v2, enrichment, dashboard · **D** Maya · **E** compounding.

---

## Phase A — before the site goes public

These block a public launch regardless of what gets built afterwards.

### Business identity

- [ ] **Swap the temporary business Gmail for a Google Workspace address** — `themotorhouse.uk@gmail.com` is in `OPERATOR_EMAILS` and `ADMIN_ALLOWLIST` as a placeholder. At launch it becomes a Workspace address on the real domain. Changing it means updating both variables in all three Vercel environments and re-running `npm run sync-admins`, because the allow-list and the `admin_users` table must agree.

- [ ] **Domain name**
- [ ] **Business phone number** — the one sellers will actually call
- [ ] **Business email address**
- [ ] **Registered company name** (exact, as at Companies House)
- [ ] **Company registration number**
- [ ] **Registered office address**
- [ ] **VAT number** (if VAT registered)
- [ ] **Trading address** — where cars are handled, if different from registered office
- [ ] **ICO data protection registration number** — likely required as a data controller

### Legal sign-off

- [ ] **Solicitor review of the privacy policy, the terms of service, and the outstanding-finance blog post** — all three are drafted and all three make procedural claims. CLAUDE.md v2 section 16 adds the blog post to this list.
- [ ] **Data retention period** — how long lead data is kept before deletion. The privacy policy has an `AwaitingInfo` slot for it, and it governs photo, transcript and provenance retention from Phase B onward.

### Deployment

- [ ] **Vercel project connected** to the GitHub repo, with existing env vars added
- [ ] **End-to-end submission tested from a phone** — the Phase A acceptance test
- [ ] **Operator alert destination** — `OPERATOR_EMAILS`. A WhatsApp or Telegram webhook can come later.

### Decisions that change what gets built

- [ ] **Do we accept part-exchange, or purchase only?** The FAQ and form step 3 both need a definite answer.
- [ ] **Do we buy non-runners and Category N/S cars?** The FAQ has `AwaitingInfo` slots for both.
- [ ] **Is the two-hour response promise realistic seven days a week?** If not, change it to a promise we can always keep. Breaking it once undermines the entire positioning. **Maya is affected:** asked directly whether the two hours holds on a Saturday she says she does not know and defers to a person, which is correct but is an obvious gap a seller can find in one question. `agent/guards.ts` blocks any weekend service claim until this is answered.
- [ ] **Do we publish an indicative price range, or only firm offers by phone?** Recommendation remains firm offers only — it protects the no-deductions promise and keeps Maya's price refusal coherent.

---

## Phase B — live vehicle data and storage

### Keys and accounts

- [ ] **Supabase project** — URL, anon key, service role key. Postgres, Auth and RLS all come from this one project.
- [ ] **Vercel Blob store** — `BLOB_READ_WRITE_TOKEN`, for seller photos.
- [ ] **DVLA Vehicle Enquiry Service API key** — free, via the DVLA developer portal. Takes days. Enables reg → make, model, year, colour, fuel, MOT status.
- [ ] **DVSA MOT History API credentials** — free, but four values: client id, client secret, API key and scope. OAuth2 client-credentials. Takes days. Enables mileage history and advisory data.

Both government APIs are applied for separately and neither is instant. Apply before Session 1 or Phase B stalls on paperwork.

### Decisions

- [ ] **Photo retention and deletion policy** — how long seller photos live in Blob after a lead closes, and who deletes them. Needed for the privacy policy as well as the code.

---

## Phase C — enrichment, decision engine and dashboard

### Keys and access

- [x] ~~Admin allow-list emails~~ — set 5 October 2026, two addresses, pushed to all three Vercel environments and reconciled into `admin_users` with `npm run sync-admins`.
- [ ] **Inngest keys** — `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`, only if Inngest wins the job-runner decision below.
- [ ] **Supabase Auth redirect allow-list** — blocks admin sign-in on every deployed environment. Supabase only redirects a magic link to its Site URL plus the URIs on the allow-list, and a new project ships with Site URL `http://localhost:3000` and an empty list, so a link clicked on production currently has nowhere valid to land. Needs, in Authentication → URL Configuration:
  - Site URL: the production origin
  - Redirect URLs: `https://<production-domain>/admin/auth/callback` and `https://*-themotorhouse.vercel.app/admin/auth/callback` for previews
  There is no `supabase/config.toml` in the repo and no management access token on this machine, so this cannot be set or read from the CLI as things stand — it is a dashboard change, or a `supabase init` plus `supabase config push` if we want it version-controlled. Local sign-in on port 3000 works without it.

### Decisions

- [x] ~~Inngest or Vercel cron~~ — decided 5 October 2026: Vercel cron plus an inline trigger. Recorded in ARCHITECTURE section 9.
- [ ] **Margin floors** — export default £3,500, domestic default £500. Confirm with Alex before they go into the settings seed.
- [ ] **Landed-cost defaults** — shipping, marine insurance, Cyprus clearance, Cyprus registration, Cyprus VAT handling. Every one is a settings row, editable later without a deploy, but the seed needs real starting numbers rather than invented ones.
- [ ] **Recon default and CRA contingency percentage** — same seed, same rule: no invented figures.
- [ ] **Days-to-sell table** — expected days to sell by model or segment. Drives the domestic channel test.
- [ ] **SLA hours** — the inbox marks a lead breached past this. Two hours matches the public promise; confirm it is the internal target too.
- [ ] **Target models list** — currently hardcoded in `config/site.ts` as `TARGET_MODELS`. v2 section 11 puts it in the settings table so Alex can change it without a deploy. Confirm the list before it moves.

---

## Phase D — Maya, the virtual employee

- [ ] **Maya's real name** — working name only, now a single value in `config/site.ts` as `AGENT.name`, with `agent/prompt.md` templated on `{{AGENT_NAME}}`. Changing it is a one-line edit, so the decision can wait until the prompt has been read.
- [ ] **ElevenLabs account** — `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID`. Needed **before Session 6**, not Session 5: text mode runs through our own endpoint so the guards can see every turn, and ElevenLabs enters as voice transport calling that same endpoint as a custom LLM (verified against their custom-LLM docs, ARCHITECTURE section 9).
- [ ] **Voice choice** — which ElevenLabs voice. It is the first thing a seller hears, so it belongs with the brand decisions rather than the technical ones. Before Session 6.
- [ ] **`ANTHROPIC_API_KEY`** — the model behind Maya. Needed from step 3 of Session 5 onward, not for the prompt itself. The model name is a settings row (`agent_model`, default `claude-sonnet-5-5`) so it can change without a deploy.
- [ ] **Approval of `agent/prompt.md`** — you approve every line of what Maya is allowed to say, per SESSION-PROMPTS.md. Claude Code shows it before any integration code.
- [ ] **Supabase CLI re-authentication** — `npx supabase db push` now fails with `AccessTokenRequiredError`, so `supabase/migrations/20261010000000_voice_transcript.sql` is written but **not applied**. The post-call webhook writes to `conversations.voice_transcript` and will fail until it is. Run `npx supabase login` (or set `SUPABASE_ACCESS_TOKEN`) then `npx supabase db push`.
- [ ] **ElevenLabs post-call webhook** — create it in the dashboard, point it at `https://<production>/api/agent/webhook`, and put the generated signing secret in `.env.local` as `ELEVENLABS_WEBHOOK_SECRET`. Unsigned and unverified calls are rejected, so until this exists no voice transcript is stored.
- [ ] **Voice consent wording** — `components/agent/VoiceConsent.tsx` carries placeholder copy, marked on screen as "Draft wording, pending legal review". It must be replaced by the solicitor's text before launch, and the same wording added to the privacy and cookie policies.
- [ ] **Voice legal review** — AI disclosure wording, recording consent wording, and transcript retention, added to the privacy and cookie policies. Goes to the same solicitor as the Phase A review.

---

## Phase E — compounding

- [ ] **Provenance provider choice** — HPI or Experian AutoCheck. Then `PROVENANCE_PROVIDER` and `PROVENANCE_API_KEY`. Paid per check, run only from `/admin` by a human.
- [ ] **Valuation provider choice** — UK Vehicle Data or CheckCarDetails first, CAP HPI later per CLAUDE.md section 2. Then `VALUATION_PROVIDER` and `VALUATION_API_KEY`. This is also what unblocks the value-band `AwaitingInfo` slots in the blog.
- [ ] **Cyprus comparables** — real logged examples of what target models ask and sell for in Cyprus. The comparables logger collects them; it needs a first batch from Alex to be useful.
- [ ] **Catchment cities** — the 12 largest towns we collect from, for local landing pages. Only build these once the trading address is confirmed, and never with placeholder content.

---

## Credibility — not phase-bound, but the site feels thin without them

- [ ] **Logo** — wordmark at minimum, SVG
- [ ] **Favicon / app icons**
- [ ] **Real names and photographs** of the people behind the business, for `/about`
- [ ] **Short founder bio** — 60–100 words, why this business exists
- [ ] **Collection area** — how far from base we collect free, and whether there is a limit
- [ ] **Payment method and timing** — confirm the exact promise we can make
- [ ] **Opening hours**
- [ ] **Hero photography** — one strong daylight shot of a real car we bought. No stock.
- [ ] **Recently purchased cars** — model, year, mileage, photos. The page 404s and the home section renders nothing until car one.
- [ ] **Real seller feedback** — only after real transactions. Never write these ourselves.
- [ ] **Insurance details** — motor trade policy number, if we want it as a trust signal

---

## SEO and analytics

- [ ] **Google Business Profile** — needs a verified address
- [ ] **Social profiles** — Instagram, Facebook, LinkedIn URLs for `Organization` schema `sameAs`
- [ ] **Google Search Console** verification
- [ ] **Analytics choice** — Plausible or GA4. The consent gate is built and empty; the chosen provider drops into `AnalyticsGate` and inherits the blocking.

---

## Nice to have / later

- [ ] **Dedicated Range Rover Sport page** — currently covered on `/sell-my-range-rover`. It has real search volume of its own and warrants `/sell-my-range-rover-sport` with its own hand-written copy.
- [ ] **Plate typeface decision** — the registration input uses letter-spaced condensed bold as the sanctioned fallback. Decide whether to license a Charles Wright lookalike.

---

## Resolved

Kept briefly so nobody re-chases them.

- ~~Trading name~~ — The Motor House, confirmed 29 August 2026
- ~~Airtable base ID and API key~~ — live; superseded by Supabase from Phase B
- ~~Resend API key and verified sending domain~~ — live
- ~~Seller photo upload flow~~ — now Phase B scope, not a later task
