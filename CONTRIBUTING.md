# Contributing

This repo follows the build plan in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Conventions in [`ARCHITECTURE_GUIDELINES.md`](./ARCHITECTURE_GUIDELINES.md) (Angular) and [`AGENTS.md`](./AGENTS.md) are non-negotiable.

## For AI agents (and humans)

Each step in the plan is a self-contained unit: read its frontmatter (`Depends on`, `Blocks`, `Type`, `Est`, `Primary paths`), then its `Goal`, `Scope (IN/OUT)`, `Tasks`, `Acceptance`, `Files`, and `Avoid` sections. Read every upstream step in `Depends on` before writing code. Stay inside the step's `Scope (IN)` — anything in `Scope (OUT)` belongs to another step.

## Branching

- One step → one branch → one PR.
- Branch name: `feat/s<id>-<kebab-title>` — e.g. `feat/s03-nestjs-skeleton`.
- Always branch from up-to-date `main`.

## PR titles and commit messages

- PR title: `S<id> — <Title>` — e.g. `S03 — NestJS skeleton`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Enforced by commitlint via the `commit-msg` Husky hook and a CI job.

  ```
  feat(s03): add NestJS skeleton with Fastify adapter
  fix(s10): correct sidenav focus trap
  docs: tighten CONTRIBUTING guide
  ```

  Valid types (from `@commitlint/config-conventional`): `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Local workflow

```bash
npm install --legacy-peer-deps   # see README.md for why
npm run lint                     # ESLint across all projects
npm run test                     # Vitest (web, shared) + Jest (api)
npm run build:web && npm run build:api
```

`npx nx <target> <project>` runs a single target. `npx nx affected --target=<t>` runs only what changed against `main` — handy for big plans.

## Pre-commit hooks

Husky runs `lint-staged` before every commit: ESLint --fix + Prettier on staged files. Commit messages are validated by commitlint. **Do not bypass with `--no-verify`** — fix the underlying issue.

## CI checks (must pass before merge)

`.github/workflows/ci.yml` runs on every PR:

- `nx affected --target=lint`
- `nx affected --target=typecheck`
- `nx affected --target=test`
- `nx affected --target=build`
- Commit lint (all commits in the PR vs. `main`)

CI verifies; it does **not** auto-fix. Fix locally and push.

## Project tags and import boundaries

Every project has tags in its `project.json` that drive `@nx/enforce-module-boundaries`:

| Project       | Tags                       |
| ------------- | -------------------------- |
| `apps/web`    | `scope:web`, `type:app`    |
| `apps/api`    | `scope:api`, `type:app`    |
| `libs/shared` | `scope:shared`, `type:lib` |

Rules:

- `scope:web` may depend only on `scope:web` and `scope:shared`.
- `scope:api` may depend only on `scope:api` and `scope:shared`.
- `scope:shared` may depend only on `scope:shared`.
- `type:app` may depend only on `type:lib`.

Adding a new project? Give it the appropriate `scope:*` and `type:*` tags up front.
