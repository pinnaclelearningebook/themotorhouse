import { existsSync } from "node:fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The mega-menu, measured rather than reasoned about.
 *
 * On 11 October 2026 "What we buy" opened a panel hanging off the left
 * edge of the window: an empty column where four of the seven models
 * should have been, and the rest unreachable. The cause was ordinary —
 * `absolute left-1/2 -translate-x-1/2 w-[46rem]` anchored to a trigger
 * that sits near the left of a 1440px header — and completely invisible
 * to a test that reads source or markup. Nothing was missing from the
 * DOM. The panel was simply somewhere a reader could not look at it.
 *
 * So this one drives a real browser, opens the menu at each of the
 * three widths in the brief, and asserts the panel's bounding box is
 * inside the viewport. The last test re-creates the original defect in
 * the page and proves the measurement catches it, because an assertion
 * about geometry is the easiest kind to write so that it can never fail.
 *
 * It needs a server and a Chrome. Point LAYOUT_BASE_URL at a preview
 * deployment, or run `npm run build && npm start` first. Without both,
 * the suite says so and asserts nothing — the same choice the build-
 * output half of test/trademark.test.ts makes, for the same reason: a
 * skip that announces itself beats an assertion that passes on air.
 */

const BASE = process.env.LAYOUT_BASE_URL ?? "http://localhost:3000";
const WIDTHS = [1024, 1280, 1440];
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PANEL = "[data-mega-menu]";

/** Every model page, plus the catch-all. The panel shows all of them. */
const EXPECTED_LINKS = 8;

async function reachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

type Box = { left: number; right: number; top: number; width: number };

async function openMenu(page: Page): Promise<void> {
  const trigger = await page.$('button[aria-haspopup="true"]');
  if (!trigger) throw new Error("no mega-menu trigger at this width");
  await trigger.click();
  await page.waitForSelector(PANEL, { visible: true, timeout: 4000 });
}

async function measure(page: Page): Promise<Box & { links: number }> {
  return page.$eval(PANEL, (el) => {
    const box = el.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      top: box.top,
      width: box.width,
      links: el.querySelectorAll("a[href]").length,
    };
  });
}

const available = existsSync(CHROME);
let serverUp = false;
let browser: Browser | undefined;

beforeAll(async () => {
  serverUp = await reachable(BASE);
  if (!available || !serverUp) return;
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--hide-scrollbars"],
  });
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

describe("the What we buy panel", () => {
  it("was measured, rather than skipped quietly", () => {
    // `expect(x).toBe(x)` would pass here and tell nobody anything. The
    // point of this one is that the reason prints: a missing browser and
    // a missing server are the two ways the three tests below turn into
    // no tests at all, and they should be read as such.
    const missing = [
      available ? null : `no Chrome at ${CHROME} (set CHROME_PATH)`,
      serverUp ? null : `nothing serving ${BASE} (set LAYOUT_BASE_URL)`,
    ].filter(Boolean);
    if (missing.length > 0) {
      console.warn(`[mega-menu] not measured: ${missing.join("; ")}`);
      expect(missing.length, missing.join("; ")).toBeGreaterThan(0);
      return;
    }
    expect(browser, `measured against ${BASE}`).toBeTruthy();
  });

  for (const width of WIDTHS) {
    it(`stays inside a ${width}px viewport`, async () => {
      if (!browser) return;
      const page = await browser.newPage();
      try {
        await page.setViewport({ width, height: 900 });
        await page.goto(BASE, { waitUntil: "domcontentloaded" });
        await openMenu(page);
        const box = await measure(page);

        expect(box.left, `left edge at ${width}px`).toBeGreaterThanOrEqual(0);
        expect(box.right, `right edge at ${width}px`).toBeLessThanOrEqual(width);
        expect(box.top, `top edge at ${width}px`).toBeGreaterThanOrEqual(0);
        // A panel clipped to nothing would satisfy the bounds above.
        expect(box.width, `width at ${width}px`).toBeGreaterThan(600);
        expect(box.links, `links at ${width}px`).toBe(EXPECTED_LINKS);
      } finally {
        await page.close();
      }
    }, 45_000);
  }

  it("closes on Escape and gives the trigger back the focus", async () => {
    if (!browser) return;
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await openMenu(page);
      await page.keyboard.press("ArrowDown");
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
        "A",
      );
      await page.keyboard.press("Escape");
      await page.waitForSelector(PANEL, { hidden: true, timeout: 4000 });
      expect(
        await page.evaluate(() =>
          document.activeElement?.getAttribute("aria-haspopup"),
        ),
      ).toBe("true");
    } finally {
      await page.close();
    }
  }, 45_000);

  it("is measuring, not just agreeing", async () => {
    if (!browser) return;
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await openMenu(page);
      const before = await measure(page);

      // Push it one pixel past the left edge — the smallest version of
      // what went wrong — and confirm the bounds check above notices.
      // Without this the three tests could be asserting against a
      // measurement that always returns the same comfortable numbers.
      await page.$eval(PANEL, (el) => {
        // `!important`, because .menu-drop's `both` fill means the
        // animation's transform outranks an ordinary inline style —
        // which is precisely how a translate(-50%) left behind in a
        // keyframe survived being deleted from the element's classes.
        (el as HTMLElement).style.setProperty(
          "transform",
          "translateX(-1px)",
          "important",
        );
      });
      const after = await measure(page);

      expect(before.left, "panel starts flush with the viewport").toBe(0);
      expect(after.left, "a one-pixel shift is visible to the test").toBe(-1);
      expect(after.left >= 0 && after.right <= 1440).toBe(false);
    } finally {
      await page.close();
    }
  }, 45_000);
});
