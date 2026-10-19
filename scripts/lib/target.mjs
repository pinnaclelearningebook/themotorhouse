/**
 * Which database a script is about to write to, and whether it may.
 *
 * On 15 October 2026 six fabricated leads were written to the
 * production project, because preview and production shared one
 * Supabase project and a row labelled `admin-test` would have been
 * hidden on the preview that needed to see it. The labelling rule was
 * followed and the rows still landed in production, which is the
 * clearest possible evidence that a convention is not a control.
 *
 * So: a seeding or test script asks this module for its target, and
 * the module refuses unless the target can *prove* it is not
 * production. A blocklist would be the obvious shape and the wrong
 * one — it fails open on the day somebody adds a third project, and
 * it trusts an environment variable that is exactly as forgettable as
 * the convention it replaces.
 *
 * The proof lives in the database being written to, not beside it:
 *
 *   1. the target is not the one named `production`;
 *   2. its URL differs from production's, when production's is known;
 *   3. its own `settings` table carries `environment = 'staging'`;
 *   4. it holds no lead that looks like a real seller.
 *
 * Rule 4 is the backstop, and the one that would have caught the
 * mistake. Rules 1 to 3 can all be satisfied at once by a
 * misconfiguration — a marker written to the wrong project is a
 * single mistyped flag — but a database holding a row somebody is
 * waiting for a phone call about cannot be mistaken for a scratch
 * database, whatever the environment variables say.
 *
 * "Looks like a real seller" means a lead whose `source` is not one
 * of ours. Rows seeded into staging carry `staging-seed`, so the
 * seeder can run twice; rows from the voice harness carry
 * `admin-test`. A production lead's source is null, which is why the
 * null arm is the one that must never be relaxed.
 */
import { readFileSync } from "node:fs";

/**
 * `.env.local` over the process environment. Values are never printed.
 *
 * @param {string} [file]
 * @returns {Record<string, string | undefined>}
 */
export function readEnv(file = ".env.local") {
  /** @type {Record<string, string | undefined>} */
  const out = { ...process.env };
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && match[2].trim() !== "") {
        out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No .env.local is normal in CI; the process environment stands alone.
  }
  return out;
}

export const TARGETS = {
  production: {
    url: "SUPABASE_URL",
    serviceKey: "SUPABASE_SERVICE_ROLE_KEY",
    anonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  },
  staging: {
    url: "STAGING_SUPABASE_URL",
    serviceKey: "STAGING_SUPABASE_SERVICE_ROLE_KEY",
    anonKey: "STAGING_SUPABASE_ANON_KEY",
  },
};

/**
 * The project a script will act on.
 *
 * `--target staging` on the command line, or the `TARGET` variable.
 * There is deliberately no default: a script that picks a database
 * when nobody named one is a script that will eventually pick the
 * wrong one.
 */
/**
 * @param {string | undefined} name
 * @param {Record<string, string | undefined>} [env]
 */
export function resolveTarget(name, env = readEnv()) {
  if (!name) {
    throw new Error(
      "No target named. Pass --target staging or --target production.",
    );
  }
  const spec = TARGETS[name];
  if (!spec) {
    throw new Error(
      `Unknown target "${name}". Known: ${Object.keys(TARGETS).join(", ")}.`,
    );
  }
  const url = env[spec.url];
  const serviceKey = env[spec.serviceKey];
  if (!url || !serviceKey) {
    const missing = [!url && spec.url, !serviceKey && spec.serviceKey].filter(
      Boolean,
    );
    throw new Error(
      `Target "${name}" needs ${missing.join(" and ")} in .env.local. ` +
        `Not set, and this script will not guess.`,
    );
  }
  return {
    name,
    url: url.replace(/\/$/, ""),
    serviceKey,
    anonKey: env[spec.anonKey] ?? null,
    accessToken: env.SUPABASE_ACCESS_TOKEN ?? null,
    ref: new URL(url).hostname.split(".")[0],
    productionUrl: env[TARGETS.production.url]?.replace(/\/$/, "") ?? null,
  };
}

/**
 * Sources a row of ours can carry. Anything else — including no
 * source at all, which is what the public form writes — is a seller.
 */
export const OUR_SOURCES = ["admin-test", "staging-seed"];

function notProduction(name, url, productionUrl) {
  if (name === "production") {
    return "this script never writes to production";
  }
  if (productionUrl && url === productionUrl) {
    return `target "${name}" points at the production project`;
  }
  return null;
}

function noRealLeads(name, realLeadCount) {
  if (realLeadCount > 0) {
    return (
      `target "${name}" holds ${realLeadCount} lead${realLeadCount === 1 ? "" : "s"} ` +
      `whose source is not one of ${OUR_SOURCES.join(" or ")}. ` +
      "A database with real sellers in it is not a scratch database."
    );
  }
  return null;
}

/**
 * The whole decision, with the I/O already done, so every arm of it
 * can be tested without a database. Returns the reason to refuse, or
 * null to allow.
 */
export function refusalReason({
  name,
  url,
  productionUrl,
  environmentMarker,
  realLeadCount,
}) {
  return (
    notProduction(name, url, productionUrl) ??
    (environmentMarker !== "staging"
      ? `target "${name}" does not identify itself as staging ` +
        `(settings.environment is ${
          environmentMarker === null || environmentMarker === undefined
            ? "not set"
            : `"${environmentMarker}"`
        }). ` +
        "Run scripts/bootstrap-staging.mjs against it first."
      : null) ??
    noRealLeads(name, realLeadCount)
  );
}

/**
 * The narrower question bootstrap asks: may this project be *made*
 * staging? The marker cannot be required — writing it is the point —
 * so emptiness carries the whole weight here, and rule 4 is not
 * optional at this one call site.
 */
export function designationRefusalReason({
  name,
  url,
  productionUrl,
  realLeadCount,
}) {
  return (
    notProduction(name, url, productionUrl) ?? noRealLeads(name, realLeadCount)
  );
}

/**
 * Check the Management API token before a script leans on it.
 *
 * DDL cannot go through PostgREST, so every schema script needs
 * `SUPABASE_ACCESS_TOKEN` — and a dead one produces a bare
 * `401 {"message":"Invalid access token"}` from whichever query ran
 * first, which reads like a problem with that query. It is not: the
 * token is either valid for the whole account or valid for nothing.
 *
 * So the distinction is drawn here, once, in words. 401 means
 * revoked or expired and needs a new token; 403 means the token is
 * real but missing a scope, which is a different errand.
 */
export async function assertManagementToken(target) {
  if (!target.accessToken) {
    throw new Error(
      "Missing SUPABASE_ACCESS_TOKEN in .env.local.\n" +
        "Schema changes go through the Management API, which the project\n" +
        "keys cannot reach. Create one at\n" +
        "  https://supabase.com/dashboard/account/tokens",
    );
  }
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${target.ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${target.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: "select 1 as ok;" }),
    },
  );
  if (response.ok) return;

  const detail = (await response.text()).slice(0, 200);
  if (response.status === 401) {
    throw new Error(
      `SUPABASE_ACCESS_TOKEN is not valid (401 ${detail}).\n` +
        "A token is valid for the whole account or for nothing, so this is\n" +
        "not about the target: it has expired or been revoked. Replace it\n" +
        "with a new personal access token from\n" +
        "  https://supabase.com/dashboard/account/tokens\n" +
        "and keep the scopes it already needed for scripts/configure-auth.mjs\n" +
        "(auth_config_read and auth_config_write), or create it with full access.",
    );
  }
  if (response.status === 403) {
    throw new Error(
      `SUPABASE_ACCESS_TOKEN is real but not allowed to run SQL on ` +
        `${target.name} (403 ${detail}).\n` +
        "This is a scope, not an expiry — grant it database access, or use a\n" +
        "token with full access.",
    );
  }
  throw new Error(`Management API refused the check: ${response.status} ${detail}`);
}

async function rest(target, path) {
  const response = await fetch(`${target.url}/rest/v1/${path}`, {
    headers: {
      apikey: target.serviceKey,
      Authorization: `Bearer ${target.serviceKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `${target.name}: ${path.split("?")[0]} returned ${response.status}`,
    );
  }
  return response.json();
}

/** What the target says about itself. Separated so `refusalReason` stays pure. */
export async function inspectTarget(target) {
  let environmentMarker = null;
  try {
    const rows = await rest(
      target,
      "settings?key=eq.environment&select=value",
    );
    const raw = rows[0]?.value;
    environmentMarker = typeof raw === "string" ? raw : (raw ?? null);
  } catch {
    // No settings table yet — an unmigrated project, which cannot pass
    // rule 3 anyway. Left null so the reason names the marker.
  }

  let realLeadCount = 0;
  try {
    const ours = OUR_SOURCES.join(",");
    const rows = await rest(
      target,
      `leads?select=id&or=(source.is.null,source.not.in.(${ours}))&limit=200`,
    );
    realLeadCount = rows.length;
  } catch {
    // No leads table is the same as no real leads.
  }

  return { environmentMarker, realLeadCount };
}

/**
 * Throws unless the target has proved it is safe to write fabricated
 * data to. Every seeding and test script calls this before its first
 * write, and `test/staging-guard.test.ts` asserts they all do.
 */
export async function assertWritable(target) {
  const observed = await inspectTarget(target);
  const reason = refusalReason({ ...target, ...observed });
  if (reason) throw new Error(`Refusing to write: ${reason}`);
  return observed;
}

/** The same, for the one script that writes the marker. */
export async function assertSafeToDesignate(target) {
  const observed = await inspectTarget(target);
  const reason = designationRefusalReason({ ...target, ...observed });
  if (reason) throw new Error(`Refusing to designate: ${reason}`);
  return observed;
}
