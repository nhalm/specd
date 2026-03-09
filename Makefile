.PHONY: install hooks check lint fmt test fix

install: ## Install dependencies
	npm install

hooks: ## Install lefthook git hooks
	npx lefthook install

check: lint fmt ## Run all checks (lint + fmt)

lint: ## Run ESLint
	npx eslint .

fmt: ## Check formatting with Prettier
	npx prettier --check .

test: ## Run tests
	npx vitest run

fix: ## Auto-fix lint and formatting
	npx eslint --fix .
	npx prettier --write .
