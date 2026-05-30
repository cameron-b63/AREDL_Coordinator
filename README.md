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
3. Enable GitHub Pages: Settings → Pages → Source: **Deploy from a branch** → `gh-pages` / `/ (root)`
4. Enable workflow permissions: Settings → Actions → General → **Read and write permissions**

### 3. Frontend API URL

Update [`frontend/.env.production`](frontend/.env.production) with your deployed Worker URL:

```
VITE_API_URL=https://aredl-coordinator.<your-subdomain>.workers.dev
```

Also ensure `FRONTEND_ORIGIN` in `wrangler.toml` is the CORS origin (scheme + host, no path). Browsers send `Origin` without the repo path even when the app is served from a subpath like `/AREDL_Coordinator/`.

### 4. Discord OAuth (before auth implementation)

1. Create an application at [Discord Developer Portal](https://discord.com/developers/applications).
2. Add redirect URI: `https://aredl-coordinator.<your-subdomain>.workers.dev/auth/discord/callback`
3. Store secrets in Cloudflare (not in the repo):

   ```bash
   cd backend
   npx wrangler secret put DISCORD_CLIENT_ID
   npx wrangler secret put DISCORD_CLIENT_SECRET
   npx wrangler secret put JWT_SECRET
   ```

## Local development

Requires Node.js 22+ and Rust with the `wasm32-unknown-unknown` target (`make setup-rust`).

```bash
make install   # first time
make dev       # backend on :8787, frontend on :5173
```

Or run individually: `make dev-backend`, `make dev-frontend`.

See `make help` for all targets (build, migrate, deploy, etc.).

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

## API routes (boilerplate)

| Route | Description |
|---|---|
| `GET /api/health` | Backend health check |
| `GET /api/aredl/ping` | Proxies AREDL API `/health` |
| `GET /auth/discord` | Stub (501) — Discord OAuth login |
| `GET /auth/discord/callback` | Stub (501) — OAuth callback |
| `GET /api/me` | Stub (501) — authenticated user profile |

## External API

Level data comes from the [AREDL API v2](https://api.aredl.net/v2/docs) (`https://api.aredl.net/v2/api`). User claims are stored in D1.

## License

Private project — add a license if you open-source this repository.
