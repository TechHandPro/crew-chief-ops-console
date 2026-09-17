---
ticket_id: 322
title: Ops Console: generic CREW CHIEF public asset (pluggable SoR, no TNT branding)
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
| **work_ticket_id** | **322** — <https://ai.techhand.pro/tickets/322> (generic public template) |
| **Related** | **#323** — <https://ai.techhand.pro/tickets/323> (LIVE dogfood list failures, child of #320) |
| **Shipped** | **#320** — v1 read-only console (Resolved) |
| **git_repository_id** | **12** (linked on org 1, 2026-09-17) |
| **Companion repo** | `TechHandPro/crew-chief-middleware` (CLI/MCP only, no UI) |

## MCP routing

1. `tnt_resolve_repo(repo_slug="TechHandPro/crew-chief-ops-console")` resolves
   to org 1 / `git_repository_id=12` / work ticket #323.
2. Read with the organization pin: pass `organization_id=1` on
   `tnt_list_tickets` / `tnt_list_documents` / `tnt_list_vault_entries`.
3. Pass `git_repository_id=12` on organization-scoped writes; comment on
   `ticket_id=322` (generic template) or `323` (dogfood incident).
4. Do not resolve long-lived platform pin tickets (#35) when a slice ships here.
