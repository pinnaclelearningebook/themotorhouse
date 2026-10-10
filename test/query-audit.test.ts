import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every column named in a Supabase query must exist.
 *
 * get_vehicle_context selected fuel_type and engine_capacity. The table
 * has fuel and engine_cc. PostgREST returned an error, the code read the
 * result as null, and the vehicle context was empty in every conversation
 * for days — indistinguishable from a lookup that found nothing, which is
 * exactly what everyone assumed it was.
 *
 * TypeScript cannot see inside those strings. This walks the source,
 * pulls the column lists out of .select(), .insert() and .update() calls
 * against known tables, and checks each name against the migrations.
 */

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "lib", "agent", "components", "config"];
const MIGRATIONS = join(ROOT, "supabase/migrations");

/** Columns per table, read from every create table and alter table add. */
function schema(): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");

    for (const match of sql.matchAll(/create table (\w+)\s*\(([\s\S]*?)\n\);/g)) {
      const [, table, body] = match;
      const columns = tables.get(table) ?? new Set<string>();
      for (const line of body.split("\n")) {
        const column = line.match(/^\s{2,}([a-z_][a-z0-9_]*)\s+\S/);
        // Skip table-level constraints, which are not columns.
        if (column && !/^(primary|foreign|unique|check|constraint)$/.test(column[1])) {
          columns.add(column[1]);
        }
      }
      tables.set(table, columns);
    }

    for (const match of sql.matchAll(
      /alter table (\w+)\s+add column (?:if not exists )?([a-z_][a-z0-9_]*)/g,
    )) {
      const [, table, column] = match;
      const columns = tables.get(table) ?? new Set<string>();
      columns.add(column);
      tables.set(table, columns);
    }
  }
  return tables;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = join(current, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
  };
  try {
    walk(join(ROOT, dir));
  } catch {
    // Directory may not exist; nothing to audit.
  }
  return out;
}

/**
 * Keys at the top level of an object literal, ignoring nested ones.
 *
 * A naive line-based match treated `topic:` and `at:` inside a
 * structured_notes array as columns of the conversations table. Only the
 * outermost keys are columns.
 */
function topLevelKeys(source: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let i = 0;

  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{" || ch === "[" || ch === "(") depth += 1;
    else if (ch === "}" || ch === "]" || ch === ")") {
      depth -= 1;
      if (depth === 0) break;
    } else if (depth === 1) {
      const key = source.slice(i).match(/^([a-z_][a-z0-9_]*)\s*:/);
      // A key follows an opening brace or a comma, and nothing else. The
      // ternary `before ? null : { … }` otherwise reads "null" as one.
      const prior = source.slice(0, i).replace(/\s+$/, "").slice(-1);
      const KEYWORDS = new Set(["null", "true", "false", "undefined"]);
      if (key && (prior === "{" || prior === ",") && !KEYWORDS.has(key[1])) {
        keys.push(key[1]);
        i += key[0].length - 1;
      }
    }
  }
  return keys;
}

interface Query {
  file: string;
  table: string;
  kind: "select" | "insert" | "update";
  columns: string[];
}

/** Pull the table and the columns out of each chained query. */
function queries(tables: Map<string, Set<string>>): Query[] {
  const found: Query[] = [];

  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFiles(dir)) {
      const code = readFileSync(file, "utf8");
      const short = relative(ROOT, file);

      for (const match of code.matchAll(/\.from\(["'](\w+)["']\)/g)) {
        const table = match[1];
        if (!tables.has(table)) continue;
        // Look only as far as the next .from(, so chains do not bleed.
        const rest = code.slice(match.index + match[0].length);
        const nextFrom = rest.search(/\.from\(["']\w+["']\)/);
        const chain = nextFrom === -1 ? rest.slice(0, 1200) : rest.slice(0, nextFrom);

        const select = chain.match(/\.select\(\s*(?:\/\/[^\n]*\n\s*)*["`]([^"`]*)["`]/);
        if (select && select[1].trim() && !select[1].includes("(")) {
          found.push({
            file: short,
            table,
            kind: "select",
            columns: select[1]
              .split(",")
              .map((c) => c.trim())
              .filter((c) => c && c !== "*"),
          });
        }

        for (const write of ["insert", "update", "upsert"] as const) {
          const at = chain.search(new RegExp(`\\.${write}\\(\\s*\\{`));
          if (at === -1) continue;
          const columns = topLevelKeys(chain.slice(chain.indexOf("{", at)));
          if (columns.length) {
            found.push({
              file: short,
              table,
              kind: write === "upsert" ? "insert" : write,
              columns,
            });
          }
        }
      }
    }
  }
  return found;
}

describe("every queried column exists", () => {
  const tables = schema();
  const all = queries(tables);

  it("reads the schema and finds queries to check", () => {
    expect(tables.size).toBeGreaterThan(8);
    expect(tables.get("vehicles")?.has("fuel")).toBe(true);
    expect(tables.get("vehicles")?.has("fuel_type")).toBe(false);
    expect(all.length).toBeGreaterThan(15);
  });

  it("names no column the migrations do not define", () => {
    const wrong: string[] = [];
    for (const query of all) {
      const columns = tables.get(query.table);
      if (!columns) continue;
      for (const column of query.columns) {
        if (!columns.has(column)) {
          wrong.push(`${query.file}: ${query.table}.${column} (${query.kind})`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("a failed query is not an empty one", () => {
  /**
   * The vehicle-context bug was invisible because a broken query and a
   * lookup that found nothing produced the same thing: no data. Every
   * read in the agent's tools must separate them.
   */
  it("every tool read captures and acts on its error", () => {
    const tools = readFileSync(join(ROOT, "agent/tools.ts"), "utf8");
    const reads = tools.split("export async function").slice(1);

    for (const fn of reads) {
      const name = fn.slice(0, fn.indexOf("(")).trim();
      if (!/getVehicleContext|readFormState|appendLeadNote/.test(name)) continue;
      expect(fn, `${name} must capture the error`).toMatch(/error\s*[,}]|error:/);
      expect(fn, `${name} must act on it`).toMatch(/failed\(/);
    }
  });

  it("tells the model the lookup failed, not that the car is unknown", () => {
    const tools = readFileSync(join(ROOT, "agent/tools.ts"), "utf8");
    expect(tools).toMatch(/is not available right now/);
    // After the query, the error is checked before an empty result is
    // treated as "no such vehicle". The early return above the query —
    // for a session with no vehicle bound at all — is a different case
    // and legitimately comes first.
    const fn = tools.slice(tools.indexOf("export async function getVehicleContext"));
    const afterQuery = fn.slice(fn.indexOf(".maybeSingle()"));
    expect(afterQuery.indexOf("failed(")).toBeGreaterThan(-1);
    expect(afterQuery.indexOf("failed(")).toBeLessThan(
      afterQuery.indexOf("known: false"),
    );
  });
});
