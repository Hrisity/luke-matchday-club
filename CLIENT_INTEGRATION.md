# Predict integration

## Demo

Live demo: https://luke-matchday-club.hristiana-russanova.chatgpt.site/

CMS: https://luke-matchday-club.hristiana-russanova.chatgpt.site/admin

Health check: `/api/health`

## Integration model

Partners can use the hosted Predict UI, embed the game routes in their member area, or consume the API from a custom frontend. Each partner is isolated by a tenant ID. CMS access is granted through `staff_memberships`; players are identified by the authenticated account.

## Core endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/game` | Read the current football round, player picks, leagues and leaderboard data |
| `POST /api/game` | Save drafts, submit predictions, create leagues and update player profile |
| `GET /api/f1` | Read the current F1 round and saved picks |
| `POST /api/f1` | Save or submit F1 predictions |
| `GET /api/admin` | Read CMS configuration for an authorised staff member |
| `POST /api/admin` | Publish a validated, versioned configuration |
| `GET /api/health` | Confirm the API and database are available |

All write requests require the authenticated session and same-origin protection. Configuration publishing uses compare-and-swap revisions so two CMS editors cannot overwrite one another.

## Production handover

The client supplies their identity provider, tenant name, branding, sports-data feed (or confirms manual CMS entry), domain, and data-retention requirements. We then configure the production database, staff memberships, authentication, environment secrets, and a separate staging deployment.
