# External dependencies and production prerequisites

- Licensed football and Formula 1 data provider: competition coverage, commercial redistribution, score corrections, first-goal event rights.
- Production identity provider: native login, recovery, verification, privileged MFA, partner OIDC metadata and secrets.
- PostgreSQL, Redis, worker hosting, private object storage and secrets management if following the target architecture.
- Business-owned cloud account, DNS/domain verification, CI deploy identity, mail/push credentials, monitoring and backup destinations.
- Stripe account and verified webhook secret only when real subscription billing is implemented.
- Legal product terms, production privacy policy, retention policy, accessibility audit, and a separate assessment before any paid-entry/prize mechanics.
- Asset review before commercial release. Current demo uses a downloaded Unsplash stadium photo and original abstract team monograms. Google Fonts are currently requested at runtime; self-host approved fonts before a strict CSP/privacy release.

No credentials, provider results, legal approvals, or live integrations have been invented. There are no payment fields in this prototype.
