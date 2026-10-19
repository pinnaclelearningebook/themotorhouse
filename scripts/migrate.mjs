#!/usr/bin/env node
/**
 * Apply every migration, in order, to a named project.
 *
 * `scripts/apply-migration.mjs` runs one file and is still the right
 * tool for a migration written five minutes ago. This is for a project
 * that has none of them: a fresh staging database that has to end up
 * with production's schema, from the same files the tests replay
 * against PGlite.
 *
 *   node scripts/migrate.mjs --target staging
 *   node scripts/migrate.mjs --target staging --dry-run
 *
 * **Applied migrations are recorded in the target itself**, in
 * `schema_migrations`, so a second run applies nothing and says so.
 * A runner that decides what to skip by sniffing for a column it
 * expects can only recognise migrations whose shape it can parse —
 * which is why the single-file script takes `--check` rather than
 * guessing, and why this one keeps a ledger instead.
 *
 * Production is allowed here, unlike the seeding scripts: bringing a
 * schema up to date is what this is for. It is the only script in the
 * repository that may name `--target production`, and it will not run
 * one file against it without `--i-mean-production`, because the
 * ordinary case is staging and the dangerous case should cost a
 * sentence.
 *
 * Reads SUPABASE_ACCESS_TOKEN plus the target's URL. Values are never
 * printed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveTarget } from "./lib/target.mjs";

const API = "https://api.supabase.com/v1";
const DIR = join("supabase", "migrations");

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : (argv[index + 1] ?? "");
};
const has = (name) => argv.includes(`--${name}`);

let target;
try {
  target = resolveTarget(flag("target") ?? process.env.TARGET);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (target.name === "production" && !has("i-mean-production")) {
  console.error(
    "Refusing: --target production needs --i-mean-production as well.\n" +
      "The ordinary case is staging; this one should cost a sentence.",
  );
  process.exit(1);
}
if (!target.accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${target.accessToken}`,
  "content-type": "application/json",
};

async function query(sql) {
  const response = await fetch(`${API}/projects/${target.ref}/database/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: sql }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : [];
}

const files = readdirSync(DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error(`No .sql files in ${DIR}.`);
  process.exit(1);
}

/*
 * The ledger. Created before anything else and outside the loop, so a
 * run that fails on migration seven still remembers one to six.
 */
await query(`
  create table if not exists schema_migrations (
    filename    text primary key,
    applied_at  timestamptz not null default now()
  );
`);

const applied = new Set(
  (await query("select filename from schema_migrations;")).map(
    (row) => row.filename,
  ),
);

const pending = files.filter((name) => !applied.has(name));

console.log(`target: ${target.name} (${target.ref})`);
console.log(`${files.length} migrations, ${applied.size} applied, ${pending.length} pending`);

/*
 * A project that already has the schema but no ledger — which is
 * every project migrated before this script existed, production
 * included. Replaying the files there would fail on the first
 * `create table` and tell you nothing useful, so the ledger is
 * backfilled deliberately rather than discovered by crashing.
 */
const [{ count: existing } = { count: 0 }] = await query(
  `select count(*)::int as count from information_schema.tables
   where table_schema = 'public' and table_name = 'leads';`,
);

if (has("mark-applied")) {
  if (pending.length === 0) {
    console.log("ledger already complete");
    process.exit(0);
  }
  const values = pending
    .map((name) => `('${name.replace(/'/g, "''")}')`)
    .join(", ");
  await query(
    `insert into schema_migrations (filename) values ${values}
     on conflict (filename) do nothing;`,
  );
  console.log(`${pending.length} recorded as applied. Nothing was run.`);
  process.exit(0);
}

if (existing > 0 && applied.size === 0) {
  console.error(
    "\nThis project already has a `leads` table but an empty ledger, so the\n" +
      "schema predates this runner. Replaying the files would fail on the\n" +
      "first create table. Backfill the ledger instead:\n\n" +
      `  node scripts/migrate.mjs --target ${target.name} --mark-applied` +
      (target.name === "production" ? " --i-mean-production" : "") +
      "\n\nThen run this again; anything genuinely new will apply.",
  );
  process.exit(1);
}

if (pending.length === 0) {
  console.log("nothing to do");
  process.exit(0);
}

if (has("dry-run")) {
  for (const name of pending) console.log(`  would apply  ${name}`);
  process.exit(0);
}

for (const name of pending) {
  const sql = readFileSync(join(DIR, name), "utf8");
  process.stdout.write(`  ${name} … `);
  try {
    await query(sql);
    /*
     * Recorded after the fact, in a separate statement. Appending the
     * insert to the migration's own text would make the ledger part of
     * the transaction that might fail, and a half-applied migration
     * recorded as done is worse than one recorded as pending.
     */
    await query(
      `insert into schema_migrations (filename) values ('${name.replace(/'/g, "''")}')
       on conflict (filename) do nothing;`,
    );
    console.log("applied");
  } catch (error) {
    console.log("FAILED");
    console.error(`    ${error.message}`);
    console.error(
      `\n${pending.indexOf(name)} of ${pending.length} applied before this one. ` +
        "Fix the file and run again; the ledger will skip what already landed.",
    );
    process.exit(1);
  }
}

console.log(`\n${pending.length} applied. Compare with: node scripts/compare-schema.mjs`);
