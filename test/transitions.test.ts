import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MOVABLE_STATUSES, STAGES } from "@/lib/admin/pipeline";
import {
  FINAL_STATUSES,
  LOSS_REASONS,
  TRANSITIONS,
  allowedTargets,
  canMove,
  demandFor,
  edgeKind,
  isLossReason,
  refusalFor,
} from "@/lib/admin/transitions";

/**
 * Which moves the board allows, and where that is decided.
 *
 * The board gained drag-and-drop on 19 October 2026, reopening a
 * decision taken against it two weeks earlier on the grounds that a
 * drag is one gesture with no confirmation and a bad swipe puts a car
 * in the wrong column. The map is the answer to that, so it is worth
 * testing by its consequences rather than by reading it back.
 */

describe("the transition map", () => {
  it("covers every status a card can hold", () => {
    for (const status of MOVABLE_STATUSES) {
      expect(TRANSITIONS, `${status} has no row`).toHaveProperty(status);
    }
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...MOVABLE_STATUSES].sort());
  });

  it("points only at statuses that exist", () => {
    for (const [from, edges] of Object.entries(TRANSITIONS)) {
      for (const edge of edges) {
        expect(
          MOVABLE_STATUSES,
          `${from} → ${edge.to} is not a real status`,
        ).toContain(edge.to);
        expect(edge.to, `${from} points at itself`).not.toBe(from);
      }
    }
  });

  it("refuses the skip a drag makes easy", () => {
    // The whole reason the map exists. A board that accepts these is
    // a board whose P&L is fiction.
    expect(canMove("new", "sold")).toBe(false);
    expect(canMove("new", "collected")).toBe(false);
    expect(canMove("contacted", "accepted")).toBe(false);
    expect(canMove("offered", "sold")).toBe(false);
    expect(canMove("accepted", "sold")).toBe(false);
  });

  it("lets a car progress one stage at a time", () => {
    for (const [from, to] of [
      ["new", "contacted"],
      ["contacted", "offered"],
      ["offered", "accepted"],
      ["accepted", "collected"],
      ["collected", "listed"],
      ["collected", "shipped"],
      ["listed", "sold"],
      ["shipped", "sold"],
    ]) {
      expect(canMove(from, to), `${from} → ${to} should be allowed`).toBe(true);
    }
  });

  it("lets a mis-drop be undone one step", () => {
    // Without this a wrong drag needs a database console, which means
    // in practice it stays wrong.
    for (const [from, to] of [
      ["contacted", "new"],
      ["offered", "contacted"],
      ["accepted", "offered"],
      ["collected", "accepted"],
      ["listed", "collected"],
      ["shipped", "collected"],
    ]) {
      expect(canMove(from, to), `${from} → ${to} should be a correction`).toBe(true);
      expect(edgeKind(from, to)).toBe("correction");
    }
  });

  it("makes sold terminal", () => {
    expect(allowedTargets("sold")).toEqual([]);
    expect(refusalFor("sold", "listed")).toMatch(/realised margin/i);
  });

  it("only reaches declined from a state where an offer exists", () => {
    // `declined` means the seller turned an offer down. Reaching it
    // from `new` would record a refusal of something never made.
    for (const from of MOVABLE_STATUSES) {
      if (!canMove(from, "declined")) continue;
      expect(["offered"], `${from} → declined`).toContain(from);
    }
  });

  it("lets a closed lead be reopened", () => {
    expect(canMove("lost", "contacted")).toBe(true);
    expect(canMove("declined", "contacted")).toBe(true);
  });

  it("gives a reason for every refusal", () => {
    expect(refusalFor("new", "sold")).toBeTruthy();
    expect(refusalFor("new", "contacted")).toBeNull();
    // Same status in and out is not a refusal, it is a no-op.
    expect(refusalFor("new", "new")).toBeNull();
    expect(refusalFor("not-a-status", "new")).toMatch(/not a stage/);
  });
});

describe("what a move costs the person making it", () => {
  it("asks for an offer when a card lands in Offered", () => {
    expect(demandFor("offered")).toBe("offer");
  });

  it("asks why when a car leaves the pipeline", () => {
    expect(demandFor("lost")).toBe("reason");
    expect(demandFor("declined")).toBe("reason");
  });

  it("confirms the final stage", () => {
    expect(demandFor("sold")).toBe("confirm");
  });

  it("asks nothing for an ordinary step", () => {
    expect(demandFor("contacted")).toBe("none");
    expect(demandFor("collected")).toBe("none");
  });

  it("demands something at every final stage", () => {
    for (const status of FINAL_STATUSES) {
      expect(demandFor(status), `${status} slips through silently`).not.toBe("none");
    }
  });

  it("has a short, closed list of reasons", () => {
    expect(LOSS_REASONS.length).toBeGreaterThan(2);
    expect(LOSS_REASONS.length).toBeLessThanOrEqual(6);
    expect(isLossReason("price")).toBe(true);
    expect(isLossReason("because")).toBe(false);
    expect(isLossReason(undefined)).toBe(false);
    expect(isLossReason("")).toBe(false);
  });

  it("invents no status for a seller who pulled out", () => {
    // "Withdrawn" is a reason on `lost`, not a status. Adding one is
    // a migration and a decision about the business.
    expect(MOVABLE_STATUSES).not.toContain("withdrawn");
    expect(LOSS_REASONS.map((r) => r.value)).toContain("withdrawn");
  });
});

describe("where the map is enforced", () => {
  const action = readFileSync(
    join("app", "admin", "(workspace)", "pipeline", "actions.ts"),
    "utf8",
  );

  it("is the server action, not only the board", () => {
    // A client that is wrong, old or hostile can post anything. The
    // board checks the same map so it does not animate a drop it is
    // about to be told off for, but this is the control.
    expect(action).toMatch(/from "@\/lib\/admin\/transitions"/);
    expect(action).toMatch(/canMove\(/);
    expect(action).toMatch(/refusalFor\(/);
  });

  it("re-checks the reason the dialog collected", () => {
    expect(action).toMatch(/isLossReason\(/);
  });

  it("writes the from-stage, the to-stage and the reason", () => {
    expect(action).toMatch(/before: \{ status: from \}/);
    expect(action).toMatch(/reason \? \{ reason \}/);
    expect(action).toMatch(/action: "lead\.status"/);
  });

  it("returns a refusal instead of throwing", () => {
    // The caller is an optimistic board that has already moved the
    // card and needs something to say when it puts it back.
    expect(action).toMatch(/Promise<MoveResult>/);
    expect(action).toMatch(/ok: false/);
  });

  it("offers no bulk or automatic move", () => {
    const exported = [...action.matchAll(/export async function (\w+)/g)].map(
      (match) => match[1],
    );
    for (const name of exported) {
      expect(name, `${name} reads as an automatic offer`).not.toMatch(
        /\b(make|create|generate|calculate)Offer\b/i,
      );
    }
  });
});

describe("the board", () => {
  const board = readFileSync(
    join("components", "admin", "PipelineBoard.tsx"),
    "utf8",
  );

  it("keeps select-and-submit alongside the drag", () => {
    // The 5 October reasons are still true: keyboard, phone, and a
    // swipe that lands two pixels outside the column.
    expect(board).toMatch(/<select/);
    expect(board).toMatch(/onDrop=/);
  });

  it("gives the phone a stage switcher, not a sideways board", () => {
    expect(board).toMatch(/stage-switch/);
    expect(board).toMatch(/lg:hidden/);
  });

  it("puts the card back when the server refuses", () => {
    expect(board).toMatch(/result\.status/);
    expect(board).toMatch(/show\(result\.message, "error"\)/);
  });

  it("shows what the brief asked each card to show", () => {
    for (const field of ["card.reg", "vehicleName(card)", "firstName(card.name)", "card.nextContactDate", "inStage"]) {
      expect(board, `card is missing ${field}`).toContain(field);
    }
  });

  it("counts each column in its header", () => {
    expect(board).toMatch(/\{column\.cards\.length\}/);
  });

  it("announces a move for a screen reader", () => {
    expect(board).toMatch(/aria-live="polite"/);
  });
});

describe("the board's columns", () => {
  it("cover every stage a card can sit in", () => {
    const carded: string[] = STAGES.flatMap((stage) => [...stage.statuses]);
    // Everything else is an outcome or a follow-up state, counted
    // rather than carded — see lib/admin/pipeline.ts.
    const uncarded = MOVABLE_STATUSES.filter((s) => !carded.includes(s));
    expect(uncarded.sort()).toEqual(["declined", "lost", "researching"]);
  });
});
