import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAllPosts, CATEGORY_DESCRIPTIONS, CATEGORIES } from "@/lib/blog";
import { MODELS } from "@/config/models";
import { siteUrl } from "@/config/site";

/**
 * The technical SEO rules, held to in source rather than rechecked by
 * hand after every content change.
 *
 * Phase 1 of the SEO programme, 15 October 2026. What this is guarding
 * against is drift: every one of these was correct the day it was
 * written and several of them had quietly stopped being true.
 */

const TITLE_MAX = 60;
const DESC_MAX = 155;
/** `%s — The Motor House` on every page that does not opt out. */
const SUFFIX = " — The Motor House".length;

describe("titles and descriptions", () => {
  it("fits every guide's title into the budget", () => {
    // Guides set `absolute`, so the brand suffix is not on them: the
    // whole 60 goes on the words a reader actually searched for.
    for (const post of getAllPosts()) {
      const title = post.seoTitle ?? post.title;
      expect(
        title.length,
        `${post.slug}: "${title}" is ${title.length}, add or shorten seoTitle`,
      ).toBeLessThanOrEqual(TITLE_MAX);
    }
  });

  it("fits every guide's description into the budget", () => {
    for (const post of getAllPosts()) {
      const desc = post.seoDescription ?? post.description;
      expect(
        desc.length,
        `${post.slug}: description is ${desc.length}, add or shorten seoDescription`,
      ).toBeLessThanOrEqual(DESC_MAX);
    }
  });

  it("fits every hand-written page title into the budget, with the suffix", () => {
    // These pages keep `%s — The Motor House`, so the budget is
    // 60 minus the suffix. Read straight out of the route files.
    const offenders: string[] = [];
    for (const file of routeFiles()) {
      const source = readFileSync(file, "utf8");
      const match = source.match(/export const metadata[\s\S]*?title:\s*"([^"]+)"/);
      if (!match) continue;
      const total = match[1].length + SUFFIX;
      if (total > TITLE_MAX) offenders.push(`${file}: "${match[1]}" → ${total}`);
    }
    expect(offenders).toEqual([]);
  });

  it("fits every hand-written description into the budget", () => {
    const offenders: string[] = [];
    for (const file of routeFiles()) {
      const source = readFileSync(file, "utf8");
      // The description is a template literal in some files, so the
      // match is deliberately loose and the length is approximate for
      // those — a breach still shows up, which is the point.
      const match = source.match(
        /export const metadata[\s\S]*?description:\s*\n?\s*"([^"]+)"/,
      );
      if (!match) continue;
      if (match[1].length > DESC_MAX) {
        offenders.push(`${file}: ${match[1].length} chars`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("gives every category its own description, not a template", () => {
    const seen = new Set<string>();
    for (const category of CATEGORIES) {
      const description = CATEGORY_DESCRIPTIONS[category];
      expect(description, `${category} has no description`).toBeTruthy();
      expect(description.length).toBeLessThanOrEqual(DESC_MAX);
      // Thin pages are the risk here; 43-character near-duplicates are
      // what these were before.
      expect(description.length, `${category} is too thin`).toBeGreaterThan(80);
      expect(seen.has(description), `${category} repeats another`).toBe(false);
      seen.add(description);
    }
  });
});

describe("canonicals and the domain", () => {
  it("resolves to the real domain, not a deployment hostname", () => {
    // Every canonical, the sitemap and every OG URL come from this.
    // Before 15 October 2026 it returned themotorhouse.vercel.app, so
    // the live domain spent its first weeks telling Google the real
    // version of every page lived somewhere else.
    const url = process.env.NEXT_PUBLIC_SITE_URL ?? siteUrl();
    expect(url).not.toMatch(/vercel\.app/);
    expect(url).toMatch(/^https:\/\/www\.selltothemotorhouse\.co\.uk$/);
  });

  it("redirects the old deployment hostnames to it", () => {
    const config = readFileSync("next.config.ts", "utf8");
    expect(config).toMatch(/themotorhouse\.vercel\.app/);
    expect(config).toMatch(/permanent: true/);
    expect(config).toMatch(/https:\/\/www\.selltothemotorhouse\.co\.uk/);
  });
});

describe("structured data", () => {
  it("describes the business once, by reference everywhere else", () => {
    const site = readFileSync("components/seo/SiteJsonLd.tsx", "utf8");
    expect(site).toMatch(/"@type": "AutoDealer"/);
    expect(site).toMatch(/"@type": "WebSite"/);
    // Anything else naming the business points at the id.
    const posting = readFileSync("components/seo/BlogPostingJsonLd.tsx", "utf8");
    expect(posting).toMatch(/ORG_ID/);
    expect(posting).not.toMatch(/"@type": "Organization"/);
  });

  it("claims no rating, review or search it does not have", () => {
    // There are no reviews. An aggregateRating without them is a
    // fabricated business fact and a manual action waiting to happen.
    // There is no site search, so no SearchAction either.
    for (const file of readdirSync("components/seo")) {
      const source = readFileSync(join("components/seo", file), "utf8");
      const code = source.replace(/\/\*[\s\S]*?\*\//g, " ");
      for (const banned of ["aggregateRating", "AggregateRating", "reviewCount", "SearchAction"]) {
        expect(code, `${file} emits ${banned}`).not.toMatch(
          new RegExp(`["']?${banned}["']?\\s*:`),
        );
      }
    }
  });

  it("emits a breadcrumb trail and the markup from one source", () => {
    const crumbs = readFileSync("components/ui/Breadcrumbs.tsx", "utf8");
    expect(crumbs).toMatch(/BreadcrumbJsonLd/);
    expect(crumbs).toMatch(/aria-label="Breadcrumb"/);
    expect(crumbs).toMatch(/aria-current="page"/);
    // No page may emit the markup without the visible trail: markup
    // describing a trail nobody can see is the mismatch Google's
    // policy names.
    const OWNERS = [
      join("components", "ui", "Breadcrumbs.tsx"),
      join("components", "seo", "BreadcrumbJsonLd.tsx"),
    ];
    const stray: string[] = [];
    for (const file of routeFiles(true)) {
      if (OWNERS.includes(file)) continue;
      // Comments may name it — PageHero's does, to say it must not be
      // emitted twice. Only an actual import or element counts.
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/.*$/gm, "$1")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
      if (/BreadcrumbJsonLd/.test(code)) stray.push(file);
    }
    expect(stray).toEqual([]);
  });
});

describe("internal linking", () => {
  it("links every model page to guides about that model", () => {
    const template = readFileSync("components/models/ModelPage.tsx", "utf8");
    expect(template).toMatch(/getPostsForModel/);
    // And the relationship has to actually produce something.
    const withoutGuides = MODELS.filter(
      (model) =>
        getAllPosts().filter((post) => post.relatedModels.includes(model.slug))
          .length === 0,
    ).map((m) => m.slug);
    expect(
      withoutGuides,
      "these model pages have no guide to link to; write one or tag an existing post",
    ).toEqual([]);
  });

  it("links the two pages that nothing in the body used to reach", () => {
    expect(readFileSync("components/sections/HowItWorks.tsx", "utf8")).toMatch(
      /href="\/how-it-works"/,
    );
    expect(readFileSync("app/(site)/export/page.tsx", "utf8")).toMatch(
      /href="\/about"/,
    );
  });
});

/** Every route file under the public site group. */
function routeFiles(componentsToo = false): string[] {
  const roots = componentsToo
    ? ["app/(site)", "components"]
    : ["app/(site)"];
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx")) out.push(full);
    }
  };
  roots.forEach(walk);
  return out.filter((f) => !f.includes("opengraph-image"));
}
