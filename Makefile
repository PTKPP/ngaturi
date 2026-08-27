PYTHON ?= $(shell \
	if [ -x ".venv/bin/python" ]; then \
		echo ".venv/bin/python"; \
	elif command -v python3 >/dev/null 2>&1; then \
		command -v python3; \
	else \
		echo "python"; \
	fi)
COMPOSE ?= docker compose -f docker-compose.tools.yml
PM2 ?= pm2

.PHONY: app-build frontend-build legacy-backend-build pm2-start pm2-reload pm2-stop pm2-delete pm2-status pm2-logs knowledge-up knowledge-down knowledge-health knowledge-index knowledge-reindex knowledge-search knowledge-test

frontend-build:
	cd apps/frontend && npm run build

legacy-backend-build:
	cd legacy/go-auth-backend && go test ./... && go build -trimpath ./cmd/api

app-build: frontend-build

pm2-start: app-build
	$(PM2) startOrReload ecosystem.config.cjs --update-env

pm2-reload: app-build
	$(PM2) reload ecosystem.config.cjs --update-env

pm2-stop:
	$(PM2) stop ngaturi-frontend

pm2-delete:
	$(PM2) delete ngaturi-frontend

pm2-status:
	$(PM2) status

pm2-logs:
	$(PM2) logs ngaturi-backend ngaturi-frontend

knowledge-up:
	$(COMPOSE) up -d chromadb

knowledge-down:
	$(COMPOSE) down

knowledge-health:
	$(PYTHON) tools/knowledge/healthcheck.py

knowledge-index:
	$(PYTHON) tools/knowledge/ingest.py

knowledge-reindex:
	@test -n "$(COLLECTION)" || (echo "Set COLLECTION explicitly, e.g. make knowledge-reindex COLLECTION=digital-invitation-knowledge"; exit 2)
	$(PYTHON) tools/knowledge/ingest.py --collection "$(COLLECTION)" --reindex

knowledge-search:
	@test -n "$(QUERY)" || (echo "Set QUERY, e.g. make knowledge-search QUERY=\"public invitation\""; exit 2)
	$(PYTHON) tools/knowledge/search.py --query "$(QUERY)"

knowledge-test:
	$(PYTHON) -m pytest tools/knowledge/tests -q
