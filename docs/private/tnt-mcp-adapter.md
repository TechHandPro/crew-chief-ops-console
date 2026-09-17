# Optional reference: in-tree MCP adapter (`tnt-mcp`)

This note is **not** part of the public pack. Contest and import readers
should stay on the root `README.md` (fixtures + `SystemOfRecord`) and skip
this file.

`src/lib/sor/tnt-mcp/` is one MCP client that already implements
`SystemOfRecord`. It is an example, not a required integration. Any other
MCP server or read API can replace it by following the five steps in the
README.

A shorter pointer lives in the
[public-pack optional-reference appendix](../public-pack.md#appendix-optional-reference).

## When you actually want this adapter

```bash
cp .env.example .env.local
# SOR_PROVIDER=tnt-mcp
# TNT_MCP_URL, TNT_WEB_BASE_URL, TNT_MCP_API_KEY, TNT_ORGANIZATION_ID
# SOR_SYSTEM_NAME defaults to the adapter's own name unless you override it
npm run dev
```

The adapter speaks Streamable HTTP to a FastMCP endpoint and sends the
organization API key as `Authorization: Bearer <key>`, the same shape Cursor
Desktop and Cursor Automations use. Keys are created in the system of record
→ Organization → **API Keys**.

- **Scopes.** Read scopes only: `mcp:tickets:read`, `mcp:docs:read`,
  `mcp:vault:read`; add `mcp:repo:resolve` if you set a repository pin, and
  `mcp:platform:cross_org` for a platform key that serves several client
  organizations. Grant scopes on an existing key without rotating it.
- **Actor permission.** Vault metadata additionally requires the MCP actor
  user behind the key to hold `page:vault`. If vault listings fail with a
  `page:vault` error, the fix is on the host, not in this app.
- **Organization pin (required for this adapter).** `TNT_ORGANIZATION_ID` is
  sent as `organization_id` on **every** ticket, document, and vault list.
  Lists therefore work without a linked GitHub repository and without a prior
  `tnt_resolve_repo`, and the console can never list another tenant by
  accident.
- **Repository pin (optional, informational).** When `TNT_GIT_REPOSITORY_ID`
  / `TNT_REPO_SLUG` are set, the adapter calls `tnt_resolve_repo` once per
  session and shows the linked repository in the connection badge. If the
  server reports the repository as not linked (`action_required: link_repo`),
  the console keeps reading through the organization pin and displays a
  routing note; only a 401 or an unreachable endpoint blocks the connection.
- **Session loss.** If the server forgets the session (restart, expiry) the
  client reconnects and retries the read once.
- **Allow-list.** The client can only call `tnt_resolve_repo`,
  `tnt_list_tickets`, `tnt_get_ticket`, `tnt_list_documents`,
  `tnt_get_document`, `tnt_list_vault_entries`. Adding a name to that list
  is a code change reviewers will see.
- **Failure envelopes.** The server reports tool failures either as
  `{ success: false, error }` or as `{ error, action_required }` with no
  `success` key. Both surface as "the system of record reported an error"
  with the server's own message; a payload that matches neither shape is
  rejected as `bad_response` rather than rendered partially.

The key lives only in the server process environment. It is never sent to the
browser, never logged, and never part of an error message.

Reusable client: `src/lib/sor/tnt-mcp/client.ts` (Bearer auth, Streamable
HTTP, single lazy session, reconnect-once). Integration coverage:
`src/lib/sor/tnt-mcp/provider.integration.test.ts`.

## TechHand dogfood (env-only)

A private instance is a deployment of this template, not a fork of the
defaults. Values are never committed. Example shape:

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

Container example when this adapter is chosen:

```bash
docker run --rm -p 3000:3000 \
  -e SOR_PROVIDER=tnt-mcp \
  -e TNT_MCP_URL=https://tnt.example/mcp -e TNT_WEB_BASE_URL=https://tnt.example \
  -e TNT_MCP_API_KEY=… -e TNT_ORGANIZATION_ID=1 \
  -e OPS_CONSOLE_ACCESS_TOKEN=… -e OPS_CONSOLE_SESSION_SECRET=… \
  crew-chief-ops-console
```
