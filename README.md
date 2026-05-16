# TCG Arena

A platform for playing physical trading card games remotely. See [`BUSINESS_SPECS.md`](./BUSINESS_SPECS.md) for the product spec and [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the step-by-step build plan.

## Repository layout

Nx monorepo (npm).

```
apps/web/     Angular 21 PWA (also served as a Discord Activity)
apps/api/     NestJS backend
libs/shared/  Cross-app types and contracts (import as @tcg/shared)
```

## Prerequisites

- Node 22+
- npm 10+

## Install

```bash
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is required while Nx 22's optional peer on `@angular-devkit/build-angular` clashes with the Angular 21 toolchain we actually use (`@angular/build`).

## Common commands

```bash
npm run start:web     # nx serve web   — http://localhost:4200
npm run start:api     # nx serve api   — http://localhost:3000/api
npm run build:web     # nx build web
npm run build:api     # nx build api
npm test              # nx run-many --target=test --all
npm run lint          # nx run-many --target=lint --all
npm run graph         # nx graph
```

Run any Nx target directly with `npx nx <target> <project>`.

## Contributing

Read [`ARCHITECTURE_GUIDELINES.md`](./ARCHITECTURE_GUIDELINES.md) (Angular conventions for `apps/web`) and follow the step-by-step build plan in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). One step → one branch → one PR.
