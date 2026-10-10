// Socialio's account emails (sign-up confirmation, password reset, invite…).
// Supabase writes these emails and Resend delivers them, so the templates
// live in Supabase's auth settings. This file is their source of truth.
//
//   node scripts/email-templates.mjs            -> writes previews to supabase/email-templates/
//   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/email-templates.mjs --deploy
//                                               -> uploads subjects + HTML to Supabase
//
// The look lives in supabase/functions/_shared/emailLayout.js, shared with
// the order emails the Edge Functions send.
// public/email/work-strip.jpg must be live on the site before deploying.
import { mkdirSync, writeFileSync } from "node:fs";
import { C, SUPPORT, p, small, link, button, details, fallbackLink, layout as sharedLayout } from "../supabase/functions/_shared/emailLayout.js";

const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

const PROJECT_REF = "arihkzzgylfmcqgdzjqf";

const greeting = `{{ if .Data.full_name }}Hi {{ .Data.full_name }},{{ else }}Hi there,{{ end }}`;

// Supabase fills in {{ .SiteURL }} when it sends.
const layout = (parts) => sharedLayout({ siteUrl: "{{ .SiteURL }}", ...parts });

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
