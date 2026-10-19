#!/usr/bin/env node
/**
 * Designate a project as staging, once.
 *
 *   node scripts/bootstrap-staging.mjs
 *
 * Writes `settings.environment = 'staging'` to the project named by
 * STAGING_SUPABASE_URL. That row is what every seeding and test
 * script checks before its first write, so this is the single moment
 * at which a database becomes writable by them — and the only one
 * where emptiness, rather than the marker, is what makes it safe.
 *
 * It therefore refuses a project holding any lead that is not ours.
 * Run it before `scripts/seed-staging.mjs`, after `scripts/migrate.mjs`
 * has given the project a `settings` table to write into.
 */
import { resolveTarget, assertSafeToDesignate } from "./lib/target.mjs";

let target;
try {
  target = resolveTarget("staging");
  await assertSafeToDesignate(target);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const headers = {
  apikey: target.serviceKey,
  Authorization: `Bearer ${target.serviceKey}`,
  "content-type": "application/json",
  Prefer: "resolution=merge-duplicates,return=representation",
};

const response = await fetch(`${target.url}/rest/v1/settings?on_conflict=key`, {
  method: "POST",
  headers,
  body: JSON.stringify([
    {
      key: "environment",
      /*
       * A bare JSON string, because `settings.value` is jsonb and
       * every reader of this row compares it to "staging".
       */
      value: "staging",
      /*
       * Named rather than left blank, for whoever opens
       * /admin/settings on staging and wonders what this row is: a
       * marker nobody recognises is a marker somebody deletes.
       */
      updated_by: "scripts/bootstrap-staging.mjs",
    },
  ]),
});

if (!response.ok) {
  const detail = (await response.text()).slice(0, 300);
  /*
   * The ordinary way to arrive here is too early: a brand-new project
   * has no `settings` table to write the marker into. Saying so beats
   * a PostgREST schema-cache error, which reads like a bug in this
   * script rather than a step that has not been run.
   */
  if (/public\.settings/.test(detail)) {
    console.error(
      "This project has no `settings` table yet, so there is nowhere to put\n" +
        "the marker. Run the migrations first:\n\n" +
        "  node scripts/migrate.mjs --target staging\n",
    );
    process.exit(1);
  }
  console.error(`Failed: ${response.status} ${detail}`);
  process.exit(1);
}

console.log(`${target.ref} is now marked as staging.`);
console.log("Next: node scripts/seed-staging.mjs");
