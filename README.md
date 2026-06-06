# AREDL Coordinator

A coordinator for completing every level on the [All Rated Extreme Demons List](https://aredl.net). This repository contains deployment-ready boilerplate: a Preact frontend on GitHub Pages and a Rust Cloudflare Worker backend with D1 persistence.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Preact, Vite, TypeScript, CSS custom properties |
| Backend | Cloudflare Workers (Rust / workers-rs) |
| Database | Cloudflare D1 (SQLite) |
| CI/CD | GitHub Actions |

## Project structure

```
frontend/   Preact app (GitHub Pages)
backend/    Rust Worker + D1 migrations
```

## One-time setup

### 1. Cloudflare

1. Create a free [Cloudflare account](https://dash.cloudflare.com/sign-up).
2. Install Wrangler locally: `npm install -g wrangler` (or use `npx wrangler`).
3. Log in: `wrangler login`
4. Create the D1 database:

   ```bash
   cd backend
   npm install
   npx wrangler d1 create aredl-coordinator
   ```

5. Copy the `database_id` from the output into [`backend/wrangler.toml`](backend/wrangler.toml).
6. Update `FRONTEND_ORIGIN` and `FRONTEND_BASE_PATH` in `wrangler.toml` to match your GitHub Pages URL:

   ```
   FRONTEND_ORIGIN = "https://nshbeatsthearedl.christmas"
   FRONTEND_BASE_PATH = ""
   ```

   For a project site at `https://<github-username>.github.io/<repo-name>/` instead, use the host for `FRONTEND_ORIGIN` and set `FRONTEND_BASE_PATH = "/<repo-name>"`.

7. Apply migrations locally (optional):

   ```bash
   npx wrangler d1 migrations apply DB --local
   ```

### 2. GitHub

1. Push this repository to GitHub (public repo for free Pages).
2. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN` — Cloudflare dashboard → My Profile → API Tokens. Use the "Edit Cloudflare Workers" template for deploys, and add **Zone → DNS Edit** plus **Zone → Zone Settings Edit** for the custom domain (required by the Enforce HTTPS workflow).
   - `CLOUDFLARE_ACCOUNT_ID` — Cloudflare dashboard sidebar
   - `DISCORD_CLIENT_ID` — same value as production Discord OAuth (see §4)
   - `DISCORD_CLIENT_SECRET` — same value as production Discord OAuth (see §4)
   - `DISCORD_BOT_TOKEN` — bot token for guild role checks (see §4)
   - `JWT_SECRET` — same value as production (`openssl rand -hex 32`)

   GitHub Actions uploads the Discord/JWT secrets on every backend deploy. Without them, a push to `main` deploys a Worker version with no OAuth bindings.
3. Enable GitHub Pages: Settings → Pages → Source: **Deploy from a branch** → `gh-pages` / `/ (root)`
4. Enable workflow permissions: Settings → Actions → General → **Read and write permissions**
5. Custom domain HTTPS (`nshbeatsthearedl.christmas`):
   - Point the domain at Cloudflare and add GitHub Pages DNS records (four `A` records to GitHub Pages IPs for the apex, or a `CNAME` to `<username>.github.io` for `www`).
   - In Cloudflare: set SSL/TLS mode to **Full** (never **Flexible** with GitHub Enforce HTTPS — that causes redirect loops), enable the **orange-cloud proxy** on the Pages records, and turn on **Always Use HTTPS** under SSL/TLS → Edge Certificates.
   - In GitHub Pages settings, enable **Enforce HTTPS** once the certificate is active. Deploys also call the Pages API to keep this enabled.
   - To apply or re-apply the full Cloudflare + GitHub HTTPS setup, run the **Enforce HTTPS** workflow from the Actions tab (or `gh workflow run enforce-https.yml`).

### 3. Frontend API URL

Update [`frontend/.env.production`](frontend/.env.production) with your deployed Worker URL:

```
VITE_API_URL=https://aredl-coordinator.<your-subdomain>.workers.dev
```

Also ensure `FRONTEND_ORIGIN` in `wrangler.toml` is the CORS origin (scheme + host, no path). With a custom domain at the site root, set `FRONTEND_BASE_PATH = ""`. If serving from a subpath like `username.github.io/repo-name/`, set `FRONTEND_BASE_PATH = "/repo-name"`.

### 4. Discord OAuth

1. Create an application at [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **Bot**, create a bot and copy the token into `DISCORD_BOT_TOKEN`. Invite the bot to your coordinator guild (`DISCORD_GUILD_ID` in `wrangler.toml`) with permission to view members.
3. Open **OAuth2** and add **both** redirect URIs (Discord requires an exact match):
   - Production: `https://aredl-coordinator.cameron-bond63.workers.dev/auth/discord/callback`
   - Local dev: `http://localhost:8787/auth/discord/callback`
3. Copy **Client ID** and **Client Secret** from the OAuth2 page.
4. Generate a JWT signing secret: `openssl rand -hex 32`
5. Store secrets in Cloudflare (optional if using GitHub Actions secrets from step 2 above):

   ```bash
   cd backend
   npx wrangler secret put DISCORD_CLIENT_ID
   npx wrangler secret put DISCORD_CLIENT_SECRET
   npx wrangler secret put DISCORD_BOT_TOKEN
   npx wrangler secret put JWT_SECRET
   ```

   Or sync from local `.dev.vars` after a manual deploy: `make sync-secrets`

6. For local dev, copy [`backend/.dev.vars.example`](backend/.dev.vars.example) to `backend/.dev.vars` and fill in the values. Set `FRONTEND_ORIGIN=http://localhost:5173`. Leave `FRONTEND_BASE_PATH` unset (defaults to `""`) when the Vite dev server uses `base: '/'`.

### OAuth cookie behavior

- OAuth transient cookies (`oauth_state`, `oauth_return_to`) use `SameSite=Lax`, `HttpOnly`, and `Secure`.
- Session cookie (`session`) uses `SameSite=None`, `HttpOnly`, and `Secure` so frontend API calls can include credentials across origins.
- If signin fails with `missing oauth state cookie`, inspect the `/auth/discord` response for `Set-Cookie` and confirm the `/auth/discord/callback` request includes a `Cookie` header.

## Local development

Requires Node.js 22+. For manual deploys, also run `make setup-rust` once to install `worker-build` (Wrangler dev runs the build automatically).

```bash
make install   # first time
make dev       # applies local D1 migrations, then backend on :8787 and frontend on :5173
```

Local D1 is separate from production and starts without claims. To mirror production claim data for progress/filters, run `make seed-local-db` once (requires `wrangler login`).

Or run individually: `make dev-backend`, `make dev-frontend`.

`make build-backend` runs `worker-build --release`, the same compile path used by `wrangler deploy`. See `make help` for all targets.

## Deploy

**Via GitHub Actions** (recommended):

```bash
make deploy-ci   # push to main; Actions deploys backend + frontend
```

**Manual backend deploy:**

```bash
make deploy-backend   # applies remote D1 migrations, then wrangler deploy
make deploy-frontend  # builds static assets (Pages still updated by CI on push)
```

## API routes

| Route | Description |
|---|---|
| `GET /api/health` | Backend health check (includes D1 claim/user counts) |
| `GET /api/aredl/ping` | Proxies AREDL API `/health` |
| `GET /api/aredl/levels` | Proxies AREDL demon list (cached) |
| `GET /api/board` | Demon list merged with NSH clan completions and claim flags (cached) |
| `GET /auth/discord` | Starts Discord OAuth (redirects to Discord) |
| `GET /auth/discord/callback` | OAuth callback; sets session cookie; redirects to frontend |
| `GET /auth/logout` | Clears session cookie; redirects to frontend |
| `GET /api/me` | Authenticated user profile with effective hardest, AREDL/manual split, saved filter preferences, stats, and claims (401 when signed out) |
| `PUT /api/me/manual-hardest` | Set manual hardest by list placement (`{ position }`); resolves level name from AREDL list |
| `DELETE /api/me/manual-hardest` | Clear manual hardest override (revert to AREDL profile) |
| `PUT /api/me/preferences` | Save filter and sort preferences (`{ filters, sortDirection }`) |
| `POST /api/claims` | Submit or update a claim (session + coordinator role) |
| `DELETE /api/claims/:level_id` | Remove your own claim on a level |
| `DELETE /api/admin/claims/:level_id` | Admin hard-reset of any claim |
| `POST /api/admin/prune-claims` | Admin: remove claims from users without the coordinator role |

Sign-in requires the Discord role configured as `DISCORD_REQUIRED_ROLE_ID` in the coordinator guild (`DISCORD_GUILD_ID`). Admin actions require `DISCORD_ADMIN_ROLE_ID`. The bot token checks membership via the Discord REST API.

## External API

Level data and clan completions come from the [AREDL API v2](https://api.aredl.net/v2/docs) (`https://api.aredl.net/v2/api`). The board endpoint merges `GET /aredl/levels` with `GET /aredl/clan/{AREDL_CLAN_ID}` (NSH clan records) and reads claims from D1. Each user may hold one claim per level; clobbering inserts a new row and preserves the previous claim. The board shows the highest-severity claim per level. De-escalating (submitting a lower priority on your own claim) updates your row; **Remove Claim** deletes it; admin reset clears all claims on a level. User hardest for filters is the manual override in D1 when set, otherwise from `GET /aredl/profile/{discord_id}`. Filter and sort preferences are stored per user in D1 (`preferences_json`).

## Data persistence

Claims and users are stored in **Cloudflare D1**, separate from the Worker code. Deploying the Worker (`wrangler deploy` or GitHub Actions) only updates runtime code; it does **not** wipe D1 data.

Before each deploy, CI runs `d1 migrations apply DB --remote`, which applies **only pending** migrations. New migrations must preserve existing rows (copy-rename pattern like [`0004_multi_claim_per_level.sql`](backend/migrations/0004_multi_claim_per_level.sql)); `backend/scripts/check-migrations.sh` rejects migrations that drop `claims` without an `INSERT … SELECT`.

To verify claims survived a deploy, compare `db.claimsCount` from `GET /api/health` before and after:

```bash
curl -s https://aredl-coordinator.<your-subdomain>.workers.dev/api/health
```

## License

Private project — add a license if you open-source this repository.
