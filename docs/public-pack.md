# Public pack vs dogfood

This repository is two products that share one codebase. They must not be
bundled, and they must not leak into each other. TNT **#338** (child of epic
**#329**) is the scrub dry-run that proves the split. It does **not** depend
on **#330** (MCP factory) or **#331** (audit surface). Soft **#318** stays
parked. Publish of any contest/template restage stays Jeremiah.

| Surface | What it is | How it is configured |
|---------|------------|----------------------|
| **Public pack** | Contest/template Ops Console: generic CREW CHIEF branding, fictional fixtures, pluggable system-of-record adapters. | Zero credentials. `SOR_PROVIDER` defaults to `fixtures`. |
| **Dogfood** | The operator's private live instance (hostname `ops.techhand.pro`). Hard TechHand stack: TNT MCP, org pin, branding. | Environment only. Never a required default in this repo. |

Companion generator: [`crew-chief-middleware`](https://github.com/TechHandPro/crew-chief-middleware)
(CLI/MCP only). Its public examples may mention Meta Graph; they must not
embed tokens or private hostnames as required defaults. Middleware follow-ups
from this audit are noted at the bottom — they are not part of this PR.

## Deny-list (written check)

The public pack — `README.md`, `.env.example`, `src/lib/config.ts` defaults,
`src/lib/sor/fixtures/`, UI copy under `src/app/` and `src/components/`, and
`public/` — must contain **none** of the following as required values,
defaults, or demo data:

1. **Vault secrets or secret-bearing fields.** No passwords, OTP seeds, API
   tokens, PEM blocks, or reveal-tool payloads. Fixture vault rows are
   metadata only (`hasPassword` / `hasOtp` flags).
2. **Vault paths or production record identifiers.** Demo ticket, document,
   vault, comment, and related-record ids live in **9000–9999** so they
   cannot be read as production TNT vault/ticket paths.
3. **Real client / customer names.** The demo organization is fictional and
   marked `(demo)`. Fixture people and hosts use `.example` / `.example.test`.
4. **Private operator hostnames** — including `ops.techhand.pro`,
   `ai.techhand.pro`, and any other `*.techhand.pro` name — as required
   defaults. A dogfood deploy sets `TNT_MCP_URL`, `TNT_WEB_BASE_URL`, and
   branding through env. The public pack must boot without those names.

Allowed in the public pack: the words **TNT** / **TechHand Network Toolkit**
as the *name of the reference adapter*, and the public GitHub org
`TechHandPro` in clone URLs. Those are not hostnames and not required
endpoints.

This document is the operator note that *may* name the dogfood hostname so
the split is explicit. The automated check does **not** scan this file,
[`DEPLOY_OPS_CONSOLE.md`](DEPLOY_OPS_CONSOLE.md) (portable seating skill;
dogfood path is an example only), `docs/TNT_TICKET.md`, or `docs/agents/`.

## Automated proof

`src/lib/public-pack.denylist.test.ts` (run by `npm test`) is the dry-run
proof. It fails CI if the public pack regresses any deny-list rule.

```bash
npm test -- src/lib/public-pack.denylist.test.ts
```

## Dogfood (env-only)

A private instance is a deployment of this template, not a fork of the
defaults. Example shape (values never committed):

```bash
SOR_PROVIDER=tnt-mcp
TNT_MCP_URL=https://<private-mcp-host>/mcp
TNT_WEB_BASE_URL=https://<private-web-host>
TNT_MCP_API_KEY=…          # organization API key; never in git
TNT_ORGANIZATION_ID=…      # required pin
OPS_CONSOLE_BRAND_NAME=…   # operator label
OPS_CONSOLE_BRAND_TAGLINE=…
OPS_CONSOLE_ACCESS_TOKEN=…
OPS_CONSOLE_SESSION_SECRET=…
```

TechHand's dogfood hostname is `ops.techhand.pro`. It is **not** a default,
not a fixture, and not required to evaluate the public pack
(`npm run dev` → `http://localhost:3000`, demo dataset).

## Middleware follow-up (not this PR)

Public middleware examples (`examples/tickets-*`,
`examples/generated/tickets_mcp`, `examples/generated/meta_graph_mcp/.env.example`)
do **not** embed tokens or private hostnames. Graph defaults to
`https://graph.facebook.com` (public API).

Follow-up (keep off this PR, keep off **#330** / **#331**):
`examples/meta-graph-pages.md` and the middleware README still describe a
TechHand-only operator path (TNT vault + orange-prompt Jeremiah + SOCIAL /
Grok Bot). That copy should be restated as an optional host-specific
runbook, not as the public template contract.

## Deploy skill

Portable seating lives in [`DEPLOY_OPS_CONSOLE.md`](DEPLOY_OPS_CONSOLE.md).
**Do not default to WSL2.** Tracks: (A) Docker Desktop Windows + localhost
port; (B) optional `hosts` → `ops.local`; (C) VPS+Caddy+public DNS (TechHand
TPS / `ops.techhand.pro` = example only). Vaulted MCP URL + token, smoke,
fail-closed. Cross **#331**: that ticket is the later audit surface; this
skill only seats the console.

## Out of scope here

- MCP factory loop (**#330**)
- Ops Console audit surface (**#331**)
- Contest/template publish (Jeremiah)
- Soft **#318** (mcp pin / FastMCP migrate)
