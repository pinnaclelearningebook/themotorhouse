#!/usr/bin/env node
/**
 * Point Vercel's Preview and Development at the staging project.
 *
 *   node scripts/repoint-preview.mjs --dry-run
 *   node scripts/repoint-preview.mjs
 *
 * Vercel holds each variable separately per environment, so writing
 * Preview's copy cannot reach Production's. That is the property this
 * whole split rests on, and the script asserts it rather than trusting
 * it: it records Production's three before and after and refuses to
 * report success if anything about them moved.
 *
 * Values are piped to the CLI on stdin, never passed as `--value`.
 * A service-role key on a command line ends up in shell history, in
 * the process table, and in whatever is scrolling past at the time.
 *
 * `vercel env add` will not overwrite, so each variable is removed
 * first. The window between the two is real: a deployment started in
 * that second would build without the variable. Previews are not
 * serving anyone, which is the only reason this is acceptable here
 * and would not be on Production.
 */
import { execFileSync } from "node:child_process";
import { readEnv } from "./lib/target.mjs";

const env = readEnv();
const dryRun = process.argv.includes("--dry-run");

/** What each environment's copy should point at. */
const PLAN = {
  SUPABASE_URL: "STAGING_SUPABASE_URL",
  SUPABASE_ANON_KEY: "STAGING_SUPABASE_ANON_KEY",
  SUPABASE_SERVICE_ROLE_KEY: "STAGING_SUPABASE_SERVICE_ROLE_KEY",
  /*
   * Unused by the application — nothing reads it (the code reads the
   * three above) — but it is set in all three environments, and a
   * variable named for this project sitting on a preview while
   * pointing at production is precisely the trap the split exists to
   * remove. Repointed, not deleted: deleting someone else's variable
   * is a separate decision.
   */
  NEXT_PUBLIC_SUPABASE_URL: "STAGING_SUPABASE_URL",
};

const ENVIRONMENTS = ["preview", "development"];

const missing = Object.values(PLAN).filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing in .env.local: ${[...new Set(missing)].join(", ")}`);
  process.exit(1);
}

function vercel(args, input) {
  return execFileSync("npx", ["vercel@latest", ...args], {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/** Names and environments only. A value is never read back or printed. */
function inventory() {
  const lines = vercel(["env", "ls"]).split("\n");
  const rows = [];
  for (const line of lines) {
    const match = line
      .trim()
      .match(/^([A-Z0-9_]+)\s+\S.*?\s+(Development|Preview|Production)(?:,\s*\S+)?\s/);
    if (match) rows.push(`${match[1]} @ ${match[2]}`);
  }
  return rows.sort();
}

const productionBefore = inventory().filter((row) => row.endsWith("@ Production"));
console.log(`Production variables before: ${productionBefore.length}`);

if (dryRun) {
  for (const [name, source] of Object.entries(PLAN)) {
    for (const environment of ENVIRONMENTS) {
      console.log(`  would set  ${name} @ ${environment}  ← ${source}`);
    }
  }
  process.exit(0);
}

for (const [name, source] of Object.entries(PLAN)) {
  for (const environment of ENVIRONMENTS) {
    try {
      vercel(["env", "rm", name, environment, "--yes"]);
    } catch {
      // Not set in that environment yet, which is fine — add covers it.
    }
    vercel(["env", "add", name, environment, "--yes"], env[source]);
    console.log(`  set  ${name} @ ${environment}`);
  }
}

const productionAfter = inventory().filter((row) => row.endsWith("@ Production"));
console.log(`Production variables after:  ${productionAfter.length}`);

const same =
  productionBefore.length === productionAfter.length &&
  productionBefore.every((row, index) => row === productionAfter[index]);

if (!same) {
  console.error("\nFAIL: Production's variables changed. They should not have.");
  const gone = productionBefore.filter((row) => !productionAfter.includes(row));
  const added = productionAfter.filter((row) => !productionBefore.includes(row));
  for (const row of gone) console.error(`  lost  ${row}`);
  for (const row of added) console.error(`  new   ${row}`);
  process.exit(1);
}

console.log("\nPreview and Development point at staging. Production is unchanged.");
console.log("Redeploy for the change to take effect — env vars are read at build time.");
