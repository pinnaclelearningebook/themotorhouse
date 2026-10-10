import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The two constraints that matter most in this repository, enforced by
 * the test suite rather than by remembering to run a grep.
 *
 *   1. No code path calls a paid API automatically. Provenance and
 *      valuation cost money per call and are only ever run by a human
 *      pressing a button in /admin.
 *   2. No code path makes, sends or calculates an offer. The decision
 *      engine recommends; a person types the number.
 *
 * Both come from CLAUDE.md sections 1 and 17. If someone adds a call to
 * runProvenance from the enrichment pipeline, this fails before it ships.
 */

const ROOTS = ["app", "lib", "components", "config"];
const ROOT_DIR = process.cwd();

/** Where a paid adapter may legitimately be called from. */
const PAID_CALL_ALLOWED = [
  /^lib\/adapters\//, // the definitions themselves
  /^app\/admin\//, // human-triggered from the dashboard
  /^app\/api\/admin\//, // the routes those buttons hit
];

/** Where channel, score and eligibility may appear. Never seller-facing. */
const INTERNAL_ONLY_ALLOWED = [
  /^lib\//,
  /^app\/admin\//,
  /^components\/admin\//, // admin UI is internal by definition
  /^config\/settings-schema\.ts$/,
  /^app\/api\/admin\//,
  /^app\/api\/cron\//,
  /^app\/actions\//,
];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
        out.push(relative(ROOT_DIR, full));
      }
    }
  };
  for (const root of ROOTS) walk(join(ROOT_DIR, root));
  return out;
}

/**
 * Comments describing a rule must not trip the rule. Strips block and
 * line comments before any pattern is applied.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function allowed(file: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(file));
}

const FILES = sourceFiles().map((file) => ({
  file,
  code: stripComments(readFileSync(join(ROOT_DIR, file), "utf8")),
}));

describe("no automatic paid API calls", () => {
  it("finds at least one source file, so the walk is not silently empty", () => {
    expect(FILES.length).toBeGreaterThan(30);
  });

  it("calls runProvenance only from an adapter or /admin", () => {
    const offenders = FILES.filter(
      ({ file, code }) =>
        /\brunProvenance\s*\(/.test(code) && !allowed(file, PAID_CALL_ALLOWED),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("calls runValuation only from an adapter or /admin", () => {
    const offenders = FILES.filter(
      ({ file, code }) =>
        /\brunValuation\s*\(/.test(code) && !allowed(file, PAID_CALL_ALLOWED),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("never imports a paid adapter into the enrichment pipeline or cron", () => {
    const offenders = FILES.filter(
      ({ file, code }) =>
        /^(lib\/decision\/|app\/api\/cron\/)/.test(file) &&
        /from\s+["'].*adapters\/(provenance|valuation)["']/.test(code),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("guards both adapters behind an explicit configuration check", () => {
    for (const name of ["provenance", "valuation"]) {
      const source = readFileSync(
        join(ROOT_DIR, `lib/adapters/${name}.ts`),
        "utf8",
      );
      expect(source, name).toMatch(/if \(!is\w+Configured\(\)\) return null;/);
    }
  });
});

describe("no offer path", () => {
  it("defines no function that makes, sends or calculates an offer", () => {
    const banned =
      /\b(make|send|create|generate|calculate|suggest|auto)[A-Za-z]*Offer\s*[=(]/i;
    const offenders = FILES.filter(({ code }) => banned.test(code)).map(
      ({ file }) => file,
    );
    expect(offenders).toEqual([]);
  });

  it("writes to the offers table only from /admin", () => {
    // Writes, specifically. Reading an accepted offer is how the pipeline
    // knows what a car cost, and banning the read would push that query
    // into a page component for no safety gain. Creating or changing an
    // offer outside /admin is the thing that must never happen.
    const write = /\.\s*(insert|update|upsert|delete)\s*\(/;
    const offenders = FILES.filter(({ file, code }) => {
      if (allowed(file, [/^app\/admin\//, /^app\/api\/admin\//])) return false;
      for (const match of code.matchAll(/from\(["']offers["']\)/g)) {
        const after = code.slice(
          match.index + match[0].length,
          match.index + match[0].length + 200,
        );
        if (write.test(after)) return true;
      }
      return false;
    }).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("returns a max bid, never an offer amount, from the decision engine", () => {
    const source = readFileSync(
      join(ROOT_DIR, "lib/decision/score.ts"),
      "utf8",
    );
    expect(source).toMatch(/maxBidExport/);
    expect(source).not.toMatch(/\boffer(Amount|Price|Value)\b/i);
  });
});

describe("decision output stays internal", () => {
  it("never renders channel, eligibility or score in seller-facing code", () => {
    const internal = /\b(exportEligible|export_eligible|recommendedChannel|recommended_channel|channel_decided)\b/;
    const offenders = FILES.filter(
      ({ file, code }) =>
        internal.test(code) && !allowed(file, INTERNAL_ONLY_ALLOWED),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});

describe("the admin dev bypass cannot reach production", () => {
  it("is guarded by NODE_ENV === development", () => {
    const source = readFileSync(join(ROOT_DIR, "lib/admin/auth.ts"), "utf8");
    const bypass = source.indexOf("ADMIN_DEV_BYPASS");
    expect(bypass, "ADMIN_DEV_BYPASS should exist or this test is stale")
      .toBeGreaterThan(-1);
    // The NODE_ENV check must be in the same condition, before it.
    const guard = source.lastIndexOf(
      'process.env.NODE_ENV === "development"',
      bypass,
    );
    expect(guard).toBeGreaterThan(-1);
    expect(bypass - guard).toBeLessThan(120);
  });

  it("is the only bypass in the admin auth path", () => {
    const source = stripComments(
      readFileSync(join(ROOT_DIR, "lib/admin/auth.ts"), "utf8"),
    );
    const returnsSession = source.match(/return \{ email/g) ?? [];
    // One for the dev bypass, one for the real path. A third would mean
    // someone added another way in.
    expect(returnsSession.length).toBe(2);
  });
});

describe("the decision engine is pure", () => {
  it("does no IO", () => {
    const source = stripComments(
      readFileSync(join(ROOT_DIR, "lib/decision/score.ts"), "utf8"),
    );
    expect(source).not.toMatch(/\bawait\b/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bdb\s*\(\)/);
  });
});

describe("the agent endpoint", () => {
  const chat = readFileSync(
    join(ROOT_DIR, "app/api/agent/chat/route.ts"),
    "utf8",
  );

  it("checks the kill switch before spending anything", () => {
    // Nothing may be bought before agent_enabled is read. If the switch
    // check drifts below the model call, turning Maya off stops her
    // replying but not costing.
    const switchAt = chat.search(/if \(mode === "off"\)/);
    const modelAt = chat.search(/await runTurn\(/);
    expect(switchAt).toBeGreaterThan(-1);
    expect(modelAt).toBeGreaterThan(-1);
    expect(switchAt).toBeLessThan(modelAt);
  });

  it("resolves the session from the cookie, never from the body", () => {
    // A lead id in the request body would let anyone read or write any
    // seller's record by guessing one.
    expect(chat).toMatch(/resolveSession\(\)/);
    expect(chat).not.toMatch(/body\s*\.\s*leadId/);
    const session = readFileSync(join(ROOT_DIR, "lib/agent/session.ts"), "utf8");
    expect(session).toMatch(/session_token/);
  });

  it("guards the model's turn before it reaches the seller", () => {
    const modelAt = chat.search(/await runTurn\(/);
    const guardAt = chat.search(/runGuards\(/);
    const respondAt = chat.lastIndexOf("NextResponse.json({");
    expect(modelAt).toBeLessThan(guardAt);
    expect(guardAt).toBeLessThan(respondAt);
  });

  it("stores the blocked text but never returns it", () => {
    // The transcript holds what the seller saw. The original lives in
    // agent_blocks alone, so re-reading a conversation cannot resurface a
    // number nobody stood behind.
    expect(chat).toMatch(/agent_blocks/);
    expect(chat).toMatch(/original:\s*verdict\.original/);
    expect(chat).toMatch(/reply:\s*outgoing/);
  });

  it("fails the kill switch closed", () => {
    const settings = readFileSync(
      join(ROOT_DIR, "lib/agent/settings.ts"),
      "utf8",
    );
    // Anything other than exactly true is off, including a missing row,
    // a string, or an unreadable settings table.
    expect(settings).toMatch(/enabled:\s*false/);
    expect(settings).toMatch(/=== true/);
  });

  it("never sends an empty completion to the seller", () => {
    // claude-sonnet-5-5 thinks by default and thinking tokens come out of
    // max_tokens, so a long system prompt with a modest ceiling produced
    // an empty text block and a blank chat bubble behind a 200. Thinking
    // is off, and an empty completion is now an error rather than a
    // message.
    const provider = readFileSync(join(ROOT_DIR, "agent/provider.ts"), "utf8");
    expect(provider).toMatch(/thinking:\s*\{\s*type:\s*"between_tools"\s*\}/);
    // A turn that is only tool calls is legitimately textless, so the
    // emptiness check must account for that rather than firing on it.
    expect(provider).toMatch(/if \(!text && toolUses\.length === 0\)/);
    expect(provider).toMatch(/throw new Error\(\s*`model returned no text/);
  });

  it("guards the development force-on behind NODE_ENV", () => {
    // Same standard as ADMIN_DEV_BYPASS. Next sets NODE_ENV=production for
    // every build, so this cannot be switched on in a deployed
    // environment by setting the variable in Vercel.
    const settings = readFileSync(
      join(ROOT_DIR, "lib/agent/settings.ts"),
      "utf8",
    );
    const guard = settings.match(
      /process\.env\.NODE_ENV === "development"[\s\S]{0,120}?AGENT_DEV_FORCE_ON/,
    );
    expect(guard, "AGENT_DEV_FORCE_ON must be behind a NODE_ENV check").not.toBeNull();
  });

  it("calls no paid adapter", () => {
    for (const file of ["app/api/agent/chat/route.ts", "agent/provider.ts", "agent/tools.ts"]) {
      const code = readFileSync(join(ROOT_DIR, file), "utf8");
      expect(code).not.toMatch(/runProvenance|runValuation/);
    }
  });

  it("lets Maya write no field that could be mistaken for an offer", () => {
    const tools = readFileSync(join(ROOT_DIR, "agent/tools.ts"), "utf8");
    for (const forbidden of [
      "indicative_offer",
      "firm_offer",
      "channel_decided",
      "channel_recommended",
      "sold_price",
    ]) {
      expect(
        tools.includes(forbidden),
        `agent tools must not write ${forbidden}`,
      ).toBe(false);
    }
    expect(tools).not.toMatch(/from\(["']offers["']\)/);
  });
});

describe("the agent tool loop", () => {
  const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
  const tools = readFileSync(join(ROOT_DIR, "agent/tools.ts"), "utf8");

  it("bounds the number of tool rounds", () => {
    // A model that keeps calling tools without answering spends money in a
    // circle while the seller watches a typing indicator.
    expect(run).toMatch(/MAX_TOOL_ROUNDS\s*=\s*\d+/);
    expect(run).toMatch(/round <= MAX_TOOL_ROUNDS/);
  });

  it("validates every tool input with its Zod schema before running it", () => {
    // The wire schemas are instructions to a model; the Zod schemas decide
    // what is actually accepted. Each writing tool must parse first.
    for (const tool of ["set_field", "append_lead_note"]) {
      expect(
        run.includes(`toolSchemas.${tool}.safeParse`),
        `${tool} must be validated before it runs`,
      ).toBe(true);
    }
  });

  it("exposes only tools that do something", () => {
    /**
     * CLAUDE.md section 10 lists six. Two of them — go_to_step and
     * trigger_photo_guide — set an effect that the chat endpoint returned
     * and no component ever read, so calling them moved nothing and
     * returned ok. She could then tell a seller she had taken them to a
     * step they were not on, and nothing could catch it, because the tool
     * really did succeed.
     *
     * They are out until the form consumes the effect. This list is the
     * record of that, so putting one back means coming through here.
     */
    const declared = [...tools.matchAll(/^\s{4}name: "([a-z_]+)",$/gm)].map(
      (m) => m[1],
    );
    expect(new Set(declared)).toEqual(
      new Set([
        "get_vehicle_context",
        "read_form_state",
        "set_field",
        "append_lead_note",
      ]),
    );

    // And nothing claims the capability anywhere else.
    const prompt = readFileSync(join(ROOT_DIR, "agent/prompt.md"), "utf8");
    expect(prompt).not.toMatch(/go_to_step|trigger_photo_guide/);
    const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
    expect(run).not.toMatch(/goToStep|photoGuide/);
  });

  it("keeps the wire schemas and the Zod schemas in step", () => {
    // Two hand-written lists drift. This fails when one gains a tool the
    // other does not have.
    const wire = [...tools.matchAll(/^\s{4}name: "([a-z_]+)",$/gm)].map((m) => m[1]);
    const zod = [...tools.matchAll(/^\s{2}([a-z_]+): z\.object\(/gm)].map((m) => m[1]);
    expect(new Set(wire)).toEqual(new Set(zod));
  });
});

describe("agent tool writes report honestly", () => {
  const tools = readFileSync(join(ROOT_DIR, "agent/tools.ts"), "utf8");

  it("confirms every write before reporting success", () => {
    // Maya tells the seller what she has saved. A write that fails
    // silently makes her a liar, which is the one thing this brand cannot
    // afford. Both writing tools must destructure and check `error`.
    const writes = tools.split("export async function").slice(1);
    for (const fn of writes) {
      const name = fn.slice(0, fn.indexOf("(")).trim();
      if (!/setField|appendLeadNote/.test(name)) continue;
      expect(fn, `${name} must capture the error`).toMatch(/const \{ error \}/);
      expect(fn, `${name} must act on the error`).toMatch(/if \(error\)/);
    }
  });

  it("rejects values a database enum would refuse", () => {
    // "fairly soon" is a plausible answer that Postgres rejects. Without
    // this it passed validation, failed the write, and was reported saved.
    expect(tools).toMatch(/FIELD_ENUMS/);
    for (const field of ["timeline", "service_history", "finance_outstanding"]) {
      expect(tools.includes(`${field}:`), `${field} needs its enum`).toBe(true);
    }
  });
});

describe("the model call cannot hang", () => {
  it("abandons a call that does not return promptly", () => {
    // fetch has no default timeout. A hung call was observed holding a
    // request open for sixty minutes before the socket gave up — on
    // Vercel that spends the whole function budget while the seller
    // watches a typing indicator.
    const provider = readFileSync(join(ROOT_DIR, "agent/provider.ts"), "utf8");
    expect(provider).toMatch(/MODEL_TIMEOUT_MS\s*=\s*[\d_]+/);
    // The turn's remaining budget when the loop supplies one, falling
    // back to the per-call ceiling.
    expect(provider).toMatch(
      /signal:\s*AbortSignal\.timeout\(opts\.timeoutMs \?\? MODEL_TIMEOUT_MS\)/,
    );
  });
});

describe("a turn is bounded end to end", () => {
  it("budgets the whole turn, not just one model call", () => {
    // Five tool rounds at thirty seconds each is two and a half minutes
    // of a seller watching a typing indicator, and most of a Vercel
    // function's budget. One deadline covers the turn.
    const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
    expect(run).toMatch(/TURN_BUDGET_MS\s*=\s*[\d_]+/);
    expect(run).toMatch(/const deadline = Date\.now\(\) \+ TURN_BUDGET_MS/);
    expect(run).toMatch(/timeoutMs: remaining/);
  });
});

describe("notes are not written twice", () => {
  it("drops a repeat of the same topic and words", () => {
    // Observed live: the model retried append_lead_note after an
    // ambiguous result and the seller's reason for selling landed twice,
    // in the one place an operator reads before ringing them.
    const tools = readFileSync(join(ROOT_DIR, "agent/tools.ts"), "utf8");
    expect(tools).toMatch(/const duplicate = existing\.some/);
    expect(tools).toMatch(/if \(duplicate\) return/);
    // Compared case- and whitespace-insensitively, since a retry rarely
    // reproduces the original byte for byte.
    expect(tools).toMatch(/toLowerCase\(\)\.replace\(/);
  });
});

describe("the review page reports production, not the local override", () => {
  it("shows the stored setting rather than the effective one", () => {
    // A dashboard reading "on" because of a developer's local flag would
    // tell an operator Maya was live when she was not — the dev-bypass
    // mistake in CLAUDE.md section 17 wearing a different hat.
    const page = readFileSync(
      join(ROOT_DIR, "app/admin/(workspace)/review/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/settings\.storedEnabled \? "on" : "off"/);
    expect(page).not.toMatch(/settings\.enabled \? "on" : "off"/);
    // And it says so when the two disagree.
    expect(page).toMatch(/settings\.enabled && !settings\.storedEnabled/);
  });
});

describe("the scripted-reply hook cannot run in production", () => {
  it("is guarded by NODE_ENV, like the other development switches", () => {
    const provider = readFileSync(join(ROOT_DIR, "agent/provider.ts"), "utf8");
    const fn = provider.slice(provider.indexOf("function scriptedReplyForTests"));
    // The check must come first and must be a hard return, so no value of
    // the variable can reach a deployed environment.
    expect(fn).toMatch(
      /if \(process\.env\.NODE_ENV === "production"\) return null;/,
    );
    const guardAt = fn.indexOf('NODE_ENV === "production"');
    const readAt = fn.indexOf("AGENT_TEST_SCRIPTED_REPLY");
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(readAt);
  });
});

describe("the voice surfaces", () => {
  const llm = readFileSync(join(ROOT_DIR, "app/api/agent/llm/[[...openai]]/route.ts"), "utf8");
  const webhook = readFileSync(
    join(ROOT_DIR, "app/api/agent/webhook/route.ts"),
    "utf8",
  );
  const voiceSession = readFileSync(
    join(ROOT_DIR, "app/api/agent/voice-session/route.ts"),
    "utf8",
  );
  const voice = readFileSync(join(ROOT_DIR, "lib/agent/voice.ts"), "utf8");

  it("checks the shared secret before anything else", () => {
    // An unauthenticated caller must not learn whether Maya is on, let
    // alone spend a model call finding out.
    const secretAt = llm.search(/hasLlmSecret\(/);
    const settingsAt = llm.search(/await agentSettings\(\)/);
    const modelAt = llm.search(/streamVoiceTurn\(/);
    expect(secretAt).toBeGreaterThan(-1);
    expect(secretAt).toBeLessThan(settingsAt);
    expect(settingsAt).toBeLessThan(modelAt);
  });

  it("compares the secret in constant time", () => {
    expect(voice).toMatch(/timingSafeEqual/);
    expect(voice).not.toMatch(/presented === expected/);
  });

  it("applies the same kill switch, turn cap and guards as text", () => {
    expect(llm).toMatch(/if \(!settings\.enabled\)/);
    expect(llm).toMatch(/turnCount >= settings\.maxTurns/);
    expect(llm).toMatch(/agent_blocks/);
    // The guards now run inside the release loop, which is where they
    // have to be for streaming to be safe at all.
    const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
    expect(run).toMatch(/runGuards\(prefix/);
  });

  it("guards the prefix, not the sentence, before releasing speech", () => {
    // Each completed sentence is checked against everything said so far in
    // the turn. Guarding a sentence alone would let a price through in
    // pieces: no single fragment holds both the number and what makes it
    // a price.
    const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
    expect(run).toMatch(/const prefix = `\$\{released\}/);
    expect(run).toMatch(/runGuards\(prefix, opts\.guardContext, \{/);
    // And releasing stops at the first failure.
    expect(run).toMatch(/yield blockOn\(verdict\);\s*return;/);
  });

  it("caps spoken replies shorter than typed ones", () => {
    expect(llm).toMatch(/VOICE_MAX_TOKENS\s*=\s*\d+/);
    expect(llm).toMatch(/Math\.min\(settings\.maxOutputTokens, VOICE_MAX_TOKENS\)/);
  });

  it("caches the invariant half of the prompt", () => {
    // The prompt and knowledge are identical on every request and are by
    // far the larger half; the vehicle and form state are not and must
    // not be cached with them.
    const provider = readFileSync(join(ROOT_DIR, "agent/provider.ts"), "utf8");
    expect(provider).toMatch(/cache_control: \{ type: "ephemeral" \}/);
    const cacheAt = provider.indexOf("cache_control");
    const contextAt = provider.indexOf("# This conversation");
    expect(cacheAt).toBeLessThan(contextAt);
  });

  it("rejects an unsigned or unverified webhook before writing", () => {
    const unsignedAt = webhook.search(/if \(!signature\)/);
    const verifyAt = webhook.search(/constructEvent\(/);
    const writeAt = webhook.search(/\.update\(/);
    expect(unsignedAt).toBeGreaterThan(-1);
    expect(unsignedAt).toBeLessThan(verifyAt);
    expect(verifyAt).toBeLessThan(writeAt);
    // Verification uses the SDK, not a hand-rolled HMAC: the signature
    // format is undocumented and this decides who may write to a lead.
    expect(webhook).toMatch(/@elevenlabs\/elevenlabs-js/);
  });

  it("verifies against the raw body, not a parsed object", () => {
    const rawAt = webhook.search(/await request\.text\(\)/);
    expect(rawAt).toBeGreaterThan(-1);
    expect(webhook).not.toMatch(/await request\.json\(\)/);
  });

  it("records consent before issuing a signed url", () => {
    // ElevenLabs speaks its opening line the moment a session opens,
    // before our server is in the exchange. Holding the URL back is the
    // only point where an unconsented voice can be prevented.
    const consentAt = voiceSession.search(/consent_recorded_at/);
    const urlAt = voiceSession.search(/await signedConversationUrl\(\)/);
    expect(consentAt).toBeGreaterThan(-1);
    expect(consentAt).toBeLessThan(urlAt);
  });

  it("never sends the ElevenLabs key to the browser", () => {
    expect(voiceSession).not.toMatch(/ELEVENLABS_API_KEY/);
    const widget = readFileSync(
      join(ROOT_DIR, "components/agent/AgentWidget.tsx"),
      "utf8",
    );
    expect(widget).not.toMatch(/ELEVENLABS/);
    expect(widget).toMatch(/signedUrl/);
  });

  it("asks for the microphone only after consent is accepted", () => {
    const widget = readFileSync(
      join(ROOT_DIR, "components/agent/AgentWidget.tsx"),
      "utf8",
    );
    // startSession is what triggers the browser permission prompt and
    // their opening line; it may only be reached from startVoice, which
    // is only called by the consent panel's accept.
    const startVoiceAt = widget.search(/async function startVoice\(\)/);
    const startSessionAt = widget.search(/Conversation\.startSession\(/);
    expect(startVoiceAt).toBeLessThan(startSessionAt);
    expect(widget).toMatch(/onAccept=\{\(\) => void startVoice\(\)\}/);
  });
});

describe("the admin voice test path", () => {
  const llm = readFileSync(join(ROOT_DIR, "app/api/agent/llm/[[...openai]]/route.ts"), "utf8");
  const voiceSession = readFileSync(
    join(ROOT_DIR, "app/api/agent/voice-session/route.ts"),
    "utf8",
  );
  const review = readFileSync(
    join(ROOT_DIR, "app/admin/(workspace)/review/page.tsx"),
    "utf8",
  );

  it("lets only a signed-in admin open a session while Maya is off", () => {
    // The decision moved to lib/agent/access when the admin preview on
    // the public site gave a second way to be allowed; five places each
    // reading settings.enabled would have had to change in step. The
    // gates themselves are unchanged — currentAdmin() is the dashboard's
    // own two, a Supabase session and membership of admin_users.
    const access = readFileSync(
      join(ROOT_DIR, "lib/agent/access.ts"),
      "utf8",
    );
    expect(access).toMatch(/await currentAdmin\(\)/);
    expect(access).toMatch(/if \(opts\.enabled\) return "live";/);
    expect(access).toMatch(/if \(opts\.isAdmin\) return "preview";/);
    expect(access).toMatch(/return "off";/);

    // And the route refuses on the decision, not on its own reading.
    expect(voiceSession).toMatch(/await agentAccess\(\)/);
    expect(voiceSession).toMatch(
      /if \(mode === "off"\) \{\s*return NextResponse\.json\(\{ error: "unavailable" \}/,
    );
    expect(voiceSession).not.toMatch(/!settings\.enabled/);
  });

  it("marks the conversation rather than inferring it later", () => {
    expect(voiceSession).toMatch(/admin_test: adminTest/);
  });

  it("serves a disabled turn only for a fresh admin_test conversation", () => {
    // Three conditions, all required: the flag, the row existing, and the
    // age. Without the window an admin_test row would be a permanent key
    // to a switched-off assistant.
    expect(llm).toMatch(/ADMIN_TEST_WINDOW_MS\s*=\s*30 \* 60 \* 1000/);
    expect(llm).toMatch(/conversation\?\.admin_test === true/);
    expect(llm).toMatch(/Date\.now\(\) - startedAt < ADMIN_TEST_WINDOW_MS/);
    expect(llm).toMatch(/!isTest \|\| !fresh/);
  });

  it("still refuses everyone else while she is off", () => {
    const gate = llm.slice(llm.indexOf("if (!settings.enabled)"));
    expect(gate).toMatch(/status: 503/);
  });

  it("gives one answer for every failure while she is off", () => {
    // Distinguishing "no such conversation" from "not allowed" answers,
    // for any id someone cares to try, whether that conversation is real.
    // The id travels through a third party to reach us.
    expect(llm).toMatch(
      /if \(!conversation \|\| conversation\.ended_at \|\| !isTest \|\| !fresh\)/,
    );
    // The 404 is only reachable when she is on.
    expect(llm).toMatch(/\} else if \(!conversation \|\| conversation\.ended_at\) \{/);
  });

  it("labels test blocks and keeps them out of the tally", () => {
    // A test that deliberately provokes a block would otherwise read as
    // the model misbehaving in front of a seller, which is the one thing
    // this page exists to measure.
    expect(review).toMatch(/admin test, not a seller/);
    expect(review).toMatch(/if \(isTest\(row\)\) return acc;/);
  });

  it("labels a test conversation on the lead it is attached to", () => {
    const panel = readFileSync(
      join(ROOT_DIR, "components/admin/TranscriptPanel.tsx"),
      "utf8",
    );
    expect(panel).toMatch(/admin_test/);
    expect(panel).toMatch(/admin test, not a seller/);
  });

  it("never lets the widget decide whether it is a test", () => {
    // The widget is told it is a preview so it can say so on screen, and
    // that is all it knows. What the endpoints allow, and what goes in
    // conversations.admin_test, is decided server-side — a client prop
    // that granted either would be a prop a seller can set.
    const widget = readFileSync(
      join(ROOT_DIR, "components/agent/AgentWidget.tsx"),
      "utf8",
    );
    expect(widget).not.toMatch(/admin_test|adminTest/);
    const page = readFileSync(
      join(ROOT_DIR, "app/(site)/valuation/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/agentEnabled=\{mode !== "off"\}/);
  });
});

describe("the admin test path can start from nothing", () => {
  it("opens its own conversation, since the seller door is shut", () => {
    // /api/agent/session refuses while Maya is off, correctly — it is the
    // seller-facing door. An admin starting a voice test cold would
    // otherwise have no way to get a conversation at all, which made the
    // whole test path unreachable until this was found by trying to use
    // it. Still needed now that /api/agent/session serves a previewing
    // admin: /admin/review goes straight to voice with no text session
    // behind it. The creation sits after the access decision and inside
    // the admin branch.
    const route = readFileSync(
      join(ROOT_DIR, "app/api/agent/voice-session/route.ts"),
      "utf8",
    );
    const accessAt = route.search(/await agentAccess\(\)/);
    const createAt = route.search(/await createSession\(/);
    expect(accessAt).toBeGreaterThan(-1);
    expect(createAt).toBeGreaterThan(accessAt);
    expect(route).toMatch(/if \(!session && adminTest\)/);
    // Flagged at insert, not by a later update.
    expect(route).toMatch(/createSession\(\{ leadId, vehicleId, adminTest \}\)/);
  });
});

describe("the seeded voice-test car is not a seller", () => {
  it("is excluded from the inbox, the pipeline and follow-ups", () => {
    // A test car in the queue of people waiting for a call is worse than
    // no test car: someone rings it.
    for (const file of [
      "lib/admin/inbox.ts",
      "lib/admin/pipeline.ts",
      "lib/admin/followups.ts",
    ]) {
      const code = readFileSync(join(ROOT_DIR, file), "utf8");
      expect(code, `${file} must exclude the test source`).toMatch(
        /source\.neq\.\$\{TEST_SOURCE\}/,
      );
    }
  });

  it("marks what it seeds, rather than relying on the registration", () => {
    const seeder = readFileSync(join(ROOT_DIR, "lib/admin/voice-test.ts"), "utf8");
    expect(seeder).toMatch(/source: TEST_SOURCE/);
    expect(seeder).toMatch(/Not a real seller/);
  });

  it("checks the admin again inside the server action", () => {
    // A Server Action is an endpoint whatever page it appears on.
    const actions = readFileSync(
      join(ROOT_DIR, "app/admin/(workspace)/review/actions.ts"),
      "utf8",
    );
    expect(actions).toMatch(/const admin = await currentAdmin\(\);/);
    expect(actions).toMatch(/if \(!admin\) throw/);
  });
});

describe("spoken replies", () => {
  it("use no tools at all", () => {
    // A tool call is a second model round-trip, and the seller hears the
    // silence. Everything about the car is loaded into the context
    // instead; anything worth recording is written beside the reply.
    const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
    const voice = run.slice(run.indexOf("export async function* streamVoiceTurn"));
    expect(voice).not.toMatch(/TOOL_DEFINITIONS/);
    expect(voice).not.toMatch(/runTool\(/);
  });

  it("are capped at two sentences, and stop generating there", () => {
    const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
    expect(run).toMatch(/VOICE_SENTENCE_CAP\s*=\s*2/);
    expect(run).toMatch(/>= VOICE_SENTENCE_CAP\) break;/);
    // And the upstream stream is actually closed rather than left running.
    const provider = readFileSync(join(ROOT_DIR, "agent/provider.ts"), "utf8");
    expect(provider).toMatch(/finally \{\s*await reader\.cancel\(\)/);
  });

  it("hold a response-time sentence until the turn can be judged whole", () => {
    const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
    expect(run).toMatch(/mentionsResponseTime\(candidate\)/);
    // Holding one sentence holds the rest, or speech comes out reordered.
    expect(run).toMatch(/if \(holding \|\| mentionsResponseTime/);
  });

  it("write notes beside the reply, not inside it", () => {
    const route = readFileSync(join(ROOT_DIR, "app/api/agent/llm/[[...openai]]/route.ts"), "utf8");
    const startedAt = route.indexOf("extractAndWriteNotes({");
    const streamedAt = route.indexOf("streamVoiceTurn({");
    expect(startedAt).toBeGreaterThan(-1);
    // Started before the turn it must not delay, awaited before close.
    expect(startedAt).toBeLessThan(streamedAt);
    expect(route).toMatch(/const notes = await extraction;/);
  });

  it("write notes through the same validated writers as the tools", () => {
    const notes = readFileSync(join(ROOT_DIR, "lib/agent/notes.ts"), "utf8");
    expect(notes).toMatch(/toolSchemas\.set_field\.safeParse/);
    expect(notes).toMatch(/toolSchemas\.append_lead_note\.safeParse/);
    expect(notes).toMatch(/await setField\(/);
    expect(notes).toMatch(/await appendLeadNote\(/);
    // Never a direct write that would skip the enum and error checks.
    expect(notes).not.toMatch(/\.from\(["']leads["']\)/);
  });

  it("are capped shorter than typed ones", () => {
    const llm = readFileSync(join(ROOT_DIR, "app/api/agent/llm/[[...openai]]/route.ts"), "utf8");
    const cap = llm.match(/VOICE_MAX_TOKENS\s*=\s*(\d+)/);
    expect(cap).not.toBeNull();
    expect(Number((cap as RegExpMatchArray)[1])).toBeLessThanOrEqual(200);
  });

  it("are told to keep to two sentences and not to announce themselves", () => {
    const prompt = readFileSync(join(ROOT_DIR, "agent/prompt.md"), "utf8");
    expect(prompt).toMatch(/Two sentences\. One idea\./);
    expect(prompt).toMatch(/Never announce what you are about to do/);
    expect(prompt).toMatch(/Never open two turns running the same way/);
  });

  it("do not lead the deflection with the refusal", () => {
    const guards = readFileSync(join(ROOT_DIR, "agent/guards.ts"), "utf8");
    const deflection = guards.slice(guards.indexOf("export const PRICE_DEFLECTION"));
    expect(deflection).toMatch(/PRICE_DEFLECTION =\s*\n\s*"A person prices your car/);
    // The refusal follows; it does not lead.
    expect(deflection.indexOf("A person prices")).toBeLessThan(
      deflection.indexOf("I can't put a"),
    );
  });
});

describe("the guard context carries what the lookup knows", () => {
  it("passes the engine size, not just the obvious fields", () => {
    // The guards check claimed figures against the context. The routes
    // built it from make, model, year, colour and fuel only, so Maya
    // reading "2996cc" off her own vehicle record was blocked as an
    // invented fact — correct rule, incomplete context.
    // Text mode builds it in the route; voice builds it in the context
    // loader. Both must carry the engine size, or Maya is blocked for
    // reading her own record.
    const chat = readFileSync(join(ROOT_DIR, "app/api/agent/chat/route.ts"), "utf8");
    expect(chat).toMatch(/engineCapacity: vehicleData\.engine_cc/);
    expect(chat).toMatch(/guardContext: VehicleContext = vehicle \?\? \{\}/);

    const context = readFileSync(join(ROOT_DIR, "lib/agent/voice-context.ts"), "utf8");
    expect(context).toMatch(/engineCapacity:/);
    expect(context).toMatch(/mileage:/);
  });
});

describe("a claim with nothing written", () => {
  const llm = readFileSync(join(ROOT_DIR, "app/api/agent/llm/[[...openai]]/route.ts"), "utf8");

  it("is logged for review when the notes step wrote nothing", () => {
    // The notes step runs beside the reply, so the model never learns
    // whether the write landed before it speaks. A claim that did not
    // happen sends an operator looking for a figure that is not there.
    expect(llm).toMatch(/const claimed = claimsARecord\(spoken\);/);
    expect(llm).toMatch(
      /notes\.written\.length === 0 && !notes\.note/,
    );
    expect(llm).toMatch(/rule: "claim-without-write"/);
  });

  it("is checked only after the notes step has resolved", () => {
    const notesAt = llm.indexOf("const notes = await extraction;");
    const claimAt = llm.indexOf("const claimed = claimsARecord");
    expect(notesAt).toBeGreaterThan(-1);
    expect(notesAt).toBeLessThan(claimAt);
  });

  it("is shown as spoken rather than stopped", () => {
    const review = readFileSync(
      join(ROOT_DIR, "app/admin/(workspace)/review/page.tsx"),
      "utf8",
    );
    expect(review).toMatch(/NOT_BLOCKED = new Set\(\["claim-without-write"\]\)/);
    expect(review).toMatch(/spoken, not stopped/);
  });

  it("gives the seller's message to the guards in both modes", () => {
    // The self-correction rule is exempt when the seller asked about an
    // earlier answer, which it can only know from their message.
    const chat = readFileSync(join(ROOT_DIR, "app/api/agent/chat/route.ts"), "utf8");
    expect(chat).toMatch(/sellerMessage: parsed\.data\.message/);
    const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");
    expect(run).toMatch(/sellerMessage: opts\.message/);
  });
});

describe("the floating launcher", () => {
  const widget = readFileSync(
    join(ROOT_DIR, "components/agent/AgentWidget.tsx"),
    "utf8",
  );

  it("starts closed and is only opened by a click", () => {
    // CLAUDE.md section 10: silent by default, opt-in. A panel that
    // opens itself is the thing that rule exists to prevent.
    expect(widget).toMatch(
      /useState<"launcher" \| "panel">\("launcher"\)/,
    );
    // setView("panel") happens in open(), which is wired to the button
    // and to nothing else — no effect, no timer.
    const opens = [...widget.matchAll(/setView\("panel"\)/g)];
    expect(opens.length, 'only open() may set the panel open').toBe(1);
    const openAt = widget.search(/async function open\(\)/);
    expect(opens[0].index).toBeGreaterThan(openAt);
    expect(widget).toMatch(/onClick=\{\(\) => void open\(\)\}/);
  });

  it("names itself for a screen reader", () => {
    expect(widget).toMatch(
      /aria-label=\{`Chat with \$\{AGENT\.name\} \(AI assistant\)`\}/,
    );
    expect(widget).toMatch(/role="dialog"/);
    expect(widget).toMatch(/aria-label="Minimise the chat"/);
    expect(widget).toMatch(/aria-label=\{`End the chat with \$\{AGENT\.name\}`\}/);
  });

  it("keeps the conversation while minimised and drops it on close", () => {
    // Minimising is a seller getting the panel out of the way. Ending is
    // a seller throwing the conversation away, and it has to reach the
    // server: a reset that only cleared the screen would leave the
    // cookie pointing at a live row, so the next conversation would
    // continue the last one's transcript.
    const minimise = widget.slice(
      widget.search(/function minimise\(\)/),
      widget.search(/async function end\(\)/),
    );
    expect(minimise).toMatch(/setView\("launcher"\)/);
    expect(minimise).not.toMatch(/setTurns/);

    const end = widget.slice(
      widget.search(/async function end\(\)/),
      widget.search(/function dismiss\(\)/),
    );
    expect(end).toMatch(/setTurns\(\[\]\)/);
    expect(end).toMatch(/method: "DELETE"/);

    const route = readFileSync(
      join(ROOT_DIR, "app/api/agent/session/route.ts"),
      "utf8",
    );
    expect(route).toMatch(/export async function DELETE\(\)/);
    const session = readFileSync(join(ROOT_DIR, "lib/agent/session.ts"), "utf8");
    expect(session).toMatch(/ended_at: new Date\(\)\.toISOString\(\)/);
  });

  it("floats, and goes full width on a phone", () => {
    // The panel is a bottom sheet below the sm breakpoint and a card
    // above it. Checked at 375px in the browser, not only here.
    expect(widget).toMatch(/fixed inset-x-0 bottom-0/);
    expect(widget).toMatch(/sm:inset-x-auto sm:right-6 sm:bottom-6/);
    expect(widget).toMatch(/fixed right-4 bottom-4/);
  });

  it("uses oxblood and no plate yellow", () => {
    // CLAUDE.md section 5: plate yellow is the registration input and
    // nowhere else, the widget included.
    expect(widget).toMatch(/bg-oxblood/);
    expect(widget).not.toMatch(/plate/);
  });

  it("still offers the session-long dismissal", () => {
    expect(widget).toMatch(/Just the form/);
    expect(widget).toMatch(/dismissAgent\(\)/);
  });
});

describe("the opening line", () => {
  it("is written by the server into the transcript", () => {
    /**
     * It used to be composed in the widget and shown only there, so the
     * conversation on our side began with the seller's first message.
     * prompt.md tells her to disclose in her own first sentence, so with
     * no history she introduced herself again and the same greeting
     * appeared above and below the seller's question.
     */
    const route = readFileSync(
      join(ROOT_DIR, "app/api/agent/session/route.ts"),
      "utf8",
    );
    expect(route).toMatch(/openingLine\(vehicleName\)/);
    expect(route).toMatch(/opening,/);

    const session = readFileSync(join(ROOT_DIR, "lib/agent/session.ts"), "utf8");
    expect(session).toMatch(
      /transcript: opts\.opening\s*\?\s*\[\{ role: "assistant", content: opts\.opening \}\]/,
    );

    // And the widget renders what came back rather than composing one.
    const widget = readFileSync(
      join(ROOT_DIR, "components/agent/AgentWidget.tsx"),
      "utf8",
    );
    expect(widget).toMatch(/const \{ opening \}/);
    expect(widget).toMatch(/setTurns\(\[\{ role: "assistant", content: opening \}\]\)/);
    expect(widget).not.toMatch(/AGENT\.disclosure\}\./);
  });

  it("appears once per conversation", () => {
    const widget = readFileSync(
      join(ROOT_DIR, "components/agent/AgentWidget.tsx"),
      "utf8",
    );
    // open() is guarded by started.current, so a second click adds
    // nothing, and setTurns([...]) with the opening happens only there.
    expect(widget).toMatch(/if \(started\.current\) return;/);
    expect([...widget.matchAll(/content: opening/g)].length).toBe(1);
  });
});

describe("the voice session hands over the conversation id", () => {
  /**
   * The option is customLlmExtraBody. It was extraBody at both call
   * sites, which the SDK drops in silence — and Conversation.startSession
   * is generic over its options, so TypeScript raises no
   * excess-property error on the wrong name.
   *
   * The cost was every spoken turn: ElevenLabs called /api/agent/llm
   * with no conversation id, our endpoint refused, and the call ended
   * "custom_llm generation failed" with conversation_initiation_client_data
   * showing custom_llm_extra_body as {}. Nothing in the repository could
   * have caught it, because every voice turn tested before then was an
   * HTTP call made by hand with the id set.
   */
  for (const file of [
    "components/agent/AgentWidget.tsx",
    "app/admin/(workspace)/review/VoiceTest.tsx",
  ]) {
    it(`${file} passes customLlmExtraBody`, () => {
      // Comments stripped first: both call sites explain the old name in
      // a comment, and matching that is how a test passes or fails on
      // prose instead of code.
      const source = stripComments(readFileSync(join(ROOT_DIR, file), "utf8"));
      expect(source).toMatch(/customLlmExtraBody: \{ conversationId \}/);
      expect(source).not.toMatch(/\bextraBody:/);
    });
  }

  it("authorises the LLM endpoint by secret and conversation, never a cookie", () => {
    // ElevenLabs' servers call it. They carry no browser cookie, so a
    // cookie check there would refuse every real voice turn.
    const llm = readFileSync(join(ROOT_DIR, "app/api/agent/llm/[[...openai]]/route.ts"), "utf8");
    expect(llm).toMatch(/hasLlmSecret\(request\.headers\.get\("authorization"\)\)/);
    expect(llm).toMatch(/conversation\?\.admin_test === true/);
    expect(llm).not.toMatch(/agentAccess|currentAdmin|cookies\(/);
  });
});

describe("spoken turns have no tools and must not write any", () => {
  const run = readFileSync(join(ROOT_DIR, "lib/agent/run.ts"), "utf8");

  it("tells her so in a voice-only block", () => {
    expect(run).toMatch(/const VOICE_ONLY = `# In speech/);
    expect(run).toMatch(/You have no tools in this conversation/);
    expect(run).toMatch(/\{ type: "text", text: VOICE_ONLY \}/);
  });

  it("cuts it in code as well as asking in the prompt", () => {
    // A prompt is a request. The seller hearing XML read aloud is the
    // kind of failure that gets a coded rule (CLAUDE.md section 10).
    expect(run).toMatch(/const cut = stripToolSyntax\(pending\);/);
    expect(run).toMatch(/if \(wroteToolSyntax\) break;/);
    // And the typed path, where it would be read rather than heard.
    expect(run).toMatch(/text: stripToolSyntax\(reply\.text\)\.text,/);
  });

  it("keeps the strip in front of the sentence split", () => {
    const stripAt = run.search(/const cut = stripToolSyntax\(pending\);/);
    const splitAt = run.search(/const parts = sentences\(pending\);/);
    expect(stripAt).toBeGreaterThan(-1);
    expect(stripAt).toBeLessThan(splitAt);
  });
});
