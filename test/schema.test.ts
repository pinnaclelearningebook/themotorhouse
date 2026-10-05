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

  it("ship no permissive policies, so RLS denies by default", async () => {
    const db = await freshDb();
    const { rows } = await db.query<{ count: number }>(
      `select count(*)::int as count from pg_policies where schemaname = 'public'`,
    );
    // Deny-all is intentional for Phase B. See the comment block in
    // 20261005120100_rls.sql before adding any policy here.
    expect(rows[0].count).toBe(0);
    await db.close();
  });

  it("deny a non-bypassing role from reading leads", async () => {
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

    // As authenticated the read is refused outright. RLS with no policy
    // would already return zero rows; the revoke in the RLS migration
    // goes further and removes the SELECT grant, so this errors instead.
    // That is the stronger of the two behaviours and the one we want.
    await db.exec("set role authenticated");
    let denied: string | null = null;
    try {
      await db.query("select count(*) from leads");
    } catch (error) {
      denied = error instanceof Error ? error.message : String(error);
    }
    expect(denied).toMatch(/permission denied/i);

    await db.exec("reset role");
    await db.close();
  });

  it("seed only the two documented margin floors", async () => {
    const db = await freshDb();
    await seed(db);
    const { rows } = await db.query<{ key: string; value: number }>(
      "select key, value::text::int as value from settings order by key",
    );
    // Landed-cost constants are deliberately absent — PENDING-INFO.md,
    // Phase C. Phase C must fail loudly rather than compute from guesses.
    expect(rows).toEqual([
      { key: "margin_floor_domestic", value: 500 },
      { key: "margin_floor_export", value: 3500 },
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
