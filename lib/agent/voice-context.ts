import "server-only";
import { getVehicleContext, type AgentSession } from "@/agent/tools";
import type { VehicleContext } from "@/agent/guards";

/**
 * Everything about the car, loaded once and written into the prompt.
 *
 * Voice has no tools. A tool call costs a second model round-trip, and
 * at three to four seconds each that is the difference between a
 * conversation and a wait. None of this changes during a call — the DVLA
 * record and the MOT history are as static as anything gets — so it is
 * read from the database once per turn, server-side, and handed to the
 * model already assembled. The model never has to ask.
 *
 * Text mode keeps its tools: typing tolerates a pause, and a typed
 * conversation can afford to look things up as it goes.
 */

export interface VoiceContext {
  /** Prose for the system prompt. */
  text: string;
  /** The same facts, shaped for the guards. */
  guard: VehicleContext;
}

interface MotTest {
  test_date?: string | null;
  result?: string | null;
  odometer?: number | null;
  defects?: { type?: string; text?: string }[] | null;
}

export async function loadVoiceContext(
  session: AgentSession,
): Promise<VoiceContext> {
  const result = await getVehicleContext(session);

  if (!result.ok) {
    // A failed lookup is not an empty one. Say which, so she can be
    // honest about it rather than claiming the car is unknown.
    return {
      text: "The vehicle lookup is not working at the moment. Say so if asked; do not say the car is unknown.",
      guard: {},
    };
  }

  const data = (result.data ?? {}) as Record<string, unknown>;
  if (data.known !== true) {
    return { text: "Vehicle context: none yet.", guard: {} };
  }

  const tests = (data.motTests ?? []) as MotTest[];
  const lines: string[] = [];

  lines.push(
    [
      `Make: ${data.make ?? "unknown"}`,
      `Model: ${data.model ?? "unknown"}`,
      `Year: ${data.year_of_manufacture ?? "unknown"}`,
      `Colour: ${data.colour ?? "unknown"}`,
      `Fuel: ${data.fuel ?? "unknown"}`,
      `Engine: ${data.engine_cc ? `${data.engine_cc}cc` : "unknown"}`,
      `MOT expires: ${data.mot_expiry ?? "unknown"}`,
    ].join(" · "),
  );

  if (tests.length === 0) {
    lines.push(
      "No MOT tests on record. Normal for a car under about three years old.",
    );
  } else {
    lines.push("MOT history, most recent first:");
    for (const test of tests) {
      const advisories = (test.defects ?? [])
        .map((defect) => defect.text)
        .filter(Boolean);
      lines.push(
        `- ${test.test_date ?? "date unknown"}: ${test.result ?? "result unknown"}` +
          (typeof test.odometer === "number"
            ? `, ${test.odometer.toLocaleString("en-GB")} miles`
            : "") +
          (advisories.length ? `. Advisories: ${advisories.join("; ")}` : ". No advisories."),
      );
    }
  }

  lines.push(
    "This is the whole record. Anything not above, you do not know — say so rather than filling the gap.",
  );

  return {
    text: lines.join("\n"),
    guard: {
      make: (data.make as string) ?? null,
      model: (data.model as string) ?? null,
      year: (data.year_of_manufacture as number) ?? null,
      colour: (data.colour as string) ?? null,
      fuel: (data.fuel as string) ?? null,
      engineCapacity: (data.engine_cc as number) ?? null,
      mileage: (data.lastRecordedMileage as number) ?? null,
    },
  };
}
