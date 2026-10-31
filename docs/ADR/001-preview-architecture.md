# ADR 001 — Deploy a bounded playable preview first

Status: accepted for this initial implementation, not as a replacement for the commercial architecture.

The repository was empty and the requested spec spans a multi-application commercial platform. A cohesive end-user slice is implemented on the provided Sites runtime, with real D1 persistence and platform identity instead of misleading local-storage accounts or fake payment controls.

Consequences: this is not the target PostgreSQL/Nest modular monolith. Production work must establish workspace packages, API contracts, a licensed provider, trusted tenant resolution, immutable revisions, transaction-safe locks, event outbox, independent worker, privilege separation, partner federation, operational tooling and the rest of the implementation matrix. The pure scoring module can be moved to `packages/engine` without carrying React dependencies. The present UI can consume that API when available.
