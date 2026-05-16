# TCG Arena — MVP Implementation Plan

> **Source of truth for AI agents implementing the TCG Arena MVP.**
> Scope: Section 10 of [BUSINESS_SPECS.md](./BUSINESS_SPECS.md) — One Piece TCG only, Discord Activity + standalone PWA in parallel, 1v1 matches, board + face streams, click-to-identify CV, casual matches + simple bracket tournaments.
>
> Read this file top-to-bottom once. Then, when assigned a step, jump to its `### S<id>` heading. Every step is self-contained: it lists its dependencies, files, acceptance criteria, and what to avoid.

---

## 0. How to use this plan

### 0.1 Agent reading protocol

1. **Find your step** by `S<id>` (anchor: `#s01`, `#s02`, …).
2. **Read its frontmatter block** — `Depends on`, `Blocks`, `Primary paths`, `Est`.
3. **Read all upstream steps listed in `Depends on`** before writing code — those have shaped the surrounding code you must integrate with.
4. **Read [`ARCHITECTURE_GUIDELINES.md`](./ARCHITECTURE_GUIDELINES.md)** in full at least once before touching `apps/web`. It is non-negotiable; this plan does not re-state it.
5. **Read [`AGENTS.md`](./AGENTS.md)** for Angular conventions in `apps/web`.
6. Stick to the step's `Scope (IN)`. Anything in `Scope (OUT)` belongs to another step — do not gold-plate.
7. When done, verify every `Acceptance criteria` checkbox is satisfied locally before pushing.

### 0.2 Step section structure (every step has these, in order)

```
### S<id> — <Title>
Type:           <frontend | backend | shared | infra>
Depends on:     <comma-separated S-ids, or — for none>
Blocks:         <steps that depend on this>
Est:            <1d | 2d | 3d>
Primary paths:  <comma-separated repo paths the step touches>

Goal.            One paragraph: what is built and why.
Scope (IN).      Bullet list of work that is part of this step.
Scope (OUT).     Bullet list of related work explicitly deferred.
Tasks.           Ordered, imperative.
Acceptance.      Checklist that must pass before the step is done.
Files.           Files created/modified.
Avoid.           Anti-patterns specific to this step.
Notes.           Risks, hints, references.
```

### 0.3 Branching and PRs

- One step → one branch → one PR. Branch name: `feat/s<id>-<kebab-title>`. PR title: `S<id> — <Title>`.
- PRs must link upstream PRs (the `Depends on` steps) and pass CI (lint, type-check, unit tests, build) before merge.
- Do **not** bundle two steps into one PR; reviewers and downstream agents rely on 1:1 mapping.

### 0.4 Tech stack at a glance

| Layer            | Choice                                                 |
|------------------|--------------------------------------------------------|
| Repo             | Nx monorepo (npm)                                      |
| Frontend         | Angular 21 (zoneless, signals, OnPush), Angular Material, Transloco |
| Discord wrapper  | `@discord/embedded-app-sdk` inside the same Angular app |
| Backend          | NestJS (TypeScript), Fastify adapter                   |
| DB               | Postgres + Prisma                                      |
| Cache / Pub-sub  | Redis                                                  |
| Realtime         | Socket.IO (NestJS gateway)                             |
| Media            | LiveKit (cloud or self-hosted; cloud for MVP)          |
| Card recognition | Vendor adapter; **Ximilar** real impl, **Mock** dev impl |
| Auth             | Discord OAuth (primary) + email magic-link (dev/fallback) |
| Tests            | Vitest (unit), Playwright (e2e)                        |
| CI               | GitHub Actions                                         |

### 0.5 Repo layout (after S01)

```
/
├── apps/
│   ├── web/                # Angular PWA (also served as Discord Activity)
│   └── api/                # NestJS backend
├── libs/
│   └── shared/             # Cross-app types, DTOs, zod schemas, game-module contracts
├── nx.json
├── tsconfig.base.json
├── package.json
├── IMPLEMENTATION_PLAN.md  # this file
├── BUSINESS_SPECS.md
├── ARCHITECTURE_GUIDELINES.md
└── AGENTS.md
```

### 0.6 Cross-cutting conventions

- **Type sharing.** Every API contract (request / response / event) is defined as a zod schema in `libs/shared` and consumed by both `apps/web` and `apps/api`.
- **Domain language.** Match the BUSINESS_SPECS vocabulary in code: `Match`, `Lobby`, `Tournament`, `Deck`, `DonDeck`, `LeaderLife`, `Counter`, `Phase`.
- **No mocks in committed code paths** other than the dedicated mock backend interceptor (`apps/web`) and the `MockCardRecognitionProvider` (`apps/api`). Feature flags gate them.
- **Telemetry.** Every backend endpoint logs `{ traceId, userId, route, durationMs, status }` via the logging module set up in S03.
- **Accessibility is a hard requirement.** Components must pass AXE; tournament-blocking flows must be keyboard-navigable. Steps that fail AXE do not ship.
- **One Piece TCG only.** No code path may hardcode OP TCG concepts outside the game-module layer set up in S14. All other code references the game module via the shared interface.

### 0.7 Step index

| ID  | Title                                              | Phase | Type     | Deps             |
|-----|----------------------------------------------------|-------|----------|------------------|
| S01 | Nx monorepo migration                              | 0     | infra    | —                |
| S02 | Tooling baseline (lint, format, CI, Vitest)        | 0     | infra    | S01              |
| S03 | NestJS skeleton (config, logging, health, errors)  | 1     | backend  | S01, S02         |
| S04 | Postgres + Prisma + base schema                    | 1     | backend  | S03              |
| S05 | Redis (cache + pub-sub)                            | 1     | backend  | S03              |
| S06 | Auth: Discord OAuth + email magic-link             | 1     | backend  | S04              |
| S07 | WebSocket gateway scaffold                         | 1     | backend  | S06              |
| S08 | User profile & friends API                         | 1     | backend  | S04, S06         |
| S09 | Angular config baseline                            | 2     | frontend | S01, S02         |
| S10 | Shell, layout, theme, i18n                         | 2     | frontend | S09              |
| S11 | Frontend auth (Discord OAuth + Embedded SDK)       | 2     | frontend | S06, S09         |
| S12 | Discord Activity wrapper & manifest                | 2     | frontend | S11              |
| S13 | Shared UI primitives                               | 2     | frontend | S09              |
| S14 | Game-module interface (shared)                     | 3     | shared   | S01              |
| S15 | OP TCG card database ingestion + search API        | 3     | backend  | S04, S14         |
| S16 | OP TCG board template, formats, ban list           | 3     | shared   | S14              |
| S17 | OP TCG control widgets (frontend)                  | 3     | frontend | S13, S16         |
| S18 | Universal widgets (dice, coin, timer, undo)        | 3     | frontend | S13              |
| S19 | Lobby backend                                      | 4     | backend  | S05, S06, S07    |
| S20 | Lobby UI (create, browse, join)                    | 4     | frontend | S10, S11, S19    |
| S21 | Pre-game checklist UI                              | 4     | frontend | S20              |
| S22 | OP TCG deck list parser + deck registration        | 4     | backend+frontend | S04, S15, S20 |
| S23 | LiveKit integration (rooms + tokens)               | 5     | backend+frontend | S06, S10  |
| S24 | Stream layouts (board + face cam)                  | 5     | frontend | S23              |
| S25 | Realtime match state sync                          | 5     | backend+frontend | S07, S17, S18 |
| S26 | Voice chat controls                                | 5     | frontend | S23              |
| S27 | In-match text chat + quick emotes                  | 5     | backend+frontend | S07, S20  |
| S28 | Card recognition: backend interface + Mock         | 6     | backend  | S15              |
| S29 | Card recognition: Ximilar adapter                  | 6     | backend  | S28              |
| S30 | Tap-to-identify frontend flow                      | 6     | frontend | S24, S28         |
| S31 | Board visibility anti-cheat check                  | 7     | backend+frontend | S24, S28  |
| S32 | Replay buffer + judge call                         | 7     | frontend+backend | S25       |
| S33 | Match outcome confirmation & dispute               | 7     | backend+frontend | S25       |
| S34 | Quick match queue + friends + presence             | 8     | backend+frontend | S05, S08, S19 |
| S35 | One Piece game hub page                            | 8     | frontend | S19, S34, S36    |
| S36 | Tournament data model + endpoints                  | 8     | backend  | S04, S19         |
| S37 | Bracket engine (Swiss + single elim)               | 8     | backend  | S36              |
| S38 | Tournament UI (player + judge)                     | 8     | frontend | S36, S37         |
| S39 | Accessibility pass (AXE)                           | 9     | frontend | all UI steps     |
| S40 | i18n completion (en + pt-BR scaffold)              | 9     | frontend | S10              |
| S41 | E2E test suite (Playwright)                        | 9     | infra    | S33, S38         |
| S42 | Deployment, observability, beta allowlist          | 9     | infra    | S41              |

### 0.8 Parallelism notes

- After **S02** completes, **S03** (backend) and **S09** (frontend) can proceed in parallel.
- Inside Phase 1: S04 and S05 are independent — parallel. S06 needs S04. S07 needs S06. S08 needs S04 and S06.
- Inside Phase 2: S10, S11, S13 can all start once S09 lands.
- Inside Phase 3: S14 is the gate; S15/S16 are independent; S17/S18 are independent of each other but both depend on S13.
- Phase 5 (Realtime Match) is the largest fan-out — S24, S25, S26, S27 can each be a separate agent once their prerequisites land.
- Phase 6 (S28 → S29, S30 in parallel) is critical-path; do not start S30 frontend work until S28's contract is merged.
- Phase 8 (matchmaking + tournaments) is mostly independent of Phases 5–7 and can start once Phase 4 lands; useful for parallel staffing.

---

## Phase 0 — Foundation

### S01 — Nx Monorepo Migration
Type: infra
Depends on: —
Blocks: S02, S03, S04, S05, S06, S07, S08, S09, S14
Est: 2d
Primary paths: `nx.json`, `tsconfig.base.json`, `package.json`, `apps/web/`, `apps/api/`, `libs/shared/`

**Goal.** Convert the existing single-app Angular repo into an Nx monorepo containing the Angular app, an empty NestJS app, and a shared library. This is the precondition for every other step.

**Scope (IN).**
- Install Nx, run `nx init`.
- Move the existing Angular app from `src/` to `apps/web/src/` (preserve git history with `git mv`).
- Generate an empty NestJS app at `apps/api/` using `@nx/nest`.
- Generate `libs/shared/` (publishable: false, buildable: true) using `@nx/js`.
- Configure path aliases in `tsconfig.base.json`: `@tcg/shared` → `libs/shared/src/index.ts`.
- Update the root `package.json` scripts: `start:web`, `start:api`, `build:web`, `build:api`, `test`, `lint`.
- Add Nx caching configuration (`.nxignore`, named inputs).

**Scope (OUT).**
- Tooling beyond Nx defaults (lives in S02).
- Any business code in `apps/api` or `libs/shared` (lives in S03+ and S14+).

**Tasks.**
1. Snapshot existing state on a branch.
2. `npx nx@latest init --integrated`.
3. `git mv src apps/web/src` and update `angular.json` → `apps/web/project.json` (Nx-style).
4. Verify `nx serve web` still serves the existing Angular page on `http://localhost:4200`.
5. `nx g @nx/nest:application api --frontendProject=web` (or equivalent generator) — accept the default Express/Fastify setup; reconfigure to Fastify in S03.
6. `nx g @nx/js:library shared --bundler=tsc --unitTestRunner=vitest`.
7. Add path alias.
8. Update root README with the new dev commands.

**Acceptance.**
- [ ] `nx serve web` renders the unchanged Angular landing page at `http://localhost:4200`.
- [ ] `nx serve api` returns 200 on `GET http://localhost:3000/api` (default Nest scaffold).
- [ ] `nx build web` and `nx build api` both succeed.
- [ ] `import { } from '@tcg/shared'` resolves in both apps' `tsconfig` (verify with a temp export/import).
- [ ] `nx graph` shows three nodes: `web`, `api`, `shared`.
- [ ] No files exist under the legacy `src/` at repo root after migration.

**Files.**
- Created: `nx.json`, `tsconfig.base.json`, `apps/api/**`, `libs/shared/**`.
- Modified: `package.json`, `README.md`.
- Moved: `src/**` → `apps/web/src/**`; `angular.json` → `apps/web/project.json`.

**Avoid.**
- Squashing the move of `src/` into a new commit without `git mv` — preserves blame.
- Hand-editing generated `project.json` files unless strictly necessary.

**Notes.**
- Nx 19+ recommended; lock the Nx version in `package.json`.
- Keep Angular CLI 21 wherever Nx allows it; don't downgrade.

---

### S02 — Tooling Baseline
Type: infra
Depends on: S01
Blocks: S03, S09
Est: 2d
Primary paths: `.eslintrc*`, `.prettierrc`, `.github/workflows/`, `vitest.workspace.ts`, `.husky/`, `commitlint.config.cjs`

**Goal.** Establish lint, format, commit, and CI conventions for both apps before any feature code is written. Every later step assumes these checks gate merges.

**Scope (IN).**
- ESLint flat config at the root, with `@nx/eslint-plugin` for boundary rules (web cannot import from api and vice versa; libs/shared has no app imports).
- Angular-specific lint rules (`@angular-eslint`) enforcing rules from `AGENTS.md` (no `*ngIf`, no `ngClass`, no `standalone: true`, etc.).
- Prettier (extend existing `.prettierrc`) wired to ESLint.
- Vitest workspace config covering `apps/web`, `apps/api`, `libs/shared`.
- Husky pre-commit hook running `lint-staged`: ESLint + Prettier on staged files only.
- Commitlint enforcing Conventional Commits.
- GitHub Actions workflow `.github/workflows/ci.yml` running on PR: `nx affected --target=lint`, `--target=test`, `--target=build`, and `--target=typecheck`.
- A `CONTRIBUTING.md` summarizing branch naming, PR titling, and the agent reading protocol.

**Scope (OUT).**
- E2E test infra (S41).
- Deploy workflow (S42).
- Storybook (out of MVP entirely).

**Tasks.**
1. Install ESLint + plugins + Prettier + Husky + lint-staged + commitlint.
2. Configure boundary rules so `apps/web` and `apps/api` cannot import from each other.
3. Add a Vitest workspace and verify `nx test` runs zero or many tests cleanly across the three projects.
4. Add CI workflow.
5. Add Husky pre-commit + commit-msg hooks.
6. Document in `CONTRIBUTING.md`.

**Acceptance.**
- [ ] `nx run-many --target=lint --all` passes on a clean tree.
- [ ] An attempted import of `apps/api/**` from `apps/web/**` fails lint with a `@nx/enforce-module-boundaries` error.
- [ ] An attempted Angular component with `*ngIf` fails lint.
- [ ] A commit message `wip` is rejected by commitlint; `feat: x` passes.
- [ ] CI workflow runs on a draft PR and reports status checks.
- [ ] `CONTRIBUTING.md` exists and references this plan.

**Files.**
- Created: `eslint.config.js`, `vitest.workspace.ts`, `.husky/pre-commit`, `.husky/commit-msg`, `commitlint.config.cjs`, `.github/workflows/ci.yml`, `CONTRIBUTING.md`.
- Modified: `.prettierrc` (only if existing rules need adjustment), `package.json` (devDependencies + scripts).

**Avoid.**
- Auto-fixing lint as part of CI (CI should only verify).
- Loosening `@angular-eslint` rules to silence noise — fix the code instead.

**Notes.**
- The pre-commit hook should not run the full test suite; that's CI's job. Keep it fast.

---

## Phase 1 — Backend Foundation

### S03 — NestJS Skeleton
Type: backend
Depends on: S01, S02
Blocks: S04, S05, S06, S07, S08
Est: 2d
Primary paths: `apps/api/src/main.ts`, `apps/api/src/app/`, `apps/api/src/config/`

**Goal.** Replace the scaffolded NestJS app with a production-shaped skeleton: typed config, structured logging, global error handling, health endpoints, CORS configured for both the standalone web app and the Discord Activity origin.

**Scope (IN).**
- Switch to the **Fastify** adapter (`@nestjs/platform-fastify`).
- `ConfigModule` with zod-validated env loading. Required env keys for now: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `WEB_ORIGIN`, `DISCORD_ACTIVITY_ORIGIN`.
- `LoggerModule` (pino) emitting JSON in production, pretty in dev; binds `traceId` per request.
- Global `HttpExceptionFilter` returning `application/problem+json` shape (`type`, `title`, `status`, `detail`, `instance`, `traceId`).
- Global `ValidationPipe` wired to `zod` via `nestjs-zod` (or equivalent) so DTOs come from `libs/shared`.
- `HealthController` with `GET /health` (liveness) and `GET /health/ready` (readiness — placeholders for DB/Redis checks added by S04/S05).
- CORS configured for both web origins via env.
- Graceful shutdown hooks.

**Scope (OUT).**
- DB, Redis, Auth, WebSockets — each gets its own step.

**Tasks.**
1. Swap Express → Fastify in `main.ts`.
2. Create `apps/api/src/config/env.schema.ts` (zod schema) and `env.service.ts`.
3. Add pino logger with request binding via `nestjs-pino`.
4. Implement `HttpExceptionFilter` and `ZodValidationPipe`.
5. Add `HealthModule` with `/health` and `/health/ready`.
6. Configure CORS, helmet, compression at app bootstrap.
7. Update `nx serve api` to default port `3333`.

**Acceptance.**
- [ ] `curl http://localhost:3333/health` returns `{ "status": "ok" }`.
- [ ] Logs are JSON in `NODE_ENV=production`, pretty in dev, each line includes `traceId`.
- [ ] A request to `/health/ready` returns 200 with `{ db: 'not-configured', redis: 'not-configured' }` placeholders.
- [ ] Throwing inside a route returns a problem+json body, not a stack trace.
- [ ] Boot fails fast when `WEB_ORIGIN` is missing.

**Files.**
- Created: `apps/api/src/main.ts` (overwrite), `apps/api/src/app/app.module.ts`, `apps/api/src/config/**`, `apps/api/src/health/**`, `apps/api/src/common/filters/**`, `apps/api/src/common/pipes/**`.

**Avoid.**
- Custom logging wrappers around pino — use it directly.
- Reading `process.env` outside `EnvService`.

**Notes.**
- pino logger names: use the module name (e.g., `MatchesService`).

---

### S04 — Postgres + Prisma + Base Schema
Type: backend
Depends on: S03
Blocks: S06, S08, S15, S19, S22, S36
Est: 3d
Primary paths: `apps/api/prisma/`, `apps/api/src/db/`

**Goal.** Stand up Postgres, configure Prisma, and define the baseline schema that downstream features extend. Migrations and a seed script must run from CI.

**Scope (IN).**
- `prisma/schema.prisma` with the following models (rough field lists; refine per step):
  - `User { id, discordId?, email?, displayName, avatarUrl?, locale, region, createdAt, updatedAt }`
  - `AuthIdentity { id, userId, provider ('discord' | 'email'), providerSubject, createdAt }`
  - `Session { id, userId, refreshTokenHash, userAgent, ip, expiresAt, revokedAt? }`
  - `Friendship { id, userAId, userBId, status ('pending' | 'accepted' | 'blocked'), createdAt }`
  - `Deck { id, userId, gameId, name, listJson, createdAt, updatedAt }`
  - `Lobby { id, hostUserId, gameId, format, visibility, status, createdAt }` (filled out by S19)
  - `Match { id, lobbyId, gameId, format, startedAt?, endedAt?, winnerUserId?, statusJson, createdAt }` (filled by S25/S33)
  - `Tournament { id, organizerUserId, gameId, format, bracketType, roundTime, decklistPolicy, prizeInfo, status, createdAt }` (filled by S36)
  - `Card { id, gameId, externalId, name, setCode, number, rarity, imageUrl, dataJson }` (populated by S15)
- Prisma client wrapper module (`DbModule`) injecting `PrismaService`.
- Local docker-compose with `postgres:16`.
- Migration scripts (`prisma migrate dev`, `prisma migrate deploy`).
- Seed script with a handful of dev users and one demo deck.
- `/health/ready` updated to check DB connectivity.

**Scope (OUT).**
- Auth flow (S06).
- Friend list endpoints (S08).
- Real lobby/match/tournament logic — these models are scaffolded only.

**Tasks.**
1. Add `docker-compose.yml` at repo root with a `postgres` service (port 5432, persistent volume).
2. Install Prisma; init.
3. Define schema; create initial migration.
4. Implement `PrismaService` with `enableShutdownHooks`.
5. Wire `/health/ready` to `prisma.$queryRaw\`SELECT 1\``.
6. Write `seed.ts` and an `nx run api:db:seed` target.
7. Add CI step that boots a service container Postgres and runs `prisma migrate deploy`.

**Acceptance.**
- [ ] `docker compose up postgres` boots Postgres locally; `prisma migrate dev` applies the initial migration cleanly.
- [ ] `nx run api:db:seed` produces deterministic seed data.
- [ ] `/health/ready` returns 200 with `{ db: 'ok' }` while Postgres is up, 503 when it's down.
- [ ] CI runs migrations against a fresh container and passes.
- [ ] `PrismaService` is `@Injectable` and exported only from `DbModule`.

**Files.**
- Created: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/**`, `apps/api/src/db/**`, `apps/api/scripts/seed.ts`, `docker-compose.yml`.

**Avoid.**
- Adding fields you don't need yet — leave that to the step that actually uses them.
- Hand-writing SQL migrations.

**Notes.**
- Cascade rules: deleting a user should hard-delete sessions and friendships but soft-archive matches/tournaments. Use `onDelete: SetNull` on `Match.winnerUserId` etc.

---

### S05 — Redis (Cache + Pub-Sub)
Type: backend
Depends on: S03
Blocks: S07, S19, S34
Est: 1d
Primary paths: `apps/api/src/cache/`, `docker-compose.yml`

**Goal.** Add a Redis instance and a typed wrapper module used by realtime, matchmaking, and lobby state.

**Scope (IN).**
- Add Redis to `docker-compose.yml` (port 6379).
- Install `ioredis`.
- `CacheModule` exposing `RedisService` with: `get<T>(key)`, `set(key, value, ttlSeconds?)`, `del(key)`, `publish(channel, payload)`, `subscribe(channel, handler)`.
- Wire `/health/ready` to ping Redis.
- Two Redis clients managed (one for pub, one for sub) per ioredis pub/sub guidance.

**Scope (OUT).**
- Application-specific keyspace conventions (defined by the consuming step — e.g., lobby keys in S19, matchmaking keys in S34).

**Tasks.**
1. Add service to docker-compose.
2. Add env keys `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (zod-validated).
3. Implement `RedisService`.
4. Update `/health/ready` check.

**Acceptance.**
- [ ] `docker compose up redis` boots Redis; `RedisService.get/set` works in a quick unit test.
- [ ] `/health/ready` returns 503 when Redis is down.
- [ ] Pub-sub round-trip works in a unit test (`publish` → subscriber receives).

**Files.**
- Created: `apps/api/src/cache/cache.module.ts`, `apps/api/src/cache/redis.service.ts`, `apps/api/src/cache/redis.service.spec.ts`.
- Modified: `docker-compose.yml`, `apps/api/src/config/env.schema.ts`, `apps/api/src/health/**`.

**Avoid.**
- Using a single ioredis client for both publish and subscribe.
- Storing JSON via `JSON.stringify` ad-hoc in callers — centralize serialization in `RedisService`.

**Notes.**
- Default TTL convention: `null` = no expiry; set sensible defaults at each caller.

---

### S06 — Auth: Discord OAuth + Email Magic-Link
Type: backend
Depends on: S04
Blocks: S07, S08, S11, S19, S23
Est: 3d
Primary paths: `apps/api/src/auth/`, `libs/shared/src/auth/`

**Goal.** Issue session tokens for users authenticated via either Discord OAuth (production primary) or an email magic-link (development + standalone fallback users without Discord). Returns a JWT access token and an opaque rotating refresh token.

**Scope (IN).**
- `POST /auth/discord/callback` — exchanges Discord OAuth `code` for tokens, fetches the Discord user, upserts `User` and `AuthIdentity`, issues `{ accessToken, refreshToken }`. Token TTLs: access 15min, refresh 30d.
- `POST /auth/email/request` — accepts `email`, generates a single-use nonce stored in Redis (TTL 15min) keyed `magic:<nonce>`, logs the link in dev (no real email sender in MVP; gated behind env).
- `POST /auth/email/verify` — consumes nonce, issues tokens.
- `POST /auth/refresh` — rotates refresh tokens.
- `POST /auth/logout` — revokes the current session.
- `JwtAuthGuard` and `@CurrentUser()` decorator for downstream controllers.
- DTOs and zod schemas in `libs/shared/src/auth/`.

**Scope (OUT).**
- Frontend integration (S11).
- Friends / profile endpoints (S08).
- Production-grade email delivery — log-only is acceptable for MVP, replaced later.

**Tasks.**
1. Install Discord OAuth dependencies (`passport-discord` or direct fetch; prefer direct fetch — Passport is overkill).
2. Implement the four endpoints + guards + decorator.
3. Sign JWTs with `JWT_SECRET` env (HS256 fine for MVP; switch to KMS later).
4. Hash refresh tokens with argon2 before storing in `Session.refreshTokenHash`.
5. Unit tests covering: happy path, expired nonce, replay attack on refresh token (must invalidate the session), Discord API failure.

**Acceptance.**
- [ ] `POST /auth/discord/callback` with a mocked Discord token endpoint creates a `User` row on first login and reuses it on second.
- [ ] `POST /auth/email/request` then `POST /auth/email/verify` returns a valid access/refresh pair.
- [ ] `POST /auth/refresh` with a valid token returns a new pair and invalidates the previous refresh token row.
- [ ] Reusing a rotated refresh token returns 401 and revokes the entire session chain.
- [ ] `JwtAuthGuard` rejects requests without `Authorization: Bearer <jwt>` with 401.
- [ ] zod schemas for request/response bodies exported from `libs/shared`.

**Files.**
- Created: `apps/api/src/auth/**`, `libs/shared/src/auth/index.ts`.
- Modified: `apps/api/src/config/env.schema.ts` (add `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`).

**Avoid.**
- Storing plaintext refresh tokens.
- Using `passport-*` for both providers — direct fetch is simpler and easier to test.
- Sending emails for real — the MVP logs the magic link to console.

**Notes.**
- Discord scopes for MVP: `identify` only. `email` is optional and not required for our flow.
- Refresh token rotation: every successful `/auth/refresh` creates a new `Session` row and revokes the old one. Detect reuse and revoke the user's whole chain.

---

### S07 — WebSocket Gateway Scaffold
Type: backend
Depends on: S06
Blocks: S19, S25, S27, S34
Est: 2d
Primary paths: `apps/api/src/realtime/`

**Goal.** Auth-tied Socket.IO gateway with room routing. Downstream realtime steps register namespaces / event handlers on top of this.

**Scope (IN).**
- Single Socket.IO server mounted at `/socket` (NestJS `@WebSocketGateway`).
- Connection handshake: client sends access token in `auth.token`; gateway verifies via the same JWT service used by HTTP routes. Unauthenticated sockets are disconnected.
- Per-connection bound `userId` accessible to handlers.
- Room helpers: `joinUserRoom(socket, userId)`, `joinLobbyRoom(socket, lobbyId)`, `joinMatchRoom(socket, matchId)`. Wrap socket.io rooms in named helpers so feature code never touches raw room names.
- Redis adapter (`@socket.io/redis-adapter`) so the API scales horizontally; uses the pub/sub clients from S05.
- A debug event `ping`/`pong` for liveness testing.

**Scope (OUT).**
- Any business events — lobbies (S19), match state (S25), chat (S27), matchmaking (S34) each add their handlers.

**Tasks.**
1. Add Socket.IO + Redis adapter.
2. Implement the gateway and the auth middleware.
3. Implement room helpers as a `RealtimeService`.
4. Add a unit test using `socket.io-client` against an in-process server.

**Acceptance.**
- [ ] A client connecting without `auth.token` is disconnected with an `unauthorized` error event.
- [ ] A client connecting with a valid token receives `connect` and can call `ping` to receive `pong`.
- [ ] Two API instances behind the Redis adapter can both broadcast to a shared room and the messages are received once per subscriber.
- [ ] Room helpers reject raw socket.io room names from feature code (enforce via a small wrapper, not lint).

**Files.**
- Created: `apps/api/src/realtime/**`.

**Avoid.**
- Reaching into `socket.rooms` from feature code.
- Multiple Socket.IO servers — one server, multiple namespaces if needed.

**Notes.**
- For OP TCG 1v1, the match room is `match:<matchId>`; the lobby room is `lobby:<lobbyId>`. Standardize this in helpers.

---

### S08 — User Profile & Friends API
Type: backend
Depends on: S04, S06
Blocks: S34, S35
Est: 2d
Primary paths: `apps/api/src/users/`, `libs/shared/src/users/`

**Goal.** REST endpoints for the current user's profile and friends list management. Downstream features (matchmaking, hub page) read from these.

**Scope (IN).**
- `GET /users/me` — current user.
- `PATCH /users/me` — update `displayName`, `locale`, `region` (regions enum from `libs/shared`).
- `GET /users/:id` — public profile (no email, no Discord ID).
- `GET /friends` — list of friends with status.
- `POST /friends` — `{ targetUserId }` creates a `pending` friendship.
- `PATCH /friends/:id` — accept or block.
- `DELETE /friends/:id` — remove or reject.
- All endpoints zod-validated; DTOs in `libs/shared`.

**Scope (OUT).**
- Online presence (S34 owns the Redis-backed presence set).
- Direct messages (not in MVP).

**Tasks.**
1. Define DTOs in `libs/shared`.
2. Implement `UsersController` + service.
3. Implement `FriendsController` + service. Enforce: no duplicate friendship rows; canonicalize user pair ordering (`userAId < userBId`) to make uniqueness trivial.
4. Unit tests for the friendship state machine.

**Acceptance.**
- [ ] `GET /users/me` requires auth; returns the authenticated user.
- [ ] Sending a duplicate friend request returns 409.
- [ ] A blocked friendship prevents new requests from either side.
- [ ] zod schemas in `libs/shared` are imported by `apps/web` without leaking server-only types.

**Files.**
- Created: `apps/api/src/users/**`, `apps/api/src/friends/**`, `libs/shared/src/users/index.ts`.

**Avoid.**
- Surfacing internal IDs (`AuthIdentity.id`, refresh token hashes) in public responses.

**Notes.**
- Region enum starter: `['NA-East', 'NA-West', 'SA', 'EU-West', 'EU-Central', 'APAC']`. Iterate later.

---

## Phase 2 — Frontend Foundation

### S09 — Angular Config Baseline
Type: frontend
Depends on: S01, S02
Blocks: S10, S11, S13, S20, S35
Est: 3d
Primary paths: `apps/web/src/app/`, `apps/web/src/environments/`

**Goal.** Bring `apps/web` up to the conventions in `ARCHITECTURE_GUIDELINES.md` so every later frontend step starts from a clean, opinionated base.

**Scope (IN).**
- `app.config.ts` with: `provideZonelessChangeDetection`, `provideRouter(routes, withComponentInputBinding(), withViewTransitions())`, `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, mockBackendInterceptor]))`, `provideAnimationsAsync()`, `provideTransloco`, `provideAnimations`, error handler.
- Angular Material installed and a base theme (light + dark) wired to a `data-theme` attribute on `<body>`.
- Folder skeleton per the guidelines: `core/`, `data/`, `layout/`, `pages/`, `shared/`.
- `core/config/` with `API_BASE_URL` injection token.
- `core/auth/` skeleton (filled in S11) and `core/errors/` (Notifier service, AppErrorHandler, AppError class) ready.
- `core/http/auth.interceptor.ts`, `core/http/error.interceptor.ts`, `core/http/mock-backend.interceptor.ts` stubs.
- `data/repositories/_base/crud.repository.ts` exactly as documented.
- `shared/utils/url-state.ts` exactly as documented.
- Transloco set up with `en` + `pt-BR` skeleton (translation files empty for now; keys added per feature).
- Environments: `environment.ts` (prod) and `environment.development.ts` (dev) with `apiBaseUrl`, `useMockBackend`, `discordClientId`.

**Scope (OUT).**
- Auth implementation (S11).
- Shell layout (S10).
- Discord Activity wrapper (S12).
- Reusable UI components (S13).

**Tasks.**
1. Delete the default `app.html` placeholder and replace with a minimal `<router-outlet>` + theme bootstrap.
2. Install Material, Transloco.
3. Implement the skeletons above. Most files compile to no-ops; later steps fill them.
4. Add `mockBackendInterceptor` that returns 501 by default — feature steps add per-endpoint mocks.

**Acceptance.**
- [ ] `nx serve web` renders an empty page (no errors).
- [ ] `nx build web --configuration production` succeeds.
- [ ] Toggling `data-theme="dark"` on `<body>` flips the Material theme.
- [ ] The folder tree matches Section 2 of `ARCHITECTURE_GUIDELINES.md`.
- [ ] Zero usages of `NgModule` in `apps/web`.
- [ ] An HTTP request through the stack passes through all three interceptors in order.

**Files.**
- Created: full skeleton under `apps/web/src/app/{core,data,layout,pages,shared}/`.
- Modified: `apps/web/src/main.ts`, `apps/web/src/app/app.config.ts`, `apps/web/src/styles.scss`, `apps/web/src/environments/**`.

**Avoid.**
- Adding feature directories now — keep `pages/` empty until S10/S20+.
- Importing Material modules globally; each component imports what it needs.

**Notes.**
- Per `ARCHITECTURE_GUIDELINES.md`, do **not** set `standalone: true` in decorators. Angular 21 defaults to standalone.

---

### S10 — Shell, Layout, Theme, i18n
Type: frontend
Depends on: S09
Blocks: S20, S23, S35
Est: 2d
Primary paths: `apps/web/src/app/layout/shell/`, `apps/web/src/app/pages/dashboard/`

**Goal.** App shell with a top bar, side nav, theme toggle, and language picker. This is the chrome every authenticated route renders inside.

**Scope (IN).**
- `Shell` standalone component (toolbar + sidenav + `<router-outlet>`).
- Top bar with: app logo, theme toggle, language picker, profile menu (Sign Out only for now — Auth comes in S11).
- Side nav with placeholder links: Dashboard, Game Hubs, Tournaments, Friends.
- Theme toggle persists in `localStorage` (`theme:preference`).
- Language picker calls `TranslocoService.setActiveLang`.
- Empty `Dashboard` page (placeholder).

**Scope (OUT).**
- Auth state in the profile menu (filled by S11).
- Real content for any of the side-nav links (filled later).

**Tasks.**
1. Implement `Shell` per the smart-component conventions.
2. Implement `Dashboard` placeholder.
3. Add routes `''` → `dashboard`, with the shell as a parent route (no guards yet — added in S11).

**Acceptance.**
- [ ] `nx serve web` loads `Shell` with the sidenav, toolbar, and a "Dashboard" page.
- [ ] Theme toggle flips between light and dark and survives reload.
- [ ] Language toggle between `en` and `pt-BR` changes the toolbar labels.
- [ ] No `@Input`/`@Output` decorators in the new code.

**Files.**
- Created: `apps/web/src/app/layout/shell/**`, `apps/web/src/app/pages/dashboard/**`.

**Avoid.**
- Hardcoding strings — use Transloco for every visible string.

**Notes.**
- Use Material `mat-sidenav` with `mode="side"` on desktop and `mode="over"` on mobile (`BreakpointObserver`).

---

### S11 — Frontend Auth (Discord OAuth + Embedded SDK)
Type: frontend
Depends on: S06, S09
Blocks: S12, S20, S34
Est: 3d
Primary paths: `apps/web/src/app/core/auth/`, `apps/web/src/app/pages/login/`

**Goal.** A single `Auth` service that detects whether the app is running as a Discord Activity or standalone, and uses the appropriate sign-in flow. Downstream code calls `auth.isAuthenticated()` without caring about the context.

**Scope (IN).**
- `AppContext` service: detects Discord Activity context by inspecting `window.location` (Discord's `frame_id` query param) and the presence of the embedded SDK. Exposes `mode = signal<'discord-activity' | 'standalone'>(…)`.
- `Auth` service:
  - In `standalone`: full OAuth code flow — redirect to Discord's authorize URL, callback page exchanges the code with `POST /auth/discord/callback`, stores access + refresh tokens in `localStorage` (access) and httpOnly is N/A here — use `localStorage` for both with refresh rotation as the integrity mechanism (acceptable for MVP). Email magic link as fallback (`POST /auth/email/request` then `POST /auth/email/verify` via a token in a query param).
  - In `discord-activity`: uses `@discord/embedded-app-sdk` `authorize` + `authenticate` to acquire a Discord access token, then exchanges it via `POST /auth/discord/callback`. No redirects, no separate callback page.
  - Both flows resolve to the same internal state: `accessToken`, `refreshToken`, `currentUser` signals.
  - Token rotation: a single timer refreshes 1 minute before expiry; `signOut()` revokes refresh on the backend.
- Login page (standalone only) with two buttons: "Sign in with Discord" and "Sign in with email".
- `authGuard`, `guestGuard` per the guidelines.
- `authInterceptor` implemented (was a stub in S09).
- `errorInterceptor` handles 401 by calling `auth.signOut()` and redirecting to `/login` — but only in standalone mode; in Discord Activity it shows a "session expired" snackbar.

**Scope (OUT).**
- Discord SDK initialization details outside auth (S12).
- Profile editing UI (later, optional).

**Tasks.**
1. Implement `AppContext`.
2. Implement `Auth` with both flows.
3. Implement `/login` page (used only in standalone mode).
4. Wire guards on the shell route.
5. Unit tests for `Auth` with mocked HTTP and a mocked Discord SDK.

**Acceptance.**
- [ ] Visiting `/dashboard` while unauthenticated in standalone mode redirects to `/login` with a `returnUrl`.
- [ ] Completing the OAuth flow in standalone returns to `returnUrl`.
- [ ] In a stub Discord Activity context (mocked `frame_id` + mocked SDK), the user is authenticated without ever seeing `/login`.
- [ ] A 401 from any API call signs the user out (standalone) or shows a snackbar (activity).
- [ ] Refresh token rotation runs 1 minute before expiry without dropping the session.

**Files.**
- Created: `apps/web/src/app/core/auth/**`, `apps/web/src/app/pages/login/**`.
- Modified: interceptor stubs from S09.

**Avoid.**
- Storing access tokens anywhere else than `Auth` state + localStorage.
- Branching on `AppContext.mode()` outside `Auth` — other code should not need to know which mode it's in.

**Notes.**
- Discord Embedded SDK installation: `npm i @discord/embedded-app-sdk`. Pin the version; the SDK is evolving.
- The redirect URL for the OAuth code flow must be allow-listed in the Discord application config.

---

### S12 — Discord Activity Wrapper & Manifest
Type: frontend
Depends on: S11
Blocks: —
Est: 2d
Primary paths: `apps/web/src/app/core/discord/`, `apps/web/discord-manifest.json`, `apps/web/src/index.html`

**Goal.** Wire up the Discord Embedded SDK lifecycle (ready, subscriptions, channel info, voice activity) and produce a deployable Discord Activity manifest. After this step, the same Angular app can be loaded inside a Discord voice channel as an Activity.

**Scope (IN).**
- `DiscordEmbedded` service: wraps the SDK; provides `ready` signal, `channelId` signal, `voiceParticipants` signal, `currentUser` from the SDK.
- Initializes the SDK on app bootstrap **only when** `AppContext.mode() === 'discord-activity'`.
- Adds the Discord URL mapping configuration in the index.html (`<meta>` tags) and any required asset whitelisting for the Activity.
- A `discord-manifest.json` describing the Activity (name, supported platforms, orientations, default size).
- Documentation in `apps/web/README.md`: how to register the Activity in the Discord developer portal, how to run a local Activity via a tunneling tool (Cloudflared) pointing at `nx serve web`.

**Scope (OUT).**
- Using Discord voice channels for in-match audio — we use LiveKit for that (S23 + S26). The Embedded SDK's voice channel data is read-only context.
- Discord-specific monetization rails.

**Tasks.**
1. Implement `DiscordEmbedded`.
2. Write `discord-manifest.json`.
3. Verify the app loads inside a Discord iframe using a tunneling tool.

**Acceptance.**
- [ ] Loading the app inside a stub Discord iframe (`?frame_id=test`) initializes the SDK without errors.
- [ ] `DiscordEmbedded.channelId()` exposes the voice channel ID provided by Discord.
- [ ] Loading the app outside of Discord (`/dashboard` directly) does not initialize the SDK.
- [ ] Documentation in `apps/web/README.md` is sufficient for an agent to spin up a local Activity.

**Files.**
- Created: `apps/web/src/app/core/discord/**`, `apps/web/discord-manifest.json`.
- Modified: `apps/web/README.md`.

**Avoid.**
- Loading the Discord SDK script unconditionally — gate it on `AppContext.mode()` to keep the standalone bundle clean.

**Notes.**
- The SDK's `URL Mapping` feature is required to allow LiveKit + Ximilar hosts. Document this clearly so a TO can self-host.

---

### S13 — Shared UI Primitives
Type: frontend
Depends on: S09
Blocks: S20, S17, S18, S35, S38
Est: 3d
Primary paths: `apps/web/src/app/shared/ui/`

**Goal.** Implement the reusable, stateless UI components that downstream pages compose. These are the exact components named in `ARCHITECTURE_GUIDELINES.md` Section 2.

**Scope (IN).**
- `PageHeader` — title, breadcrumb list, optional action button slot.
- `DataGrid<T>` — columns + rows + paging + sort + select; generic; emits `pageChange`, `sortChange`, `rowClick`.
- `FilterBar` — multi-field reactive filter form; inputs: schema of fields; outputs: `filterChange`.
- `StatusChip` — small badge with semantic colors.
- `EmptyState` — illustration slot + title + description + action.
- `ConfirmDialog` (service) — `confirm(opts)` returns Promise<boolean>.
- `GlobalSearch` — search input bound to a search service stub (no real backend yet).

**Scope (OUT).**
- Wiring any of these into a real page (each page step does that).
- Storybook (not in MVP).

**Tasks.**
1. Implement each component as standalone, OnPush, signal-based.
2. Write unit tests for each.
3. Add a single demo page (route-gated, `?demo=1`) that renders all of them with sample data — useful for downstream agents to copy.

**Acceptance.**
- [ ] Every component is standalone with OnPush.
- [ ] No `@Input`/`@Output` decorators anywhere.
- [ ] AXE passes on the demo page.
- [ ] Each component has a unit test covering its main interaction.

**Files.**
- Created: `apps/web/src/app/shared/ui/{page-header,data-grid,filter-bar,status-chip,empty-state,confirm-dialog,global-search}/**`.

**Avoid.**
- Letting these components fetch data or inject app services — they receive inputs only.

**Notes.**
- `DataGrid` should support both client-side and server-side paging via an `dataMode` input.

---

## Phase 3 — One Piece TCG Game Module

### S14 — Game-Module Interface (shared)
Type: shared
Depends on: S01
Blocks: S15, S16, S17, S25, S36
Est: 1d
Primary paths: `libs/shared/src/games/`

**Goal.** Define the contract every game module implements: card database source, board template, control widgets, formats, ban lists. Even though MVP ships only OP TCG, this interface keeps OP TCG specifics from leaking into engine/match/tournament code.

**Scope (IN).**
- `GameId` type alias (`'op-tcg'` initially).
- `GameModule` interface in TypeScript:
  ```ts
  interface GameModule {
    id: GameId;
    displayName: string;
    formats: FormatDefinition[];
    boardTemplate: BoardTemplate;
    controlWidgets: ControlWidgetSpec[];
    parseDeckList(text: string): DeckListParseResult;
    initialMatchState(format: FormatDefinition): MatchState;
    applyEvent(state: MatchState, event: MatchEvent): MatchState;
  }
  ```
- Supporting types: `FormatDefinition`, `BoardTemplate` (zones with coordinates), `ControlWidgetSpec` (kind + config), `MatchState` (game-agnostic structure of zones + counters + flags), `MatchEvent` (discriminated union: `'life_change'`, `'counter_change'`, `'phase_change'`, `'turn_pass'`, `'undo'`, …), `DeckListParseResult`.
- A registry pattern: `getGameModule(id: GameId): GameModule`. The OP TCG implementation registers in S16/S17.

**Scope (OUT).**
- The OP TCG implementation (S16/S17).
- Rules enforcement (we don't enforce rules at MVP; soft tracking only).

**Tasks.**
1. Write the types as zod schemas (so they double as runtime validators for network payloads).
2. Export the registry.
3. Add unit tests covering: parsing failures, deterministic `applyEvent` for trivial events.

**Acceptance.**
- [ ] `libs/shared` exports the interface and registry.
- [ ] `apps/api` and `apps/web` can both import the interface.
- [ ] A no-op `GameModule` fixture in tests validates the contract works.

**Files.**
- Created: `libs/shared/src/games/index.ts`, `libs/shared/src/games/types.ts`, `libs/shared/src/games/registry.ts`, `libs/shared/src/games/**.spec.ts`.

**Avoid.**
- Importing the OP TCG module from `libs/shared`. The registry is populated at app bootstrap (S16 wires it up).

**Notes.**
- This is the single most important architectural decision in the plan. Every later step depends on it.

---

### S15 — OP TCG Card Database Ingestion + Search API
Type: backend
Depends on: S04, S14
Blocks: S17, S22, S28, S30
Est: 3d
Primary paths: `apps/api/src/cards/`, `apps/api/scripts/ingest-op-cards.ts`

**Goal.** Ingest the One Piece TCG card data into Postgres and expose a search API. The ingest job is idempotent and re-runnable when sets are added.

**Scope (IN).**
- Pick one source: prefer a stable fan-maintained API or a public dataset. Document the source choice in the ingest script header. (e.g., `https://api.optcg.com` or an equivalent — agent should evaluate and pick at implementation time; document trade-offs.)
- `scripts/ingest-op-cards.ts`: downloads card data, normalizes to the `Card` model, upserts in batches of 500.
- `nx run api:cards:ingest` target.
- `GET /cards?gameId=op-tcg&query=&page=&pageSize=` — paged search by name (case-insensitive prefix + full-text). Returns the `Card` rows.
- `GET /cards/:id` — fetch a single card.
- Indexes: `(gameId, externalId)` unique, GIN trigram index on `name`.

**Scope (OUT).**
- Card recognition (S28+).
- Card images hosted by us — link to source URLs only.

**Tasks.**
1. Choose data source; document.
2. Write the ingest script with progress logging.
3. Run it once locally to load a starter set.
4. Implement controller + service.
5. Add indexes via a Prisma migration.

**Acceptance.**
- [ ] `nx run api:cards:ingest` populates `Card` rows; running it twice produces no diff.
- [ ] `GET /cards?gameId=op-tcg&query=lu` returns Luffy variants and is paginated.
- [ ] Looking up an unknown ID returns 404 via the problem+json filter.

**Files.**
- Created: `apps/api/src/cards/**`, `apps/api/scripts/ingest-op-cards.ts`, `apps/api/prisma/migrations/**`.

**Avoid.**
- Storing card images locally for MVP — store URLs.
- Hardcoding the source URL — keep it in env or a config file.

**Notes.**
- IP risk per BUSINESS_SPECS Section 11 — keep this fan-source-driven, surface attribution in the UI.

---

### S16 — OP TCG Board Template, Formats, Ban List
Type: shared
Depends on: S14
Blocks: S17, S22, S25
Est: 2d
Primary paths: `libs/shared/src/games/op-tcg/`

**Goal.** The non-UI half of the OP TCG game module: formats, board template, ban list config.

**Scope (IN).**
- `formats`: `[{ id: 'standard', displayName: 'Standard' }, { id: 'east', displayName: 'East' }, { id: 'west', displayName: 'West' }]`.
- `boardTemplate`: zones — `leader`, `characters[1..5]`, `stage`, `don-deck-active`, `don-deck-rested`, `deck`, `discard`, `trash`, `hand` (hand is hidden). Coordinates as percentages so layouts scale.
- `banList`: a JSON file under `libs/shared/src/games/op-tcg/banlists/` keyed by format. Empty arrays are fine to start.
- `initialMatchState`: per-format starting state (life = leader-specific, DON deck size 10, deck depending on format rules).
- `applyEvent`: pure reducer over `MatchEvent` for OP TCG specifics — DON attach/detach, counter values, attach effects.
- Register the module in the registry from S14.
- 100% unit-tested reducer.

**Scope (OUT).**
- Card list ingestion (S15).
- The UI widgets that operate on this state (S17).

**Tasks.**
1. Write the module.
2. Encode the OP TCG events as a discriminated union of `MatchEvent`s.
3. Test every event.

**Acceptance.**
- [ ] `getGameModule('op-tcg')` returns the populated module after app bootstrap.
- [ ] `applyEvent` is pure — same input always returns the same output.
- [ ] Ban-list file shape lets a TO drop in a JSON to update bans without code changes.

**Files.**
- Created: `libs/shared/src/games/op-tcg/{index.ts,formats.ts,board-template.ts,reducer.ts,banlists/standard.json}`.

**Avoid.**
- Branching `applyEvent` on `format` inside the reducer — keep formats data-driven.

**Notes.**
- Don't try to enforce rules. Players can mis-click; that's their problem (and undo + judge call exist).

---

### S17 — OP TCG Control Widgets (frontend)
Type: frontend
Depends on: S13, S16
Blocks: S25
Est: 3d
Primary paths: `apps/web/src/app/pages/match/widgets/op-tcg/`

**Goal.** The Angular widgets in the OP TCG control panel: leader life, DON!! deck (active / rested split), attached DON per character, counter values, turn/phase indicator.

**Scope (IN).**
- `LeaderLifeWidget` — life signal in/out; emits `LifeChange` events.
- `DonDeckWidget` — active/rested split with +/- buttons and "rest all" / "ready all" actions.
- `AttachedDonWidget` — per-character DON counters.
- `CounterValuesWidget` — show face-down counter values on demand.
- `TurnPhaseWidget` — current phase indicator + "next phase" button + "pass turn" button.
- All widgets read state from a shared `MatchStateStore` signal-based service (defined in S25's contract, stubbed here behind an interface so S17 and S25 can be developed in parallel).

**Scope (OUT).**
- Wiring widgets to the realtime state sync (S25 does that).
- Universal widgets (dice, coin) — S18.

**Tasks.**
1. Implement the widgets following the dumb-component pattern.
2. Visual test: a `?demo=1` route shows the widget panel with mocked state.

**Acceptance.**
- [ ] Each widget is standalone OnPush.
- [ ] AXE passes on the widget panel demo.
- [ ] Increment/decrement controls have keyboard shortcuts (`+`/`-`) and aria-labels.
- [ ] Widgets emit events; they do not mutate state directly.

**Files.**
- Created: `apps/web/src/app/pages/match/widgets/op-tcg/**`.

**Avoid.**
- Coupling widgets to a specific transport (WebSocket etc.) — they emit events; the page wires those events to the gateway in S25.

**Notes.**
- Use Material `mat-icon-button` with explicit `aria-label`s. Tournament players use these widgets a lot — keyboard speed matters.

---

### S18 — Universal Widgets
Type: frontend
Depends on: S13
Blocks: S25
Est: 2d
Primary paths: `apps/web/src/app/pages/match/widgets/universal/`

**Goal.** Game-agnostic widgets reused across all TCGs (we only have OP TCG today, but the contract stays game-agnostic per S14).

**Scope (IN).**
- `DiceWidget` — n-sided (4, 6, 8, 10, 12, 20, or custom).
- `CoinFlipWidget` — visible animation, deterministic result over the wire.
- `CustomCounterWidget` — labeled, +/- counters; multi-instance per match.
- `TurnTimerWidget` — countdown, configurable per format.
- `ChessClockWidget` — two-side time tracker; switches on turn pass.
- `UndoButton` — undoes the last applied `MatchEvent` (the reducer in S14 must support reverse events).

**Scope (OUT).**
- Rolling dice / flipping coins must be **server-authoritative** — that wiring lives in S25 (the widgets here emit "request roll" events).

**Tasks.**
1. Implement widgets following S13 conventions.
2. Demo page integration.

**Acceptance.**
- [ ] All widgets are standalone OnPush.
- [ ] AXE passes.
- [ ] `ChessClockWidget` accurately tracks across 5-minute simulated turns in a unit test (use fake timers).

**Files.**
- Created: `apps/web/src/app/pages/match/widgets/universal/**`.

**Avoid.**
- Doing client-side RNG that affects game state — the server rolls. Widgets only request and render.

**Notes.**
- `UndoButton` must be a single-step undo for MVP, not a history stack. The reducer keeps the last event in a small history.

---

## Phase 4 — Lobby & Pre-Game

### S19 — Lobby Backend
Type: backend
Depends on: S05, S06, S07
Blocks: S20, S22, S27, S34, S36
Est: 3d
Primary paths: `apps/api/src/lobbies/`, `libs/shared/src/lobbies/`

**Goal.** Create / list / join / leave 1v1 lobbies. State lives in Redis (volatile) and is mirrored to Postgres only on key transitions (lobby created, lobby destroyed, match started).

**Scope (IN).**
- `POST /lobbies` — `{ gameId, format, timeLimit, bestOf, visibility: 'public' | 'private' | 'unlisted' }`. Host is the creator.
- `GET /lobbies?gameId=&visibility=public` — list of public lobbies.
- `GET /lobbies/:id` — single lobby, only if caller is host, participant, invited, or visibility allows it.
- `POST /lobbies/:id/join` — joins as the second player. Errors if full or visibility forbids.
- `POST /lobbies/:id/leave` — leaves; if host leaves, lobby is destroyed.
- `POST /lobbies/:id/start` — host-only; transitions to `match-ready` state, creates a `Match` row, returns matchId.
- Realtime events on `lobby:<id>` room: `lobby:updated`, `lobby:user-joined`, `lobby:user-left`, `lobby:destroyed`, `lobby:match-started`.
- Public lobby list cached in Redis with a short TTL (5s) and invalidated on any mutation.

**Scope (OUT).**
- Lobby UI (S20).
- Pre-game checklist server logic (mostly client-side; S21).
- Deck list submission (S22).

**Tasks.**
1. Implement controllers, service, and zod DTOs.
2. Redis keys convention: `lobby:<id>` (hash), `lobby:public:<gameId>` (sorted set by createdAt).
3. Hook realtime events through the gateway from S07.

**Acceptance.**
- [ ] Creating a lobby returns a UUID and writes it to Redis + Postgres.
- [ ] A second user joining triggers `lobby:user-joined` on the lobby room.
- [ ] Host leaving destroys the lobby and triggers `lobby:destroyed`.
- [ ] Listing public lobbies returns paginated results.
- [ ] Calling `/start` creates a `Match` row and emits `lobby:match-started` with the matchId.

**Files.**
- Created: `apps/api/src/lobbies/**`, `libs/shared/src/lobbies/index.ts`.

**Avoid.**
- Long-running locks in Redis — use optimistic updates with `WATCH/MULTI/EXEC`.

**Notes.**
- 1v1 only for MVP. Validate `participantCount === 2` at start.

---

### S20 — Lobby UI (Create, Browse, Join)
Type: frontend
Depends on: S10, S11, S19
Blocks: S21, S35
Est: 3d
Primary paths: `apps/web/src/app/pages/lobby/`

**Goal.** The frontend pages for creating a lobby, browsing public lobbies, and joining one. Wires Socket.IO events from S19 into signals so the UI reacts live.

**Scope (IN).**
- `LobbyList` page (`/lobbies`) — `DataGrid` of public lobbies for OP TCG, with filter bar (format, time limit).
- `LobbyCreate` page (`/lobbies/new`) — reactive form: game (fixed to OP TCG for MVP), format, time limit, best-of, visibility. Submits → navigates to lobby room.
- `LobbyRoom` page (`/lobbies/:id`) — participants list, host controls (Start match), Leave button. Subscribes to `lobby:<id>` events via Socket.IO.
- `lobbies.routes.ts` per the conventions (list / new / :id).
- Repository: `LobbiesRepository extends CrudRepository<Lobby>`.

**Scope (OUT).**
- Pre-game checklist (S21).
- Deck list registration (S22).

**Tasks.**
1. Implement pages and routes.
2. Add a Socket.IO client service `RealtimeClient` (one connection per Auth'd session; re-uses access token).
3. Wire `LobbyRoom` to lobby events.

**Acceptance.**
- [ ] Creating a lobby navigates to its room and shows the host.
- [ ] In a second browser, joining the lobby from `/lobbies` causes both rooms to show two participants instantly.
- [ ] Host clicks Start → both users navigate to `/match/:matchId`.
- [ ] All visible text is translated.
- [ ] AXE passes on each page.

**Files.**
- Created: `apps/web/src/app/pages/lobby/**`, `apps/web/src/app/data/repositories/lobbies.repository.ts`, `apps/web/src/app/core/realtime/realtime-client.ts`.

**Avoid.**
- Polling `/lobbies/:id` — the realtime channel is the source of truth.

**Notes.**
- `RealtimeClient` is reused by S25 and S27 — make it generic over event maps.

---

### S21 — Pre-Game Checklist UI
Type: frontend
Depends on: S20
Blocks: S23
Est: 2d
Primary paths: `apps/web/src/app/pages/lobby/lobby-room/pregame-checklist/`

**Goal.** Embedded in the `LobbyRoom` after both players have joined: a checklist both must complete before Start unlocks. Camera framing self-check, audio check, proxy policy agreement, optional rule-zero notes.

**Scope (IN).**
- Local-only camera framing preview: shows the user's overhead camera feed and a sketch overlay of the "board zone" they must fit. Player clicks "Looks good".
- Audio level meter (Web Audio API). Player clicks "I hear myself".
- Proxy policy checkbox.
- Rule-zero notes textarea (max 500 chars).
- Both players' checklist state visible to each other via realtime events (`lobby:checklist-update`).
- Host's "Start match" button is disabled until both checklists are complete.

**Scope (OUT).**
- Anti-cheat CV check during the match (S31).
- Deck list (S22).

**Tasks.**
1. Implement the checklist component.
2. Add `lobby:checklist-update` events through the lobby room (server passthrough — no validation).

**Acceptance.**
- [ ] The camera preview correctly requests permission and shows the player's video.
- [ ] The audio meter visualizes mic input.
- [ ] Start button enables only when both players' checklists are done.
- [ ] Refreshing the page preserves the user's checklist state (lobby-side cache).
- [ ] AXE passes.

**Files.**
- Created: `apps/web/src/app/pages/lobby/lobby-room/pregame-checklist/**`.
- Modified: `apps/api/src/lobbies/lobbies.gateway.ts` (event passthrough).

**Avoid.**
- Recording video from the preview — preview only.

**Notes.**
- The preview can fail (no camera permission). Render an `EmptyState` with instructions.

---

### S22 — OP TCG Deck List Parser + Deck Registration
Type: backend+frontend
Depends on: S04, S15, S20
Blocks: S38
Est: 3d
Primary paths: `libs/shared/src/games/op-tcg/deck-parser.ts`, `apps/api/src/decks/`, `apps/web/src/app/pages/decks/`

**Goal.** Parse and validate OP TCG deck lists in a format-aware way; let users register decks against their account; surface deck pick UI inside the lobby room.

**Scope (IN).**
- Deck list grammar: one line per card, format `<count> <name> [<set>-<number>]`. Tolerant to extra spaces and case.
- `parseDeckList(text, format)` in the OP TCG module (from S16 — extend it here).
- Validation: 50-card deck rule, 1 leader, max 4 copies per non-leader card, ban-list filter.
- `POST /decks`, `GET /decks`, `DELETE /decks/:id` REST endpoints.
- Frontend: `DecksList` page, `DeckForm` page (paste text → live-parsed preview → save).
- Inside the lobby room, a "Pick deck" dropdown lets each player select one of their decks. Selection broadcast via `lobby:deck-selected`. Decklists remain private until tournament rules require reveal (out of scope for MVP — visibility flag wired but always private at launch).

**Scope (OUT).**
- Tournament-time deck reveal (S38 connects this).
- Deck stats / win-rate analytics (cut).

**Tasks.**
1. Implement parser with unit tests covering valid lists, ban list rejection, count violations.
2. Build REST endpoints.
3. Build deck CRUD UI.
4. Wire deck selection into lobby room.

**Acceptance.**
- [ ] Pasting a known-good deck list shows a green check and a card-by-card breakdown with images.
- [ ] Banned card produces a specific error message naming the card.
- [ ] Saving a deck round-trips to the API and shows up in the list.
- [ ] A user with no saved decks sees an `EmptyState`.

**Files.**
- Created: `libs/shared/src/games/op-tcg/deck-parser.ts`, `apps/api/src/decks/**`, `apps/web/src/app/pages/decks/**`, `apps/web/src/app/data/repositories/decks.repository.ts`.

**Avoid.**
- Building a full deck-builder UI — paste-only is fine for MVP.

**Notes.**
- Card resolution: parser first matches by `setCode-number`, falls back to `name`. Ambiguous names return errors with candidates.

---

## Phase 5 — Realtime Match

### S23 — LiveKit Integration (Rooms + Tokens)
Type: backend+frontend
Depends on: S06, S10
Blocks: S24, S26, S31
Est: 3d
Primary paths: `apps/api/src/media/`, `apps/web/src/app/core/media/`

**Goal.** Provision LiveKit rooms server-side and mint short-lived JWT tokens for clients. Frontend joins rooms via `livekit-client`.

**Scope (IN).**
- Backend `MediaService`: creates/destroys LiveKit rooms; mints participant tokens with permissions (`canPublish`, `canSubscribe`).
- `POST /media/rooms/:matchId/token` — caller must be a participant of the match; returns `{ url, token }`.
- Frontend `MediaClient` service: handles `connect`, `disconnect`, `localTracks`, `remoteParticipants` (signals).
- Local track helpers: enable/disable camera, mic; switch camera device.

**Scope (OUT).**
- Layouts (S24).
- Voice controls UX (S26).
- Anti-cheat CV (S31).

**Tasks.**
1. Spin up a LiveKit Cloud project (free tier OK for dev); add credentials to env (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_HOST`).
2. Implement `MediaService` and `/media/rooms/:matchId/token`.
3. Implement `MediaClient`.

**Acceptance.**
- [ ] Two browsers joining a match can publish and subscribe to each other's camera + mic.
- [ ] Tokens expire after 1 hour and can be refreshed.
- [ ] Disabling the camera on one client is observable on the other.
- [ ] If the requester is not a match participant, `/media/rooms/:matchId/token` returns 403.

**Files.**
- Created: `apps/api/src/media/**`, `apps/web/src/app/core/media/**`.

**Avoid.**
- Long-lived tokens.
- Storing tokens server-side — they're issued on demand.

**Notes.**
- LiveKit will be used for both video and audio. No Discord voice for in-match audio (per BUSINESS_SPECS — Discord is the social layer; LiveKit owns match media).

---

### S24 — Stream Layouts (Board + Face Cam)
Type: frontend
Depends on: S23
Blocks: S30, S31
Est: 3d
Primary paths: `apps/web/src/app/pages/match/streams/`

**Goal.** Render up to two streams per player (board cam required, face cam optional) in selectable layouts. This is where players spend the match — UX matters.

**Scope (IN).**
- Local stream selection: the user picks which camera is "board" and which is "face". Stored in localStorage.
- Layout options: `grid`, `focused` (active player's board large + others as PiP), `spotlight` (any chosen stream large).
- Stream tile components with overlays: player name, life total (from match state in S25), DON counter, click overlay for tap-to-identify (S30).
- Layout switcher persists per user in localStorage.

**Scope (OUT).**
- Tap-to-identify behavior (S30 wires the click overlay).
- Broadcaster mode (cut from MVP).

**Tasks.**
1. Build layout components.
2. Subscribe to remote participants via `MediaClient` and render their tracks.
3. AXE pass — focus rings on layout switcher.

**Acceptance.**
- [ ] Joining a match with both players publishing camera shows 2 board streams + 2 face streams (4 tiles) in the grid layout.
- [ ] Switching to spotlight layout enlarges the chosen tile and PiP's the others.
- [ ] Layout choice persists across reload.

**Files.**
- Created: `apps/web/src/app/pages/match/streams/**`.

**Avoid.**
- Hard-coding 1v1 — layouts should accept N participants even if MVP only uses 2.

**Notes.**
- Use CSS Grid for the grid layout; absolute positioning only for PiP overlays.

---

### S25 — Realtime Match State Sync
Type: backend+frontend
Depends on: S07, S17, S18
Blocks: S30, S31, S32, S33
Est: 4d
Primary paths: `apps/api/src/matches/`, `apps/web/src/app/pages/match/state/`

**Goal.** Server-authoritative match state. Players emit `MatchEvent`s; server validates (only the right user can emit specific events), applies via the game module reducer, and broadcasts the new state to the match room.

**Scope (IN).**
- Backend `MatchesService` + gateway namespace: handles `match:event` events from clients, applies through `getGameModule(gameId).applyEvent`, persists state snapshots to Postgres every N events or every 5s (whichever first), broadcasts `match:state` snapshots.
- Server-authoritative RNG: `dice:roll` and `coin:flip` requests are translated to `MatchEvent`s with deterministic IDs and seeded results.
- Frontend `MatchStateStore` (Angular service): signal of `MatchState`, methods to emit events; subscribes to `match:state` snapshots.
- Conflict resolution: server uses last-write-wins per zone, but events include a `clientEventId` so clients can detect ack vs reject.
- Match lifecycle: `created` → `playing` → `awaiting-result` → `finalized`. Transitions via specific events.

**Scope (OUT).**
- Match outcome confirmation (S33).
- Replay buffer (S32).

**Tasks.**
1. Define event types in `libs/shared`.
2. Implement gateway handlers + service.
3. Implement `MatchStateStore` + wire all widgets from S17/S18 into it (they were stubbed against an interface).
4. Persistence layer.

**Acceptance.**
- [ ] Two clients playing emit life-change events; both see the same state within 200ms (LAN test).
- [ ] A spectator joining mid-match receives the current snapshot immediately.
- [ ] Reloading the page during a match restores state from the latest snapshot + outstanding events.
- [ ] Server rolls dice; both clients see the same result; one client's clock skew doesn't desync.
- [ ] Undo applies a server-side reverse of the last event.

**Files.**
- Created: `apps/api/src/matches/**`, `apps/web/src/app/pages/match/state/**`, plus event types in `libs/shared/src/games/`.

**Avoid.**
- Client-authoritative RNG.
- Broadcasting full snapshots on every event — diff snapshots or send events with a periodic snapshot.

**Notes.**
- Match snapshots are large-ish (~10KB); persist as JSONB in Postgres.

---

### S26 — Voice Chat Controls
Type: frontend
Depends on: S23
Blocks: —
Est: 2d
Primary paths: `apps/web/src/app/pages/match/voice/`

**Goal.** The voice controls UX on top of LiveKit audio tracks: mute opponent / table / spectators independently, push-to-talk vs open-mic toggle, RNNoise toggle, device picker.

**Scope (IN).**
- A floating "voice tray" component during a match.
- PTT key binding (Space) using `host` listeners — no `@HostListener` (per AGENTS.md).
- RNNoise integration — use LiveKit's built-in noise suppression or a wasm RNNoise module.
- Mute targets stored per-match in localStorage.

**Scope (OUT).**
- Backend changes — none, LiveKit handles audio routing.

**Tasks.**
1. Implement the voice tray.
2. PTT key handling.
3. RNNoise toggle.

**Acceptance.**
- [ ] Muting the opponent stops their audio without affecting one's own publish.
- [ ] PTT mode only publishes audio while Space is held.
- [ ] RNNoise toggle affects audio quality measurably in a recorded test.
- [ ] AXE: all controls reachable by keyboard, named with `aria-label`.

**Files.**
- Created: `apps/web/src/app/pages/match/voice/**`.

**Avoid.**
- Pulling new audio dependencies — prefer LiveKit's built-ins.

**Notes.**
- Defaults per BUSINESS_SPECS: PTT in tournaments, open-mic in casual.

---

### S27 — In-Match Text Chat + Quick Emotes
Type: backend+frontend
Depends on: S07, S20
Blocks: —
Est: 2d
Primary paths: `apps/api/src/chat/`, `apps/web/src/app/pages/match/chat/`

**Goal.** Lightweight chat in the match room with a quick-emote palette.

**Scope (IN).**
- Gateway events: `match:chat:send`, `match:chat:message`.
- Quick emotes (string IDs): `gg`, `gh`, `n1`, `mulligan`. Translated client-side.
- Rate limiting per user (5 messages / 5s) using Redis.
- Persistence: optional — keep last 100 messages in Redis only; not in Postgres (chat is ephemeral for MVP).
- Spectators in the match room receive a separate chat channel `match:chat:spectator:*` (used in S33's spectator surfaces).

**Scope (OUT).**
- Cross-match chat / friends DMs (not in MVP).
- Profanity filter (deferred).

**Tasks.**
1. Implement chat events.
2. Frontend chat sidebar.
3. Emote palette.

**Acceptance.**
- [ ] Sending a message appears on both clients within 200ms.
- [ ] Rate limit kicks in at 6 messages in 5s with a clear error.
- [ ] Spectators can't see player-to-player chat.

**Files.**
- Created: `apps/api/src/chat/**`, `apps/web/src/app/pages/match/chat/**`.

**Avoid.**
- Persisting chat to Postgres for MVP.

**Notes.**
- Use a small fixed emote set; iterate post-launch.

---

## Phase 6 — Card Recognition

### S28 — Card Recognition: Backend Interface + Mock
Type: backend
Depends on: S15
Blocks: S29, S30, S31
Est: 2d
Primary paths: `apps/api/src/recognition/`

**Goal.** Define the `CardRecognitionProvider` interface and ship a deterministic Mock adapter so the frontend tap-to-identify work in S30 can proceed without vendor cost or signup.

**Scope (IN).**
- Interface:
  ```ts
  interface CardRecognitionProvider {
    identify(input: { gameId: GameId; imageBase64: string; region?: BBox }): Promise<{
      candidates: Array<{ cardId: string; confidence: number }>;
      requestId: string;
    }>;
  }
  ```
- `MockCardRecognitionProvider` — selects up to 3 random `Card` rows for the given gameId, returns them with synthetic confidences. Deterministic when seeded with a hash of the imageBase64 prefix (so reloads are stable in tests).
- `RecognitionModule` exposing `POST /recognition/identify`, gated by `CardRecognitionProvider`.
- Env switch `CV_PROVIDER=mock|ximilar`.
- Audit log: every identify call logged with `userId, matchId, confidence, top1CardId`.

**Scope (OUT).**
- Ximilar adapter (S29).
- Frontend usage (S30).

**Tasks.**
1. Define interface + DTOs in `libs/shared`.
2. Implement `MockCardRecognitionProvider`.
3. Wire env switch.

**Acceptance.**
- [ ] `POST /recognition/identify` with a 1-pixel image returns 3 mock candidates (with `CV_PROVIDER=mock`).
- [ ] Mock results are deterministic for the same input.
- [ ] Audit log lines appear with the expected fields.

**Files.**
- Created: `apps/api/src/recognition/**`, `libs/shared/src/recognition/index.ts`.

**Avoid.**
- Adding rate limits per IP — that's S29's job; mock is for dev.

**Notes.**
- Image payload size: cap at 2MB; reject larger.

---

### S29 — Card Recognition: Ximilar Adapter
Type: backend
Depends on: S28
Blocks: —
Est: 2d
Primary paths: `apps/api/src/recognition/ximilar/`

**Goal.** The production card recognition adapter using Ximilar's Collectibles Recognition API.

**Scope (IN).**
- Ximilar HTTP client (signed with `XIMILAR_API_KEY`).
- Implement `CardRecognitionProvider.identify` against Ximilar's `/v2/...` endpoint (exact path per their docs at implementation time — agent must read Ximilar docs and document the chosen endpoint).
- Map Ximilar's response to our shape; resolve their card identifiers to our `Card.externalId`. If a Ximilar match has no local card, return it with `cardId = null` and a `name` hint instead.
- Caching: hash the imageBase64, look up Ximilar response in Redis with a 24h TTL.
- Rate limiting per user (e.g., 60/min). Per-match limit higher (300/min) because the act of identifying is a click action.

**Scope (OUT).**
- Frontend wiring (S30).
- In-house ML — explicitly deferred.

**Tasks.**
1. Spike Ximilar's API; document the chosen endpoint and any quirks in a `README.md` next to the adapter.
2. Implement adapter + tests with a recorded fixture (avoid hitting Ximilar in CI).
3. Wire env switch.

**Acceptance.**
- [ ] `CV_PROVIDER=ximilar` with a real key returns sensible candidates for a known card image (manual smoke test).
- [ ] Repeated identical requests are cache hits (verified by log).
- [ ] Rate limits return 429 with a `Retry-After` header.

**Files.**
- Created: `apps/api/src/recognition/ximilar/**`.

**Avoid.**
- Streaming the user's camera feed to Ximilar — single frame on click only.

**Notes.**
- Watch for Ximilar's terms (rate, image retention). Document any constraints.

---

### S30 — Tap-to-Identify Frontend Flow
Type: frontend
Depends on: S24, S28
Blocks: —
Est: 3d
Primary paths: `apps/web/src/app/pages/match/recognition/`

**Goal.** User clicks anywhere on a stream tile → a frame is captured, sent to the backend, and a panel shows the top-3 candidates with confidence. Also: search-by-name fallback, lookup history sidebar, and a pin-card persistent marker.

**Scope (IN).**
- Click overlay on each stream tile that captures the current frame at the click coordinates with a 30%-of-frame bounding box; sends `imageBase64 + region` to `/recognition/identify`.
- Result panel: card art (large), full rules text, set/number, top-3 candidates with confidence; "this isn't it — search by name" link.
- Search-by-name page: `/cards/search?q=` with a `DataGrid` over `GET /cards`.
- Lookup history sidebar: every successful identification this match (max 50 entries), click to re-open card details.
- Pin a card: pin button on the result panel attaches a small badge to the click location on the stream tile that persists for the rest of the match. Pins are local-only (not synced across players) for MVP — note this in UX copy.

**Scope (OUT).**
- Server-side image processing optimizations (S29's caching is enough).
- Cross-player pin sharing.

**Tasks.**
1. Stream click overlay → frame capture (`HTMLVideoElement` → `<canvas>` → base64 PNG; quality knob).
2. Identify call + result panel UI.
3. Card search page.
4. Lookup history sidebar.
5. Pin marker overlay.

**Acceptance.**
- [ ] Clicking a stream produces a panel within ~1s in mock mode.
- [ ] Low-confidence results show a banner suggesting search-by-name.
- [ ] History sidebar persists across page reloads within the same match.
- [ ] Pin marker stays positioned correctly when the layout switches.

**Files.**
- Created: `apps/web/src/app/pages/match/recognition/**`, `apps/web/src/app/pages/cards/**`, `apps/web/src/app/data/repositories/cards.repository.ts`.

**Avoid.**
- Sending high-resolution full frames — downscale to 720p before encoding.

**Notes.**
- Frame capture from a `MediaStreamTrack` published by a remote LiveKit participant requires care — read LiveKit's `attach()` + canvas drawing docs.

---

## Phase 7 — Match Outcome & Integrity

### S31 — Board Visibility Anti-Cheat Check
Type: backend+frontend
Depends on: S24, S28
Blocks: —
Est: 3d
Primary paths: `apps/api/src/anti-cheat/`, `apps/web/src/app/pages/match/anti-cheat/`

**Goal.** Periodic check that each player's declared board zone is visible in their overhead stream. Toggling the camera or pointing it away triggers a warning; in tournament mode, repeated violations can trigger auto-loss.

**Scope (IN).**
- Frontend captures a 480p board frame every 30s and sends to `POST /anti-cheat/board-visibility-check`.
- Backend uses the CV provider to run a "is this a top-down playmat scene?" heuristic. MVP: use Mock provider returning `pass` unless the image is mostly one color (covered camera). Real visibility check delegated to a future step — MVP just detects covered/blank camera.
- If `fail`: backend emits `anti-cheat:warning` on the match room. After 3 strikes in a match, in tournament mode it emits `anti-cheat:auto-loss` and finalizes the match.
- Frontend toast on warnings, modal on auto-loss with judge-appeal link (judge call comes in S32).

**Scope (OUT).**
- Sophisticated CV — covered-camera detection only for MVP.
- Tournament-only enforcement nuances beyond strike count.

**Tasks.**
1. Implement endpoint + simple covered-camera heuristic (mean pixel variance threshold).
2. Strike counter in Redis.
3. Frontend capture loop + UI.

**Acceptance.**
- [ ] Covering the camera during a casual match shows a warning toast.
- [ ] Three consecutive failures in a tournament match emit `anti-cheat:auto-loss` and finalize the match record.
- [ ] Disabling the check via a hidden dev flag works in dev only.

**Files.**
- Created: `apps/api/src/anti-cheat/**`, `apps/web/src/app/pages/match/anti-cheat/**`.

**Avoid.**
- Streaming continuous video for anti-cheat — sample-only.

**Notes.**
- This is intentionally weak at MVP. BUSINESS_SPECS Section 11 acknowledges anti-cheat has a ceiling — keep human judges in the loop.

---

### S32 — Replay Buffer + Judge Call
Type: frontend+backend
Depends on: S25
Blocks: —
Est: 3d
Primary paths: `apps/web/src/app/pages/match/replay/`, `apps/api/src/moderation/`

**Goal.** Local 5-minute rolling buffer of both players' streams so disputes can be reviewed without uploading anything to the server. Plus a "judge call" button that summons a moderator into the match as an observer.

**Scope (IN).**
- `MediaRecorder` per stream tile recording into a circular buffer (RAM-backed) of the last 5 minutes (~720p, 1Mbps).
- "Save last 5 min" button exports the buffer as a `.webm` download.
- `POST /moderation/judge-call` endpoint: creates a `JudgeCall` record, broadcasts on a `judges` channel (Redis pub-sub). Tournament-assigned judges (S38) listen to this channel.
- Frontend judge-call modal: optional reason text; while open, players' streams continue.
- When a judge joins the match, they appear as a third (observer) participant in LiveKit with a `role: 'judge'` claim baked into their token.
- Side chat between judge and each player (1:1 channels) routed through the existing chat gateway.

**Scope (OUT).**
- Tournament-judge assignment & permissions UI (S38).
- Server-side replay storage (cut for MVP — local only).

**Tasks.**
1. Implement the MediaRecorder buffer.
2. `judge-call` endpoint + realtime broadcast.
3. Judge observer LiveKit join flow.
4. Judge side chat channels.

**Acceptance.**
- [ ] Pressing "Save last 5 min" produces a playable webm file in the user's downloads.
- [ ] Pressing "Judge call" alerts every online tournament judge for the relevant tournament (or any moderator if casual).
- [ ] Judge can join the match read-only — cannot publish a camera.

**Files.**
- Created: `apps/web/src/app/pages/match/replay/**`, `apps/api/src/moderation/**`.

**Avoid.**
- Persisting the buffer anywhere — keep it ephemeral, RAM only.

**Notes.**
- Be careful with MediaRecorder memory pressure — drop oldest chunks aggressively at the 5-min mark.

---

### S33 — Match Outcome Confirmation & Dispute
Type: backend+frontend
Depends on: S25
Blocks: S41
Est: 3d
Primary paths: `apps/api/src/matches/outcome/`, `apps/web/src/app/pages/match/outcome/`

**Goal.** End-of-match flow: both players confirm winner and game state; mismatched confirmations open a dispute (locked until both agree or judge resolves).

**Scope (IN).**
- Backend: `POST /matches/:id/confirm` with `{ winnerUserId, finalLifeTotals, turnsPlayed }`. When both players' confirmations match, the match transitions to `finalized` and is recorded.
- If they disagree: state = `disputed`. A `Dispute` row is created; judge call (S32) can resolve via `POST /matches/:id/resolve` with override authority.
- Frontend: outcome modal shown when match transitions to `awaiting-result` (any player can declare end of game via "Match over" button in the match UI).
- Result persisted in `Match` row; visible on user profile (rendered in S35).

**Scope (OUT).**
- Match replays beyond local buffer (S32).
- Skill rating updates (cut from MVP).

**Tasks.**
1. Implement endpoints + state machine.
2. Outcome modal.
3. Profile-visible match list (delegated to S35 / future profile page).

**Acceptance.**
- [ ] Both players confirm same winner → match finalized; chat shows "GG, finalized" system message.
- [ ] Players disagree → match enters `disputed`; "Call judge" button appears.
- [ ] Judge override sets `winnerUserId` and finalizes.

**Files.**
- Created: `apps/api/src/matches/outcome/**`, `apps/web/src/app/pages/match/outcome/**`.

**Avoid.**
- Letting a match sit in `disputed` indefinitely with no escalation path.

**Notes.**
- "Match over" can only be triggered after the lobby's `bestOf` games are complete.

---

## Phase 8 — Matchmaking & Tournaments

### S34 — Quick Match Queue + Friends + Presence
Type: backend+frontend
Depends on: S05, S08, S19
Blocks: S35
Est: 3d
Primary paths: `apps/api/src/matchmaking/`, `apps/web/src/app/pages/quick-match/`, `apps/web/src/app/pages/friends/`

**Goal.** A "Quick match" button users press to be auto-paired with someone in their region for casual play. Friends list with live online presence. Direct challenge from the friends list.

**Scope (IN).**
- Presence: every authenticated socket connection adds the user to a Redis set `presence:online`. Disconnect removes after a 30s grace period.
- Matchmaking worker: a server-side worker pops users from a queue (`mm:queue:op-tcg:<region>`) two at a time and creates a lobby with both as participants, transitions straight to match-ready, emits `mm:matched` to both users.
- `POST /matchmaking/enqueue { gameId, format, region }` / `POST /matchmaking/dequeue`.
- Friends page: `DataGrid` of friends, online indicator, "Challenge" button that creates a private lobby and invites.
- Friend search and invite flow (`POST /friends` from S08).

**Scope (OUT).**
- Skill-based matchmaking (ELO is cut from MVP).
- Cross-region matchmaking (MVP is region-strict).

**Tasks.**
1. Implement presence in the gateway from S07.
2. Implement the matchmaking worker (NestJS BullMQ or a simple polling worker — BullMQ recommended; share Redis from S05).
3. Frontend quick-match page with cancel button.
4. Friends page with online indicators.

**Acceptance.**
- [ ] Two users enqueue with same gameId/format/region → both get `mm:matched` with a lobbyId.
- [ ] Cancelling the queue removes the user.
- [ ] A friend going offline updates the friends list within 30s.

**Files.**
- Created: `apps/api/src/matchmaking/**`, `apps/web/src/app/pages/quick-match/**`, `apps/web/src/app/pages/friends/**`.

**Avoid.**
- Long-polling for matchmaking — use realtime events.

**Notes.**
- BullMQ requires a separate Redis DB or namespace; isolate from S05's keyspace.

---

### S35 — One Piece Game Hub Page
Type: frontend
Depends on: S19, S34, S36
Blocks: —
Est: 2d
Primary paths: `apps/web/src/app/pages/hubs/op-tcg/`

**Goal.** The OP TCG game hub: a single page showing active live matches, open lobbies, and tournaments (upcoming/live). Per BUSINESS_SPECS Section 4.1.

**Scope (IN).**
- Three sections: Live Matches (read-only list with spectate buttons), Open Lobbies (`DataGrid` reused from S20), Tournaments (list from S36 endpoints, with status chips).
- Quick-match button prominently surfaced.

**Scope (OUT).**
- Meta snapshot (Phase 2 per spec).
- News from publisher (Phase 2 per spec).

**Tasks.**
1. Build the page.
2. Wire data from the existing endpoints.

**Acceptance.**
- [ ] Page loads under 1s on a warm cache.
- [ ] Each section paginates and refreshes via realtime where applicable (lobbies and matches).
- [ ] AXE passes.

**Files.**
- Created: `apps/web/src/app/pages/hubs/op-tcg/**`.

**Avoid.**
- Building a generic hub framework — MVP has one game, hardcode it.

**Notes.**
- Live Matches list is fed by Redis `presence:matches:op-tcg` (active match-room set; maintained by the matches gateway).

---

### S36 — Tournament Data Model + Endpoints
Type: backend
Depends on: S04, S19
Blocks: S37, S38
Est: 3d
Primary paths: `apps/api/src/tournaments/`, `libs/shared/src/tournaments/`

**Goal.** CRUD endpoints for tournaments, registration, check-in, drop. Bracket generation lives in S37.

**Scope (IN).**
- Models (in S04 placeholders; fill out here): `Tournament`, `TournamentRegistration`, `TournamentRound`, `TournamentMatch`.
- Endpoints:
  - `POST /tournaments` — create (organizer: any authenticated user). Body: `{ gameId, format, bracketType, roundTime, decklistPolicy: 'open' | 'closed' | 'private', prizeInfo, startsAt }`.
  - `GET /tournaments` — list (filterable by status and gameId).
  - `GET /tournaments/:id`.
  - `POST /tournaments/:id/register` — caller registers themselves, optionally attaches a `deckId`.
  - `POST /tournaments/:id/check-in`.
  - `POST /tournaments/:id/drop`.
  - `POST /tournaments/:id/judges` — organizer-only; assigns `judge` role to listed users for this tournament.
- All actions emit realtime events on `tournament:<id>` room.

**Scope (OUT).**
- Bracket logic (S37).
- UI (S38).

**Tasks.**
1. Migrations.
2. Controller / service.
3. Realtime fanout.

**Acceptance.**
- [ ] Organizer can create a tournament; a participant can register and check in.
- [ ] Drop and check-in are idempotent.
- [ ] Decklist policy is enforced: `closed` decklists are hidden from other players; `open` are visible after check-in.

**Files.**
- Created: `apps/api/src/tournaments/**`, `libs/shared/src/tournaments/index.ts`, migrations.

**Avoid.**
- Stuffing bracket logic into this step.

**Notes.**
- Roles are tournament-scoped (judge of one tournament is not a judge of another).

---

### S37 — Bracket Engine (Swiss + Single Elim)
Type: backend
Depends on: S36
Blocks: S38
Est: 4d
Primary paths: `apps/api/src/tournaments/bracket/`

**Goal.** Generate pairings, compute tiebreakers, accept score reporting, produce top-cut transitions. Two bracket types for MVP: Swiss and single elimination.

**Scope (IN).**
- Pairing algorithms:
  - **Swiss**: standard Swiss with byes for odd counts, no repeat pairings, sorted by current points + tiebreakers (OMW% then GW%).
  - **Single elim**: standard seeded bracket from Swiss standings (or registration order if no Swiss).
- Pairing entry point: `POST /tournaments/:id/rounds/next` — organizer or judge generates the next round.
- Score reporting: `POST /tournaments/:id/matches/:matchId/report` with `{ winnerUserId }`. Validates caller is a participant or judge.
- Top-cut transition: when configured, finishes Swiss and auto-generates single elim from top-N.
- Standings endpoint: `GET /tournaments/:id/standings` — points, OMW%, GW%, position.

**Scope (OUT).**
- Double elim (cut from MVP).
- Round robin (cut from MVP).
- Live in-match score reporting (matches in tournaments use the regular match flow from S25/S33; the bracket engine reads results when matches finalize).

**Tasks.**
1. Pure functions for pairing + tiebreakers (`libs/shared` or `apps/api/src/tournaments/bracket/`; the latter is fine since these aren't shared with the frontend).
2. Heavily unit-tested with realistic Swiss scenarios (16/32/64 players, byes, intentional draws).
3. Wire to match-finalize events from S33: when a tournament match finalizes, update `TournamentMatch.winnerUserId`.
4. Standings.

**Acceptance.**
- [ ] A 16-player Swiss tournament over 4 rounds produces correct pairings and standings.
- [ ] Top-cut to 8 produces a valid single-elim bracket.
- [ ] No player is paired with the same opponent twice in Swiss.
- [ ] Byes only awarded to lowest-ranked unbye'd players.

**Files.**
- Created: `apps/api/src/tournaments/bracket/**`.

**Avoid.**
- Random pairings in Swiss — deterministic with documented tiebreakers.

**Notes.**
- Tiebreakers reference: OMW% (opponents' match-win %), GW% (own game-win %), OGW% if needed. Document the exact formula in the file header.

---

### S38 — Tournament UI (Player + Judge)
Type: frontend
Depends on: S36, S37
Blocks: S41
Est: 4d
Primary paths: `apps/web/src/app/pages/tournaments/`

**Goal.** UI for tournament creation, registration, the live bracket, the player's current pairing card, and judge tools.

**Scope (IN).**
- `/tournaments` — list page.
- `/tournaments/new` — create form.
- `/tournaments/:id` — overview: standings, current round, bracket visualization, your-pairing card with "Open match" button, check-in/drop buttons.
- Judge view (when the user has `judge` role for this tournament): drop into any active match, manual score override modal, issue warning button.
- Open-decklist mode: opponent decklists visible after check-in if tournament `decklistPolicy === 'open'`.

**Scope (OUT).**
- Broadcaster mode (cut for MVP).
- Twitch restream integration (cut for MVP).

**Tasks.**
1. Pages + routes.
2. Bracket visualization (Swiss table + single-elim tree). A simple component using SVG is fine.
3. Judge tools panel.

**Acceptance.**
- [ ] An organizer can create a tournament, players can register & check in, the bracket renders, and a player can navigate to their current match.
- [ ] Judges can override results and the bracket updates.
- [ ] AXE passes.

**Files.**
- Created: `apps/web/src/app/pages/tournaments/**`.

**Avoid.**
- Heavy charting libs for the bracket — a small custom SVG component is enough.

**Notes.**
- The bracket UI must be readable on a 1366×768 laptop screen.

---

## Phase 9 — Polish & Launch

### S39 — Accessibility Pass (AXE)
Type: frontend
Depends on: all UI steps
Blocks: S41
Est: 3d
Primary paths: app-wide

**Goal.** Final accessibility sweep. Per AGENTS.md and ARCHITECTURE_GUIDELINES.md, the app must pass AXE and meet WCAG AA.

**Scope (IN).**
- Run `axe-core` automated audits across every route. Fix every violation or document a justified suppression.
- Manual checks: keyboard-only navigation through the full match flow (lobby → match → outcome). Screen reader smoke test (VoiceOver / NVDA) on lobby, match, and outcome surfaces.
- Color contrast audit in both light and dark themes.
- Focus management: modals trap focus, route transitions reset focus to the page header.

**Scope (OUT).**
- Reduced-motion preferences (nice-to-have; defer).

**Tasks.**
1. Set up Playwright + axe-playwright runner.
2. Generate audit report per route.
3. Fix violations.

**Acceptance.**
- [ ] AXE produces zero violations across all routes (or every remaining one has a documented justification).
- [ ] Full match can be played keyboard-only.
- [ ] Color contrast ratios meet WCAG AA in both themes.

**Files.**
- Created: `tools/axe/**`, audit reports.

**Avoid.**
- Setting `tabindex` on non-interactive elements.

**Notes.**
- AXE in CI: gated as a non-blocking informational job to start; promote to blocking after S39 passes.

---

### S40 — i18n Completion (en + pt-BR Scaffold)
Type: frontend
Depends on: S10
Blocks: S41
Est: 2d
Primary paths: `apps/web/src/assets/i18n/`

**Goal.** All visible strings translated to English; Brazilian Portuguese scaffolded with at least the navigation and key match flows translated.

**Scope (IN).**
- Every string introduced in S10–S38 has a key under `{feature}.{context}.{key}`.
- `en.json` complete.
- `pt-BR.json` covers: shell, lobby, match controls (life/DON/turn), outcome, tournament basics.
- Language picker in the shell is functional.

**Scope (OUT).**
- Full pt-BR translation parity (community-source later).

**Tasks.**
1. Sweep templates for hardcoded strings.
2. Fill in translations.
3. Verify language switch is smooth (no flash of untranslated content).

**Acceptance.**
- [ ] Zero hardcoded user-facing strings in templates (audited via a lint rule or grep).
- [ ] Switching to pt-BR translates the shell, lobby, and match panels.

**Files.**
- Modified: `apps/web/src/assets/i18n/en.json`, `apps/web/src/assets/i18n/pt-BR.json`.

**Avoid.**
- Putting English defaults inline in templates as "fallbacks".

**Notes.**
- Use Transloco's missing-key handler in dev to surface gaps loudly.

---

### S41 — E2E Test Suite (Playwright)
Type: infra
Depends on: S33, S38
Blocks: S42
Est: 4d
Primary paths: `apps/web-e2e/`, `.github/workflows/ci.yml`

**Goal.** Playwright E2E suite covering the golden paths. Runs in CI against a stack of `nx serve api` + `nx serve web` + a containerized Postgres + Redis + a LiveKit mock.

**Scope (IN).**
- Tests:
  1. Sign up via email magic link.
  2. Create a public lobby; second user joins; both complete checklist; host starts; both navigate to match.
  3. Play a 1v1 match: emit a few life-change events, both confirm winner, match finalizes.
  4. Run a 4-player Swiss tournament: create, register, check-in 4 users, run two rounds, see standings.
- LiveKit mock: stub the media layer at the `MediaClient` level since real LiveKit in CI is overkill. Document the mock.
- Mock CV provider used end-to-end.

**Scope (OUT).**
- Visual regression (cut for MVP).
- Mobile viewport tests (cut — desktop-only MVP).

**Tasks.**
1. Set up `@nx/playwright`.
2. Test fixtures: helpers to create test users and authenticate them.
3. Implement the four scenarios.
4. CI wiring.

**Acceptance.**
- [ ] All four scenarios pass in CI.
- [ ] Suite runs under 10 minutes.
- [ ] Test users are isolated (no shared global state).

**Files.**
- Created: `apps/web-e2e/**`.
- Modified: `.github/workflows/ci.yml`.

**Avoid.**
- Hitting real Discord, Ximilar, or LiveKit from CI.

**Notes.**
- Playwright tracing on failure is invaluable — enable it.

---

### S42 — Deployment, Observability, Beta Allowlist
Type: infra
Depends on: S41
Blocks: —
Est: 4d
Primary paths: `infra/`, `.github/workflows/deploy.yml`

**Goal.** Ship to a staging environment a TO can use. Add structured logging aggregation, error tracking, basic uptime, and an allowlist gate so only invited users can sign in during the beta.

**Scope (IN).**
- Container images for `apps/api`; static export of `apps/web` to a CDN (Cloudflare Pages or Vercel or equivalent — pick at implementation time, document the choice).
- LiveKit Cloud (or self-host on Fly.io / Hetzner) — credentials and connection wiring.
- Managed Postgres (Neon / Supabase) + managed Redis (Upstash) for staging.
- Secret management via a single env-var injection (e.g., Doppler, or platform-native).
- Sentry for both apps (DSN per environment).
- Uptime: a single uptime monitor on `/health/ready`.
- Allowlist: a `BetaAllowlist` table in Postgres; `auth/discord/callback` and `auth/email/verify` reject non-allowlisted users with a friendly "you're on the waitlist" message in MVP. Allowlist seeded with the Limitless OP TCG TOs identified in the BUSINESS_SPECS.
- Deployment workflow: GitHub Actions deploys on `main` push.
- A bare-bones admin page (route gated by hardcoded email list — fine for MVP) to manage the allowlist.

**Scope (OUT).**
- Auto-scaling, multi-region, full disaster recovery — beyond MVP.

**Tasks.**
1. Set up staging infrastructure (manual but documented).
2. Wire CI deploy.
3. Implement allowlist gating.
4. Add Sentry SDKs to both apps.
5. Smoke-test the full flow on staging.

**Acceptance.**
- [ ] A new commit to `main` deploys to staging in under 10 minutes.
- [ ] Smoke test on staging: a non-allowlisted user cannot sign in; an allowlisted user can play a full match.
- [ ] Sentry receives a triggered test error from each app.
- [ ] `/health/ready` reachable from the public URL.

**Files.**
- Created: `infra/**`, `.github/workflows/deploy.yml`, `apps/api/src/admin/**`, `apps/api/src/auth/allowlist.ts`, `apps/web/src/app/pages/admin/**`.

**Avoid.**
- Coupling the allowlist gate to platform-specific identity — it lives in our DB.
- Hardcoding secrets in CI.

**Notes.**
- This is the step where you onboard the first 2–3 OP TCG TOs from Limitless. That's the validation goalpost from BUSINESS_SPECS Section 10.

---

## Appendix A — Open questions deferred from BUSINESS_SPECS Section 11

These are tracked but **not** addressed in MVP:

- **Card image / rules text licensing.** Use fan-sourced data with attribution; revisit before monetization. Tracked.
- **Discord Activity continuous-video limits.** S12 includes the manifest; if a technical spike during S23/S24 reveals iframe-video issues, the standalone PWA mode (S11/S12) covers us.
- **Anti-cheat ceiling.** S31 + S32 (judge call) accept this trade-off explicitly.
- **Latency under multi-stream load.** MVP is 1v1 + 2 streams + (optional) judge observer = 5 streams max in a room. LiveKit handles this comfortably. Re-evaluate before any multi-player support post-MVP.

## Appendix B — Glossary (for agent-context priming)

- **Match**: a single best-of-N series between two players.
- **Lobby**: a pre-match room where players gather, complete the checklist, and submit decks.
- **Tournament**: a multi-round event over multiple matches, organized via Swiss and/or single elim.
- **DON!! deck**: One Piece TCG resource zone; cards toggle between active and rested.
- **Counter value**: face-down value of an OP TCG card played as a defense response.
- **Game module**: pluggable per-game implementation registered against the `GameModule` interface (S14).
- **Activity**: Discord's embedded-app feature; loads a web app inside a voice channel iframe.
- **CV**: computer vision — for MVP, click-to-identify single-card recognition only.

---

_End of plan. 42 steps. Re-read [`ARCHITECTURE_GUIDELINES.md`](./ARCHITECTURE_GUIDELINES.md) and [`AGENTS.md`](./AGENTS.md) before starting any step in `apps/web`._
