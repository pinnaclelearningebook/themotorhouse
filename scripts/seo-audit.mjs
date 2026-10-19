/**
 * Reads every page in the live sitemap and prints what a crawler sees:
 * title and description lengths, the canonical, h1 count, JSON-LD
 * types, and images with no alt.
 *
 * Run against production by hand after a release that touches
 * metadata — `node scripts/seo-audit.mjs`. Nothing imports it and
 * nothing in CI runs it; it is a check, not a build step.
 */
const BASE = "https://www.selltothemotorhouse.co.uk";
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const paths = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname)
  .map((p) => (p === "" ? "/" : p));

const rows = [];
for (const path of paths) {
  const html = await (await fetch(BASE + path)).text();
  const pick = (re) => (html.match(re)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#x27;|&apos;/g, "'").trim();
  const title = pick(/<title>([^<]*)<\/title>/);
  const desc = pick(/<meta name="description" content="([^"]*)"/);
  const canon = pick(/<link rel="canonical" href="([^"]*)"/);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1].replace(/<[^>]*>/g, "").trim());
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].length;
  const types = [...new Set([...html.matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]))];
  const lang = pick(/<html lang="([^"]*)"/);
  const ogTitle = /property="og:title"/.test(html);
  const twCard = /name="twitter:card"/.test(html);
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)];
  const noAlt = imgs.filter((m) => !/\balt="/.test(m[0])).length;
  const emptyAlt = imgs.filter((m) => /\balt=""/.test(m[0])).length;
  rows.push({ path, title, t: title.length, desc, d: desc.length, canon, h1: h1s.length, h1text: h1s[0] ?? "", h2s, types, lang, ogTitle, twCard, imgs: imgs.length, noAlt, emptyAlt });
}

console.log("PATH | TITLE LEN | DESC LEN | H1 | H2 | JSON-LD");
for (const r of rows) {
  const flags = [];
  if (r.t > 60) flags.push(`TITLE ${r.t}`);
  if (r.d > 155) flags.push(`DESC ${r.d}`);
  if (r.d === 0) flags.push("NO DESC");
  if (r.h1 !== 1) flags.push(`H1=${r.h1}`);
  if (!r.canon.startsWith(BASE)) flags.push("CANON WRONG");
  if (r.lang !== "en-GB") flags.push(`LANG ${r.lang}`);
  if (!r.ogTitle) flags.push("NO OG");
  if (!r.twCard) flags.push("NO TWITTER");
  if (r.noAlt) flags.push(`${r.noAlt} IMG NO ALT`);
  console.log(`${r.path.padEnd(42)} ${String(r.t).padStart(3)} ${String(r.d).padStart(4)} ${r.h1} ${String(r.h2s).padStart(2)}  ${r.types.join(",") || "—"}${flags.length ? "   ⚠ " + flags.join("; ") : ""}`);
}
console.log(`\n${rows.length} pages in the sitemap`);
const dupTitles = Object.entries(rows.reduce((a, r) => { (a[r.title] ??= []).push(r.path); return a; }, {})).filter(([, p]) => p.length > 1);
const dupDescs = Object.entries(rows.reduce((a, r) => { (a[r.desc] ??= []).push(r.path); return a; }, {})).filter(([, p]) => p.length > 1);
console.log(`duplicate titles: ${dupTitles.length ? JSON.stringify(dupTitles) : "none"}`);
console.log(`duplicate descriptions: ${dupDescs.length ? JSON.stringify(dupDescs) : "none"}`);
console.log(`canonicals on the wrong host: ${rows.filter(r => !r.canon.startsWith(BASE)).length} of ${rows.length}`);
