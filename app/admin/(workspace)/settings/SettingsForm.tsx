"use client";

import { useState, useTransition } from "react";
import { saveSetting } from "./actions";
import type { SettingField } from "@/config/settings-schema";

/**
 * One setting, one save. Deliberately not a single form with one submit:
 * these are independent decisions made at different times by different
 * people, and a bulk save makes it unclear what actually changed.
 */
export function SettingsForm({
  field,
  current,
}: {
  field: SettingField;
  current: { value: unknown; updatedBy: string | null; updatedAt: string | null } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initial = (() => {
    if (!current) return "";
    const v = current.value;
    if (field.kind === "percent" && typeof v === "number") return String(v * 100);
    if (field.kind === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) return v.join("\n");
    if (v && typeof v === "object") {
      return Object.entries(v as Record<string, unknown>)
        .map(([k, n]) => `${k}=${n}`)
        .join("\n");
    }
    return String(v ?? "");
  })();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get("value") ?? "");
    startTransition(async () => {
      const result = await saveSetting(field.key, raw);
      if (result.status === "error") {
        setError(result.message);
        setMessage(null);
      } else {
        setError(null);
        setMessage(raw.trim() === "" ? "Cleared" : "Saved");
      }
    });
  }

  const unset = !current;

  return (
    <form onSubmit={submit} className="rounded border border-line p-5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={field.key} className="text-sm font-medium">
          {field.label}
        </label>
        {unset ? (
          <span className="text-caption text-oxblood">Not set</span>
        ) : (
          <span className="data-inline text-caption text-structure">
            {current.updatedAt?.slice(0, 10)}
            {current.updatedBy ? ` · ${current.updatedBy}` : ""}
          </span>
        )}
      </div>
      <p className="mt-1.5 max-w-prose text-caption text-structure">{field.help}</p>

      <div className="mt-3 flex items-start gap-3">
        {field.kind === "boolean" ? (
          <select
            id={field.key}
            name="value"
            defaultValue={initial || "false"}
            className="rounded border border-line bg-paper px-3 py-2 text-sm"
          >
            <option value="true">On</option>
            <option value="false">Off</option>
          </select>
        ) : field.kind === "list" ? (
          <textarea
            id={field.key}
            name="value"
            rows={4}
            defaultValue={initial}
            className="w-full rounded border border-line bg-paper px-3 py-2 font-mono text-sm"
          />
        ) : (
          <input
            id={field.key}
            name="value"
            inputMode="decimal"
            defaultValue={initial}
            placeholder={field.kind === "percent" ? "e.g. 19" : "e.g. 900"}
            className="data-inline w-48 rounded border border-line bg-paper px-3 py-2 text-sm"
          />
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-line px-4 py-2 text-sm transition-colors duration-200 hover:border-oxblood disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {message && <p className="mt-2 text-caption text-structure">{message}</p>}
      {error && (
        <p role="alert" className="mt-2 text-caption font-medium text-oxblood">
          {error}
        </p>
      )}
      {unset && field.absenceCost && (
        <p className="mt-2 text-caption text-oxblood">{field.absenceCost}</p>
      )}
    </form>
  );
}
