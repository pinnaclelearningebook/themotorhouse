import { describe, expect, it } from "vitest";
import { freshDb, seed } from "./db";

describe("migrations", () => {
  it("execute cleanly from an empty database", async () => {
    const db = await freshDb();
    const { rows } = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' order by table_name`,
    );
    const tables = rows.map((r) => r.table_name);

    expect(tables).toEqual([
      "admin_users",
      "api_rate_limits",
      "audit_log",
      "comparables",
      "conversations",
      "enrichments",
      "leads",
      "mot_tests",
      "offers",
      "photos",
      "provenance_checks",
      "settings",
      "vehicles",
    ]);
    await db.close();
  });

  it("enable row-level security on every table", async () => {
    const db = await freshDb();
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    const unprotected = rows.filter((r) => !r.relrowsecurity).map((r) => r.relname);
    expect(unprotected).toEqual([]);
    await db.close();
  });

  it("gate every policy on admin membership, never on 'true'", async () => {
    const db = await freshDb();
    const { rows } = await db.query<{ tablename: string; qual: string | null }>(
      `select tablename, qual from pg_policies where schemaname = 'public'`,
    );
    // Phase B shipped deny-all with no policies; Phase C added the admin
    // policies. What must never appear is a policy that lets any
    // authenticated session through, because Supabase will hand a session
    // to any email that asks. See 20261005120100_rls.sql.
    expect(rows.length).toBeGreaterThan(0);
    const permissive = rows.filter(
      (row) => (row.qual ?? "").trim().replace(/\s/g, "") === "true",
    );
    expect(permissive).toEqual([]);
    for (const row of rows) {
      expect(row.qual ?? "", row.tablename).toMatch(/is_admin\(\)/);
    }
    await db.close();
  });

  it("deny anon entirely, and deny an authenticated non-admin", async () => {
    const db = await freshDb();
    await db.exec(`
      insert into vehicles (reg, make) values ('AB12CDE', 'LAND ROVER');
      insert into leads (reg, name) values ('AB12CDE', 'Test Seller');
    `);

    // As service_role (bypassrls) the row is visible.
    await db.exec("set role service_role");
    const asService = await db.query<{ count: number }>(
      "select count(*)::int as count from leads",
    );
    expect(asService.rows[0].count).toBe(1);

    // anon has no grant at all and is refused outright.
    await db.exec("set role anon");
    let anonDenied: string | null = null;
    try {
      await db.query("select count(*) from leads");
    } catch (error) {
      anonDenied = error instanceof Error ? error.message : String(error);
    }
    expect(anonDenied).toMatch(/permission denied/i);
    await db.exec("reset role");

    // authenticated now has a grant, so it does not error — but with an
    // empty admin_users the policy shows it nothing. The fuller matrix
    // lives in test/admin-rls.test.ts.
    await db.exec("set role authenticated");
    const asAuthed = await db.query<{ count: number }>(
      "select count(*)::int as count from leads",
    );
    expect(asAuthed.rows[0].count).toBe(0);

    await db.exec("reset role");
    await db.close();
  });

  it("seed only settings that are actually decided", async () => {
    const db = await freshDb();
    await seed(db);
    const { rows } = await db.query<{ key: string; value: number }>(
      "select key, value::text::int as value from settings order by key",
    );
    // Landed-cost constants are deliberately absent — PENDING-INFO.md,
    // Phase C. The engine must fail loudly rather than compute from
    // guesses. sla_hours is here because two hours is not a decision
    // anyone still owes: it is the promise the site already makes.
    expect(rows).toEqual([
      { key: "margin_floor_domestic", value: 500 },
      { key: "margin_floor_export", value: 3500 },
      { key: "sla_hours", value: 2 },
    ]);
    await db.close();
  });

  it("cascade lead children and keep the vehicle", async () => {
    const db = await freshDb();
    await db.exec(`
      insert into vehicles (id, reg) values
        ('11111111-1111-1111-1111-111111111111', 'AB12CDE');
      insert into leads (id, reg, vehicle_id) values
        ('22222222-2222-2222-2222-222222222222', 'AB12CDE',
         '11111111-1111-1111-1111-111111111111');
      insert into photos (lead_id, blob_url) values
        ('22222222-2222-2222-2222-222222222222', 'https://example/x.jpg');
      delete from leads where id = '22222222-2222-2222-2222-222222222222';
    `);
    const photos = await db.query<{ count: number }>(
      "select count(*)::int as count from photos",
    );
    const vehicles = await db.query<{ count: number }>(
      "select count(*)::int as count from vehicles",
    );
    expect(photos.rows[0].count).toBe(0);
    expect(vehicles.rows[0].count).toBe(1);
    await db.close();
  });

  it("bump updated_at on lead update", async () => {
    const db = await freshDb();
    await db.exec(
      `insert into leads (id, reg, name) values
       ('33333333-3333-3333-3333-333333333333', 'AB12CDE', 'Before')`,
    );
    const before = await db.query<{ updated_at: string }>(
      "select updated_at from leads where id = '33333333-3333-3333-3333-333333333333'",
    );
    await db.exec(
      `update leads set name = 'After' where id = '33333333-3333-3333-3333-333333333333'`,
    );
    const after = await db.query<{ updated_at: string }>(
      "select updated_at from leads where id = '33333333-3333-3333-3333-333333333333'",
    );
    expect(
      new Date(after.rows[0].updated_at).getTime(),
    ).toBeGreaterThanOrEqual(new Date(before.rows[0].updated_at).getTime());
    await db.close();
  });
});
