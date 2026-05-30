.DEFAULT_GOAL := help

FRONTEND_DIR := frontend
BACKEND_DIR  := backend
WASM_TARGET  := wasm32-unknown-unknown

NPM := npm
CARGO := cargo

.PHONY: help install setup-rust \
        dev dev-backend dev-frontend \
        build build-backend build-frontend check \
        migrate-local migrate-remote sync-secrets \
        deploy deploy-backend deploy-frontend deploy-ci \
        preview-frontend clean

help: ## Show available targets
	@echo "AREDL Coordinator"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install frontend and backend npm dependencies
	$(NPM) ci --prefix $(FRONTEND_DIR)
	$(NPM) ci --prefix $(BACKEND_DIR)

setup-rust: ## Install worker-build for local deploys (Wrangler dev runs it automatically)
	rustup target add $(WASM_TARGET)
	cargo install worker-build --locked --version 0.8.3

dev: ## Run backend and frontend dev servers in parallel
	@echo "Backend: http://localhost:8787"
	@echo "Frontend: http://localhost:5173"
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Run Wrangler dev server (port 8787)
	$(NPM) run dev --prefix $(BACKEND_DIR)

dev-frontend: ## Run Vite dev server (port 5173)
	$(NPM) run dev --prefix $(FRONTEND_DIR)

build: build-backend build-frontend ## Build backend (wasm) and frontend (static)

build-backend: ## Build Rust Worker bundle (same path as wrangler deploy)
	cd $(BACKEND_DIR) && worker-build --release

build-frontend: ## Build frontend for production
	$(NPM) run build --prefix $(FRONTEND_DIR)

check: build ## Alias for build (compile/typecheck everything)

migrate-local: ## Apply D1 migrations to local dev database
	$(NPM) exec --prefix $(BACKEND_DIR) wrangler d1 migrations apply DB --local -c wrangler.toml

migrate-remote: ## Apply D1 migrations to production database
	$(NPM) exec --prefix $(BACKEND_DIR) wrangler d1 migrations apply DB --remote -c wrangler.toml

sync-secrets: ## Upload OAuth/JWT secrets from backend/.dev.vars to Cloudflare
	@test -f $(BACKEND_DIR)/.dev.vars || (echo "Missing $(BACKEND_DIR)/.dev.vars — copy from .dev.vars.example" && exit 1)
	@DISCORD_CLIENT_ID=$$(grep '^DISCORD_CLIENT_ID=' $(BACKEND_DIR)/.dev.vars | cut -d= -f2-) && \
	DISCORD_CLIENT_SECRET=$$(grep '^DISCORD_CLIENT_SECRET=' $(BACKEND_DIR)/.dev.vars | cut -d= -f2-) && \
	JWT_SECRET=$$(grep '^JWT_SECRET=' $(BACKEND_DIR)/.dev.vars | cut -d= -f2-) && \
	printf '%s' "$$DISCORD_CLIENT_ID" | $(NPM) exec --prefix $(BACKEND_DIR) wrangler secret put DISCORD_CLIENT_ID -c $(BACKEND_DIR)/wrangler.toml && \
	printf '%s' "$$DISCORD_CLIENT_SECRET" | $(NPM) exec --prefix $(BACKEND_DIR) wrangler secret put DISCORD_CLIENT_SECRET -c $(BACKEND_DIR)/wrangler.toml && \
	printf '%s' "$$JWT_SECRET" | $(NPM) exec --prefix $(BACKEND_DIR) wrangler secret put JWT_SECRET -c $(BACKEND_DIR)/wrangler.toml

deploy-backend: migrate-remote ## Deploy Worker to Cloudflare
	$(NPM) run deploy --prefix $(BACKEND_DIR)
	@$(MAKE) sync-secrets

deploy-frontend: build-frontend ## Build frontend (GitHub Actions publishes to Pages)
	@echo "Frontend built in $(FRONTEND_DIR)/dist"
	@echo "Push to main to publish via GitHub Actions, or run: make deploy-ci"

deploy: deploy-backend deploy-frontend ## Deploy backend and build frontend

deploy-ci: ## Push to main and trigger GitHub Actions deploy
	git push origin main

preview-frontend: build-frontend ## Serve production frontend build locally
	$(NPM) run preview --prefix $(FRONTEND_DIR)

clean: ## Remove build artifacts
	$(CARGO) clean --manifest-path $(BACKEND_DIR)/Cargo.toml
	rm -rf $(BACKEND_DIR)/build $(BACKEND_DIR)/.wrangler
	rm -rf $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/*.tsbuildinfo
