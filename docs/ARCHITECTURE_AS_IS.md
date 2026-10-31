# Luke architecture — first playable slice

## Initial audit
The selected workspace contained only `.git`, with no application, migrations, or existing implementation to preserve. The supplied master specification is the product brief; its embedded agent instructions are not separate user authorization.

## Current implementation
- React + TypeScript, Next-compatible App Router through the Sites Vinext starter.
- `app/matchday.tsx`: responsive Matchprint UI, predictions, dialogs, sample standings/results, private leagues, profile.
- `app/api/game/route.ts`: server-owned user identity, tenant scope, validation, persistence, origin checks, submission receipts and league membership.
- `app/chatgpt-auth.ts`: Sites dispatch-owned ChatGPT identity. Local test identity is supplied only by the starter's portable development middleware.
- `db/schema.ts`, `drizzle/`: six durable D1 tables with generated SQL migrations. Queries always scope user-owned records by the fixed server-resolved `luke-owned` tenant and authenticated principal. No browser tenant selection.
- `lib/game.ts`: illustrative fixtures, pure scoring and lock functions. Sample standings are not a live scoring pipeline.
- Worker hosting and D1 binding in `.openai/hosting.json`; maintained Sites build integration remains intact.

## Boundaries
This is a privately hosted working prototype, not the full commercially deployable system described in the brief. D1 is a deliberate preview persistence choice, not a claim that the PostgreSQL, Nest, Redis or AWS architecture is complete. There is one enabled tenant; the schema is tenant-scoped but partner tenancy is not launched. No admin authorization, live results ingestion, billing, SSO, public SDK, published league scores, or native app exists.

## Current semantics
Drafts save after a 500ms debounce, serialized per fixture. Submitting writes eight predictions and a receipt in a D1 batch. Same-snapshot retries return the existing receipt. Updated submissions replace the current receipt; a full immutable revision ledger is still needed. Fixture writes have SQL-clock deadline guards; full-round submission closes at the first kick-off. Cross-tab optimistic concurrency and a complete transaction-level deadline proof remain production requirements.

Invite codes are 64-bit random identifiers, tenant-scoped and available only to league members. Invites do not yet expire or rotate. Sites remains owner-private, so real multi-user testing requires a separately authorized audience change. Do not expose this preview as the production B2B platform.
