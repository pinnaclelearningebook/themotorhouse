#!/usr/bin/env node
/**
 * Set the hosted project's auth configuration.
 *
 * None of this lives in supabase/config.toml. That file configures a
 * local `supabase start` stack; the hosted project reads none of it, so
 * a Site URL or an email template set once in the dashboard is invisible
 * to the repository and drifts the moment anyone forgets. On 11 October
 * 2026 that drift sent a production magic link to http://localhost:3000
 * and shipped an email whose template promised a code it did not carry.
 *
 * So the hosted configuration is set from here, through the Management
 * API, and this script is the record of what it should be. Run it again
 * after any dashboard change to put it back.
 *
 * Run:  node scripts/configure-auth.mjs https://themotorhouse.vercel.app
 *
 * Reads SUPABASE_URL (for the project ref) and SUPABASE_ACCESS_TOKEN
 * from .env.local. The token needs both `auth_config_read` and
 * `auth_config_write`: the write makes the change, the read proves it
 * landed, and a token with only one of them fails halfway.
 *
 * Custom SMTP is deliberately opt-in:
 *
 *   node scripts/configure-auth.mjs https://… --smtp you@your-verified-domain
 *
 * Without it the project uses Supabase's own sender, which works but is
 * capped at two auth emails an hour. Resend will not send from a domain
 * it has not verified, and gmail.com can never be one, so pointing this
 * at a free-mail address would silently stop every sign-in email —
 * silently because the access token cannot read the auth logs. Pass the
 * flag only with an address on a domain verified in Resend.
 *
 * SMTP also decides whether the email template can be set at all. A free
 * project on Supabase's own sender is refused template writes outright,
 * which is why the URL configuration and the template go in two separate
 * requests: the URLs are what fix the magic link, and they should land
 * whether or not the template can. Exit codes say which happened —
 * 0 everything, 2 the URLs with the template held, 1 anything else.
 */
import { readFileSync } from "node:fs";

const API = "https://api.supabase.com/v1";

function env() {
  const out = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const vars = env();
const base = process.argv[2]?.replace(/\/$/, "");
const smtpIndex = process.argv.indexOf("--smtp");
const smtpSender = smtpIndex === -1 ? null : process.argv[smtpIndex + 1];

if (!vars.SUPABASE_URL || !vars.SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_URL or SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}
if (!base || !base.startsWith("https://")) {
  console.error("Usage: node scripts/configure-auth.mjs https://your-deployment [--smtp sender@verified-domain]");
  process.exit(1);
}
if (smtpIndex !== -1 && (!smtpSender || !smtpSender.includes("@"))) {
  console.error("--smtp needs a sender address on a domain verified in Resend");
  process.exit(1);
}

const ref = new URL(vars.SUPABASE_URL).hostname.split(".")[0];
const headers = {
  Authorization: `Bearer ${vars.SUPABASE_ACCESS_TOKEN}`,
  "content-type": "application/json",
};

/**
 * The magic-link email.
 *
 * Both routes in, because the link does not always survive the journey:
 * Outlook's SafeLinks and similar scanners follow URLs before a human
 * does, and a magic link is single use, so the token can be spent before
 * the admin clicks it. The code cannot be consumed by a scanner reading
 * the message. The login page promises this code — app/admin/login —
 * which is why the template has to carry it.
 *
 * {{ .Token }} is the numeric code; its length is the project's
 * mailer_otp_length, read back below rather than assumed.
 */
const MAGIC_LINK_SUBJECT = "Your sign-in link";
const MAGIC_LINK_TEMPLATE = `<h2>Your sign-in link</h2>

<p>Follow the link below to sign in. It expires in an hour and can only be used once.</p>

<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>

<p>Or enter this code on the sign-in page:</p>

<p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;letter-spacing:0.08em">{{ .Token }}</p>

<p>Use the code if the link does not work. Some email scanners open links before you do, which spends them; a code cannot be spent that way.</p>

<p>If you did not ask to sign in, ignore this email.</p>`;

// Exactly the two callbacks, production and local dev. Nothing broader:
// a wildcard here is a redirect any branch deployment can claim.
const REDIRECTS = [`${base}/admin/auth/callback`, "http://localhost:3000/admin/auth/callback"];

// Two requests, not one. Supabase refuses the whole PATCH if any field
// in it is a template field and the project is not allowed template
// writes, so sending them together means a plan restriction silently
// takes the Site URL fix down with it.
const urlPatch = {
  site_url: base,
  uri_allow_list: REDIRECTS.join(","),
};

const templatePatch = {
  mailer_subjects_magic_link: MAGIC_LINK_SUBJECT,
  mailer_templates_magic_link_content: MAGIC_LINK_TEMPLATE,
};

const patch = urlPatch;

if (smtpSender) {
  if (!vars.RESEND_API_KEY) {
    console.error("--smtp needs RESEND_API_KEY in .env.local");
    process.exit(1);
  }
  Object.assign(patch, {
    smtp_host: "smtp.resend.com",
    smtp_port: 465,
    smtp_user: "resend",
    smtp_pass: vars.RESEND_API_KEY,
    smtp_admin_email: smtpSender,
    smtp_sender_name: "The Motor House",
    // Supabase's own sender is fixed at two an hour. Ours is not, and an
    // admin asking for a second link should not be refused.
    rate_limit_email_sent: 30,
  });
}

/**
 * A refusal names the permission it wanted. Print that and nothing else:
 * the scoped token's permissions are granted one at a time, so the first
 * missing one is the only useful thing in the response.
 */
async function refused(response, what) {
  const detail = await response.text();
  console.error(`Could not ${what}: ${response.status}`);
  let missing = [];
  try {
    missing = JSON.parse(detail)?.error?.missing_permissions ?? [];
  } catch {
    // Not a permission error. The body is the explanation.
  }
  if (missing.length) {
    console.error(`\nAdd this to SUPABASE_ACCESS_TOKEN: ${missing.join(", ")}`);
    console.error("Reading and writing are separate permissions, and this");
    console.error("script needs auth_config_read as well as auth_config_write —");
    console.error("it reads every value back rather than trusting the write.");
  } else {
    console.error(detail.slice(0, 600));
  }
  process.exit(1);
}

async function main() {
  const response = await fetch(`${API}/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
  });

  if (!response.ok) await refused(response, "set the URL configuration");

  // The template, separately, because this is the request a plan
  // restriction refuses.
  const templateResponse = await fetch(`${API}/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(templatePatch),
  });

  let templateHeld = null;
  if (!templateResponse.ok) {
    const detail = await templateResponse.text();
    const planned = /not available for free tier|upgrade your plan|custom SMTP/i.test(detail);
    if (!templateResponse.ok && !planned) {
      console.error(`Could not set the email template: ${templateResponse.status}`);
      console.error(detail.slice(0, 600));
      process.exit(1);
    }
    templateHeld = JSON.parse(detail)?.message ?? detail.slice(0, 300);
  }

  // Read it back rather than trusting the write.
  const readBack = await fetch(`${API}/projects/${ref}/config/auth`, { headers });
  if (!readBack.ok) await refused(readBack, "read the auth config back");
  const after = await readBack.json();

  const expected = {
    site_url: base,
    uri_allow_list: REDIRECTS.join(","),
    ...(templateHeld
      ? {}
      : {
          mailer_subjects_magic_link: MAGIC_LINK_SUBJECT,
          mailer_templates_magic_link_content: MAGIC_LINK_TEMPLATE,
        }),
    ...(smtpSender
      ? {
          smtp_host: "smtp.resend.com",
          smtp_port: "465",
          smtp_user: "resend",
          smtp_admin_email: smtpSender,
          smtp_sender_name: "The Motor House",
          rate_limit_email_sent: 30,
        }
      : {}),
  };

  let ok = true;
  for (const [key, want] of Object.entries(expected)) {
    const got = after[key];
    const same = String(got) === String(want);
    if (!same) ok = false;
    const shown = key.startsWith("mailer_templates") ? `${String(got).length} chars` : JSON.stringify(got);
    console.log(`${same ? "ok  " : "BAD "} ${key.padEnd(38)} ${shown}`);
  }

  // Derived checks, because these are the two that broke.
  const token = String(after.mailer_templates_magic_link_content ?? "");
  const hasCode = token.includes("{{ .Token }}");
  const hasLink = token.includes("{{ .ConfirmationURL }}");
  console.log(`${hasLink ? "ok  " : "BAD "} template carries the link`);
  console.log(`${hasCode ? "ok  " : "BAD "} template carries the code`);
  console.log(`     code length is ${after.mailer_otp_length} digits, valid ${after.mailer_otp_exp}s`);
  console.log(`     auth emails per hour: ${after.rate_limit_email_sent}`);
  console.log(`     custom SMTP: ${after.smtp_host ? `${after.smtp_host} as ${after.smtp_admin_email}` : "none — Supabase's own sender"}`);

  if (templateHeld) {
    console.log("");
    console.log("HELD the email template. Supabase said:");
    console.log(`  ${templateHeld}`);
    console.log("");
    console.log("  The magic link is fixed and works. The emailed code is not:");
    console.log("  the template cannot be given {{ .Token }} while this project");
    console.log("  is on the free tier using Supabase's own sender, so no code");
    console.log("  reaches the inbox and the code box on /admin/login has");
    console.log("  nothing to accept. Fix it with a verified Resend domain and");
    console.log("  --smtp, which lifts the restriction, or a paid plan.");
    process.exit(2);
  }

  if (!ok || !hasCode || !hasLink) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
