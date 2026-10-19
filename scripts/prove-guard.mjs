#!/usr/bin/env node
/**
 * Point the seeder at production on purpose, and watch it refuse.
 *
 *   node scripts/prove-guard.mjs
 *
 * The guard in lib/target.mjs is unit-tested arm by arm, which proves
 * the logic and not the wiring. This proves the wiring: it runs the
 * real seeding script, in a real process, with STAGING_SUPABASE_URL
 * deliberately set to the production project — the exact mistake the
 * guard exists for — and then counts production's rows to confirm
 * nothing moved.
 *
 * Safe by construction, and safe twice over. Rule 2 compares the
 * target URL to production's and refuses on a string equality, and
 * rule 3 refuses a project with no `environment = 'staging'` row,
 * which production does not have and must never be given. Both fire
 * before the script's first write. If either has been broken, this
 * says so loudly, which is the point.
 *
 * Reads .env.local directly and passes values to the child through
 * its environment. Nothing is printed.
 */
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readEnv } from "./lib/target.mjs";

const env = readEnv();
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  Prefer: "count=exact",
};

async function count(table) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=id`, {
    headers: { ...headers, Range: "0-0" },
  });
  const range = response.headers.get("content-range") ?? "";
  return Number(range.split("/")[1] ?? NaN);
}

const before = {
  leads: await count("leads"),
  vehicles: await count("vehicles"),
  offers: await count("offers"),
};
console.log("production before:", JSON.stringify(before));

/**
 * Twice, because one layer is not a guard.
 *
 * The first run is the plain mistake: staging's variables pointed at
 * production, with production's own variables still present, so rule
 * 2 can see what it is being asked to do.
 *
 * The second takes rule 2 away — production's URL is simply not in
 * the environment, which is what a CI runner or a stripped shell
 * looks like — and checks that rule 3 catches it anyway. That is the
 * arm that does not depend on knowing production's address: a
 * project with no `environment = 'staging'` row of its own is
 * refused whether or not anything can tell what it is.
 */
function attempt(label, extra) {
  const child = {
    ...process.env,
    // The mistake, made on purpose.
    STAGING_SUPABASE_URL: env.SUPABASE_URL,
    STAGING_SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    ...extra,
  };
  for (const [key, value] of Object.entries(child)) {
    if (value === undefined) delete child[key];
  }
  /*
   * Run from a directory with no .env.local, by absolute path. The
   * guard reads that file relative to the working directory, so from
   * here it would quietly put production's URL back and the second
   * case would silently become the first. Node resolves the script's
   * own imports relative to the file, so the move costs nothing.
   */
  const run = spawnSync(process.execPath, [resolve("scripts/seed-staging.mjs")], {
    encoding: "utf8",
    env: child,
    cwd: tmpdir(),
  });
  console.log(`${label}: exit ${run.status} — ${(run.stderr || run.stdout).trim().split("\n")[0]}`);
  return run;
}

const withUrl = attempt("rule 2, production's URL visible");
const withoutUrl = attempt("rule 3, production's URL hidden ", {
  SUPABASE_URL: undefined,
  NEXT_PUBLIC_SUPABASE_URL: undefined,
});

const after = {
  leads: await count("leads"),
  vehicles: await count("vehicles"),
  offers: await count("offers"),
};
console.log("production after: ", JSON.stringify(after));

const unchanged = ["leads", "vehicles", "offers"].every(
  (table) => before[table] === after[table],
);

for (const [label, run] of [["rule 2", withUrl], ["rule 3", withoutUrl]]) {
  if (run.status === 0) {
    console.error(`\nFAIL: ${label} did not refuse.`);
    process.exit(1);
  }
}
if (!/points at the production project/.test(withUrl.stderr + withUrl.stdout)) {
  console.error("\nFAIL: rule 2 refused, but for the wrong reason.");
  process.exit(1);
}
if (!/does not identify itself as staging/.test(withoutUrl.stderr + withoutUrl.stdout)) {
  console.error("\nFAIL: rule 3 refused, but for the wrong reason.");
  process.exit(1);
}
if (!unchanged) {
  console.error("\nFAIL: production row counts changed.");
  process.exit(1);
}
console.log("\nPASS: both rules refused, and production is untouched.");
