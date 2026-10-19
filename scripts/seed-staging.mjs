#!/usr/bin/env node
/**
 * Fill staging with one lead per pipeline stage.
 *
 *   node scripts/seed-staging.mjs
 *   node scripts/seed-staging.mjs --clear
 *
 * Enough to work the inbox, the pipeline and a lead page against
 * something, without any of it reaching a seller or a real queue.
 * Re-runnable: rows are keyed by registration and replaced.
 *
 * Everything here is obviously fake, on purpose, and in three
 * independent ways — because the only thing worse than no sample
 * data is sample data somebody rings.
 *
 *   · `source = 'staging-seed'` on every row, which is what the
 *     guard in lib/target.mjs counts as ours;
 *   · telephone numbers from Ofcom's drama range (07700 900xxx),
 *     which are reserved and cannot connect;
 *   · `@example.com` addresses, reserved by RFC 2606.
 *
 * Refuses to run against anything that has not proved it is staging.
 * See scripts/lib/target.mjs for what that means and why it is not
 * a check on an environment variable.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveTarget,
  assertWritable,
  assertManagementToken,
} from "./lib/target.mjs";

let target;
try {
  target = resolveTarget("staging");
  await assertWritable(target);
  await assertManagementToken(target);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

/**
 * The operating constants, from the same file production was seeded
 * from.
 *
 * Not copied into this script: two lists of margin floors and agent
 * limits is two lists that disagree the first time one of them
 * changes, and the whole reason staging exists is to behave like
 * production. `on conflict do nothing` in the file makes it safe to
 * run every time.
 */
const seedSql = readFileSync(join("supabase", "seed.sql"), "utf8");
const seedResponse = await fetch(
  `https://api.supabase.com/v1/projects/${target.ref}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${target.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query: seedSql }),
  },
);
if (!seedResponse.ok) {
  console.error(
    `supabase/seed.sql failed: ${seedResponse.status} ${(await seedResponse.text()).slice(0, 300)}`,
  );
  process.exit(1);
}

const headers = {
  apikey: target.serviceKey,
  Authorization: `Bearer ${target.serviceKey}`,
  "content-type": "application/json",
  Prefer: "return=representation",
};

async function send(method, path, body) {
  const response = await fetch(`${target.url}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path.split("?")[0]} → ${response.status} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : [];
}

const days = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const date = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * One per stage the pipeline shows, plus a row that stopped before
 * giving contact details — the "incomplete" case the inbox hides by
 * default, which is the one nobody remembers to test.
 */
const LEADS = [
  {
    reg: "SG01NEW", status: "new", name: "Avery Sample", method: "whatsapp",
    vehicle: { make: "LAND ROVER", model: "RANGE ROVER EVOQUE", year: 2022, colour: "GREY", fuel: "DIESEL", cc: 1999 },
    age: 0.1, mileage: 28_400, timeline: "asap", history: "full",
  },
  {
    reg: "SG02CON", status: "contacted", name: "Blake Sample", method: "call",
    vehicle: { make: "LAND ROVER", model: "DISCOVERY SPORT", year: 2021, colour: "WHITE", fuel: "DIESEL", cc: 1999 },
    age: 2, mileage: 41_250, timeline: "this_month", history: "full",
  },
  {
    reg: "SG03OFF", status: "offered", name: "Casey Sample", method: "sms",
    vehicle: { make: "MERCEDES-BENZ", model: "GLE 350DE", year: 2020, colour: "BLACK", fuel: "HYBRID ELECTRIC", cc: 1950 },
    age: 4, mileage: 52_900, timeline: "this_month", history: "partial",
    offer: { amount: 24_500, channel: "domestic", status: "sent" },
  },
  {
    reg: "SG04ACC", status: "accepted", name: "Devon Sample", method: "call",
    vehicle: { make: "LAND ROVER", model: "DEFENDER", year: 2021, colour: "GREEN", fuel: "DIESEL", cc: 2996 },
    age: 7, mileage: 33_100, timeline: "asap", history: "full",
    offer: { amount: 48_750, channel: "export", status: "accepted" },
  },
  {
    reg: "SG05COL", status: "collected", name: "Elliot Sample", method: "email",
    vehicle: { make: "LEXUS", model: "RX 450H", year: 2019, colour: "SILVER", fuel: "HYBRID ELECTRIC", cc: 3456 },
    age: 12, mileage: 61_300, timeline: "asap", history: "full",
    offer: { amount: 19_200, channel: "domestic", status: "accepted" },
  },
  {
    reg: "SG06LIS", status: "listed", name: "Frankie Sample", method: "whatsapp",
    vehicle: { make: "LAND ROVER", model: "RANGE ROVER VELAR", year: 2020, colour: "BLUE", fuel: "PETROL", cc: 1997 },
    age: 18, mileage: 44_600, timeline: "this_month", history: "partial",
    offer: { amount: 31_000, channel: "domestic", status: "accepted" },
  },
  {
    reg: "SG07SHI", status: "shipped", name: "Harper Sample", method: "call",
    vehicle: { make: "LAND ROVER", model: "RANGE ROVER", year: 2022, colour: "BLACK", fuel: "DIESEL", cc: 2997 },
    age: 24, mileage: 21_800, timeline: "asap", history: "full",
    offer: { amount: 72_400, channel: "export", status: "accepted" },
  },
  {
    reg: "SG08SLD", status: "sold", name: "Indy Sample", method: "email",
    vehicle: { make: "LAND ROVER", model: "DISCOVERY SPORT", year: 2019, colour: "RED", fuel: "DIESEL", cc: 1999 },
    age: 35, mileage: 68_200, timeline: "few_months", history: "partial",
    offer: { amount: 16_950, channel: "domestic", status: "accepted" },
  },
  {
    reg: "SG09LOS", status: "lost", name: "Jules Sample", method: "sms",
    vehicle: { make: "VOLKSWAGEN", model: "GOLF", year: 2017, colour: "WHITE", fuel: "PETROL", cc: 1395 },
    age: 9, mileage: 79_500, timeline: "researching", history: "none",
  },
  {
    // Stopped after confirming the car. No name, no number, no email.
    reg: "SG10INC", status: "new", name: null, method: null,
    vehicle: { make: "BMW", model: "3 SERIES", year: 2018, colour: "GREY", fuel: "DIESEL", cc: 1995 },
    age: 1, mileage: null, timeline: null, history: null,
  },
];

const REGS = LEADS.map((lead) => lead.reg);
const inRegs = `(${REGS.join(",")})`;

/** Wipe first, so a second run replaces rather than duplicates. */
const existing = await send("GET", `leads?reg=in.${inRegs}&select=id`);
if (existing.length > 0) {
  const ids = `(${existing.map((row) => row.id).join(",")})`;
  for (const table of ["audit_log", "offers", "enrichments", "conversations", "photos"]) {
    await send("DELETE", `${table}?lead_id=in.${ids}`);
  }
  await send("DELETE", `leads?id=in.${ids}`);
}
await send("DELETE", `vehicles?reg=in.${inRegs}`);

if (process.argv.includes("--clear")) {
  console.log(`cleared ${existing.length} seeded leads from ${target.ref}`);
  process.exit(0);
}

let offers = 0;
for (const [index, lead] of LEADS.entries()) {
  const [vehicle] = await send("POST", "vehicles", [
    {
      reg: lead.reg,
      make: lead.vehicle.make,
      model: lead.vehicle.model,
      colour: lead.vehicle.colour,
      fuel: lead.vehicle.fuel,
      engine_cc: lead.vehicle.cc,
      year_of_manufacture: lead.vehicle.year,
      first_registered: `${lead.vehicle.year}-03-01`,
      mot_status: "Valid",
      mot_expiry: date(120),
      tax_status: "Taxed",
    },
  ]);

  const complete = lead.name !== null;
  const [row] = await send("POST", "leads", [
    {
      reg: lead.reg,
      vehicle_id: vehicle.id,
      status: lead.status,
      source: "staging-seed",
      created_at: days(lead.age),
      updated_at: days(Math.max(0, lead.age - 0.5)),
      // Ofcom's drama range: reserved, and cannot connect.
      name: lead.name,
      phone: complete ? `07700 9000${String(index).padStart(2, "0")}` : null,
      email: complete ? `${lead.name.split(" ")[0].toLowerCase()}@example.com` : null,
      postcode: complete ? "SW1A 1AA" : null,
      preferred_contact_method: lead.method,
      contact_window: complete ? "Weekday afternoons" : null,
      marketing_consent: false,
      completed_at: complete ? days(lead.age) : null,
      furthest_step: complete ? 4 : 2,
      mileage_reported: lead.mileage,
      service_history: lead.history,
      timeline: lead.timeline,
      reason_for_sale: complete ? "Sample row — staging only." : null,
      next_contact_date: lead.status === "contacted" ? date(1) : null,
    },
  ]);

  if (lead.offer) {
    await send("POST", "offers", [
      {
        lead_id: row.id,
        made_by: "staging-seed",
        amount: lead.offer.amount,
        channel: lead.offer.channel,
        status: lead.offer.status,
        valid_until: date(7),
      },
    ]);
    await send("POST", "audit_log", [
      {
        actor: "staging-seed",
        lead_id: row.id,
        action: "offer.recorded",
        before: null,
        after: { amount: lead.offer.amount, channel: lead.offer.channel },
        at: days(Math.max(0, lead.age - 1)),
      },
    ]);
    offers += 1;
  }

  console.log(`  ${lead.reg}  ${lead.status}${complete ? "" : "  (incomplete)"}`);
}

console.log(`\n${LEADS.length} leads and ${offers} offers seeded into ${target.ref}.`);
