import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { freshDb } from "./db";

/**
 * Proves the admin policies actually gate on membership of admin_users,
 * rather than letting any authenticated session read the lead database.
 *
 * This matters because Supabase magic-link auth will issue a session to
 * any email that requests one. If these policies were wrong, a stranger
 * who signed up could read every seller's name, phone and postcode
 * through the public REST API.
 *
 * PGlite has no Supabase `auth` schema, so the harness supplies an
 * auth.jwt() returning whichever email the test is pretending to be.
 * Everything else — the policies, the grants, is_admin() — is the real
 * migration.
 */
async function dbActingAs(email: string | null): Promise<PGlite> {
  const db = await freshDb();
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.jwt()
    returns jsonb language sql stable as $$
      select ${email === null ? "'{}'::jsonb" : `jsonb_build_object('email', '${email}')`};
    $$;
  `);
  await db.exec(`
    insert into vehicles (reg, make) values ('AD01MIN', 'LAND ROVER');
    insert into leads (reg, name, phone)
      values ('AD01MIN', 'A Real Seller', '07700 900000');
  `);
  return db;
}

async function leadsVisibleTo(
  db: PGlite,
): Promise<{ count: number | null; error: string | null }> {
  await db.exec("set role authenticated");
  try {
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int as count from leads",
    );
    return { count: rows[0].count, error: null };
  } catch (error) {
    return {
      count: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await db.exec("reset role");
  }
}

describe("admin access to leads", () => {
  it("lets an authenticated user on the list read leads", async () => {
    const db = await dbActingAs("alex@example.com");
    await db.exec(
      "insert into admin_users (email, added_by) values ('alex@example.com','test')",
    );
    const result = await leadsVisibleTo(db);
    expect(result.error).toBeNull();
    expect(result.count).toBe(1);
    await db.close();
  });

  it("shows nothing to an authenticated user who is NOT on the list", async () => {
    // The dangerous case: a stranger who signed up for a magic link.
    const db = await dbActingAs("stranger@example.com");
    await db.exec(
      "insert into admin_users (email, added_by) values ('alex@example.com','test')",
    );
    const result = await leadsVisibleTo(db);
    expect(result.count).toBe(0);
    await db.close();
  });

  it("shows nothing when the list is empty", async () => {
    const db = await dbActingAs("anyone@example.com");
    const result = await leadsVisibleTo(db);
    expect(result.count).toBe(0);
    await db.close();
  });

  it("shows nothing to a session carrying no email claim", async () => {
    const db = await dbActingAs(null);
    await db.exec(
      "insert into admin_users (email, added_by) values ('alex@example.com','test')",
    );
    const result = await leadsVisibleTo(db);
    expect(result.count).toBe(0);
    await db.close();
  });

  it("matches the email case-insensitively", async () => {
    const db = await dbActingAs("Alex@Example.COM");
    await db.exec(
      "insert into admin_users (email, added_by) values ('alex@example.com','test')",
    );
    const result = await leadsVisibleTo(db);
    expect(result.count).toBe(1);
    await db.close();
  });

  it("stops a non-admin writing a lead", async () => {
    const db = await dbActingAs("stranger@example.com");
    await db.exec("set role authenticated");
    let denied: string | null = null;
    try {
      await db.query("insert into leads (reg) values ('HACK001')");
    } catch (error) {
      denied = error instanceof Error ? error.message : String(error);
    }
    await db.exec("reset role");
    expect(denied).toMatch(/row-level security|permission denied/i);
    await db.close();
  });

  it("stops an admin adding another admin — only the service role may", async () => {
    const db = await dbActingAs("alex@example.com");
    await db.exec(
      "insert into admin_users (email, added_by) values ('alex@example.com','test')",
    );
    await db.exec("set role authenticated");
    let denied: string | null = null;
    try {
      await db.query(
        "insert into admin_users (email) values ('accomplice@example.com')",
      );
    } catch (error) {
      denied = error instanceof Error ? error.message : String(error);
    }
    await db.exec("reset role");
    expect(denied).toMatch(/row-level security|permission denied/i);
    await db.close();
  });

  it("still denies the anon role entirely", async () => {
    const db = await dbActingAs("alex@example.com");
    await db.exec(
      "insert into admin_users (email, added_by) values ('alex@example.com','test')",
    );
    await db.exec("set role anon");
    let denied: string | null = null;
    try {
      await db.query("select count(*) from leads");
    } catch (error) {
      denied = error instanceof Error ? error.message : String(error);
    }
    await db.exec("reset role");
    expect(denied).toMatch(/permission denied/i);
    await db.close();
  });
});

describe("admin access to car_costs", () => {
  // Added with the actuals migration. A cost line names what we paid for
  // a specific seller's car, so it is no less sensitive than the lead.
  async function costsVisibleTo(
    db: PGlite,
  ): Promise<{ count: number | null; error: string | null }> {
    await db.exec("set role authenticated");
    try {
      const { rows } = await db.query<{ count: number }>(
        "select count(*)::int as count from car_costs",
      );
      return { count: rows[0].count, error: null };
    } catch (error) {
      return {
        count: null,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await db.exec("reset role");
    }
  }

  it("lets an admin read cost lines", async () => {
    const db = await dbActingAs("alex@example.com");
    await db.exec(
      "insert into admin_users (email) values ('alex@example.com');",
    );
    await db.exec(`
      insert into car_costs (lead_id, kind, amount)
      select id, 'recon', 450 from leads limit 1;
    `);
    const result = await costsVisibleTo(db);
    expect(result.error).toBeNull();
    expect(result.count).toBe(1);
  });

  it("shows cost lines to nobody off the list", async () => {
    const db = await dbActingAs("stranger@example.com");
    await db.exec(
      "insert into admin_users (email) values ('alex@example.com');",
    );
    await db.exec(`
      insert into car_costs (lead_id, kind, amount)
      select id, 'recon', 450 from leads limit 1;
    `);
    const result = await costsVisibleTo(db);
    expect(result.count).toBe(0);
  });
});
