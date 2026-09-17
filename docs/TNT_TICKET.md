---
ticket_id: 331
title: "Ops Console: audit surface (who/what + deep links)"
git_repository_id: 12
organization_id: 1
repo_slug: TechHandPro/crew-chief-ops-console
source: task_description
updated: 2026-09-17
---

# TNT work ticket pin (CREW CHIEF Ops Console)

This file pins the current work ticket for **TechHandPro/crew-chief-ops-console**
on org **TechHand Pro Solutions** (org 1).

| Field | Value |
|-------|-------|
| **work_ticket_id** | **331** — audit surface; fixtures-only hold (child of epic **#329**) |
| **Hold** | **#332** / **#336** — Challenger pass; no production ticket/vault deep links until that decision |
| **Related** | **#322** generic public asset (Resolved); **#323** LIVE list failures (Resolved); **#325** mobile list overflow (Resolved) |
| **Shipped** | **#342** public README scrub; **#340** Overview FastMCP unwrap; **#338** public pack vs dogfood scrub (MERGED); **#320** v1 read-only console (Resolved) |
| **git_repository_id** | **12** (linked on org 1, 2026-09-17) |
| **Companion repo** | `TechHandPro/crew-chief-middleware` (CLI/MCP only, no UI) |

## MCP routing

1. `tnt_resolve_repo(repo_slug="TechHandPro/crew-chief-ops-console")` resolves
   to org 1 / `git_repository_id=12` / work ticket #331.
2. Read with the organization pin: pass `organization_id=1` on
   `tnt_list_tickets` / `tnt_list_documents` / `tnt_list_vault_entries`.
3. Pass `git_repository_id=12` on organization-scoped writes; comment on
   `ticket_id=331` for this slice.
4. Do not resolve long-lived platform pin tickets (#35) when a slice ships here.

Public pack contract: [`docs/public-pack.md`](public-pack.md). Portable deploy
skill: [`docs/DEPLOY_OPS_CONSOLE.md`](DEPLOY_OPS_CONSOLE.md) — not WSL2;
tracks A localhost / B ops.local / C VPS (TPS example only). #338 / #340 /
#342 are merged on main. Soft #318 parked. Publish stays Jeremiah.

## Scope lock (Grumpy / Challenger)

`/audit` is a read-only **fixtures preview**. Do not wire live TNT audit
reads or production SoR deep links until #332 / #336 says so. Soft #318
parked.
