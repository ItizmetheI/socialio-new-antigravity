// Socialio's account emails (sign-up confirmation, password reset, invite…).
// Supabase writes these emails and Resend delivers them, so the templates
// live in Supabase's auth settings. This file is their source of truth.
//
//   node scripts/email-templates.mjs            -> writes previews to supabase/email-templates/
//   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/email-templates.mjs --deploy
//                                               -> uploads subjects + HTML to Supabase
//
// Look: plain and monochrome (white card, black type, one black button,
// small key/value rows), with one signature detail: a strip of real
// Socialio work at the foot of every email, the only colour in it.
// public/email/work-strip.jpg must be live on the site before deploying.
//
// Email-client rules: table layout, inline styles on every element (Gmail
// and Outlook drop most <style> rules), a <style> block only for phone
// sizing, a bulletproof button, a plain-link fallback, hidden preheader.
import { mkdirSync, writeFileSync } from "node:fs";

const PROJECT_REF = "arihkzzgylfmcqgdzjqf";
const SUPPORT = "support@socialio.io";

const C = {
  page: "#f5f5f6",
  card: "#ffffff",
  ink: "#0b0b0d",
  body: "#4a4a52",
  muted: "#8b8b94",
  line: "#e8e8eb",
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

const greeting = `{{ if .Data.full_name }}Hi {{ .Data.full_name }},{{ else }}Hi there,{{ end }}`;

const p = (html) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.body};">${html}</p>`;
const small = (html) => `<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">${html}</p>`;
const link = (href, text = href, color = C.ink) => `<a href="${href}" style="color:${color};text-decoration:underline;word-break:break-all;">${text}</a>`;

function button(href, label) {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 26px;">
  <tr>
    <td align="center" bgcolor="${C.ink}" style="border-radius:8px;background:${C.ink};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`;
}

// Key/value rows: what this email is about, at a glance.
function details(rows) {
  const tr = rows
    .map(
      ([label, value]) => `
  <tr>
    <td style="padding:9px 0;border-top:1px solid ${C.line};font-family:${FONT};font-size:13px;color:${C.muted};width:132px;vertical-align:top;">${label}</td>
    <td style="padding:9px 0;border-top:1px solid ${C.line};font-family:${FONT};font-size:13px;color:${C.ink};vertical-align:top;word-break:break-word;">${value}</td>
  </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;border-bottom:1px solid ${C.line};">${tr}</table>`;
}

const fallbackLink = (href) => small(`Button not working? Paste this into your browser:<br>${link(href, href, C.muted)}`);

function layout({ preheader, heading, content }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${heading}</title>
<style>
  @media (max-width: 600px) {
    .sc-card { padding: 28px 22px 22px !important; }
    .sc-heading { font-size: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
  <tr>
    <td align="center" style="padding:36px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 2px 18px;">
            <a href="{{ .SiteURL }}" target="_blank" style="text-decoration:none;">
              <img src="{{ .SiteURL }}/logo.png" width="96" alt="Socialio" style="display:block;width:96px;height:auto;border:0;font-family:${FONT};font-size:20px;font-weight:700;color:${C.ink};">
            </a>
          </td>
        </tr>
        <tr>
          <td class="sc-card" style="background:${C.card};border:1px solid ${C.line};border-radius:12px;padding:36px 36px 26px;">
            <h1 class="sc-heading" style="margin:0 0 14px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${C.ink};">${heading}</h1>
            ${content}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-top:1px solid ${C.line};">
              <tr>
                <td style="padding-top:20px;">
                  <a href="{{ .SiteURL }}/case-studies" target="_blank" style="text-decoration:none;">
                    <img src="{{ .SiteURL }}/email/work-strip.jpg" width="488" alt="Recent Socialio work: beauty, food, jewellery and creator content" style="display:block;width:100%;max-width:488px;height:auto;border:0;border-radius:6px;">
                  </a>
                  <p style="margin:10px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted};">Recent work from the Socialio studio</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 2px 0;">
            <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">Questions? Write to ${link(`mailto:${SUPPORT}`, SUPPORT, C.muted)}.</p>
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">Socialio · KB Tech Inc. · Bensalem, Pennsylvania</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// Links expire after mailer_otp_exp (currently 3600s = 1 hour).
export const TEMPLATES = {
  confirmation: {
    subject: "Confirm your email for Socialio",
    html: layout({
      preheader: "One click and your Socialio account is ready.",
      heading: "Confirm your email",
      content:
        p(greeting) +
        p("Thanks for signing up to Socialio. Confirm your email address and your account is ready.") +
        button("{{ .ConfirmationURL }}", "Confirm email") +
        details([
          ["Account", "{{ .Email }}"],
          ["Link valid for", "1 hour"],
        ]) +
        small("Didn't sign up? Ignore this email. No account is created until the email is confirmed.") +
        fallbackLink("{{ .ConfirmationURL }}"),
    }),
  },
  recovery: {
    subject: "Reset your Socialio password",
    html: layout({
      preheader: "Choose a new password. The link works for 1 hour.",
      heading: "Reset your password",
      content:
        p(greeting) +
        p("Someone asked to reset the password on your Socialio account. If that was you, choose a new one below.") +
        button("{{ .ConfirmationURL }}", "Choose a new password") +
        details([
          ["Account", "{{ .Email }}"],
          ["Link valid for", "1 hour, one use"],
        ]) +
        small("Didn't ask for this? Ignore this email and your password stays the same.") +
        fallbackLink("{{ .ConfirmationURL }}"),
    }),
  },
  invite: {
    subject: "You're invited to Socialio",
    html: layout({
      preheader: "Your Socialio dashboard is ready. Accept the invite to get started.",
      heading: "Your dashboard is ready",
      content:
        p(greeting) +
        p("The Socialio team has set up an account for you. Accept the invite and choose a password to see your plan, your content and everything we're working on.") +
        button("{{ .ConfirmationURL }}", "Accept invite") +
        details([
          ["Account", "{{ .Email }}"],
          ["Link valid for", "1 hour"],
        ]) +
        small(`Link expired? Ask your Socialio contact for a new invite, or write to ${link(`mailto:${SUPPORT}`, SUPPORT, C.muted)}.`) +
        fallbackLink("{{ .ConfirmationURL }}"),
    }),
  },
  magic_link: {
    subject: "Your Socialio sign-in link",
    html: layout({
      preheader: "Sign in to Socialio with one click.",
      heading: "Sign in to Socialio",
      content:
        p(greeting) +
        p("Here's your sign-in link. No password needed.") +
        button("{{ .ConfirmationURL }}", "Sign in") +
        details([
          ["Account", "{{ .Email }}"],
          ["Link valid for", "1 hour, one use"],
        ]) +
        small("Didn't ask to sign in? Ignore this email.") +
        fallbackLink("{{ .ConfirmationURL }}"),
    }),
  },
  email_change: {
    subject: "Confirm your new email for Socialio",
    html: layout({
      preheader: "Confirm the new email address on your Socialio account.",
      heading: "Confirm your new email",
      content:
        p(greeting) +
        p("Please confirm you want to change the email on your Socialio account.") +
        button("{{ .ConfirmationURL }}", "Confirm new email") +
        details([
          ["From", "{{ .Email }}"],
          ["To", "{{ .NewEmail }}"],
        ]) +
        small(`Didn't ask for this? Ignore this email and write to ${link(`mailto:${SUPPORT}`, SUPPORT, C.muted)}.`) +
        fallbackLink("{{ .ConfirmationURL }}"),
    }),
  },
  reauthentication: {
    subject: "{{ .Token }} is your Socialio verification code",
    html: layout({
      preheader: "Your Socialio verification code.",
      heading: "Your verification code",
      content:
        p("Enter this code to confirm it's you:") +
        `<p style="margin:4px 0 22px;font-family:${MONO};font-size:30px;font-weight:700;letter-spacing:6px;color:${C.ink};">{{ .Token }}</p>` +
        details([["Code valid for", "1 hour"]]) +
        small("Didn't ask for a code? Someone may know your password. Change it and let us know."),
    }),
  },
  password_changed_notification: {
    subject: "Your Socialio password was changed",
    html: layout({
      preheader: "The password on your Socialio account was just changed.",
      heading: "Your password was changed",
      content:
        p(greeting) +
        p("The password on your Socialio account was just changed. If that was you, there's nothing else to do.") +
        details([
          ["Account", "{{ .Email }}"],
          ["Changed", "Just now"],
        ]) +
        p(`Wasn't you? Reset your password now and write to ${link(`mailto:${SUPPORT}`, SUPPORT)}.`) +
        button("{{ .SiteURL }}/app/forgot-password", "Reset password"),
    }),
  },
};

// Supabase config keys for each template.
function configPatch() {
  const patch = {};
  for (const [name, t] of Object.entries(TEMPLATES)) {
    patch[`mailer_subjects_${name}`] = t.subject;
    patch[`mailer_templates_${name}_content`] = t.html;
  }
  return patch;
}

// Previews with sample values, for checking in a browser. SITE_URL lets a
// local dev server stand in for the live site.
const SAMPLE = {
  "{{ .SiteURL }}": process.env.PREVIEW_SITE_URL ?? "https://socialio-new-admin.ahmedbarkat1067.workers.dev",
  "{{ .ConfirmationURL }}": "https://socialio.io/auth/v1/verify?token=SAMPLE&type=signup",
  "{{ .Email }}": "sam@northwind-coffee.com",
  "{{ .NewEmail }}": "sam@northwindcoffee.co",
  "{{ .Token }}": "48201937",
};
function preview(html) {
  let out = html.replace(/\{\{ if \.Data\.full_name \}\}Hi \{\{ \.Data\.full_name \}\},\{\{ else \}\}Hi there,\{\{ end \}\}/g, "Hi Sam,");
  for (const [k, v] of Object.entries(SAMPLE)) out = out.split(k).join(v);
  return out;
}

const dir = new URL("../supabase/email-templates/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const [name, t] of Object.entries(TEMPLATES)) {
  writeFileSync(new URL(`${name}.html`, dir), preview(t.html));
}
console.log(`Wrote ${Object.keys(TEMPLATES).length} previews to supabase/email-templates/`);

if (process.argv.includes("--deploy")) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("Set SUPABASE_ACCESS_TOKEN to deploy.");
    process.exit(1);
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(configPatch()),
  });
  console.log(res.ok ? "Deployed subjects and templates to Supabase." : `Deploy failed: ${res.status} ${await res.text()}`);
  if (!res.ok) process.exit(1);
}
