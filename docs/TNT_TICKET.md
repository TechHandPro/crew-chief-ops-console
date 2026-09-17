---
ticket_id: 340
title: Ops Console Overview summary widgets fail schema/read (post-#338)
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
| **work_ticket_id** | **340** — Overview summary schema/read (child of epic **#329**) |
| **Related** | **#338** public pack scrub (Resolved, LIVE @ 7c48544); **#323** list unwrap (Resolved) |
| **Not this PR** | **#330** MCP factory; **#331** audit surface (PR #6 stays draft); Soft **#318** parked |
| **Shipped** | **#320** v1; **#322** generic template; **#323** org-pin + unwrap; **#338** public pack |
| **git_repository_id** | **12** (linked on org 1, 2026-09-17) |
| **Companion repo** | `TechHandPro/crew-chief-middleware` (CLI/MCP only, no UI) |

## MCP routing

1. `tnt_resolve_repo(repo_slug="TechHandPro/crew-chief-ops-console")` resolves
   to org 1 / `git_repository_id=12`. Prefer work ticket **#340** for this slice.
2. Read with the organization pin: pass `organization_id=1` on
   `tnt_list_tickets` / `tnt_list_documents` / `tnt_list_vault_entries`.
3. Pass `git_repository_id=12` on organization-scoped writes; comment on
   `ticket_id=340`. Do not post factory/audit work here.
4. Do not resolve long-lived platform pin tickets (#35) when a slice ships here.

Public pack contract: [`docs/public-pack.md`](public-pack.md). Portable deploy
skill: [`docs/DEPLOY_OPS_CONSOLE.md`](DEPLOY_OPS_CONSOLE.md) — not WSL2;
tracks A localhost / B ops.local / C VPS (TPS example only). Cross #331.
Soft #318 parked. Publish stays Jeremiah.
