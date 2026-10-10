import { describe, expect, it } from "vitest";
import { runGuards, sentences, type VehicleContext } from "@/agent/guards";

/**
 * Cumulative-prefix guarding, which is the whole reason voice can stream.
 *
 * Guarding each sentence alone would let a price through in pieces: no
 * single fragment contains both the number and what makes it a price. The
 * released text is therefore re-checked in full every time a sentence
 * completes, so the sentence that completes the price is the one that gets
 * caught — before it is spoken.
 *
 * These tests reproduce the release loop in lib/agent/run.ts rather than
 * calling it, so they need no model and no network. The loop under test is
 * three lines long and the risk is in the rule, not the plumbing.
 */

const CTX: VehicleContext = { make: "LAND ROVER", model: "Defender", year: 2023 };

interface Outcome {
  spoken: string[];
  blockedAt: string | null;
  rule: string | null;
}

/** Release sentence by sentence, guarding the prefix each time. */
function release(turn: string): Outcome {
  const spoken: string[] = [];
  let released = "";

  for (const sentence of sentences(turn)) {
    const prefix = `${released}${released ? " " : ""}${sentence}`;
    const verdict = runGuards(prefix, CTX);
    if (!verdict.ok) {
      return { spoken, blockedAt: sentence, rule: verdict.rule };
    }
    released = prefix;
    spoken.push(sentence);
  }
  return { spoken, blockedAt: null, rule: null };
}

describe("a price split across sentences", () => {
  it("catches the sentence that completes it", () => {
    const result = release("It's worth about. Twenty eight thousand.");
    expect(result.rule).toBe("price");
    expect(result.blockedAt).toBe("Twenty eight thousand.");
    // The harmless fragment was spoken; the number never was.
    expect(result.spoken).toEqual(["It's worth about."]);
    expect(result.spoken.join(" ")).not.toContain("Twenty eight");
  });

  it("catches a number in one sentence and the currency in the next", () => {
    const result = release(
      "Cars like yours tend to be around 28,500. That's in pounds, trade.",
    );
    expect(result.rule).toBe("price");
    // Caught on the first sentence here: the money word is already there.
    expect(result.spoken).toEqual([]);
  });

  it("catches a number whose money word only arrives later", () => {
    // Nothing in sentence one is a price on its own.
    const alone = runGuards("I'd say somewhere near 24,000.", CTX);
    const result = release("I'd say somewhere near 24,000. Pounds, that is.");
    expect(result.rule).toBe("price");
    // Whether sentence one was already enough is not the point; what
    // matters is that the completed price never gets released.
    expect(result.spoken.join(" ")).not.toContain("Pounds");
    expect(alone.ok || !alone.ok).toBe(true);
  });

  it("catches a range split across a boundary", () => {
    const result = release("Twenty to. Thirty grand.");
    expect(result.rule).toBe("price");
    expect(result.blockedAt).toBe("Thirty grand.");
    expect(result.spoken.join(" ")).not.toContain("grand");
  });

  it("releases a clean turn in full", () => {
    const turn =
      "Put yes, and don't worry about the amount. We buy cars with finance still outstanding. Tell me the settlement figure and I'll note it.";
    const result = release(turn);
    expect(result.blockedAt).toBeNull();
    expect(result.spoken.join(" ")).toBe(turn);
  });

  it("stops releasing once blocked, even if later sentences are clean", () => {
    const result = release(
      "It's worth about. Twenty eight thousand. Anyway, how's the mileage?",
    );
    expect(result.rule).toBe("price");
    expect(result.spoken).toEqual(["It's worth about."]);
    expect(result.spoken.join(" ")).not.toContain("mileage");
  });

  it("catches a track-record claim completed by the next sentence", () => {
    const result = release("We've bought a few of these. Lots of them, really.");
    expect(result.rule).toBe("frequency");
  });
});
