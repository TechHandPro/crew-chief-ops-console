---
ticket_id: 338
title: CREW CHIEF edge: public pack vs dogfood scrub
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
| **work_ticket_id** | **338** — public pack vs dogfood scrub (child of epic **#329**) |
| **Related** | **#322** generic public asset (Resolved); **#323** LIVE list failures (Resolved) |
| **Not this PR** | **#330** MCP factory; **#331** audit surface — do not bundle |
| **Shipped** | **#320** — v1 read-only console (Resolved) |
| **git_repository_id** | **12** (linked on org 1, 2026-09-17) |
| **Companion repo** | `TechHandPro/crew-chief-middleware` (CLI/MCP only, no UI) |

## MCP routing

1. `tnt_resolve_repo(repo_slug="TechHandPro/crew-chief-ops-console")` resolves
   to org 1 / `git_repository_id=12` / work ticket #338 when pinned.
2. Read with the organization pin: pass `organization_id=1` on
   `tnt_list_tickets` / `tnt_list_documents` / `tnt_list_vault_entries`.
3. Pass `git_repository_id=12` on organization-scoped writes; comment on
   `ticket_id=338` for this scrub. Do not post factory/audit work here.
4. Do not resolve long-lived platform pin tickets (#35) when a slice ships here.

Public pack contract: [`docs/public-pack.md`](public-pack.md). Soft #318 parked.
Publish stays Jeremiah.
