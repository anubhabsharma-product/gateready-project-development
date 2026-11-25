# Vercel deployment guide

GateReady is a Next.js 16 App Router application. The source package is deployment-ready, but a local preview is not a public deployment. Do not publish until the environment variables and Supabase schema are configured and the production smoke checks below pass.

## 1. Supabase setup

1. Create or select the Supabase project intended for this app.
2. Open its SQL Editor and run `supabase/schema.sql`.
3. Confirm both `gateready_demo_workspaces` and `gateready_demo_activity` exist, row-level security is enabled, and `anon`/`authenticated` have no direct table grants. The app uses server-side service-role access; do not add a browser client for these private tables.
4. Use a project-specific private server key. Never use a `NEXT_PUBLIC_` prefix for it.

## 2. Vercel project settings

Connect this repository to a Vercel project using the repository root as the Root Directory. Use the included `pnpm-lock.yaml`; Vercel should detect Next.js and pnpm automatically. Do not add Cloudflare-specific bindings or local database fallbacks.

Add these variables in Vercel Project Settings → Environment Variables for the environments you will deploy:

| Variable | Required | Value |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL. `NEXT_PUBLIC_SUPABASE_URL` is accepted as a URL fallback by the server adapter, but `SUPABASE_URL` is preferred. |
| `SUPABASE_SECRET_KEY` | Yes | Secret server-side Supabase key with access to the tables. The service-role equivalent `SUPABASE_SERVICE_ROLE_KEY` is also accepted. Keep it private. |
| `DEMO_SESSION_SECRET` | Yes in production | A high-entropy random secret used to sign reviewer session cookies. |
| `GEMINI_API_KEY` | Yes for live analyst | Google Gemini API key, server-side only. |
| `GEMINI_MODEL` | Recommended | `gemini-3.5-flash-lite` (the requested model; do not silently substitute). |

`.env.example` contains only empty placeholders. Do not commit `.env.local`, `.env.development.local`, or any credential.

## 3. Deploy and smoke-test

1. Deploy a Preview first; verify the build and environment variables before promoting it.
2. Open the deployed URL in a signed-out/private browser. Confirm the read-only dashboard loads without a Vercel or ChatGPT login.
3. Start a private demo. Change a scenario or add a task, reload, and confirm the workspace persists.
4. Open a second independent browser session and confirm its edits do not change the first session.
5. Ask the analyst an evidence-based question, a follow-up, and an unsupported question (for example weather). Confirm it distinguishes source evidence from assumptions and does not invent evidence. Confirm task suggestions require explicit confirmation.
6. Download the original workbook and JSON; verify that a source override export remains separate from both original files.
7. Verify server-only credentials are absent from page source, browser requests, and downloadable package. Confirm response security headers on the deployed app.
8. Promote to Production only after every gate above passes and the public route is reachable while signed out.

## 4. Operations and limitations

- The anonymous reviewer workspace is not staff authentication. Add an appropriate staff identity provider before using this workflow for real staff or attendee personal data.
- Workspace records have a revision counter. A stale write returns a conflict rather than overwriting a newer save.
- RLS is enabled and direct anonymous/authenticated table grants are revoked; service credentials remain server-side.
- Set a dedicated, high-entropy `DEMO_SESSION_SECRET` before production. Existing installations without it derive a signing key from the legacy service-role credential when present; changing the signing key invalidates existing demo cookies.
- AI requests are bounded and rate-limited per workspace. Monitor provider quota and errors; analyst results need human review.
- The sample source pack is synthetic and the capacity limits are hypothetical. Replace only with authorized, validated source data and approved venue limits before operational use.

For current validation status, see `docs/VERIFICATION.md`. A public production URL belongs here only after an actual deployment has been verified.
