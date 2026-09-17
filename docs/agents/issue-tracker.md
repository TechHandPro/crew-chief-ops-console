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

- Work ticket: **#320** — *CREW CHIEF Ops Console v1 (Fable 5.1) — read-only
  tickets/docs/vault + deep links*.
- Repository link: **pending**. As of 2026-09-16 `tnt_resolve_repo` returns
  `action_required: link_repo` for this slug. Link it in TNT (Organization →
  Repositories) and then update the `git_repository_id` in the pin file. Until
  then, comment on #320 directly with `ticket_id=320`.

## Related repositories

- [`TechHandPro/crew-chief-middleware`](https://github.com/TechHandPro/crew-chief-middleware)
  — OpenAPI → MCP generator. CLI/MCP only; it must not grow a UI. This console
  is the human-facing companion and reads through the connected MCP endpoint.
