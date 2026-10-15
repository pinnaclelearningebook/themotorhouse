#!/usr/bin/env node
/**
 * Run one migration file against the hosted database, verbatim.
 *
 * The rule in this project is that migrations are never applied by
 * hand-editing SQL in a console. This is the other half of that rule:
 * the thing that runs is the file in supabase/migrations, byte for
 * byte, so what the tests replay against PGlite and what production
 * has are the same text.
 *
 *   node scripts/apply-migration.mjs supabase/migrations/<file>.sql
 *   node scripts/apply-migration.mjs <file> --check
 *
 * `--check` runs nothing. It reports whether the columns and types the
 * file defines are already present, which is how you tell "not applied
 * yet" from "applied twice" before doing either.
 *
 * Reads SUPABASE_URL (for the project ref) and SUPABASE_ACCESS_TOKEN
 * from .env.local. Values are never printed.
 */
import { readFileSync } from "node:fs";

const API = "https://api.supabase.com/v1";

function env() {
  const out = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const vars = env();
const file = process.argv[2];
const checkOnly = process.argv.includes("--check");

if (!vars.SUPABASE_URL || !vars.SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_URL or SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <path to .sql> [--check]");
  process.exit(1);
}

const ref = new URL(vars.SUPABASE_URL).hostname.split(".")[0];
const headers = {
  Authorization: `Bearer ${vars.SUPABASE_ACCESS_TOKEN}`,
  "content-type": "application/json",
};

async function query(sql) {
  const response = await fetch(`${API}/projects/${ref}/database/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: sql }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : [];
}

const sql = readFileSync(file, "utf8");

/** Everything the file says it creates, so --check can look for it. */
const columns = [...sql.matchAll(/alter table (\w+) add column (\w+)/g)].map(
  ([, table, column]) => ({ table, column }),
);
const types = [...sql.matchAll(/create type (\w+)/g)].map(([, name]) => name);

async function present() {
  const found = { columns: [], types: [] };
  if (columns.length) {
    const rows = await query(
      `select table_name, column_name from information_schema.columns
       where table_schema = 'public'
         and (${columns
           .map((c) => `(table_name = '${c.table}' and column_name = '${c.column}')`)
           .join(" or ")});`,
    );
    found.columns = rows.map((r) => `${r.table_name}.${r.column_name}`);
  }
  if (types.length) {
    const rows = await query(
      `select typname from pg_type where typname in (${types
        .map((t) => `'${t}'`)
        .join(", ")});`,
    );
    found.types = rows.map((r) => r.typname);
  }
  return found;
}

const before = await present();
const wanted = columns.map((c) => `${c.table}.${c.column}`);

console.log(`${file}`);
console.log(`  defines: ${[...types, ...wanted].join(", ") || "(nothing detectable)"}`);
console.log(
  `  already present: ${[...before.types, ...before.columns].join(", ") || "none"}`,
);

if (checkOnly) process.exit(0);

if (
  before.columns.length === wanted.length &&
  before.types.length === types.length &&
  wanted.length + types.length > 0
) {
  console.log("  nothing to do — already applied");
  process.exit(0);
}

try {
  await query(sql);
} catch (error) {
  console.error(`  FAILED: ${error.message}`);
  process.exit(1);
}

const after = await present();
const missing = [
  ...types.filter((t) => !after.types.includes(t)),
  ...wanted.filter((c) => !after.columns.includes(c)),
];
if (missing.length) {
  console.error(`  applied, but these are still missing: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`  applied, and verified present`);
