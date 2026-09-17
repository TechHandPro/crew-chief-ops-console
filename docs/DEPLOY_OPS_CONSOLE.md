---
name: deploy-ops-console
description: >-
  Seat the CREW CHIEF Ops Console. Default: Docker Desktop on Windows + a
  localhost port. Optional: per-machine hosts → ops.local. Later: VPS+Caddy+
  public DNS (TechHand TPS = example only). Do not default to WSL2. Vaulted
  MCP URL + token (orange/secret only — never chat). Fail-closed if MCP is
  missing. Smoke tickets/docs/vault. TNT #338. Cross #331.
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

## Tracks (do not default to WSL2)

Start at **A**. Do **not** open an Ubuntu WSL2 shell, a Linux VM, or
“install Docker inside WSL” as the documented first path. Docker Desktop for
Windows is the operator workflow. If Desktop happens to use a WSL2 backend,
that is an implementation detail — operators still build and publish from
Windows (PowerShell or Docker Desktop).

| Track | When | How you reach the UI |
|-------|------|----------------------|
| **A — default** | First seat, laptop, contest preview, most operators | Docker Desktop (Windows) + **localhost port** → `http://127.0.0.1:3000` |
| **B — optional** | Same machine or LAN, nicer hostname | Per-machine `hosts` → `ops.local` (127.0.0.1 or a LAN IP) |
| **C — later** | Shared / public hostname | VPS + Caddy + public DNS. TechHand TPS + `ops.techhand.pro` is **one example**, not the skill. |

macOS/Linux Docker Engine operators follow the same Compose as A (localhost
port). Still skip WSL2-as-workflow.

## Deny-list (still required)

The image and the public pack must boot without any of:

1. Vault secrets or secret-bearing fields
2. Production vault/ticket paths (demo fixtures use ids **9000–9999**)
3. Real client / customer names
4. Private operator hostnames as required defaults (`ops.techhand.pro`,
   `ai.techhand.pro`, any `*.techhand.pro`)

Snippets use `tnt.example` and `ops.local`. Substitute **your** SoR values
from the vault at apply time.

## Fail-closed if MCP is missing

When `SOR_PROVIDER=tnt-mcp`, the process refuses to start a live adapter
without a complete MCP pin. In `NODE_ENV=production`, `proxy.ts` and
`GET /api/health` return **HTTP 503** naming the missing variable. A missing
URL is a misconfiguration, not a silent fall-through to dogfood.

| Variable | Why it fails closed |
|----------|---------------------|
| `TNT_MCP_URL` | No default hostname (#338). https required (loopback http only). |
| `TNT_WEB_BASE_URL` | Deep links. Same rule. No credentials in the URL. |
| `TNT_MCP_API_KEY` | Bearer to the MCP endpoint. |
| `TNT_ORGANIZATION_ID` | Tenant pin on every list. |
| `OPS_CONSOLE_ACCESS_TOKEN` | Required in **production** (≥16 chars) unless `OPS_CONSOLE_ALLOW_ANONYMOUS=true` behind an identity-aware proxy. |
| `OPS_CONSOLE_SESSION_SECRET` | Required in production when a token is set (≥32 chars). |

Track **A/B** over **HTTP**: production session cookies are `Secure`. They
will not stick on `http://127.0.0.1` or `http://ops.local`. For a first HTTP
seat use `NODE_ENV=development` (MCP vars still required when
`SOR_PROVIDER=tnt-mcp`). Use track **C** (or local TLS) when you want
production cookies.

Do not set `SOR_PROVIDER=fixtures` on a shared hostname unless you intend a
public demo.

## Secrets: orange / vault only — never chat

`TNT_MCP_URL`, `TNT_MCP_API_KEY`, `OPS_CONSOLE_ACCESS_TOKEN`, and
`OPS_CONSOLE_SESSION_SECRET` are secrets (the URL names a private SoR).

1. **Orange-prompt** the operator (or pull from the org vault). Do not ask
   for the key in Slack, SMS, ticket comments, or chat.
2. Store the MCP URL + organization API key as a vault entry. Reveal once
   into a gitignored `compose.env` on that machine (mode `0400`).
3. Inject at **runtime** only. The Docker build copies no `.env`. Do not
   write tokens into Compose files, Caddyfiles, `mcp.json`, or git.
4. Key scopes (read only): `mcp:tickets:read`, `mcp:docs:read`,
   `mcp:vault:read`. Add `mcp:repo:resolve` only if you set a repository pin.
   The MCP actor needs `page:vault` for vault **metadata**. This console never
   calls reveal.
5. Rotate in the vault; recreate the container. Do not paste the new secret
   into a ticket.

```powershell
# Windows (Docker Desktop / PowerShell) — then vault the values
openssl rand -base64 24    # OPS_CONSOLE_ACCESS_TOKEN
openssl rand -hex 32       # OPS_CONSOLE_SESSION_SECRET
```

## Track A — Docker Desktop Windows + localhost port (default)

Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/).
Use the Desktop app (and PowerShell). Do not switch the skill to “open WSL2
and clone there.”

From the repository root. Secrets live in a gitignored env file Compose only
*references*.

```gitignore
.env
.env.production
compose.env
```

`compose.env` (create on the Windows host from the vault; not in git):

```bash
NODE_ENV=development
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

`compose.yaml` — publish **localhost**, no Caddy:

```yaml
services:
  ops-console:
    build: .
    image: crew-chief-ops-console:local
    restart: unless-stopped
    env_file:
      - compose.env
    environment:
      PORT: "3000"
      HOSTNAME: 0.0.0.0
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

Binding `127.0.0.1:3000` keeps the port off the LAN. Use `3000:3000` only
when track B needs another machine to reach this host.

```powershell
# 1. vault → compose.env (orange/secret only — never chat)
docker compose up -d --build
docker compose ps
curl.exe -fsS http://127.0.0.1:3000/api/health
# browser: http://127.0.0.1:3000
```

The image is `output: "standalone"`, non-root, and does not need secrets at
**build** time. `GET /api/health` reports `{ status, provider, access,
readOnly }` and does **not** call MCP — an SoR outage must not flap the
container healthcheck. After health is `ok`, the smoke below proves MCP.

Fixtures-only (no vault): `SOR_PROVIDER=fixtures` and drop the `TNT_*`
lines, still on `http://127.0.0.1:3000`.

Equivalent without Compose:

```powershell
docker build -t crew-chief-ops-console .
docker run --rm -p 127.0.0.1:3000:3000 --env-file compose.env crew-chief-ops-console
```

## Track B — optional per-machine hosts → ops.local

Same container as A. Add a **hosts** line on each machine that should type
`http://ops.local:3000` instead of `http://127.0.0.1:3000`. This is not
public DNS and not a required default.

On the **console machine** (Docker Desktop host):

```
127.0.0.1  ops.local
```

On **another LAN machine**, use the console host’s LAN IP (not a public
dogfood hostname):

```
192.168.x.x  ops.local
```

Windows hosts file: `C:\Windows\System32\drivers\etc\hosts` (edit as
Administrator). macOS/Linux: `/etc/hosts`. Flush the DNS cache after
editing. Publish `3000:3000` (not loopback-only) if LAN clients must
connect.

`ops.local` is a per-machine alias. Do not put it in the public pack as a
required hostname, and do not treat it as TechHand dogfood.

## Track C — VPS + Caddy + public DNS (example path only)

Use this when you want a shared https hostname. TechHand’s TPS host + Caddy
+ MANAGER merge at `ops.techhand.pro` is **one** operator’s env-only seating.
It is not the Compose default and not required to evaluate the public pack.

### Docker Compose (edge)

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

Set `NODE_ENV=production` in `compose.env` on this track so the access token
and `Secure` cookie are required.

### Caddy / TLS

Caddy terminates TLS and reverse-proxies. It sets `X-Forwarded-For` /
`X-Forwarded-Proto`. Production cookies are `Secure` + `HttpOnly` +
`SameSite=Lax`; the browser must see https.

```caddyfile
ops.example {
	encode gzip
	reverse_proxy ops-console:3000
}
```

Let’s Encrypt needs the DNS checklist below to resolve before the first
handshake. For an internal CA or tailnet:

```caddyfile
ops.example {
	tls internal
	reverse_proxy ops-console:3000
}
```

nginx alternative:

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

### DNS checklist (track C only)

Do this **before** `docker compose up` if Caddy is obtaining public
certificates.

1. Choose a console hostname that is **not** the SoR hostname
   (`ops.example` ≠ `tnt.example`).
2. `A` / `AAAA` (or `CNAME` to the VPS) for the console hostname only.
3. Confirm from off-box: `dig +short ops.example` matches the intended
   address. Wait out TTL.
4. Optional: `CAA` allowing your ACME account; otherwise first-issue can
   fail closed at the CA.
5. Do **not** put the MCP URL or API key in a DNS TXT, chat, or ticket.
6. The VPS must **egress https** to `TNT_MCP_URL`. The browser never talks
   to MCP.
7. If an identity-aware proxy already gates the hostname, you may set
   `OPS_CONSOLE_ALLOW_ANONYMOUS=true`. Default is the console’s own token
   gate.

## Smoke: tickets / documents / vault

Same checks on every track. Sign in with the vaulted operator token (never
a chat-pasted value).

| # | Check | Pass |
|---|--------|------|
| 1 | `GET /api/health` | `status=ok`. Live seat: `provider=tnt-mcp`. **503** naming a variable is a fail (MCP/config missing). |
| 2 | `/sign-in` then overview | Branding from env. Live seat: badge is **not** “Demo dataset”; org pin visible. |
| 3 | `/tickets` → one detail | List + markdown + comments; deep link uses `TNT_WEB_BASE_URL`. |
| 4 | `/documents` → one detail | List + rendered markdown (HTML skipped). |
| 5 | `/vault` → one detail | Metadata only. **No** password, OTP seed, or reveal control. |
| 6 | Deny-list | No committed secrets, client names, or required `*.techhand.pro` defaults. |

Track A URL: `http://127.0.0.1:3000`. Track B: `http://ops.local:3000`.
Track C: `https://<your-public-host>`.

Do not smoke a public hostname against fixtures and call it seated.

## Dogfood example (track C shape only)

TechHand TPS + Caddy + MANAGER merge at `ops.techhand.pro` is an **example**
of track C. Reproduce the *shape* elsewhere with env (never commit):

```bash
NODE_ENV=production
SOR_PROVIDER=tnt-mcp
TNT_MCP_URL=https://<vaulted-mcp-host>/mcp
TNT_WEB_BASE_URL=https://<vaulted-web-host>
TNT_ORGANIZATION_ID=<vaulted-org-pin>
OPS_CONSOLE_BRAND_NAME=<operator label>
# keys from vault / orange-prompt only
```

`npm run dev` with no env remains the scrubbed public pack
(`http://localhost:3000`, fictional fixtures) and is not a deploy track.

## Out of scope

- WSL2 as the default operator path
- Implementing the #331 audit surface
- MCP factory loop (#330)
- Revealing vault secrets from the console
- Contest/template publish (Jeremiah)
- Soft #318 (MCP SDK pin / runtime migrate)
