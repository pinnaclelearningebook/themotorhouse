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
    const switchAt = chat.search(/if\s*\(!settings\.enabled\)/);
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
    for (const tool of ["set_field", "append_lead_note", "go_to_step"]) {
      expect(
        run.includes(`toolSchemas.${tool}.safeParse`),
        `${tool} must be validated before it runs`,
      ).toBe(true);
    }
  });

  it("exposes exactly the six tools from CLAUDE.md section 10", () => {
    const declared = [...tools.matchAll(/^\s{4}name: "([a-z_]+)",$/gm)].map(
      (m) => m[1],
    );
    expect(new Set(declared)).toEqual(
      new Set([
        "get_vehicle_context",
        "read_form_state",
        "set_field",
        "go_to_step",
        "trigger_photo_guide",
        "append_lead_note",
      ]),
    );
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
