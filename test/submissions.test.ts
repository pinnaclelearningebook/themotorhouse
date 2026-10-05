import { describe, expect, it } from "vitest";
import { freshDb } from "./db";
import { timelineToDb } from "../lib/submissions";
import { stepTwoSchema } from "../lib/validation";

/**
 * The form spells timeline values in kebab-case and the database enum
 * uses snake_case with different words. Nothing in TypeScript catches a
 * mismatch — Postgres would reject the insert at runtime, on a real
 * seller's submission. These tests check the mapping against both ends.
 */
describe("timeline mapping", () => {
  const FORM_VALUES = [
    "asap",
    "this-month",
    "next-few-months",
    "just-researching",
  ] as const;

  it("covers every value the form can produce", () => {
    // Sourced from the Zod schema rather than restated, so adding a
    // form option without a mapping fails here.
    const schemaValues = stepTwoSchema.shape.sellTimeline.options;
    expect([...schemaValues].sort()).toEqual([...FORM_VALUES].sort());
  });

  it("maps every form value onto a real database enum label", async () => {
    const db = await freshDb();
    const { rows } = await db.query<{ label: string }>(
      `select e.enumlabel as label
       from pg_enum e join pg_type t on t.oid = e.enumtypid
       where t.typname = 'sale_timeline'`,
    );
    const dbLabels = rows.map((r) => r.label).sort();

    expect(dbLabels).toEqual(["asap", "few_months", "researching", "this_month"]);
    for (const value of FORM_VALUES) {
      expect(dbLabels).toContain(timelineToDb(value));
    }
    await db.close();
  });

  it("accepts the mapped values on a real insert", async () => {
    const db = await freshDb();
    await db.exec("grant all on all tables in schema public to service_role");
    for (const value of FORM_VALUES) {
      await db.query(
        `insert into leads (reg, timeline) values ('AB12CDE', $1)`,
        [timelineToDb(value)],
      );
    }
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int as count from leads",
    );
    expect(rows[0].count).toBe(FORM_VALUES.length);
    await db.close();
  });
});

describe("other step-two enums match the schema", () => {
  it("finance and service history labels line up with the database", async () => {
    const db = await freshDb();
    const read = async (typname: string) => {
      const { rows } = await db.query<{ label: string }>(
        `select e.enumlabel as label from pg_enum e
         join pg_type t on t.oid = e.enumtypid where t.typname = $1`,
        [typname],
      );
      return rows.map((r) => r.label).sort();
    };

    expect(await read("finance_outstanding")).toEqual(
      [...stepTwoSchema.shape.financeOutstanding.options].sort(),
    );
    expect(await read("service_history")).toEqual(
      [...stepTwoSchema.shape.serviceHistory.options].sort(),
    );
    await db.close();
  });
});
