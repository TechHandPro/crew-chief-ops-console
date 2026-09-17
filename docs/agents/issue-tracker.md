# Issue tracker contract

The issue tracker for this repository is **TNT (TechHand Network Toolkit)**. Not
GitHub Issues, not Linear, not Jira, not scratch files.

## Session start

1. `tnt_resolve_repo(repo_slug="TechHandPro/crew-chief-ops-console")` to map
   this repository to its TNT organization and work ticket.
2. Read [`docs/TNT_TICKET.md`](../TNT_TICKET.md) for the pinned ticket.
3. `tnt_resolve_work_ticket(allow_create=false)`.
4. Pass `git_repository_id` (or `ticket_id`) on every organization-scoped MCP
   write. Organization context does not persist between tool calls.

Never post platform work to a client ticket, or client work to a platform
ticket. This console is a **platform** deliverable on org 1 (TechHand Pro
Solutions).

## Current state

- Work ticket: **#322** — *Ops Console: generic CREW CHIEF public asset
  (pluggable SoR, no TNT branding)*.
- Related incident: **#323** — *Ops Console LIVE: MCP list reads fail after
  sign-in* (child of #320; fixed by pinning `organization_id` on list calls).
- Shipped: **#320** — v1 read-only console (Resolved).
- Repository link: **linked** on org 1 as of 2026-09-17,
  `git_repository_id=12`. Pass it on organization-scoped writes. Console reads
  still do not depend on it: the adapter pins `organization_id` on every list.

## Related repositories

- [`TechHandPro/crew-chief-middleware`](https://github.com/TechHandPro/crew-chief-middleware)
  — OpenAPI → MCP generator. CLI/MCP only; it must not grow a UI. This console
  is the human-facing companion and reads through the connected MCP endpoint.
