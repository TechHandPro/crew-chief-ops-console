---
name: deploy-ops-console
description: >-
  Deploy the CREW CHIEF Ops Console behind Docker Compose and Caddy (or nginx):
  DNS, vaulted MCP URL + token (orange/secret only — never chat), fail-closed
  if MCP is missing, and a tickets/docs/vault smoke. TNT #338. Cross #331.
---

# Deploy Ops Console

Portable skill for a **CREW CHIEF** public pack. Not tribal knowledge. Not a
TechHand-only runbook.

| | |
|---|---|
| **Ticket** | TNT **#338** (public pack vs dogfood scrub; child of **#329**) |
| **Cross** | **#331** is the later audit-surface slice. This skill ships the console; it does not implement #331. |
| **Parked** | Soft **#318**. Contest/template publish stays Jeremiah. |
| **Scrub** | Public defaults stay generic. See [`public-pack.md`](public-pack.md). |

Use this when seating a new console, restaging the template, or handing deploy
to an operator who has never seen the dogfood host.

## Deny-list (still required)

The image and the public pack must boot without any of:

1. Vault secrets or secret-bearing fields
2. Production vault/ticket paths (demo fixtures use ids **9000–9999**)
3. Real client / customer names
4. Private operator hostnames as required defaults (`ops.techhand.pro`,
   `ai.techhand.pro`, any `*.techhand.pro`)

Snippets below use `ops.example` and `tnt.example`. Substitute **your**
hostnames from the vault at apply time. The dogfood path at the end is an
**example**, not a prerequisite.

## Fail-closed if MCP is missing

Production (`NODE_ENV=production`) refuses to serve the console when the live
adapter is incomplete. `proxy.ts` and `GET /api/health` both return **HTTP
503** with the missing variable name. Do not set `SOR_PROVIDER=fixtures` on a
live hostname unless you intend a public demo.

Required for `SOR_PROVIDER=tnt-mcp`:

| Variable | Why it fails closed |
|----------|---------------------|
| `TNT_MCP_URL` | No default hostname (#338). Must be an https URL (loopback http only). |
| `TNT_WEB_BASE_URL` | Deep links. Same rule. Must not embed credentials in the URL. |
| `TNT_MCP_API_KEY` | Bearer to the MCP endpoint. |
| `TNT_ORGANIZATION_ID` | Tenant pin on every list. |
| `OPS_CONSOLE_ACCESS_TOKEN` | Operator gate (≥16 chars) unless `OPS_CONSOLE_ALLOW_ANONYMOUS=true` behind an identity-aware proxy. |
| `OPS_CONSOLE_SESSION_SECRET` | HMAC for the session cookie (≥32 chars) when a token is set. |

There is no baked-in MCP host in the image. A missing URL is a
misconfiguration, not a silent fall-through to dogfood.

## Secrets: orange / vault only — never chat

`TNT_MCP_URL`, `TNT_MCP_API_KEY`, `OPS_CONSOLE_ACCESS_TOKEN`, and
`OPS_CONSOLE_SESSION_SECRET` are secrets (the URL names a private SoR).

1. **Orange-prompt** the operator (or pull from the org vault). Do not ask
   for the key in Slack, SMS, ticket comments, or chat.
2. Store the MCP URL + organization API key as a vault entry. Reveal once
   into the host secret store (`/run/secrets/…`, systemd `EnvironmentFile`
   mode `0400`, Docker secret, or your secret manager).
3. Inject at **runtime** only. The Docker build copies no `.env`. Do not
   write tokens into `tools.json`, `mcp.json`, Compose files, Caddyfiles, or
   git.
4. Key scopes (read only): `mcp:tickets:read`, `mcp:docs:read`,
   `mcp:vault:read`. Add `mcp:repo:resolve` only if you set a repository pin.
   The MCP actor needs `page:vault` for vault **metadata**. This console never
   calls reveal.
5. Rotate in the vault; restart the container. Do not paste the new secret
   into a ticket to “speed up” a deploy.

Generate the console gate locally (operator laptop), then vault it:

```bash
openssl rand -base64 24    # OPS_CONSOLE_ACCESS_TOKEN
openssl rand -hex 32       # OPS_CONSOLE_SESSION_SECRET
```

## Docker Compose

From the repository root. Build context is this repo. Secrets live in a
gitignored env file the Compose file only *references*.

```gitignore
# already implied; never commit these
.env
.env.production
compose.env
```

`compose.env` (create on the host from the vault; not in git):

```bash
NODE_ENV=production
SOR_PROVIDER=tnt-mcp
TNT_MCP_URL=https://tnt.example/mcp
TNT_WEB_BASE_URL=https://tnt.example
TNT_MCP_API_KEY=
TNT_ORGANIZATION_ID=
OPS_CONSOLE_ACCESS_TOKEN=
OPS_CONSOLE_SESSION_SECRET=
OPS_CONSOLE_BRAND_NAME=CREW CHIEF Ops Console
OPS_CONSOLE_BRAND_TAGLINE=Audit what the crew writes
```

`compose.yaml`:

```yaml
services:
  ops-console:
    build: .
    image: crew-chief-ops-console:local
    restart: unless-stopped
    env_file:
      - compose.env
    environment:
      NODE_ENV: production
      PORT: "3000"
      HOSTNAME: 0.0.0.0
    expose:
      - "3000"
    networks:
      - edge
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - edge
    depends_on:
      ops-console:
        condition: service_healthy

networks:
  edge:

volumes:
  caddy_data:
  caddy_config:
```

```bash
# 1. vault → compose.env on the host (orange/secret only)
# 2. write Caddyfile (next section) with YOUR hostname
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3000/api/health   # from the console container network
```

The image is `output: "standalone"`, non-root, and does not need secrets at
**build** time. `GET /api/health` reports `{ status, provider, access,
readOnly }` and does **not** call MCP — an SoR outage must not flap the
container healthcheck. After health is `ok`, the smoke below proves MCP.

## Caddy / TLS

Caddy terminates TLS and reverse-proxies to the Compose service. It already
sets `X-Forwarded-For` / `X-Forwarded-Proto`. Production cookies are
`Secure` + `HttpOnly` + `SameSite=Lax`; the browser must see https.

`Caddyfile`:

```caddyfile
ops.example {
	encode gzip
	reverse_proxy ops-console:3000
}
```

Let’s Encrypt needs the DNS checklist below to resolve to this host before
the first handshake. For an internal CA or tailnet:

```caddyfile
ops.example {
	tls internal
	reverse_proxy ops-console:3000
}
```

### nginx alternative

```nginx
server {
	listen 443 ssl http2;
	server_name ops.example;
	# ssl_certificate / ssl_certificate_key from your vaulted cert material

	location / {
		proxy_pass http://127.0.0.1:3000;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_set_header X-Real-IP $remote_addr;
	}
}
```

Redirect :80 → :443. Do not publish port 3000 on the public interface.

## DNS checklist

Do this **before** `docker compose up` if Caddy is obtaining public
certificates.

1. Choose a console hostname that is **not** the SoR hostname
   (`ops.example` ≠ `tnt.example`).
2. `A` / `AAAA` (or `CNAME` to the edge) for the console hostname only.
3. Confirm from off-box: `dig +short ops.example` matches the intended
   address. Wait out TTL.
4. Optional: `CAA` allowing your ACME account; otherwise first-issue can
   fail closed at the CA.
5. Do **not** put the MCP URL or API key in a DNS TXT, chat, or ticket.
6. The console host must **egress https** to `TNT_MCP_URL`. The browser
   never talks to MCP.
7. If you use an identity-aware proxy in front of Caddy, you may set
   `OPS_CONSOLE_ALLOW_ANONYMOUS=true` **only** when that proxy already
   gates the hostname. Default is the console’s own token gate.

## Smoke: tickets / documents / vault

Sign in with the vaulted operator token (never a chat-pasted value).

| # | Check | Pass |
|---|--------|------|
| 1 | `GET /api/health` | `status=ok`, `provider=tnt-mcp`, `access=token`, `readOnly=true`. **503** naming a variable is a fail (MCP/config missing). |
| 2 | `/sign-in` then overview | Branding from env. Connection badge is **not** “Demo dataset”. Org pin visible. |
| 3 | `/tickets` → one detail | List renders; detail markdown + comments; deep link goes to `TNT_WEB_BASE_URL`. |
| 4 | `/documents` → one detail | List + rendered markdown (HTML skipped). |
| 5 | `/vault` → one detail | Metadata only: name, username, `hasPassword` / OTP flags. **No** password, OTP seed, or reveal control. |
| 6 | Deny-list | Public pack / this deploy still has no committed secrets, client names, or required `*.techhand.pro` defaults. |

Fixtures-only demo (`SOR_PROVIDER=fixtures`) is for `localhost` / contest
preview. Do not smoke a live hostname against fixtures and call it seated.

## Dogfood example path only

TechHand’s private seating — TPS host + Caddy + MANAGER merge at
`ops.techhand.pro` — is **one** operator’s env-only path. It is not the
skill, not a Compose default, and not required to evaluate the public pack.

To reproduce that *shape* elsewhere, set env (never commit):

```bash
SOR_PROVIDER=tnt-mcp
TNT_MCP_URL=https://<vaulted-mcp-host>/mcp
TNT_WEB_BASE_URL=https://<vaulted-web-host>
TNT_ORGANIZATION_ID=<vaulted-org-pin>
OPS_CONSOLE_BRAND_NAME=<operator label>
# keys from vault / orange-prompt only
```

`npm run dev` with no env remains the scrubbed public pack
(`http://localhost:3000`, fictional fixtures).

## Out of scope

- Implementing the #331 audit surface
- MCP factory loop (#330)
- Revealing vault secrets from the console
- Contest/template publish (Jeremiah)
- Soft #318 (MCP SDK pin / runtime migrate)
