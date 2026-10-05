"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin/auth";

/**
 * Logging a comparable.
 *
 * These are the observations that eventually replace a guessed Cyprus
 * price with an evidenced one (CLAUDE.md section 13, Phase E), so the
 * schema is permissive about what is known: a listing seen on a forecourt
 * with an asking price and no sold price is still worth recording, and
 * demanding every field would mean fewer of them get logged.
 *
 * What is not permissive: a comparable must carry a market and a price of
 * some kind, or it says nothing.
 */

const optionalInt = (max: number) =>
  z.coerce.number().int().min(0).max(max).optional().nullable();

const schema = z
  .object({
    market: z.enum(["uk", "cyprus"]),
    source: z.string().trim().max(120).optional(),
    url: z.string().trim().url().max(500).optional().or(z.literal("")),
    make: z.string().trim().max(60).optional(),
    model: z.string().trim().max(60).optional(),
    derivative: z.string().trim().max(120).optional(),
    year: optionalInt(2100),
    mileage: optionalInt(1_000_000),
    asking: optionalInt(1_000_000),
    sold: optionalInt(1_000_000),
    daysListed: optionalInt(3650),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.asking != null || value.sold != null, {
    message: "A comparable needs an asking price or a sold price.",
    path: ["asking"],
  });

export interface LogResult {
  ok: boolean;
  error?: string;
}

export async function logComparable(
  _prev: LogResult | null,
  formData: FormData,
): Promise<LogResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };

  const raw = Object.fromEntries(formData.entries());
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? undefined : value,
    ]),
  );

  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That did not validate.",
    };
  }

  const v = parsed.data;
  const { error } = await db()
    .from("comparables")
    .insert({
      market: v.market,
      source: v.source ?? null,
      url: v.url || null,
      make: v.make ?? null,
      model: v.model ?? null,
      derivative: v.derivative ?? null,
      year: v.year ?? null,
      mileage: v.mileage ?? null,
      asking: v.asking ?? null,
      sold: v.sold ?? null,
      days_listed: v.daysListed ?? null,
      notes: v.notes ?? null,
      logged_by: admin.email,
    });

  if (error) return { ok: false, error: "Could not save that." };

  await db().from("audit_log").insert({
    actor: admin.email,
    action: "comparable.logged",
    after: { market: v.market, make: v.make, model: v.model },
  });

  revalidatePath("/admin/comparables");
  return { ok: true };
}
