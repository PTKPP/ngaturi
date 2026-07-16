PYTHON ?= python
COMPOSE ?= docker compose -f docker-compose.tools.yml

.PHONY: knowledge-up knowledge-down knowledge-health knowledge-index knowledge-reindex knowledge-search knowledge-test

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
