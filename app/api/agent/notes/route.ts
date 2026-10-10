import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveSession, ownsLead } from "@/lib/agent/session";
import { agentAccess } from "@/lib/agent/access";

/**
 * Attach a conversation to the lead, and flush what was said before it
 * existed.
 *
 * Maya appears when the car is identified; the lead is created at the
 * phone field. Anything the seller says in between belongs on the lead,
 * so the widget buffers it and sends it here once the id arrives.
 *
 * The lead id is checked against the session's own vehicle rather than
 * taken on trust: without that, anyone could staple their conversation to
 * someone else's record.
 */

const bodySchema = z.object({
  leadId: z.string().uuid(),
  notes: z.array(z.string().trim().min(1).max(2000)).max(50),
});

export async function POST(request: NextRequest) {
  const { mode } = await agentAccess();
  if (mode === "off") {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // The browser must have created this lead. A registration is visible on
  // any parked car, so without this a stranger could attach their
  // conversation to someone else's record and write to it.
  if (!(await ownsLead(parsed.data.leadId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: lead } = await db()
    .from("leads")
    .select("id, vehicle_id")
    .eq("id", parsed.data.leadId)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  // The conversation and the lead must be about the same car. A session
  // opened against one vehicle cannot adopt a lead for another.
  if (session.vehicleId && lead.vehicle_id !== session.vehicleId) {
    return NextResponse.json({ error: "mismatch" }, { status: 403 });
  }

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
      lead_id: parsed.data.leadId,
      structured_notes: [
        ...existing,
        ...parsed.data.notes.map((note) => ({
          topic: "pre-lead",
          note,
          at: new Date().toISOString(),
        })),
      ],
    })
    .eq("id", session.conversationId);

  return NextResponse.json({ ok: true });
}
