import type { Metadata } from "next";
import { db } from "@/lib/db";
import { SETTING_FIELDS, SETTING_GROUPS } from "@/config/settings-schema";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const { data } = await db().from("settings").select("key, value, updated_by, updated_at");
  const current = new Map(
    (data ?? []).map((row) => [
      row.key as string,
      { value: row.value, updatedBy: row.updated_by, updatedAt: row.updated_at },
    ]),
  );

  const missing = SETTING_FIELDS.filter(
    (field) => field.absenceCost && !current.has(field.key),
  );

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-display-3">Settings</h1>
      <p className="mt-3 max-w-prose text-sm text-structure">
        Every number the decision engine uses. Changing one takes effect on
        the next lead scored — there is no deploy.
      </p>

      {missing.length > 0 && (
        <div className="mt-8 rounded border border-oxblood bg-paper-warm p-5">
          <p className="text-sm font-medium">
            {missing.length} setting{missing.length === 1 ? " is" : "s are"} not
            filled in yet
          </p>
          <p className="mt-2 max-w-prose text-sm text-structure">
            Until they are, the engine refuses to calculate a margin rather
            than guessing one. It will keep naming them on every lead.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {missing.map((field) => (
              <li key={field.key}>
                <span className="font-medium">{field.label}</span>
                <span className="text-structure"> — {field.absenceCost}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 flex flex-col gap-12">
        {SETTING_GROUPS.map((group) => {
          const fields = SETTING_FIELDS.filter((f) => f.group === group);
          if (fields.length === 0) return null;
          return (
            <section key={group}>
              <h2 className="font-display text-2xl">{group}</h2>
              <div className="mt-5 flex flex-col gap-6">
                {fields.map((field) => (
                  <SettingsForm
                    key={field.key}
                    field={field}
                    current={current.get(field.key) ?? null}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
