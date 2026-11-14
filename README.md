# Predict — The prediction club

A working, privately hosted first slice of the Predict product brief. Football picks for six fixtures (5 exact, 2 outcome, 2 first scorer), a Formula 1 prediction game, account-backed saved drafts, review and submission receipts, private league creation/joining, profile naming, labelled sample results/leaderboards, and a staff-only configurable Game CMS. The clubhouse also includes a reversible BOTB-inspired concept skin switch while keeping the same game rules and data model.

**This is not yet the full commercial platform.** See `docs/IMPLEMENTATION_MATRIX.md` for implemented and outstanding work. No live fixtures, payment service, partner SSO or admin console is implied.

## Local development

Requires Node 24+ (Node's type stripping is used by the domain tests).

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_broken_bloodaxe.sql
npm run dev -- --hostname 127.0.0.1
```

Apply each migration once, in order. The dev server is at its printed localhost URL. The portable starter supplies a **local-only** Seedy identity through the normal Sign in button. Production identity is supplied by Sites dispatch. Never expose the portable development server publicly.

## Verification

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/engine.test.ts
# With the development server running; writes disposable local test records:
node --test tests/api.test.mjs
npm run build
```

## Source map

- `app/matchday.tsx`: user interface and interaction flows
- `app/globals.css`: Matchprint design and breakpoints
- `app/api/game/route.ts`: authenticated read/write operations
- `lib/game.ts`: pure game rules and clearly labelled demo fixtures
- `db/schema.ts`, `drizzle/`: durable D1 storage and migrations
- `docs/`: architecture, decisions, implementation matrix and external dependencies

The preview round uses 7–8 November 2026 demo kick-offs. Locks are intentionally real and date-bound; partner staff can publish a future six-fixture round through `/admin`. No real-world fixtures, F1 entrants, or scores are asserted.

## GitHub staging

The `staging` branch is configured for a free Cloudflare Workers staging deployment through `.github/workflows/staging.yml`. Create a GitHub environment named `staging` and add these secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `D1_DATABASE_ID`. The token needs Workers deployment and D1 access. Each push to `staging` builds the Vinext Worker, binds the staging D1 database, and deploys `luke-matchday-staging`.
