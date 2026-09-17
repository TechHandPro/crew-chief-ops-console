---
ticket_id: 320
title: CREW CHIEF Ops Console v1 (Fable 5.1) — read-only tickets/docs/vault + deep links
git_repository_id: 0
organization_id: 1
repo_slug: TechHandPro/crew-chief-ops-console
source: task_description
updated: 2026-09-16
---

# TNT work ticket pin (CREW CHIEF Ops Console)

This file pins the **v1 delivery** ticket for **TechHandPro/crew-chief-ops-console**
on org **TechHand Pro Solutions** (org 1).

| Field | Value |
|-------|-------|
| **work_ticket_id** | **320** — <https://ai.techhand.pro/tickets/320> |
| **git_repository_id** | `0` (repository not yet linked in TNT; update after linking) |
| **Companion repo** | `TechHandPro/crew-chief-middleware` (CLI/MCP only, no UI) |

## MCP routing

1. `tnt_resolve_repo(repo_slug="TechHandPro/crew-chief-ops-console")`.
2. Post progress comments on **#320** with `ticket_id=320` until the repo link
   exists; afterwards pass the real `git_repository_id`.
3. Do not resolve long-lived platform pin tickets (#35) when a slice ships here.
