# SESSION-PROMPTS.md — paste one per Claude Code session, in order

Each session: Claude Code re-reads CLAUDE.md and ARCHITECTURE.md, plans, waits for approval, builds, verifies against section 17, commits, pushes. Don't skip the plan step — it's where the drift gets caught.

Between sessions, do the things only you can do: keys, decisions, PENDING-INFO.md, and talking to Alex.

---

## Session 0 — close the loose ends and adopt v2

```
Three files have been replaced or added at the repo root: CLAUDE.md
(v2), ARCHITECTURE.md (new), SESSION-PROMPTS.md (new). Read all three
in full before anything else.

Then, in order:

1. Blog posts 8-12 are written but uncommitted from the last session.
   Verify the build passes, run the copy greps and the link checker,
   then commit and push them. One commit: "Complete Milestone 4: blog
   posts 8-12".

2. Reconcile the repo with CLAUDE.md v2. Anything the old CLAUDE.md
   said that v2 contradicts, v2 wins. List what changed in the spec
   and what, if anything, in the existing code is now out of line.
   Do not fix code in this session — list it.

3. Update PENDING-INFO.md with every new key and decision from
   ARCHITECTURE.md section 8 and CLAUDE.md sections 9-12: Supabase,
   Blob, DVLA, DVSA, Inngest, ElevenLabs, provenance and valuation
   provider choice, Maya's real name, admin allow-list emails.
   Group them under the phase that needs them.

4. Add .env.example entries for everything in ARCHITECTURE.md
   section 8, with comments saying which phase each is needed for.

Commit and push. Report the reconciliation list. No application code
in this session.
```

**Before Session 1, you do:** deploy the repo to Vercel (connect the GitHub repo, add the existing env vars), test a submission from your phone, apply for the DVLA VES key and DVSA MOT History credentials (both free, both take days), create a Supabase project and a Vercel Blob store. Put every key in Vercel and in your local `.env`.

---

## Session 1 — Phase B, part 1: Postgres and vehicle lookup

```
Phase B per CLAUDE.md section 13. Read ARCHITECTURE.md sections 2, 3
and 8 before planning.

Scope:

1. Supabase schema from ARCHITECTURE.md section 2 as SQL migrations
   under supabase/migrations/. Row-level security on every table. A
   seed script for settings with the defaults named in CLAUDE.md
   section 11.

2. Migrate lib/submissions.ts to Postgres behind the same interface.
   Move the Airtable implementation to lib/adapters/airtable.ts,
   unused. Every existing form path must still work end to end.

3. /api/vehicle/lookup exactly per ARCHITECTURE.md section 3:
   normalisation, rate limiting, 24h cache, DVLA then DVSA, partial
   failure handling, stub with dev banner when keys are missing.
   Typed VehicleIdentity and MotTest in lib/types.ts.

4. Form step 1 becomes identify: plate input → lookup → "Is this your
   car?" card per CLAUDE.md section 9 → confirm or "not my car" →
   manual entry fallback. On confirm, create the lead and the vehicle
   row, pre-fill make/model/year/mileage into the next step.

Constraints: no paid API calls anywhere. Keep the plate input as the
signature element. Card data in mono. Rate limit and cache must be
tested. Section 17 definition of done applies.

Plan first, wait for approval.
```

---

## Session 2 — Phase B, part 2: photos and the four-step form shell

```
Phase B continued. Read CLAUDE.md section 9 and ARCHITECTURE.md
section 4.

Scope:

1. Photo upload per ARCHITECTURE.md section 4: signed Blob uploads,
   guided shot list, previews, delete, 12 max, EXIF stripped on
   complete. Works on a phone camera roll and live camera.

2. Restructure the form into the four steps in CLAUDE.md section 9
   — identify / the car / the sale / you — with the condition grid,
   reason for selling, timeline, finance, fair-price-in-mind (stored,
   never echoed), others approached, contact window.

3. Persistence rule: lead exists from reg-confirm + first contact
   field; each step patches; abandonment at any step leaves a usable
   lead; operator alert on first persistence. Prove it by abandoning
   at each step in the browser and showing the lead state.

4. Keep the email fallback for photos in the auto-reply.

Plan first. Show me step 2 (the car) rendered before building 3
and 4 — the condition grid is the part most likely to feel like a
form instead of a conversation, and I want to react to it early.
```

**Before Session 3, you do:** decide Inngest vs Vercel cron with Claude Code's recommendation, confirm the admin allow-list emails, and agree the margin floors and landed-cost defaults with Alex — they go in the settings seed.

---

## Session 3 — Phase C, part 1: enrichment and the decision engine

```
Phase C per CLAUDE.md section 13. Read CLAUDE.md section 11 and
ARCHITECTURE.md section 5 in full.

Scope:

1. Background jobs. Recommend Inngest or Vercel cron with reasoning,
   wait for my answer, record it in ARCHITECTURE.md section 9.

2. lib/decision/score.ts as a pure, unit-tested function per
   ARCHITECTURE.md section 5, with the test cases listed there.
   Reasoning strings are human sentences.

3. The enrichment pipeline: trigger on lead created/updated
   (debounced), the seven steps, new enrichments row per run,
   operator alert with score + channel + reasoning + deep link.

4. Provenance and valuation adapters behind interfaces in
   lib/adapters/, stubbed, with a separate job each that is only
   triggerable from /admin. Cost logged per run.

Hard rule: there is no code path that makes or sends an offer, and
no code path that runs a paid check without a human pressing a
button. Grep-proof it.

Plan first, wait for approval.
```

---

## Session 4 — Phase C, part 2: the dashboard

```
Phase C continued. Read CLAUDE.md section 12 and ARCHITECTURE.md
section 7.

Scope:

1. /admin behind Supabase magic-link auth with the env allow-list.
   noindex on every page, excluded from sitemap and robots.

2. Inbox: score-sorted, channel badge, car, value band if present,
   seller timeline, time since submission, SLA marker past the
   settings sla_hours.

3. Lead detail: everything in CLAUDE.md section 12. Decision panel
   shows every number with where it came from and the enrichment
   version. Buttons: run provenance, run valuation (both disabled
   with reason if keys absent), make offer (a person types the
   amount, valid_until defaults to 7 days), pass, set next contact
   date, add note. Every change writes audit_log.

4. Pipeline kanban with status transitions and per-car P&L fields.
   Follow-ups view by next_contact_date. Settings page editing every
   key in the settings table with validation.

5. Comparables logger: the small form from CLAUDE.md section 12.

Design: same tokens and faces as the public site, denser spacing
allowed per CLAUDE.md section 5. No plate yellow anywhere in admin.

Plan first. Show me the inbox and the lead detail decision panel
rendered before building pipeline and settings.
```

**Before Session 5, you do:** pick Maya's real name, create the ElevenLabs account and agent, and read `agent/prompt.md` when Claude Code shows it — you approve every line of what she's allowed to say.

---

## Session 5 — Phase D, part 1: Maya in text mode

```
Phase D per CLAUDE.md section 13. Read CLAUDE.md section 10 and
ARCHITECTURE.md section 6 in full. They are the spec and the
guard-rails; do not loosen either.

Scope:

1. agent/prompt.md — the full system prompt. Show it to me and wait
   for approval before any integration code. It must encode every
   "never" in CLAUDE.md section 10 and the voice rules in section 4.

2. agent/knowledge/ — grounded pages only, each sourced from existing
   site copy or SOURCES.md. Nothing new that isn't already verified.

3. agent/guards.ts — the output guards per ARCHITECTURE.md section 6,
   unit-tested against a list of ways a model might try to state a
   price or a car fact. Blocked turns logged for /admin/review.

4. Tools per CLAUDE.md section 10, served from /api/agent/*, each
   validating the session belongs to the lead.

5. The widget in text mode: mounts silent after car confirmation,
   opt-in, "just the form" dismiss persisted for the session, stall
   detection, mindset questions, structured notes to the lead.

6. /admin/review — guard log and transcript viewer on lead detail.

Voice is the next session. Plan first.
```

---

## Session 6 — Phase D, part 2: voice

```
Phase D continued.

Scope:

1. Voice mode on the existing widget: push-to-talk and hands-free,
   WebRTC via the provider adapter, visible AI disclosure on first
   speech and in the widget, explicit recording consent before the
   mic opens, consent timestamp on the conversation row.

2. Transcript webhook → conversations row, cost logged.

3. Same guards run on voice turns before synthesis.

4. Graceful degradation: no mic permission, no WebRTC, provider down
   → text mode continues without error noise.

5. Cookies and privacy pages updated for voice data, retention
   stated, solicitor-review line added to PENDING-INFO.md.

Plan first. Then show me one full recorded session (text transcript)
of you playing a sceptical seller trying to get a price out of her.
```

---

## Session 7 — Phase E: compounding

```
Phase E per CLAUDE.md section 13. In priority order:

1. Comparables feed the Cyprus side of the landed-cost and margin
   model: median asking for model/year band from logged Cyprus
   comparables, shown in the decision panel with sample size.

2. Follow-up reminders to the operator (email digest each morning of
   leads with next_contact_date today or overdue). Never an automated
   message to a seller.

3. Enable paid provenance and valuation adapters if keys exist.

4. Motion pass per CLAUDE.md section 6 — Lenis and Motion installed
   now, the dark/light section transition and headline mask reveal
   first. Confirm the M1 components took motion without restructuring.

5. Lighthouse and accessibility pass across every public route.

6. Local city pages only if the trading address is confirmed in
   config/site.ts — otherwise skip and say so.

Plan first.
```

---

## Running rules for every session

- If a session's plan reveals that something in CLAUDE.md or ARCHITECTURE.md is wrong, say so and propose the edit before building. Spec drift was caught three times in v1 — keep catching it.
- Verify before writing any external claim. Log it in SOURCES.md as you write.
- Never estimate a figure. AwaitingInfo and a PENDING-INFO.md line.
- Commit per logical stage. Push at the end of every session unless told to hold.
- End every session with: what was built, what was verified and how, what's left, and anything that needs a decision from me.
