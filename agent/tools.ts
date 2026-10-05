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

/** What the model is told each tool does. Mirrors CLAUDE.md section 10. */
export const TOOL_DEFINITIONS = [
  {
    name: "get_vehicle_context",
    description:
      "The DVLA and MOT record for this car. The only permitted source for any statement of fact about the vehicle.",
  },
  {
    name: "read_form_state",
    description: "Which fields are filled in and which are still empty.",
  },
  {
    name: "set_field",
    description:
      "Record a value the seller has given you. Never a value you inferred, assumed or rounded.",
  },
  { name: "go_to_step", description: "Move the form, when the seller asks." },
  {
    name: "trigger_photo_guide",
    description: "Show the photo prompts, when the seller asks what to take.",
  },
  {
    name: "append_lead_note",
    description:
      "Write what the seller told you to the lead, in their words, for the person who will call them.",
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

  await db()
    .from("leads")
    .update({ [input.field]: input.value, updated_at: new Date().toISOString() })
    .eq("id", session.leadId);

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
    ? (conversation.structured_notes as unknown[])
    : [];

  await db()
    .from("conversations")
    .update({
      structured_notes: [
        ...existing,
        { topic: input.topic, note: input.note, at: new Date().toISOString() },
      ],
    })
    .eq("id", session.conversationId);

  return { ok: true };
}
