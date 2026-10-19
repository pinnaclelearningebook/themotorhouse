import "server-only";
import { TEST_SOURCE } from "@/lib/admin/voice-test";

/**
 * What never counts as a seller.
 *
 * Two separate problems, which is why there are two rules.
 *
 * **Source.** Leads the voice-test helper seeds carry
 * `source = 'admin-test'`. That has always been filtered out.
 *
 * **Registration.** On 15 October 2026 eight TE57VOX rows were sitting
 * in the Pipeline anyway. They were not seeded — they were put through
 * the real public form by hand while voice was being debugged, so they
 * had no source at all and were, as far as any query could tell,
 * ordinary sellers. The query was never wrong; the rows were not
 * labelled. The eight have been labelled since, but labelling after
 * the fact only works if somebody remembers, and nobody will.
 *
 * So a plate reserved for testing is excluded on sight, whatever route
 * the row came in by. Test on one of these and it stays out of the
 * queue without anyone having to tidy up afterwards.
 */
export const TEST_REGISTRATIONS = ["TE57VOX"] as const;

/**
 * Applies both rules to a leads query.
 *
 * Two chained filters rather than one `or()`: PostgREST's `or` is a
 * flat disjunction, so `(source is null OR source != test) AND reg not
 * in (...)` cannot be written as a single one without nesting that is
 * easy to get subtly wrong. The `source.is.null` arm has to stay —
 * a genuine lead has no source, and dropping it would filter out
 * every real seller, which is a far worse failure than the one this
 * guards against.
 *
 * Generic over the builder so it composes with any lead query without
 * each call site restating the filters and drifting apart. The cast is
 * deliberate: Supabase's builder types are recursive enough that
 * naming the filter methods in the constraint makes the compiler give
 * up on a count query ("type instantiation is excessively deep"). The
 * shape is checked where it matters — a builder without `or` and `not`
 * fails at the call site, and the tests in test/test-leads.test.ts
 * check that the filters are the right ones.
 */
interface Filterable {
  or: (filter: string) => Filterable;
  not: (column: string, operator: string, value: string) => Filterable;
}

export function excludeTestLeads<T>(query: T): T {
  return (query as Filterable)
    .or(`source.is.null,source.neq.${TEST_SOURCE}`)
    .not("reg", "in", `(${TEST_REGISTRATIONS.join(",")})`) as T;
}
