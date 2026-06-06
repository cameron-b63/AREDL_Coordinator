.DEFAULT_GOAL := help

FRONTEND_DIR := frontend
BACKEND_DIR  := backend
WASM_TARGET  := wasm32-unknown-unknown

NPM := npm
CARGO := cargo

# Wrangler 4 requires Node 22+. Load nvm and .nvmrc when available.
define RUN_WITH_NODE
bash -lc '\
	export NVM_DIR="$$HOME/.nvm"; \
	[ -s "$$NVM_DIR/nvm.sh" ] && . "$$NVM_DIR/nvm.sh"; \
	[ -f .nvmrc ] && nvm use >/dev/null 2>&1; \
	major=$$(node -p "process.versions.node.split(\".\")[0]"); \
	if [ "$$major" -lt 22 ]; then \
		echo "Node.js 22+ required for Wrangler (current: $$(node -v))."; \
		echo "Install and select it: nvm install 22 && nvm use 22"; \
		exit 1; \
	fi; \
	$(1)'
endef

.PHONY: help install setup-rust \
        dev dev-backend dev-frontend \
        build build-backend build-frontend check \
        migrate-local migrate-remote seed-local-db sync-secrets \
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
	@$(MAKE) migrate-local
	@echo "Backend: http://localhost:8787"
	@echo "Frontend: http://localhost:5173"
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Run Wrangler dev server (port 8787)
	$(call RUN_WITH_NODE,$(NPM) run dev --prefix $(BACKEND_DIR))

dev-frontend: ## Run Vite dev server (port 5173)
	$(NPM) run dev --prefix $(FRONTEND_DIR)

build: build-backend build-frontend ## Build backend (wasm) and frontend (static)

build-backend: ## Build Rust Worker bundle (same path as wrangler deploy)
	cd $(BACKEND_DIR) && worker-build --release

build-frontend: ## Build frontend for production
	$(NPM) run build --prefix $(FRONTEND_DIR)

check: build ## Alias for build (compile/typecheck everything)

migrate-local: ## Apply D1 migrations to local dev database
	$(call RUN_WITH_NODE,cd $(BACKEND_DIR) && npx wrangler d1 migrations apply DB --local -c wrangler.toml)

migrate-remote: ## Apply D1 migrations to production database
	$(call RUN_WITH_NODE,cd $(BACKEND_DIR) && npx wrangler d1 migrations apply DB --remote -c wrangler.toml)

seed-local-db: migrate-local ## Copy production D1 data into local dev (requires wrangler login)
	$(call RUN_WITH_NODE,cd $(BACKEND_DIR) && npx wrangler d1 export DB --remote --output=.local-db-seed.sql -c wrangler.toml && npx wrangler d1 execute DB --local --file=.local-db-seed.sql -c wrangler.toml)

sync-secrets: ## Upload OAuth/JWT secrets from backend/.dev.vars to Cloudflare
	@test -f $(BACKEND_DIR)/.dev.vars || (echo "Missing $(BACKEND_DIR)/.dev.vars — copy from .dev.vars.example" && exit 1)
	$(call RUN_WITH_NODE,set -a && . $(BACKEND_DIR)/.dev.vars && set +a && cd $(BACKEND_DIR) && \
		printf '%s' "$$DISCORD_CLIENT_ID" | npx wrangler secret put DISCORD_CLIENT_ID -c wrangler.toml && \
		printf '%s' "$$DISCORD_CLIENT_SECRET" | npx wrangler secret put DISCORD_CLIENT_SECRET -c wrangler.toml && \
		printf '%s' "$$DISCORD_BOT_TOKEN" | npx wrangler secret put DISCORD_BOT_TOKEN -c wrangler.toml && \
		printf '%s' "$$JWT_SECRET" | npx wrangler secret put JWT_SECRET -c wrangler.toml)

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
