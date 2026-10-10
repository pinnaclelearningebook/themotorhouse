import { AGENT } from "@/config/site";

/**
 * What the seller and {@link AGENT.name} actually said, plus the notes she
 * wrote for whoever rings them.
 *
 * The transcript holds what the seller saw. A turn a guard stopped is not
 * here — it lives in agent_blocks and surfaces on /admin/review — so
 * reading a lead cannot resurface a number nobody stood behind, and an
 * operator preparing for a call sees exactly what the seller does.
 */

export interface TranscriptTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StructuredNote {
  topic?: string;
  note?: string;
  at?: string;
}

export interface ConversationRecord {
  id: string;
  started_at: string;
  mode: string;
  admin_test?: boolean | null;
  turn_count: number | null;
  transcript: TranscriptTurn[] | null;
  structured_notes: StructuredNote[] | null;
}

export function TranscriptPanel({
  conversations,
}: {
  conversations: ConversationRecord[];
}) {
  if (conversations.length === 0) return null;

  return (
    <section className="rounded border border-line p-6">
      <h2 className="font-display text-2xl">{AGENT.name}</h2>
      <p className="mt-2 text-caption text-structure">
        What the seller was shown. Anything a guard stopped is on{" "}
        <span className="font-medium">Review</span>, not here.
      </p>

      {conversations.map((conversation) => {
        const notes = (conversation.structured_notes ?? []).filter(
          (note) => note.note,
        );
        const turns = conversation.transcript ?? [];

        return (
          <div
            key={conversation.id}
            className="mt-6 border-t border-line pt-4 first:mt-4 first:border-t-0 first:pt-0"
          >
            <p className="text-caption text-structure">
              <span className="data-inline font-mono">
                {conversation.started_at.slice(0, 16).replace("T", " ")}
              </span>{" "}
              · {conversation.mode} ·{" "}
              <span className="data-inline font-mono">
                {conversation.turn_count ?? 0}
              </span>{" "}
              turns
              {conversation.admin_test && (
                <>
                  {" · "}
                  <span className="font-medium text-oxblood">
                    admin test, not a seller
                  </span>
                </>
              )}
            </p>

            {notes.length > 0 && (
              <>
                <p className="mt-4 text-caption font-medium">
                  What they told her
                </p>
                <ul className="mt-2 space-y-2">
                  {notes.map((note, index) => (
                    <li key={index} className="text-sm">
                      {note.topic && note.topic !== "other" && (
                        <span className="text-caption text-structure">
                          {note.topic}:{" "}
                        </span>
                      )}
                      {note.note}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {turns.length === 0 ? (
              <p className="mt-4 text-sm text-structure">
                Opened, nothing said.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {turns.map((turn, index) => (
                  <li key={index} className="text-sm">
                    <span className="text-caption text-structure">
                      {turn.role === "user" ? "Seller" : AGENT.name}
                    </span>
                    <br />
                    {turn.content}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
