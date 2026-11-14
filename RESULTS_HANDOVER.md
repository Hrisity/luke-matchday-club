# Results, scoring and standings

## No paid feed required

CMS → Results & scoring lets provisioned staff publish verified Football and F1 outcomes. Select the round revision (blank means current), enter final results, and publish. Unchecking an outcome withdraws it; publishing a correction replaces its contribution to the standings. Enter only completed outcomes: the server checks the prediction deadline, but cannot determine whether a match or race actually finished without a feed.

The player Results and Leaderboard screens, home table, F1 table and private-league table read `/api/results`. Reads refresh every 30 seconds. Round and all-round totals are separate, and Football/F1 are never combined. Only submitted snapshots count; saved drafts never affect rankings. Players without a profile name appear as “Player”.

## Persistence and audit

`round_results` stores immutable versions keyed by tenant, round revision and version. A compare-and-swap write rejects concurrent stale editors. Each row records actor and timestamp. Scores are calculated from the latest result version and submitted snapshots on read, so corrections cannot double-award points. Historical configurations stay immutable. Existing predictions are untouched by this migration.

The GET response excludes account IDs and prediction snapshots. Private-league reads require membership. Staff writes require same-origin requests, authentication and the relevant tenant role. The default player tenant remains `luke-owned`; general partner identity routing still requires integration work.

## Free feed assessment

football-data.org offers a free tier for 12 competitions with delayed scores and a 10-request/minute limit: https://www.football-data.org/pricing . The first-scoring-team answer is not covered by the basic score response. No external feed has been enabled, no subscription created, and no API credentials are required for manual settlement. A future feed adapter must map provider fixtures to immutable round IDs and must not invent missing first-scorer or pit-stop outcomes.

## Tests

Use Node 24 (the test database uses node:sqlite).

- `npm test`: deterministic unit and SQL integration tests in an isolated in-memory database.
- `npm run test:coverage`: enforces 100% lines, branches and functions for **lib/settlement.ts and app/api/results/route.ts**. This is not a claim of whole-application coverage.
- `npx tsc --noEmit` and `npm run build`: typecheck and production build.

The integration harness executes the real migrations and route handlers, mocking only authentication and the Cloudflare binding with SQLite. Tests cover the full CMS publish → prediction submission → lock → verified results → standings journey, corrections, withdrawals, permissions, concurrency, private leagues and historical rounds. They do not replace browser tests or production D1 load testing. Existing legacy HTTP suites depend on old demo dates and are not included in the deterministic test command.

At larger scale, paginate entry reads and materialise aggregate scores; the current implementation computes totals from submitted rows on each request. No production results or customer data are seeded by tests.
