import "server-only";
import { db } from "@/lib/db";
import { excludeTestLeads } from "@/lib/admin/exclusions";
import { normaliseReg } from "@/lib/reg";

/**
 * Find a lead by anything the operator has in front of them.
 *
 * Usually that is a registration read off a text message, or a name
 * and a number from a missed call. Four columns, one query.
 *
 * Registrations are matched on the normalised form as well as the
 * typed one: a seller writes "RV23 TMH", the column holds "RV23TMH",
 * and a search that misses on a space is a search nobody trusts twice.
 */
export interface SearchHit {
  id: string;
  reg: string;
  name: string | null;
  phone: string | null;
  status: string;
  completedAt: string | null;
}

export async function searchLeads(term: string): Promise<SearchHit[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const like = `%${query}%`;
  const reg = normaliseReg(query).replace(/\s/g, "");
  const filters = [
    `reg.ilike.%${reg}%`,
    `name.ilike.${like}`,
    `phone.ilike.${like}`,
    `email.ilike.${like}`,
  ].join(",");

  const { data } = await excludeTestLeads(
    db()
      .from("leads")
      .select("id, reg, name, phone, status, completed_at")
      .or(filters),
  )
    .order("created_at", { ascending: false })
    .limit(8);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    reg: row.reg as string,
    name: (row.name as string) ?? null,
    phone: (row.phone as string) ?? null,
    status: row.status as string,
    completedAt: (row.completed_at as string) ?? null,
  }));
}
