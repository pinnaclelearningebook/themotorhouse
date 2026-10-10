import "server-only";
import { complete } from "@/agent/provider";
import {
  setField,
  appendLeadNote,
  toolSchemas,
  WRITABLE_FIELDS,
  FIELD_ENUMS,
  type AgentSession,
} from "@/agent/tools";

/**
 * Pulling facts out of what the seller said, after the fact.
 *
 * In voice this cannot happen inside the conversation. A tool call is a
 * second model round-trip, and the seller is listening to silence while
 * it happens. So the reply goes out first and this runs alongside it,
 * reading the seller's last message and writing what it finds.
 *
 * It writes through setField and appendLeadNote — the same validated
 * writers the text-mode tools use — so the enum rules, the error
 * checking and the note de-duplication all apply unchanged. Nothing here
 * can write a value the tools could not.
 */

const EXTRACTION_PROMPT = `You read one message from someone selling their car and pull out only what they actually said.

Return JSON and nothing else:
{"fields": {...}, "note": "..." | null}

"fields" may contain any of: ${WRITABLE_FIELDS.join(", ")}.

Rules:
- Only what they stated. Never infer, never round, never fill a gap.
- timeline must be one of: ${FIELD_ENUMS.timeline?.join(", ")}
- service_history must be one of: ${FIELD_ENUMS.service_history?.join(", ")}
- finance_outstanding must be one of: ${FIELD_ENUMS.finance_outstanding?.join(", ")}
- others_approached: who quoted them and what, in their words.
- mileage_reported: a whole number, only if they gave one plainly.
- "note" is for something a person ringing them should know that no field holds — a worry, a constraint, a deadline. Otherwise null.
- If they said nothing worth recording, return {"fields": {}, "note": null}.`;

export interface ExtractionResult {
  written: string[];
  note: boolean;
}

export async function extractAndWriteNotes(opts: {
  session: AgentSession;
  message: string;
  model: string;
}): Promise<ExtractionResult> {
  const written: string[] = [];
  let note = false;

  // No lead, nowhere to write. The widget replays what was said once one
  // exists, so nothing is lost by stopping here.
  if (!opts.session.leadId) return { written, note };

  let reply;
  try {
    reply = await complete({
      system: EXTRACTION_PROMPT,
      messages: [{ role: "user", content: opts.message }],
      model: opts.model,
      maxTokens: 300,
      timeoutMs: 20_000,
    });
  } catch (error) {
    console.error("[agent] note extraction failed:", error);
    return { written, note };
  }

  let parsed: { fields?: Record<string, unknown>; note?: string | null };
  try {
    const json = reply.text.slice(
      reply.text.indexOf("{"),
      reply.text.lastIndexOf("}") + 1,
    );
    parsed = JSON.parse(json);
  } catch {
    console.error("[agent] note extraction returned no usable JSON");
    return { written, note };
  }

  for (const [field, value] of Object.entries(parsed.fields ?? {})) {
    if (value === null || value === undefined || value === "") continue;

    // Through the same schema the tool uses, so a field the model should
    // not be able to write still cannot be written here.
    const check = toolSchemas.set_field.safeParse({ field, value });
    if (!check.success) {
      console.warn("[agent] extraction proposed an invalid field:", field);
      continue;
    }

    const result = await setField(opts.session, check.data);
    if (result.ok) written.push(field);
  }

  if (parsed.note && parsed.note.trim()) {
    const check = toolSchemas.append_lead_note.safeParse({
      note: parsed.note.trim(),
      topic: "other",
    });
    if (check.success) {
      const result = await appendLeadNote(opts.session, check.data);
      note = result.ok;
    }
  }

  return { written, note };
}
