# Issue tracker contract

The issue tracker for this repository is **TNT (TechHand Network Toolkit)**. Not
GitHub Issues, not Linear, not Jira, not scratch files.

## Session start

1. `tnt_resolve_repo(repo_slug="TechHandPro/crew-chief-ops-console")` to map
   this repository to its TNT organization and work ticket.
2. Read [`docs/TNT_TICKET.md`](../TNT_TICKET.md) for the pinned ticket (#331).
3. `tnt_resolve_work_ticket(allow_create=false)`.
4. Pass `git_repository_id` (or `ticket_id`) on every organization-scoped MCP
   write. Organization context does not persist between tool calls.

Never post platform work to a client ticket, or client work to a platform
ticket. This console is a **platform** deliverable on org 1 (TechHand Pro
Solutions).

## Current state

- Work ticket: **#331** — *Ops Console: audit surface (who/what + deep links)*.
  Fixtures-only preview; live SoR audit and production deep links held until
  Challenger **#332** / **#336**. PR #6 stays draft.
- Shipped: **#342** public README scrub; **#340** Overview FastMCP unwrap;
  **#338** public pack vs dogfood scrub; **#325** mobile list overflow;
  **#322** generic public asset; **#323** org-pin + FastMCP unwrap; **#320**
  v1 read-only console.
- Public pack contract: [`docs/public-pack.md`](../public-pack.md).
- Portable deploy skill: [`docs/DEPLOY_OPS_CONSOLE.md`](../DEPLOY_OPS_CONSOLE.md)
  — **not WSL2**. (A) Docker Desktop + localhost; (B) optional `ops.local`;
  (C) VPS+Caddy (TPS example only). Cross **#331**. Soft **#318** parked.
  Publish stays Jeremiah.
- Repository link: **linked** on org 1 as of 2026-09-17,
  `git_repository_id=12`. Pass it on organization-scoped writes. Console reads
  still do not depend on it: the adapter pins `organization_id` on every list.

## Related repositories

- [`TechHandPro/crew-chief-middleware`](https://github.com/TechHandPro/crew-chief-middleware)
  — OpenAPI → MCP generator. CLI/MCP only; it must not grow a UI. This console
  is the human-facing companion and reads through the connected MCP endpoint.
