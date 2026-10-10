// Socialio's email look, shared by the account emails (scripts/email-templates.mjs,
// sent by Supabase Auth) and the transactional emails the Edge Functions send
// through Resend (order confirmation). Plain JS so both Node and Deno load it.
//
// Look: plain and monochrome (white card, black type, one black button,
// small key/value rows), with one signature detail: a strip of real
// Socialio work at the foot of every email, the only colour in it.
//
// Email-client rules: table layout, inline styles on every element (Gmail
// and Outlook drop most <style> rules), a <style> block only for phone
// sizing, a bulletproof button, a plain-link fallback, hidden preheader.

export const SUPPORT = "support@socialio.io";

export const C = {
  page: "#f5f5f6",
  card: "#ffffff",
  ink: "#0b0b0d",
  body: "#4a4a52",
  muted: "#8b8b94",
  line: "#e8e8eb",
};
export const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// For any text that came from a person (names, plan labels) before it goes in HTML.
export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const p = (html) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.body};">${html}</p>`;
export const small = (html) => `<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">${html}</p>`;
export const link = (href, text = href, color = C.ink) => `<a href="${href}" style="color:${color};text-decoration:underline;word-break:break-all;">${text}</a>`;

export function button(href, label) {
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
export function details(rows) {
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

export const fallbackLink = (href) => small(`Button not working? Paste this into your browser:<br>${link(href, href, C.muted)}`);

// siteUrl is "{{ .SiteURL }}" for Supabase's templates, the real origin otherwise.
export function layout({ siteUrl, preheader, heading, content }) {
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
            <a href="${siteUrl}" target="_blank" style="text-decoration:none;">
              <img src="${siteUrl}/logo.png" width="96" alt="Socialio" style="display:block;width:96px;height:auto;border:0;font-family:${FONT};font-size:20px;font-weight:700;color:${C.ink};">
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
                  <a href="${siteUrl}/case-studies" target="_blank" style="text-decoration:none;">
                    <img src="${siteUrl}/email/work-strip.jpg" width="488" alt="Recent Socialio work: beauty, food, jewellery and creator content" style="display:block;width:100%;max-width:488px;height:auto;border:0;border-radius:6px;">
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
