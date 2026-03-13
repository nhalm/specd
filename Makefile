SHELL := /bin/bash
.DEFAULT_GOAL := help
.PHONY: help install hooks check lint fmt test test-behavioral fix

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  install           Install dependencies and link CLI"
	@echo "  hooks             Install lefthook git hooks"
	@echo "  check             Run all checks (lint + fmt)"
	@echo "  lint              Run ESLint"
	@echo "  fmt               Check formatting with Prettier"
	@echo "  test              Run tests"
	@echo "  test-behavioral   Run behavioral prompt evals (requires claude CLI, costs API credits)"
	@echo "  fix               Auto-fix lint and formatting"

install: ## Install dependencies and link CLI
	npm install
	npm link

hooks: ## Install lefthook git hooks
	npx lefthook install

check: lint fmt ## Run all checks (lint + fmt)

lint: ## Run ESLint
	npx eslint .

fmt: ## Check formatting with Prettier
	npx prettier --check .

test: ## Run tests
	npx vitest run

test-behavioral: ## Run behavioral prompt evals (requires claude CLI, costs API credits)
	set -a && . ./.env && set +a && cd evals && npx promptfoo eval

fix: ## Auto-fix lint and formatting
	npx eslint --fix .
	npx prettier --write .
