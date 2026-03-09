# spec-dd-framework Agent Guidelines

## Project Overview

CLI tool for scaffolding and managing spec-driven development projects. Written in Node.js (ESM). Installs templates, commands, and configuration into target projects so AI agents can autonomously implement specs.

## Build & Test

```bash
make install    # npm install + npm link (makes `spec-dd` CLI available)
make check      # lint + fmt
make test       # vitest
make fix        # auto-fix lint and formatting
```

All three must pass before committing. Lefthook enforces lint + fmt on pre-commit, tests on pre-push, and conventional commits on commit-msg.

## Project Structure

```
src/cli.js        # CLI entry point — arg parsing, interactive prompts
src/commands.js   # init, update, doctor — pure functions returning results
src/config.js     # File lists, version, path mapping
test/             # Vitest tests
templates/        # Template files copied into target projects
```

## Conventions

- **ESM modules** with `"type": "module"`. No `"use strict"` — ESM is strict by default.
- **Pure functions** for commands — accept paths and options, return structured results with messages. CLI layer handles I/O and process.exit.
- **No runtime dependencies.** Only `node:fs`, `node:path`, and other Node built-ins. All external packages are devDependencies.
- **Conventional commits** enforced by commitlint. Format: `type: description` (e.g., `feat:`, `fix:`, `chore:`, `refactor:`, `ci:`, `test:`).
- **Prettier** for formatting (100-char width). **ESLint** flat config for linting.
- Templates in `templates/` are excluded from lint and format — they are copied verbatim into user projects.

## File Categories

Commands in `src/commands.js` manage three categories of files in target projects:

| Category           | Behavior on init       | Behavior on update         |
| ------------------ | ---------------------- | -------------------------- |
| `FRAMEWORK_OWNED`  | Created with templates | Overwritten every update   |
| `SCAFFOLD`         | Created with templates | Skipped if exists          |
| `HEADER_UPDATABLE` | Created with templates | Header replaced, body kept |
| `REMOVED`          | —                      | Deleted if present         |

Changes to these lists in `src/config.js` must have corresponding test coverage in `test/commands.test.js`.

## Testing

Tests use real temp directories — no mocks. Each test creates a fresh tmpdir, runs commands against it, and cleans up. When adding new files to any category, add assertions for them in the init and update test suites.
