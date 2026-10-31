# Preview runbook

Hosting identity and bindings: `.openai/hosting.json`. Use the Sites skill's source helper to synchronize source and package the deploy artifact. Do not replace the project ID or publish the private site publicly without the user's request.

Build: `npm run build`. Build output is generated under `dist/`; it is not source. D1 migrations are generated via `npm run db:generate` and applied locally with Wrangler against `.wrangler/state`. Hosted migrations are applied by Sites during publication. Do not change an already-applied SQL migration.

Recovery: preserve the current private audience, inspect deployment errors before retrying, and retain the saved version ID after any partial publication. Restore a previous saved Site version if the UI fails; data migrations require their own forward-compatible repair.

Runtime failure reports are logged with `game.read.failed` or `game.write.failed`. Full observability, alerting, database export/restore drills, retention jobs and production incident procedures remain outstanding.
