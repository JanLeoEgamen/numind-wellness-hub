#!/usr/bin/env node
// Updates the hosted Supabase "Confirm signup" (email verification) template
// for this project via the Supabase Management API.
//
// Usage:
//   1) Create a Supabase access token:
//        https://supabase.com/dashboard/account/tokens  -> "Generate new token"
//   2) Run:
//        $env:SUPABASE_ACCESS_TOKEN="sbp_..." ; node scripts/update-email-template.mjs
//
// The project ref is read automatically from supabase/.temp/project-ref
// (fallback: SUPABASE_PROJECT_ID env var).
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN. Generate one at https://supabase.com/dashboard/account/tokens and set it:\n' +
      '  $env:SUPABASE_ACCESS_TOKEN="sbp_..." ; node scripts/update-email-template.mjs',
  );
  process.exit(1);
}

const projectRefFile = resolve(__dirname, "../supabase/.temp/project-ref");
const projectRef =
  (existsSync(projectRefFile) ? readFileSync(projectRefFile, "utf8").trim() : "") ||
  process.env.SUPABASE_PROJECT_ID;
if (!projectRef) {
  console.error("Could not determine project ref (supabase/.temp/project-ref is missing).");
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

const SUBJECT = "Welcome to NuMind 🌱 — confirm your email to get started";

// Supabase renders this with Go templates; {{ .ConfirmationURL }} becomes the
// one-time verification link (which our app points at /onboarding).
const CONTENT = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#eff4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eff4fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 30px -12px rgba(20,44,122,0.18);">
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <span style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;border-radius:12px;background:linear-gradient(135deg,#ffcf3f,#ffe68a);font-size:22px;">🧠</span>
              <h1 style="margin:18px 0 6px 0;font-size:22px;line-height:1.2;color:#1c2f6b;">Hi there, welcome to NuMind</h1>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;">Your everyday wellness companion for a healthier mind, stronger habits and better days.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
                You're almost there — one quick tap and we'll set up your first day together: your goals, your avatar and your first seed 🌱
              </p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
                <strong>Confirm your email</strong> to verify your account and start your onboarding.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 40px 8px 40px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#ffcf3f,#ffe68a);color:#1c2f6b;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:999px;">
                Verify my email
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 28px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                If you didn't create a NuMind account, you can safely ignore this email.<br/>
                This link expires shortly for your security.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0 0;font-size:11px;color:#9ca3af;">Reset • Focus • Grow — NuMind</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

async function main() {
  console.log(`→ Reading current auth config for project ${projectRef}...`);
  const current = await fetch(API, { headers });
  if (!current.ok) {
    console.error(`GET failed (${current.status}): ${await current.text()}`);
    process.exit(1);
  }
  const config = await current.json();
  const template = config.template ?? {};

  console.log("→ Updating the 'Confirm signup' (signup) template...");
  const res = await fetch(API, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      template: {
        ...template,
        signup: { ...(template.signup ?? {}), subject: SUBJECT, content: CONTENT },
      },
    }),
  });

  if (!res.ok) {
    console.error(`PATCH failed (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  const updated = await res.json();
  const saved = updated.template?.signup ?? {};
  console.log(`✓ Saved.`);
  console.log(`  Subject: ${saved.subject}`);
  console.log(`  Content length: ${saved.content?.length ?? 0} chars (contains ConfirmationURL: ${String(saved.content ?? "").includes("{{ .ConfirmationURL }}")})`);
  console.log(`\nNext signup will use the new template. Sender is still governed by your SMTP settings.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
