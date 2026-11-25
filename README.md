# GateReady — attendee growth decision system

**Challenge A: attendee growth** · Candidate: **Anubhab Sharma, IIT Kharagpur** · Proposed event: **Mood Indigo, IIT Bombay, Mumbai**

GateReady connects a source-audited attendee funnel to a six-week acquisition and arrival plan. The application separates observed historical records from editable planning assumptions, lets reviewers work in isolated persistent demo sessions, and routes analyst questions through Gemini on the server.

## Submission files

- `submission/GateReady-Strategy.pdf` — exactly three strategy slides; no cover or appendix.
- `submission/strategy-slides.html` — editable source used to render the PDF.
- `docs/VERCEL-DEPLOYMENT.md` — environment setup and production checklist.
- `docs/VERIFICATION.md` — checks performed and checks that still require deployment credentials/review.
- `supabase/schema.sql` — hosted persistence schema and grants.
- `.env.example` — variable names and safe placeholders only.
- `data/Attendee-Dataset-df0650.xlsx` and `data/historical-source.json` — immutable original workbook and lossless source pack.

The source ZIP is distributed separately from the repository. It excludes `.git`, build output, dependencies, and real environment files.

## Strategy summary

The city/event choice is a proposed plan for Mood Indigo at IIT Bombay, in Powai, Mumbai. IIT Bombay's official contact page confirms its Mumbai location. An official Mood Indigo contingent-leader portal describes college leaders as the link for registrations, communication, participation, and accommodation; this makes college-club contingents a credible mechanism to test, not a proven causal result. The candidate's Spring Fest core-team context is used only as relevant execution context; no additional responsibilities or outcomes are claimed.

### Observed source snapshot

The supplied source pack labels its historical event **CampusFest 2025**. It is not Mood Indigo data and is not evidence of Mood Indigo's past performance. Snapshot: 20 April 2025.

| Funnel / spend measure | Observed value | Interpretation |
| --- | ---: | --- |
| Reported reach | 666,297 | Sum of platform-day reach; not globally deduplicated people. |
| Identified external people | 3,625 | Distinct external person IDs. |
| Registered external people | 2,800 | Distinct people, not registration rows. |
| Latest confirmed external people | 2,500 | Latest eligible registration status at the selected date. |
| Unique verified external arrivals | 2,050 | At least one admitted + verified check-in; each person counted once. |
| Confirmed-to-verified arrival | 82.0% | 2,050 / 2,500; descriptive, not a causal estimate. |
| Posted net spend | ₹274,000 | Includes qualifying posted credits. Source budget target: ₹300,000. |
| Unattributed verified arrivals | 125 | Kept in portfolio total; not assigned to a channel. |

Source-data rules: join on stable IDs; deduplicate event/history IDs; select the latest status effective by the selected end-of-day snapshot; include only external people with admitted and verified check-ins; count each person once across repeat admissions; keep blank check-in campaign IDs unattributed; include negative posted vendor credits; return unavailable rather than divide by zero. The workbook's reported reach remains separate from identified people. The analytics implementation also records manual and scanner admission-event counts, but does not mistake them for unique people.

### Forecast arithmetic and operating constraints

The source's 2,050 verified attendees are the planning baseline, not a future guarantee. The five proposed pilots total ₹300,000. Their per-bet gross estimates sum to +700 base / +1,300 stretch. Portfolio overlap is an explicit, unproven deduction of 100 / 150 to avoid double-counting shared people. Thus:

- **Base:** 2,050 + 700 − 100 = **2,650 unique arrivals**.
- **Stretch:** 2,050 + 1,300 − 150 = **3,200 unique arrivals**.
- **Portfolio budget:** ₹70,000 + ₹50,000 + ₹35,000 + ₹85,000 + ₹60,000 = **₹300,000**.
- Planning capacity inputs: 3,500 unique admissions and 1,500 concurrent occupants are both **hypothetical/unapproved**, distinct controls. Never exceed the venue's approved limit or use expected no-shows as authorization.

These are planning scenarios, not source-measured campaign lift. Channel overlap, arrival response, execution capacity, event approvals, and growth estimates must be tested with cohort/holdout evidence before money is reallocated.

### Ranked bets

The score is a transparent prioritization heuristic: impact 40%, evidence/fit 30%, execution ease 20%, speed to learn 10%. Each dimension is a qualitative 1–5 score normalized to 100. “Evidence” is confidence in the fit of the mechanism to the available source/organizer evidence—not a statistical confidence interval. It does not prove incrementality.

| Rank | Bet | Proposed budget | Gross base / stretch | Score | First decision rule |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | College-club contingents | ₹70,000 | +150 / +275 | 94 | At ≥50 confirmations, scale at ≥80% arrival and ≤₹120 per verified attendee; pause below 70% or above ₹250. |
| 2 | Buddy referrals | ₹50,000 | +130 / +250 | 92 | Randomized prompt vs holdout; scale at ≥5pp verified-arrival lift and ≤₹100 per incremental arrival. |
| 3 | Arrival-confidence CRM | ₹35,000 | +180 / +300 | 88 | Randomized reminder sequence; scale at ≥5pp lift; guard opt-outs and complaints. |
| 4 | Peer-to-peer campus reps | ₹85,000 | +90 / +190 | 66 | Start with 20 reps; scale at ≥75% cohort arrival and ≤₹150 per verified arrival. |
| 5 | High-intent search + student communities | ₹60,000 | +150 / +285 | 66 | At ≥75 registrations, scale only at ≥60% identified-to-registration and ≤₹100 per verified arrival. |

Detailed owners, weeks, test instructions, stop gates, and source caveats are on the three slides and in `lib/strategy.ts`.

## Research ledger

Accessed 26 November 2026. Organizer-reported claims are identified as such and are not used as audited attendance benchmarks.

| Source | Relevant claim | Strategy use | Limitation |
| --- | --- | --- | --- |
| [IIT Bombay — Contact us](https://www.iitb.ac.in/contact-us) | Official mailing address is IIT Bombay, Powai, Mumbai 400 076; transit directions are also provided. | Confirms the proposed city/campus context and reinforces the need for clear travel/gate information. | Does not establish attendee travel time, mode, or demand. |
| [Mood Indigo — My MI contingent-leader portal](https://my.moodi.org/cl) | The portal describes the Contingent Leader as the college's official link for registration, communication, participation, and accommodation. | Supports testing accountable college-club/contingent workflows with named cohort links and roster reconciliation. | Organizer description; no causal arrival or cost effect is reported. Incentives on the page are not treated as campaign ROI. |
| [IIT Delhi — Rendezvous'25](https://www.rdv-iitd.org/) | Official page describes a four-day, multi-genre cultural festival held 27–30 September 2025. | Context for a multi-day college-festival format and event-information needs. | Its page's footfall headings do not provide an audited unique-arrival denominator; no volumes are compared. |
| [IIT Madras — Saarang 2026](https://saarang.org/) | Official page describes Saarang as a 52nd-edition festival and advertises anticipated 80,000+ footfall and 500+ colleges. | Context for the scale of college-festival ecosystems; college representation is a plausible segment to test. | These are organizer projections/claims, not verified unique arrivals; not used as a target or conversion benchmark. |

The research suggests a mechanism (trusted college representatives and useful arrival communications), not a guaranteed outcome. Weather, travel modes, causal channel lift, approved capacity, and concurrent occupancy are absent from the supplied source pack.

## Product and architecture

- **Next.js App Router + TypeScript + React**: dashboard routes, server APIs, and a responsive workspace.
- **Source analytics** (`lib/analytics.ts`): historical snapshots, campaign filters, data-quality exclusions, stable-ID deduplication, unique arrivals, net spend, and target versions.
- **Planning model** (`lib/demo-state.ts`, `lib/strategy.ts`): editable campaign assumptions, base/stretch forecast, capacity cap, ranked bets, and task creation.
- **Private reviewer sessions** (`lib/demo-session.ts`): signed HTTP-only cookie, expiry, server-validated workspace ID; stale writes use revision compare-and-swap. This is isolated demo access, not staff authentication.
- **Supabase Postgres** (`lib/supabase-admin.ts`, `supabase/schema.sql`): server-only REST access using secret credentials; RLS enabled, direct `anon`/`authenticated` table access revoked, `service_role` used only server-side.
- **Gemini analyst** (`lib/analyst.ts`, `app/api/analyst/route.ts`): server-side Google Generative Language API call, default model `gemini-3.5-flash-lite`, bounded function calls for validated metrics, comparisons, scenarios, and draft tasks. A proposed task requires an explicit user confirmation in the UI before persistence.
- **Exports**: the original workbook and source JSON remain downloadable; a private source override exports separately and never overwrites the originals.

The UI reuses the project’s existing lightweight shadcn-compatible button primitives and lucide-react icons. No marketing, attendee, or capacity facts are fabricated as source records.

## Run locally

Requirements: Node.js supported by Next.js 16 and pnpm (lockfile pins pnpm 12.3.4).

1. Copy `.env.example` to `.env.local` and configure the server variables described in `docs/VERCEL-DEPLOYMENT.md`.
2. Run `pnpm install --frozen-lockfile`.
3. Apply `supabase/schema.sql` to the chosen Supabase project.
4. Run `pnpm dev` and open `http://localhost:3000`.
5. The initial view is read-only. Use **Try the demo** to create an isolated editable workspace.

## Limitations and safe use

- The source workbook is synthetic/anonymized historical data for CampusFest 2025, not Mood Indigo or a real event's admissions ledger.
- Historical channel performance is descriptive; no randomized treatment/control is present in the source.
- Base/stretch contributions and overlap deductions are hypotheses, not measured incremental impact.
- Capacity figures are explicitly hypothetical until the venue/event authority confirms limits; unique admissions and simultaneous occupancy are different measures.
- The demo cookie isolates anonymous reviewers but does not identify staff or replace production authentication/authorization.
- Live hosted Supabase and public production deployment must be verified in the target Vercel project. Do not interpret this local preview or source package as a public deployment.
- The AI analyst can be unavailable or rate-limited; its output is not guaranteed error-free and should be checked against the displayed source data.

See `docs/VERIFICATION.md` for the exact validation evidence and unverified gates. See `docs/VERCEL-DEPLOYMENT.md` before publishing.
