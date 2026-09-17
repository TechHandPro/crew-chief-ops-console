# Public pack vs dogfood

This repository is two products that share one codebase. They must not be
bundled, and they must not leak into each other. The public-pack deny-list is
the scrub that proves the split. It does **not** depend on the MCP factory
or audit-surface tickets. Soft parking of those slices stays in effect.
Publish of any contest/template restage stays Jeremiah.

| Surface | What it is | How it is configured |
|---------|------------|----------------------|
| **Public pack** | Contest/template Ops Console: generic CREW CHIEF branding, fictional fixtures, pluggable system-of-record adapters. | Zero credentials. `SOR_PROVIDER` defaults to `fixtures`. |
| **Dogfood** | The operator's private live instance. A specific MCP stack, org pin, and branding. | Environment only. Never a required default in this repo. |

Companion generator: [`crew-chief-middleware`](https://github.com/TechHandPro/crew-chief-middleware)
(CLI/MCP only). Its public examples may mention a vendor API; they must not
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
   cannot be read as production vault/ticket paths.
3. **Real client / customer names.** The demo organization is fictional and
   marked `(demo)`. Fixture people and hosts use `.example` / `.example.test`.
4. **Private operator hostnames** — including `ops.techhand.pro`,
   `ai.techhand.pro`, and any other `*.techhand.pro` name — as required
   defaults. A dogfood deploy sets adapter URLs and branding through env.
   The public pack must boot without those names.
5. **README prose that makes a vendor system of record feel required.** The
   root `README.md` must lead with fixtures and the `SystemOfRecord`
   interface. It may keep one short **optional** example that any SoR/MCP
   can plug in. It must not: name TNT / TechHand Network Toolkit as the
   product path; list `TNT_*` environment variables as the deploy story;
   cite tracker ticket ids (`TNT #338`, `#331`, …); point at
   `docs/agents/issue-tracker.md` or `docs/TNT_TICKET.md` as a primary
   onboarding path; or default `SOR_SYSTEM_NAME` to `TNT`.

Allowed in `.env.example` and `src/lib/config.ts`: the words **TNT** /
**TechHand Network Toolkit** as the *name of one optional example adapter*,
and the public GitHub org `TechHandPro` in clone URLs. Those are not
hostnames and not required endpoints. They are **not** allowed in README
prose (rule 5).

This document is the operator note that *may* name the dogfood hostname so
the split is explicit. The automated check does **not** scan this file,
[`DEPLOY_OPS_CONSOLE.md`](DEPLOY_OPS_CONSOLE.md) (portable seating skill;
dogfood path is an example only), [`private/`](private/) (optional adapter
runbooks), `docs/TNT_TICKET.md`, or `docs/agents/`.

## Automated proof

`src/lib/public-pack.denylist.test.ts` (run by `npm test`) is the dry-run
proof. It fails CI if the public pack regresses any deny-list rule.

```bash
npm test -- src/lib/public-pack.denylist.test.ts
```

## Deploy skill

Portable seating lives in [`DEPLOY_OPS_CONSOLE.md`](DEPLOY_OPS_CONSOLE.md).
**Do not default to WSL2.** Tracks: (A) Docker Desktop Windows + localhost
port; (B) optional `hosts` → `ops.local`; (C) VPS+Caddy+public DNS (a
private TPS hostname = example only). Vaulted MCP URL + token, smoke,
fail-closed. The later audit-surface ticket is out of scope here; this
skill only seats the console.

## Out of scope here

- MCP factory loop
- Ops Console audit surface
- Contest/template publish (Jeremiah)
- Soft-parked mcp pin / FastMCP migrate work

## Middleware follow-up (not this PR)

Public middleware examples (`examples/tickets-*`,
`examples/generated/tickets_mcp`, `examples/generated/meta_graph_mcp/.env.example`)
do **not** embed tokens or private hostnames. Graph defaults to
`https://graph.facebook.com` (public API).

Follow-up (keep off this PR): `examples/meta-graph-pages.md` and the
middleware README should treat Meta Graph as one vendor example and keep
vault / orange-prompt notes as optional operator copy, not the public
template contract.

---

## Appendix: optional reference

**Skip this appendix** unless you are connecting the in-tree MCP example or
a private dogfood host. It is not required to evaluate, import, or contest
the console.

### One included MCP client

`src/lib/sor/tnt-mcp/` implements `SystemOfRecord` over Streamable HTTP +
Bearer. It is one adapter, not the product. Operator runbook (scopes, org
pin, allow-list, session retry, TechHand dogfood hostname):
[`private/tnt-mcp-adapter.md`](private/tnt-mcp-adapter.md).

`.env.example` still documents that adapter's `TNT_*` variables so the
example can be wired without reading source. Those names are opt-in; the
default `SOR_PROVIDER` is `fixtures`.

### Dogfood (env-only)

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
