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
6. Update `FRONTEND_ORIGIN` in `wrangler.toml` to your GitHub Pages CORS origin (scheme + host only, no repo path), e.g.:

   ```
   https://<github-username>.github.io
   ```

7. Apply migrations locally (optional):

   ```bash
   npx wrangler d1 migrations apply DB --local
   ```

### 2. GitHub

1. Push this repository to GitHub (public repo for free Pages).
2. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN` — Cloudflare dashboard → My Profile → API Tokens → "Edit Cloudflare Workers" template
   - `CLOUDFLARE_ACCOUNT_ID` — Cloudflare dashboard sidebar
   - `DISCORD_CLIENT_ID` — same value as production Discord OAuth (see §4)
   - `DISCORD_CLIENT_SECRET` — same value as production Discord OAuth (see §4)
   - `JWT_SECRET` — same value as production (`openssl rand -hex 32`)

   GitHub Actions uploads the Discord/JWT secrets on every backend deploy. Without them, a push to `main` deploys a Worker version with no OAuth bindings.
3. Enable GitHub Pages: Settings → Pages → Source: **Deploy from a branch** → `gh-pages` / `/ (root)`
4. Enable workflow permissions: Settings → Actions → General → **Read and write permissions**

### 3. Frontend API URL

Update [`frontend/.env.production`](frontend/.env.production) with your deployed Worker URL:

```
VITE_API_URL=https://aredl-coordinator.<your-subdomain>.workers.dev
```

Also ensure `FRONTEND_ORIGIN` in `wrangler.toml` is the CORS origin (scheme + host, no path). Browsers send `Origin` without the repo path even when the app is served from a subpath like `/AREDL_Coordinator/`.

### 4. Discord OAuth

1. Create an application at [Discord Developer Portal](https://discord.com/developers/applications).
2. Open **OAuth2** and add **both** redirect URIs (Discord requires an exact match):
   - Production: `https://aredl-coordinator.cameron-bond63.workers.dev/auth/discord/callback`
   - Local dev: `http://localhost:8787/auth/discord/callback`
3. Copy **Client ID** and **Client Secret** from the OAuth2 page.
4. Generate a JWT signing secret: `openssl rand -hex 32`
5. Store secrets in Cloudflare (optional if using GitHub Actions secrets from step 2 above):

   ```bash
   cd backend
   npx wrangler secret put DISCORD_CLIENT_ID
   npx wrangler secret put DISCORD_CLIENT_SECRET
   npx wrangler secret put JWT_SECRET
   ```

   Or sync from local `.dev.vars` after a manual deploy: `make sync-secrets`

6. For local dev, copy [`backend/.dev.vars.example`](backend/.dev.vars.example) to `backend/.dev.vars` and fill in the values. Set `FRONTEND_ORIGIN=http://localhost:5173`.

Also ensure `FRONTEND_BASE_PATH = "/AREDL_Coordinator"` is set in [`backend/wrangler.toml`](backend/wrangler.toml) so post-login redirects land on the GitHub Pages app path.

## Local development

Requires Node.js 22+. For manual deploys, also run `make setup-rust` once to install `worker-build` (Wrangler dev runs the build automatically).

```bash
make install   # first time
make dev       # backend on :8787, frontend on :5173
```

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
| `GET /api/health` | Backend health check |
| `GET /api/aredl/ping` | Proxies AREDL API `/health` |
| `GET /auth/discord` | Starts Discord OAuth (redirects to Discord) |
| `GET /auth/discord/callback` | OAuth callback; sets session cookie; redirects to frontend |
| `GET /auth/logout` | Clears session cookie; redirects to frontend |
| `GET /api/me` | Authenticated user profile (401 when signed out) |

## External API

Level data comes from the [AREDL API v2](https://api.aredl.net/v2/docs) (`https://api.aredl.net/v2/api`). User claims are stored in D1.

## License

Private project — add a license if you open-source this repository.
