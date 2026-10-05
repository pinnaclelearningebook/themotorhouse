import { describe, expect, it } from "vitest";
import { freshDb } from "./db";
import { leadSchema } from "../lib/validation";

/**
 * The four-step form sends database-native enum values directly, which
 * removes the kebab/snake mismatch the two-step form had. These tests
 * exist so that stays true: if someone adds a form option that the
 * database does not know, or renames an enum label, this fails rather
 * than Postgres rejecting a real seller's submission at runtime.
 */
async function enumLabels(typname: string): Promise<string[]> {
  const db = await freshDb();
  const { rows } = await db.query<{ label: string }>(
    `select e.enumlabel as label from pg_enum e
     join pg_type t on t.oid = e.enumtypid where t.typname = $1`,
    [typname],
  );
  await db.close();
  return rows.map((r) => r.label).sort();
}

describe("form values match the database enums", () => {
  it("timeline", async () => {
    expect(await enumLabels("sale_timeline")).toEqual(
      [...leadSchema.shape.timeline.options].sort(),
    );
  });

  it("finance outstanding", async () => {
    const schema = leadSchema.shape.financeOutstanding.unwrap().unwrap();
    expect(await enumLabels("finance_outstanding")).toEqual(
      [...schema.options].sort(),
    );
  });

  it("service history", async () => {
    const schema = leadSchema.shape.serviceHistory.unwrap().unwrap();
    expect(await enumLabels("service_history")).toEqual(
      [...schema.options].sort(),
    );
  });

  it("accepts a full four-step payload on a real insert", async () => {
    const db = await freshDb();
    await db.exec("grant all on all tables in schema public to service_role");
    await db.query(
      `insert into leads (reg, name, phone, email, postcode, timeline,
         finance_outstanding, service_history, mileage_reported, condition)
       values ('AB12CDE','A Seller','07700 900000','a@example.com','GU21 4XX',
         'this_month','no','full',74100,
         '{"bodywork":{"grade":"poor","note":"Scuffed bumper"}}'::jsonb)`,
    );
    const { rows } = await db.query<{ condition: unknown }>(
      "select condition from leads where reg = 'AB12CDE'",
    );
    expect(rows[0].condition).toEqual({
      bodywork: { grade: "poor", note: "Scuffed bumper" },
    });
    await db.close();
  });
});
