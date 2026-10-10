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
- [ ] **Data retention period** — how long lead data is kept before deletion. **Now also governs voice:** the privacy page says a written transcript is kept on the enquiry and the audio is not, but not for how long, so that sentence is incomplete until this is answered.  The privacy policy has an `AwaitingInfo` slot for it, and it governs photo, transcript and provenance retention from Phase B onward.

### Deployment

- [ ] **Vercel project connected** to the GitHub repo, with existing env vars added
- [ ] **End-to-end submission tested from a phone** — the Phase A acceptance test
- [ ] **Operator alert destination** — `OPERATOR_EMAILS`. A WhatsApp or Telegram webhook can come later.

### Decisions that change what gets built

- [ ] **Do we accept part-exchange, or purchase only?** The FAQ and form step 3 both need a definite answer.
- [ ] **Do we buy non-runners and Category N/S cars?** The FAQ has `AwaitingInfo` slots for both.
- [ ] **Is the two-hour response promise realistic seven days a week?** **The site states it unconditionally** — `/how-it-works`, the FAQ, the hero and three section components all promise two hours with no carve-out for weekends. Maya is the only place that admits the gap: asked directly about a Saturday she says she does not know and defers to a person, and `agent/guards.ts` blocks any weekend claim either way. That is an honest assistant in front of a promise the site has not qualified, which is the wrong way round. Either the promise holds seven days a week, or the copy needs the carve-out.  Breaking it once undermines the entire positioning.
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
- [ ] **`auth_config_read` and `auth_config_write` on `SUPABASE_ACCESS_TOKEN`** — blocks admin sign-in on production, and the only thing blocking it. The two are granted separately and both are needed: the write makes the change, the read proves it landed. `project_admin_write` is not the permission, despite being the first one the API names — it asks for that one first and only mentions `auth_config_write` once it is satisfied, so the first refusal looks like the whole answer. The token in use on 11 October 2026 had `project_admin_write` and neither auth permission, so `GET /v1/projects/{ref}/config/auth` was refused for `auth_config_read` and every `PATCH` for `auth_config_write`. Until they are added the hosted project keeps Site URL `http://localhost:3000` and an empty redirect allow-list, so a magic link clicked on production lands on localhost, and the magic-link template still carries no `{{ .Token }}` for the code the login page promises. `npm run configure-auth https://themotorhouse.vercel.app` closes this in one run and prints every value back.
- [ ] **`analytics_logs_read` on `SUPABASE_ACCESS_TOKEN`** — not blocking, but it is the difference between diagnosing a failed auth email and guessing. Without it `GET /analytics/endpoints/logs.all` is refused and an auth email that Supabase accepted but the sender rejected looks exactly like an email that was never requested. Needed before custom SMTP is switched on.
- [ ] **A verified Resend sending domain, and the `EMAIL_FROM` that goes with it** — `EMAIL_FROM` in `.env.local` is `themotorhouse.uk@gmail.com`, and Resend will not send from a domain it has not verified; `gmail.com` can never be one, because nobody can add DNS records to it. The SMTP credentials themselves are good — `smtp.resend.com:465`, user `resend`, the API key as the password, authenticated and accepted a sender and recipient in a probe that stopped before `DATA`. So custom SMTP for auth email is one verified domain away, and `scripts/configure-auth.mjs --smtp sender@domain` is waiting for it. Two things to confirm: what `EMAIL_FROM` is set to in Vercel production (it is marked sensitive, so it cannot be read back from the CLI), and whether any domain is verified in the Resend account — the current `RESEND_API_KEY` is send-only and cannot list them, so a key with `domains:read` would answer it. This also decides whether the seller auto-reply and operator alerts are landing at all. Until then auth email uses Supabase's own sender, capped at two an hour.

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
- [ ] **`ELEVENLABS_WEBHOOK_SECRET`** — created in the ElevenLabs dashboard, but not yet in `.env.local`; checked four times across two sessions and absent each time. Until it lands, `/api/agent/webhook` returns 503 and **no voice transcript is stored**, because an unsigned call is rejected rather than trusted. Put it in `.env.local` and Claude pushes it to all three Vercel environments.
- [ ] **Mic test** — the one part of voice nobody has exercised. Claude has no microphone and cannot drive a WebRTC session, so ElevenLabs' speech-to-text, its text-to-speech and the consent-to-microphone sequence are untested end to end. Run it from `/admin/review` → "Test Maya (voice)". Everything behind it — the endpoint, the guards, the notes, the logging — has been tested on production through the admin path.
- [ ] **Supabase CLI re-authentication** — `npx supabase db push` now fails with `AccessTokenRequiredError`, so `supabase/migrations/20261010000000_voice_transcript.sql` is written but **not applied**. The post-call webhook writes to `conversations.voice_transcript` and will fail until it is. Run `npx supabase login` (or set `SUPABASE_ACCESS_TOKEN`) then `npx supabase db push`.
- [x] ~~ElevenLabs post-call webhook~~ — created in the dashboard, pointed at `/api/agent/webhook`. Only its signing secret is outstanding, above.
- [ ] **Voice consent wording** — `components/agent/VoiceConsent.tsx` carries placeholder copy, marked on screen as "Draft wording, pending legal review". It must be replaced by the solicitor's text before launch, and the same wording added to the privacy and cookie policies.
- [ ] **Voice legal review** — AI disclosure wording, recording consent wording, and transcript retention. The privacy and cookies pages now describe the assistant, the voice option, the processors (Anthropic and ElevenLabs) and the three cookies it sets; the consent panel copy in `components/agent/VoiceConsent.tsx` is marked on screen as draft. All of it goes to the same solicitor as the Phase A review, together, since the consent panel and the policy must say the same thing.

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
- ~~Resend API key~~ — live. The *verified sending domain* half of this was closed too early: see the open item in Phase C.
- ~~Seller photo upload flow~~ — now Phase B scope, not a later task
