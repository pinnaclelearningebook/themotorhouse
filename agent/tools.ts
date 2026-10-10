import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * The tools Maya may call, per CLAUDE.md section 10.
 *
 * Two rules run through all of them.
 *
 * Every handler takes a resolved session — a conversation the caller has
 * already proved it owns — and never a lead id from the request body. A
 * tool that accepted a lead id would let anyone with the endpoint read or
 * write any seller's record by guessing one.
 *
 * `set_field` and `append_lead_note` write only what the seller said.
 * Nothing here lets her originate a value, and nothing here touches
 * offers, scores, channels or anything the decision engine produces.
 */

export interface AgentSession {
  conversationId: string;
  leadId: string | null;
  vehicleId: string | null;
}

/** Fields Maya may fill. Deliberately excludes contact and consent. */
/**
 * Fields backed by a database enum, with the values the column accepts.
 *
 * Without this a plausible-sounding answer like "fairly soon" passes Zod,
 * is rejected by Postgres, and — because the error was ignored — Maya
 * tells the seller it is saved. Checking here means she gets a usable
 * failure and can ask the question properly.
 */
export const FIELD_ENUMS: Partial<Record<string, readonly string[]>> = {
  timeline: ["asap", "this_month", "few_months", "researching"],
  service_history: ["full", "partial", "none"],
  finance_outstanding: ["yes", "no", "unsure"],
};

export const WRITABLE_FIELDS = [
  "mileage_reported",
  "service_history",
  "keepers",
  "warning_lights",
  "known_faults",
  "modifications",
  "reason_for_sale",
  "timeline",
  "finance_outstanding",
  "part_exchange_interest",
  "others_approached",
] as const;

export type WritableField = (typeof WRITABLE_FIELDS)[number];

export const toolSchemas = {
  get_vehicle_context: z.object({}),
  read_form_state: z.object({}),
  set_field: z.object({
    field: z.enum(WRITABLE_FIELDS),
    value: z.union([z.string().max(2000), z.number(), z.boolean()]),
  }),
  go_to_step: z.object({ step: z.number().int().min(1).max(4) }),
  trigger_photo_guide: z.object({}),
  append_lead_note: z.object({
    note: z.string().trim().min(1).max(2000),
    topic: z
      .enum(["reason", "timeline", "worries", "other_offers", "other"])
      .default("other"),
  }),
} as const;

export type ToolName = keyof typeof toolSchemas;

/**
 * What the model is told each tool does, in the wire format the API wants.
 *
 * Hand-written rather than generated from the Zod schemas above: these
 * descriptions are instructions to a model and read differently from
 * validation rules, and the Zod schema stays the thing that actually
 * decides what is accepted. The two are kept in step by a test.
 */
export const TOOL_DEFINITIONS = [
  {
    name: "get_vehicle_context",
    description:
      "The DVLA and MOT record for this car. The only permitted source for any statement of fact about the vehicle.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "read_form_state",
    description: "Which fields are filled in and which are still empty.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "set_field",
    description:
      "Record a value the seller has given you. Never a value you inferred, assumed or rounded.",
    input_schema: {
      type: "object",
      properties: {
        field: { type: "string", enum: [...WRITABLE_FIELDS] },
        value: { type: ["string", "number", "boolean"] },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "go_to_step",
    description: "Move the form, when the seller asks.",
    input_schema: {
      type: "object",
      properties: { step: { type: "integer", minimum: 1, maximum: 4 } },
      required: ["step"],
    },
  },
  {
    name: "trigger_photo_guide",
    description: "Show the photo prompts, when the seller asks what to take.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "append_lead_note",
    description:
      "Write what the seller told you to the lead, in their words, for the person who will call them. Use this for their answers to why they are selling, how soon, what is worrying them, and whether anyone else has made an offer.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string", maxLength: 2000 },
        topic: {
          type: "string",
          enum: ["reason", "timeline", "worries", "other_offers", "other"],
        },
      },
      required: ["note"],
    },
  },
] as const;

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export async function getVehicleContext(
  session: AgentSession,
): Promise<ToolResult> {
  if (!session.vehicleId) return { ok: true, data: { known: false } };

  const { data } = await db()
    .from("vehicles")
    .select(
      "make, model, year_of_manufacture, colour, fuel_type, engine_capacity, mot_expiry",
    )
    .eq("id", session.vehicleId)
    .maybeSingle();

  if (!data) return { ok: true, data: { known: false } };
  return { ok: true, data: { known: true, ...data } };
}

export async function readFormState(
  session: AgentSession,
): Promise<ToolResult> {
  if (!session.leadId) {
    return { ok: true, data: { leadExists: false, filled: [], empty: [] } };
  }

  const { data } = await db()
    .from("leads")
    .select(WRITABLE_FIELDS.join(", "))
    .eq("id", session.leadId)
    .maybeSingle();

  const row = (data ?? {}) as Record<string, unknown>;
  const filled = WRITABLE_FIELDS.filter(
    (field) => row[field] !== null && row[field] !== undefined,
  );
  return {
    ok: true,
    data: {
      leadExists: true,
      filled,
      empty: WRITABLE_FIELDS.filter((field) => !filled.includes(field)),
    },
  };
}

export async function setField(
  session: AgentSession,
  input: z.infer<typeof toolSchemas.set_field>,
): Promise<ToolResult> {
  if (!session.leadId) {
    // Before the phone field there is no row to write to. The widget
    // buffers and replays these once the lead exists.
    return { ok: false, error: "buffer" };
  }

  const allowed = FIELD_ENUMS[input.field];
  if (allowed && !allowed.includes(String(input.value))) {
    return {
      ok: false,
      error: `${input.field} must be one of: ${allowed.join(", ")}`,
    };
  }

  const { error } = await db()
    .from("leads")
    .update({ [input.field]: input.value, updated_at: new Date().toISOString() })
    .eq("id", session.leadId);

  // The write must be confirmed. Reporting success on a rejected update is
  // how Maya ends up telling a seller something is saved when it is not.
  if (error) {
    console.error("[agent] set_field failed:", input.field, error.message);
    return { ok: false, error: `could not save ${input.field}` };
  }

  return { ok: true, data: { field: input.field } };
}

export async function appendLeadNote(
  session: AgentSession,
  input: z.infer<typeof toolSchemas.append_lead_note>,
): Promise<ToolResult> {
  if (!session.leadId) return { ok: false, error: "buffer" };

  const { data: conversation } = await db()
    .from("conversations")
    .select("structured_notes")
    .eq("id", session.conversationId)
    .maybeSingle();

  const existing = Array.isArray(conversation?.structured_notes)
    ? (conversation.structured_notes as { topic?: string; note?: string }[])
    : [];

  /**
   * Same topic, same words, already there — do nothing and say so.
   *
   * A model that retries a tool after an ambiguous result writes the note
   * twice, which was observed in a live conversation. Two copies of a
   * seller's reason for selling is noise in the one place an operator
   * reads before ringing them, and deduping here is more reliable than
   * asking the prompt to remember.
   */
  const normalise = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");
  const duplicate = existing.some(
    (note) =>
      note.topic === input.topic &&
      typeof note.note === "string" &&
      normalise(note.note) === normalise(input.note),
  );
  if (duplicate) return { ok: true, data: { duplicate: true } };

  const { error } = await db()
    .from("conversations")
    .update({
      structured_notes: [
        ...existing,
        { topic: input.topic, note: input.note, at: new Date().toISOString() },
      ],
    })
    .eq("id", session.conversationId);

  if (error) {
    console.error("[agent] append_lead_note failed:", error.message);
    return { ok: false, error: "could not save the note" };
  }

  return { ok: true };
}
