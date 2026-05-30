.DEFAULT_GOAL := help

FRONTEND_DIR := frontend
BACKEND_DIR  := backend
WASM_TARGET  := wasm32-unknown-unknown

NPM := npm
CARGO := cargo

.PHONY: help install setup-rust \
        dev dev-backend dev-frontend \
        build build-backend build-frontend check \
        migrate-local migrate-remote \
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

setup-rust: ## Add wasm32 target for Worker builds
	rustup target add $(WASM_TARGET)

dev: ## Run backend and frontend dev servers in parallel
	@echo "Backend: http://localhost:8787"
	@echo "Frontend: http://localhost:5173"
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Run Wrangler dev server (port 8787)
	$(NPM) run dev --prefix $(BACKEND_DIR)

dev-frontend: ## Run Vite dev server (port 5173)
	$(NPM) run dev --prefix $(FRONTEND_DIR)

build: build-backend build-frontend ## Build backend (wasm) and frontend (static)

build-backend: ## Compile Rust Worker for wasm32
	$(CARGO) build --release --manifest-path $(BACKEND_DIR)/Cargo.toml --target $(WASM_TARGET)

build-frontend: ## Build frontend for production
	$(NPM) run build --prefix $(FRONTEND_DIR)

check: build ## Alias for build (compile/typecheck everything)

migrate-local: ## Apply D1 migrations to local dev database
	$(NPM) exec --prefix $(BACKEND_DIR) wrangler d1 migrations apply DB --local

migrate-remote: ## Apply D1 migrations to production database
	$(NPM) exec --prefix $(BACKEND_DIR) wrangler d1 migrations apply DB --remote

deploy-backend: migrate-remote ## Deploy Worker to Cloudflare
	$(NPM) run deploy --prefix $(BACKEND_DIR)

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
