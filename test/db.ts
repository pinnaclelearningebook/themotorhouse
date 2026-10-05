import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Runs the real migrations against PGlite — Postgres compiled to WASM,
 * in-process, no Docker. This proves the SQL executes and the RLS
 * posture behaves, on every test run rather than once by hand.
 *
 * PGlite is Postgres but not Supabase: it has no `auth` schema and none
 * of Supabase's roles. The harness creates `anon`, `authenticated` and
 * `service_role` so the grants and RLS in the migrations apply to
 * something real. Supabase-native behaviour (auth.uid(), JWT claims)
 * is verified against the hosted project, not here.
 */
const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
const SEED = join(process.cwd(), "supabase", "seed.sql");

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();

  // Supabase ships these; PGlite does not. service_role bypasses RLS,
  // which is what the server-action path relies on.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
  `);

  // Supabase's auth schema, which the admin policies call through
  // is_admin(). Defaults to no email; a test overrides auth.jwt() to
  // act as a particular user.
  await db.exec(`
    create schema auth;
    create or replace function auth.jwt()
    returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    grant usage on schema auth to anon, authenticated, service_role;
  `);

  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }

  // Supabase grants service_role full access to public tables as part of
  // its own setup; PGlite does not, and `bypassrls` only skips policies,
  // not table privileges. Granting here keeps the harness faithful to
  // how the server-action path actually behaves in production.
  await db.exec("grant all on all tables in schema public to service_role;");

  return db;
}

export async function seed(db: PGlite): Promise<void> {
  await db.exec(readFileSync(SEED, "utf8"));
}
