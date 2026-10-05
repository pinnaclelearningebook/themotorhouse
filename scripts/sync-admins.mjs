/**
 * Syncs admin_users from ADMIN_ALLOWLIST.
 *
 * The database cannot read an environment variable, and the RLS policies
 * gate on a table. This is the bridge: run it whenever the allow-list
 * changes. Re-runnable — it adds what is missing and removes what is no
 * longer listed, so the table always matches the variable.
 *
 *   node scripts/sync-admins.mjs
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_0-9]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).trim()];
    }),
);

const list = (env.ADMIN_ALLOWLIST ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (list.length === 0) {
  console.error(
    "ADMIN_ALLOWLIST is empty. Nobody would be able to sign in to /admin.",
  );
  process.exit(1);
}

const url = env.SUPABASE_URL.replace(/\/$/, "");
const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

const existing = await (
  await fetch(`${url}/rest/v1/admin_users?select=email`, { headers })
).json();
const have = new Set(existing.map((row) => row.email.toLowerCase()));

const toAdd = list.filter((email) => !have.has(email));
const toRemove = [...have].filter((email) => !list.includes(email));

if (toAdd.length) {
  const res = await fetch(`${url}/rest/v1/admin_users`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(
      toAdd.map((email) => ({ email, added_by: "sync-admins" })),
    ),
  });
  if (!res.ok) {
    console.error("add failed:", await res.text());
    process.exit(1);
  }
}

for (const email of toRemove) {
  await fetch(
    `${url}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}`,
    { method: "DELETE", headers },
  );
}

const final = await (
  await fetch(`${url}/rest/v1/admin_users?select=email&order=email`, { headers })
).json();
console.log(`admin_users now has ${final.length} entr${final.length === 1 ? "y" : "ies"}:`);
for (const row of final) console.log(`  ${row.email.replace(/^(.{3}).*(@.*)$/, "$1***$2")}`);
