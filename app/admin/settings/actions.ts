"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin/auth";
import { SETTING_FIELDS } from "@/config/settings-schema";

/**
 * Saves one setting. Every write records who made it and what it was
 * before, because a margin floor quietly changing is exactly the kind of
 * thing that is impossible to reconstruct later.
 */
export type SaveState =
  | { status: "idle" }
  | { status: "saved"; key: string }
  | { status: "error"; message: string };

function parse(kind: string, raw: string): unknown | null {
  const value = raw.trim();
  if (value === "") return null;

  switch (kind) {
    case "money":
    case "integer": {
      const n = Number(value.replace(/[£,\s]/g, ""));
      if (!Number.isFinite(n) || n < 0) return undefined;
      return Math.round(n);
    }
    case "percent": {
      const n = Number(value.replace(/[%\s]/g, ""));
      if (!Number.isFinite(n) || n < 0 || n > 100) return undefined;
      // Stored as a fraction so the engine never has to guess the unit.
      return n > 1 ? n / 100 : n;
    }
    case "boolean":
      return value === "true" || value === "on";
    case "list": {
      const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.every((line) => line.includes("="))) {
        const table: Record<string, number> = {};
        for (const line of lines) {
          const [k, v] = line.split("=");
          const n = Number(v.trim());
          if (!Number.isFinite(n)) return undefined;
          table[k.trim()] = n;
        }
        return table;
      }
      return lines;
    }
    default:
      return undefined;
  }
}

export async function saveSetting(
  key: string,
  raw: string,
): Promise<SaveState> {
  const admin = await currentAdmin();
  if (!admin) return { status: "error", message: "Not signed in." };

  const field = SETTING_FIELDS.find((f) => f.key === key);
  if (!field) return { status: "error", message: "Unknown setting." };

  const parsed = parse(field.kind, raw);
  if (parsed === undefined) {
    return { status: "error", message: `That is not a valid ${field.kind}.` };
  }

  const { data: before } = await db()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (parsed === null) {
    // Clearing a setting is allowed and meaningful: the engine goes back
    // to naming it as missing rather than computing from a stale number.
    await db().from("settings").delete().eq("key", key);
  } else {
    const { error } = await db()
      .from("settings")
      .upsert(
        { key, value: parsed, updated_by: admin.email, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) return { status: "error", message: error.message };
  }

  await db().from("audit_log").insert({
    actor: admin.email,
    action: `setting.${parsed === null ? "cleared" : "updated"}:${key}`,
    before: before?.value === undefined ? null : { value: before.value },
    after: parsed === null ? null : { value: parsed },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { status: "saved", key };
}
