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

describe("reassembly across delta boundaries", () => {
  /**
   * The model streams in fragments that break anywhere, often just after
   * a space. Rebuilding the unreleased remainder by re-joining trimmed
   * sentences ate that space and produced "within2 hours" in a live
   * reply. This reproduces the release loop over realistic fragments.
   */
  function releaseStreamed(deltas: string[]): string {
    let pending = "";
    let released = "";
    const spoken: string[] = [];

    for (const delta of deltas) {
      pending += delta;
      const parts = sentences(pending);
      while (parts.length > 1) {
        const candidate = parts.shift() as string;
        released = `${released}${released ? " " : ""}${candidate}`;
        spoken.push(candidate);
        const consumed = pending.indexOf(candidate) + candidate.length;
        pending = pending.slice(consumed);
      }
    }
    if (pending.trim()) spoken.push(pending.trim());
    return spoken.join(" ");
  }

  it("keeps a space that falls on a delta boundary", () => {
    const spoken = releaseStreamed([
      "No cut-off, we buy any car.",
      " A person prices it within ",
      "2 hours on a weekday.",
    ]);
    expect(spoken).toContain("within 2 hours");
    expect(spoken).not.toContain("within2");
  });

  it("reassembles a multi-sentence turn exactly", () => {
    const whole =
      "Put yes, and don't worry about the amount. We buy cars with finance still outstanding. Tell me the figure.";
    // Break it at awkward places, including mid-word and after spaces.
    const deltas = [
      "Put yes, and don't worry ",
      "about the amount. We buy cars with fin",
      "ance still outstanding. Tell me ",
      "the figure.",
    ];
    expect(releaseStreamed(deltas)).toBe(whole);
  });
});

describe("a qualification that arrives one sentence late", () => {
  /**
   * The published response time is two sentences: the promise, then the
   * evening clause that qualifies it. Prefix-guarding fired on the first
   * before the second existed and blocked her for saying exactly the
   * right thing — twice, in a live voice turn.
   *
   * The rule is about what the turn says, so it is judged against the
   * turn. Everything else stays prefix-checked.
   */
  const TURN =
    "I'm not the one who sets the number. A firm offer within two hours. If you enquire late in the evening, you will hear from us first thing the next morning.";

  it("fails the prefix but passes the whole turn", () => {
    const parts = sentences(TURN);
    const prefix = `${parts[0]} ${parts[1]}`;
    const onPrefix = runGuards(prefix, CTX);
    expect(onPrefix.ok).toBe(false);
    if (!onPrefix.ok) expect(onPrefix.rule).toBe("unqualified-promise");

    expect(runGuards(TURN, CTX).ok).toBe(true);
  });

  it("still blocks a turn that never qualifies it", () => {
    const bare = "I'm not the one who sets the number. A firm offer within two hours. Anything else I can help with?";
    const verdict = runGuards(bare, CTX);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.rule).toBe("unqualified-promise");
  });

  it("does not excuse a price that arrives late", () => {
    // The exemption is for this one rule only.
    const turn = "It's worth about. Twenty eight thousand. A firm offer within two hours. If you enquire late in the evening, you will hear from us first thing the next morning.";
    const verdict = runGuards(turn, CTX);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.rule).toBe("price");
  });
});
