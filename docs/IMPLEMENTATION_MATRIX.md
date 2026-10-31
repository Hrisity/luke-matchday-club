# Implementation matrix

Statuses describe this slice, not certification against the master spec's production definition of done.

| Area | Status | Evidence / limitation |
|---|---|---|
| Matchprint responsive matchday UI | working | `app/matchday.tsx`, `app/globals.css`; desktop and phone browser checks |
| Eight fixtures and first scorer controls | working | `lib/game.ts`, `FixtureCard`; clearly labelled sample schedule |
| Native Luke login / recovery | missing | ChatGPT sign-in adapter is used for this preview |
| Hosted identity | working | `app/chatgpt-auth.ts`; platform-owned identity headers, no custom password handling |
| Durable user-owned drafts | working | `app/api/game/route.ts`, `db/schema.ts`; API persistence smoke test |
| Submission receipt and repeat retries | working | same files; server-owned receipt, current snapshot persisted |
| Deadline enforcement | partial | per-fixture SQL-clock guards and server validation; race-proof production locking/revision model still required |
| Pure scoring rules | working | `lib/game.ts`, `tests/engine.test.ts`; exact/outcome never stack |
| Live provider integration | missing | no licensed feed or credentials supplied |
| Published scoring / live leaderboard | missing | sample leaderboard and results views only |
| League create, join, member count | working | authenticated API, durable records, deduplicated membership |
| League expiry, moderation, standings | missing | no live scoring and no invite lifecycle management |
| Profile name | working | persisted under tenant/user composite key |
| Account deletion / retention | missing | described honestly in preview privacy notice |
| Tenant isolation | partial | server-fixed tenant scope throughout; no configurable multi-tenant platform or RLS |
| Client/platform console and RBAC | missing | no superficial admin panels presented as operational features |
| Partner SSO / launch tickets / SDK | missing | requires implementation and identity integration |
| Payments / subscription / entitlements | missing | no fake payment UI |
| Formula 1 | missing | intentionally labelled coming soon |
| Email/push | missing | in-app demo announcement only |
| Migrations | working | generated `drizzle/0000_broken_bloodaxe.sql`, applied to local D1 |
| Automated tests | partial | scoring/validation/lock boundary plus API tests; cross-tenant/load/security suites outstanding |
| Accessibility | partial | native dialog, labelled number inputs, visible focus, reduced motion, responsive layout; full WCAG audit outstanding |
| Monitoring / backups / IaC / DR | missing | starter Worker runtime logs only; not production operations |
| Private preview deployment | partial | local build and source ready; hosting status recorded in final handoff |
