#!/usr/bin/env node
/**
 * Does staging actually match production?
 *
 *   node scripts/compare-schema.mjs
 *
 * Reads both projects and diffs what a query can trip over: tables,
 * columns with their types, nullability and defaults, enum types and
 * their values, indexes, and whether row-level security is on. Exits
 * non-zero on any difference, so it can gate the work that follows.
 *
 * It compares the *result* rather than the ledger, because the ledger
 * only says which files ran. A migration that failed halfway, a
 * column someone added in the dashboard, a type that exists in one
 * project with an extra value — none of those show up in a list of
 * filenames, and all of them produce a staging test that passes
 * against a schema production does not have.
 *
 * Defaults are normalised before comparing: Postgres writes a column
 * default back with the owning table's name in any cast it contains,
 * so the same migration produces textually different defaults in two
 * projects. Sequence names get the same treatment.
 *
 * Reads SUPABASE_ACCESS_TOKEN and both targets' URLs. Values are
 * never printed.
 */
import { resolveTarget, assertManagementToken } from "./lib/target.mjs";

const API = "https://api.supabase.com/v1";

let production;
let staging;
try {
  production = resolveTarget("production");
  staging = resolveTarget("staging");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
try {
  await assertManagementToken(production);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

async function query(target, sql) {
  const response = await fetch(`${API}/projects/${target.ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${target.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${target.name}: ${response.status} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : [];
}

const SQL = {
  columns: `
    select table_name, column_name, data_type, is_nullable, column_default,
           coalesce(character_maximum_length, -1) as len
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, column_name;`,
  enums: `
    select t.typname, e.enumlabel, e.enumsortorder
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    order by t.typname, e.enumsortorder;`,
  indexes: `
    select tablename, indexname, indexdef
    from pg_indexes where schemaname = 'public'
    order by tablename, indexname;`,
  rls: `
    select c.relname, c.relrowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname;`,
  policies: `
    select tablename, policyname, cmd
    from pg_policies where schemaname = 'public'
    order by tablename, policyname;`,
};

/** Same migration, two projects, textually different default. */
function normalise(value) {
  if (value === null || value === undefined) return null;
  return String(value)
    .replace(/'[a-z0-9]{20}'::text/gi, "'<ref>'::text")
    .replace(/\s+/g, " ")
    .trim();
}

const SHAPE = {
  columns: (r) =>
    `${r.table_name}.${r.column_name}  ${r.data_type}${r.len > 0 ? `(${r.len})` : ""} ` +
    `${r.is_nullable === "YES" ? "null" : "not null"} default=${normalise(r.column_default)}`,
  enums: (r) => `${r.typname}[${r.enumsortorder}] = ${r.enumlabel}`,
  indexes: (r) => `${r.tablename}.${r.indexname}  ${normalise(r.indexdef)}`,
  rls: (r) => `${r.relname}  rls=${r.relrowsecurity}`,
  policies: (r) => `${r.tablename}.${r.policyname}  ${r.cmd}`,
};

let differences = 0;

for (const [name, sql] of Object.entries(SQL)) {
  const [prodRows, stageRows] = await Promise.all([
    query(production, sql),
    query(staging, sql),
  ]);
  const prod = new Set(prodRows.map(SHAPE[name]));
  const stage = new Set(stageRows.map(SHAPE[name]));

  const missing = [...prod].filter((line) => !stage.has(line));
  const extra = [...stage].filter((line) => !prod.has(line));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`${name.padEnd(9)} ${prod.size} identical`);
    continue;
  }
  differences += missing.length + extra.length;
  console.log(`${name.padEnd(9)} ${missing.length} missing, ${extra.length} extra`);
  for (const line of missing) console.log(`  production only  ${line}`);
  for (const line of extra) console.log(`  staging only     ${line}`);
}

if (differences > 0) {
  console.error(`\n${differences} differences. Staging does not match production.`);
  process.exit(1);
}
console.log("\nStaging matches production.");
