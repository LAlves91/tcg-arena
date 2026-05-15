# Angular Architectural Guidelines

> Opinionated guidelines for building modern Angular applications.
> Designed for agentic development — AI agents should follow these conventions when generating, modifying, or reviewing code in Angular projects that adopt this standard.

---

## Table of Contents

- [Core Principles](#core-principles)
- [Project Structure](#project-structure)
- [Application Bootstrap](#application-bootstrap)
- [Components](#components)
- [State Management](#state-management)
- [Routing](#routing)
- [Forms](#forms)
- [Data Access (Repository Pattern)](#data-access-repository-pattern)
- [HTTP Layer](#http-layer)
- [Error Handling](#error-handling)
- [Authentication & Guards](#authentication--guards)
- [Internationalization (i18n)](#internationalization-i18n)
- [Styling](#styling)
- [Testing](#testing)
- [Environment Configuration](#environment-configuration)
- [TypeScript Conventions](#typescript-conventions)
- [File Naming & Exports](#file-naming--exports)
- [Quick Reference Cheatsheet](#quick-reference-cheatsheet)

---

## Core Principles

1. **Signals-first** — Use Angular Signals for all reactive state. RxJS is used only at the HTTP/interop boundary.
2. **Standalone everything** — No `NgModule`. Every component, directive, and pipe is standalone.
3. **Zoneless** — Use `provideZonelessChangeDetection()`. Never rely on Zone.js.
4. **OnPush always** — Every component uses `ChangeDetectionStrategy.OnPush`.
5. **Smart/Dumb separation** — Pages (smart) own state and side effects. Shared UI (dumb) receives inputs and emits outputs.
6. **Type safety** — Strict TypeScript. No `any`. Typed forms, typed repositories, typed models.
7. **Lazy by default** — Routes lazy-load components and child route configs.
8. **Minimal abstraction** — No premature abstractions. Three similar lines beats a premature helper.

---

## Project Structure

```
src/app/
├── core/                          # Singleton services, guards, interceptors, error handling
│   ├── auth/                      # Authentication service and helpers
│   ├── config/                    # InjectionTokens for app-wide configuration
│   ├── errors/                    # Global ErrorHandler, Notifier service, error types
│   ├── guards/                    # Route guards (auth, guest, role-based)
│   └── http/                      # HTTP interceptors (auth, error, mock)
│
├── data/                          # Data access layer — models, repositories, mocks
│   ├── models/                    # TypeScript interfaces and type aliases
│   ├── repositories/              # CrudRepository base + concrete implementations
│   │   └── _base/                 # Abstract CrudRepository<T, TList>
│   └── mock/                      # Mock backend interceptor and seed data
│       └── seeds/                 # JSON seed data per entity
│
├── layout/                        # App shell — main layout, navigation, sidebar
│   └── shell/                     # Shell component (toolbar, sidenav, router-outlet)
│
├── pages/                         # Feature-based route pages (smart components)
│   ├── login/                     # Login page
│   ├── dashboard/                 # Dashboard page
│   └── {feature}/                 # One folder per feature domain
│       ├── {feature}.routes.ts    # Child route definitions
│       ├── {feature}-list/        # List page component
│       └── {feature}-form/        # Create/View/Edit form component
│
└── shared/                        # Reusable, stateless building blocks
    ├── forms/                     # Form utilities, validators, directives
    │   ├── validators/            # Custom sync/async validators
    │   ├── validation-messages/   # Error message display component
    │   └── form-mode/             # FormMode directive (view/edit/create)
    ├── ui/                        # Presentational UI components
    │   ├── data-grid/             # Generic data table with sort/page/select
    │   ├── page-header/           # Title + breadcrumbs + action buttons
    │   ├── filter-bar/            # Multi-field filter form
    │   ├── status-chip/           # Status badge
    │   ├── confirm-dialog/        # Confirm dialog service
    │   ├── empty-state/           # Empty placeholder
    │   └── global-search/         # Search across entities
    └── utils/                     # Pure utility functions
        ├── url-state.ts           # Signal ↔ URL query param sync
        └── jwt.ts                 # JWT decode/expiration helpers
```

### Placement rules

| What                          | Where                              |
|-------------------------------|------------------------------------|
| Singleton service             | `core/{concern}/`                  |
| Route guard                   | `core/guards/`                     |
| HTTP interceptor              | `core/http/`                       |
| Data model interface          | `data/models/`                     |
| API repository                | `data/repositories/`               |
| Feature page component        | `pages/{feature}/{feature}-list/`  |
| Feature form component        | `pages/{feature}/{feature}-form/`  |
| Feature route config          | `pages/{feature}/{feature}.routes.ts` |
| Reusable UI component         | `shared/ui/{component-name}/`      |
| Form validator                | `shared/forms/validators/`         |
| Pure utility function         | `shared/utils/`                    |

---

## Application Bootstrap

Use a functional `ApplicationConfig` with provider functions. No `NgModule` bootstrap.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        errorInterceptor,
        ...(environment.useMockBackend ? [mockBackendInterceptor] : []),
      ]),
    ),
    provideAnimationsAsync(),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    { provide: ErrorHandler, useClass: AppErrorHandler },
  ],
};
```

Key decisions:
- **`provideZonelessChangeDetection()`** — Zoneless mode. Signals drive change detection.
- **`withComponentInputBinding()`** — Route params automatically bind to component `input()` signals.
- **`withViewTransitions()`** — Browser View Transitions API for route changes.
- **`provideAnimationsAsync()`** — Lazy-load animation module.
- **Interceptors ordered intentionally** — Auth first, then error handling, then mock (dev only).

---

## Components

### Standalone with OnPush

Every component is standalone and uses `OnPush` change detection.

```typescript
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    PageHeader,
    DataGrid,
    TranslocoPipe,
  ],
})
export class UserList {
  // ...
}
```

### Input/Output signals (not decorators)

Use the functional `input()` and `output()` APIs. Never use `@Input()` or `@Output()` decorators.

```typescript
// Dumb component — inputs and outputs only
export class DataGrid<T = unknown> {
  readonly columns = input<ColumnDef<T>[]>([]);
  readonly rows = input<T[]>([]);
  readonly loading = input<boolean>(false);
  readonly total = input<number>(0);
  readonly pageSize = input<number>(10);

  readonly pageChange = output<PageEvent>();
  readonly sortChange = output<SortState>();
  readonly rowClick = output<T>();
}
```

```typescript
// Smart component — route params as inputs (via withComponentInputBinding)
export class UserForm {
  readonly id = input<string>();
  readonly mode = input<FormMode>('view');
}
```

### ViewChild signals

Use `viewChild.required<T>()` for template references.

```typescript
protected readonly statusTpl = viewChild.required<TemplateRef<{ $implicit: User }>>('statusTpl');
protected readonly actionsTpl = viewChild.required<TemplateRef<{ $implicit: User }>>('actionsTpl');
```

### Visibility modifiers

- `private` — Internal service state, helper methods not used in template.
- `protected` — Anything used in the template (fields, methods, signals).
- `readonly` — All `input()`, `output()`, `inject()`, `signal()`, `computed()`, `viewChild()`.
- Public (`public` or no modifier) — Only for API-facing component members (rare).

```typescript
export class UserList {
  private readonly repo = inject(UsersRepository);           // not in template
  protected readonly state = urlState<UserListUrlState>({…}); // used in template
  protected readonly loading = computed(() => …);             // used in template
  protected readonly deletingId = signal<string | null>(null); // used in template
}
```

### Smart vs Dumb components

**Smart components** (pages in `pages/`):
- Inject services (repositories, router, notifier).
- Own state via signals, `rxResource`, `urlState`.
- Handle navigation, API calls, confirmations.
- Live under `pages/{feature}/`.

**Dumb components** (shared in `shared/ui/`):
- Receive data via `input()`, emit events via `output()`.
- No injected services (except optional Angular primitives).
- No side effects, no API calls.
- Reusable across features.

---

## State Management

### Signals as the primary state primitive

```typescript
// Writable signal for local component state
protected readonly submitting = signal(false);
protected readonly deletingId = signal<string | null>(null);

// Computed signal for derived state
protected readonly isView = computed(() => this.mode() === 'view');
protected readonly rows = computed<User[]>(() => this.listResource.value()?.items ?? []);
protected readonly loading = computed<boolean>(() => this.listResource.isLoading());

// Readonly signal for exposing internal state
readonly idToken = this._idToken.asReadonly();
readonly currentUser = this._currentUser.asReadonly();
readonly isAuthenticated = computed(() => this._currentUser() !== null);
```

### rxResource for API data loading

Use `rxResource()` to declaratively load data that depends on reactive inputs. It tracks loading, value, and error states automatically.

```typescript
// List resource — refetches when state signal changes
protected readonly listResource = rxResource({
  params: () => this.state(),
  stream: ({ params }) => {
    const query: Record<string, unknown> = {
      page: params.page,
      pageSize: params.pageSize,
      sort: params.sort,
    };
    if (params.search) query['displayName'] = params.search;
    return this.repo.list(query);
  },
});

// Entity resource — refetches when id/mode changes
protected readonly entity = rxResource({
  params: () => ({ id: this.id(), mode: this.mode() }),
  stream: ({ params }) => {
    if (!params.id || params.mode === 'create') return of<User | null>(null);
    return this.repo.byId(params.id);
  },
});
```

### URL state synchronization

Use `urlState<T>()` to sync component state with URL query parameters bidirectionally. This preserves filter/page state across navigation and enables sharing URLs.

```typescript
interface UserListUrlState extends Record<string, string | number | undefined> {
  page: number;
  pageSize: number;
  sort: string;
  search: string;
  status: string;
}

protected readonly state = urlState<UserListUrlState>({
  page: 0,
  pageSize: 10,
  sort: 'updatedAt,desc',
  search: '',
  status: '',
});

// Update state (automatically updates URL)
this.state.update(s => ({ ...s, page: 0, search: 'john' }));
```

### Effects for side effects

Use `effect()` for imperative reactions to signal changes.

```typescript
// Sync entity data into form when loaded
effect(() => {
  if (!this.entity.hasValue()) return;
  const user = this.entity.value();
  if (user) {
    this.form.patchValue({ …userToFormValues(user) }, { emitEvent: false });
  }
});

// Sync URL params back to filter form (browser back/forward)
effect(() => {
  const url = this.state();
  this.filterForm.patchValue(urlToFilterValues(url), { emitEvent: false });
});
```

### RxJS interop

Use `toSignal()` to bridge RxJS observables into the signal world. Use `toObservable()` for the reverse.

```typescript
// Observable → Signal
private readonly activeLang = toSignal(this.translocoService.langChanges$);
```

---

## Routing

### Lazy-loaded, feature-based routes

Root routes lazy-load feature shells and child route configs.

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then(m => m.Shell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'users',
        loadChildren: () => import('./pages/users/users.routes').then(m => m.USERS_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
```

### Feature route convention (CRUD)

Every feature follows the same 4-route CRUD pattern:

```typescript
// pages/{feature}/{feature}.routes.ts
export const USERS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./user-list/user-list').then(m => m.UserList),
    data: { breadcrumb: 'Users' },
  },
  {
    path: 'new',
    loadComponent: () => import('./user-form/user-form').then(m => m.UserForm),
    data: { mode: 'create', breadcrumb: 'New User' },
  },
  {
    path: ':id',
    loadComponent: () => import('./user-form/user-form').then(m => m.UserForm),
    data: { mode: 'view', breadcrumb: 'User Detail' },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-form/user-form').then(m => m.UserForm),
    data: { mode: 'edit', breadcrumb: 'Edit User' },
  },
];
```

Key patterns:
- **`loadComponent`** for leaf routes, **`loadChildren`** for feature groups.
- **Route `data`** carries `mode` (`create` | `view` | `edit`) and `breadcrumb` strings.
- **`withComponentInputBinding()`** in app config means `:id` binds to `input<string>('id')` and `data.mode` binds to `input<FormMode>('mode')`.
- **`canMatch`** for guard functions (not `canActivate`).

### Guards as functions

```typescript
export const authGuard: CanMatchFn = (_route, segments: UrlSegment[]) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  const returnUrl = '/' + segments.map(s => s.path).join('/');
  return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
};
```

---

## Forms

### Reactive forms with NonNullableFormBuilder

Always use `NonNullableFormBuilder` for type-safe, non-nullable controls.

```typescript
private readonly fb = inject(NonNullableFormBuilder);

protected readonly form: FormGroup<UserFormControls> = this.fb.group({
  firstName: this.fb.control('', [Validators.required, Validators.maxLength(50)]),
  lastName: this.fb.control('', [Validators.required, Validators.maxLength(50)]),
  email: this.fb.control(
    '',
    [Validators.required, Validators.email],
    [uniqueAsync(value => this.checkEmailTaken(value))],
  ),
  status: this.fb.control<UserStatus>('invited', [Validators.required]),
  roles: this.fb.control<UserRole[]>(['member'], [Validators.required]),
  phone: this.fb.group<PhoneControls>({
    countryCode: this.fb.control(''),
    number: this.fb.control('', [phoneNumber()]),
  }),
});
```

### Typed form control interfaces

Define an interface for each form's controls to get full type inference.

```typescript
interface UserFormControls {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  status: FormControl<UserStatus>;
  roles: FormControl<UserRole[]>;
  phone: FormGroup<PhoneControls>;
}

interface PhoneControls {
  countryCode: FormControl<string>;
  number: FormControl<string>;
}
```

### FormMode directive

Use the `FormModeDirective` to automatically enable/disable forms based on view/edit/create mode.

```html
<form [formGroup]="form" [appFormMode]="mode()">
  <!-- fields are automatically disabled in 'view' mode -->
</form>
```

```typescript
@Directive({ selector: '[appFormMode]' })
export class FormModeDirective {
  readonly appFormMode = input.required<FormMode>();
  private readonly container = inject(ControlContainer, { optional: true });

  constructor() {
    effect(() => {
      const mode = this.appFormMode();
      const control = this.container?.control;
      if (!control) return;
      mode === 'view' ? control.disable({ emitEvent: false }) : control.enable({ emitEvent: false });
    });
  }
}
```

### Custom validators

Place validators in `shared/forms/validators/`. Return factory functions.

```typescript
// Async uniqueness validator with debounce
export function uniqueAsync(
  checkFn: (value: string) => Observable<boolean>,
  currentValue?: () => string | null | undefined,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = control.value as string;
    if (!value) return of(null);
    if (currentValue && value === currentValue()) return of(null);
    return timer(300).pipe(
      switchMap(() => checkFn(value)),
      map(taken => (taken ? { uniqueAsync: true } : null)),
      catchError(() => of(null)),
    );
  };
}
```

### Form submission pattern

```typescript
protected async submit(): Promise<void> {
  if (this.submitting()) return;
  this.form.markAllAsTouched();
  if (this.form.invalid) return;

  const raw = this.form.getRawValue();
  const payload = buildPayload(raw);

  this.submitting.set(true);

  const op$ = this.isCreate()
    ? this.repo.create(payload)
    : this.repo.update(this.id()!, payload);

  op$.subscribe({
    next: (entity) => {
      this.notifier.success(t('feature.notifications.saved', { name: entity.name }));
      this.submitting.set(false);
      void this.router.navigate(['/feature', entity.id]);
    },
    error: () => {
      this.notifier.error(t('feature.notifications.saveFailed'));
      this.submitting.set(false);
    },
  });
}
```

---

## Data Access (Repository Pattern)

### Abstract CrudRepository

All API access goes through repository classes that extend `CrudRepository<T, TList>`.

```typescript
export interface ListQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  [key: string]: unknown;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export abstract class CrudRepository<
  T extends { id: string; createdAt: string; updatedAt: string },
  TList = T,
> {
  protected abstract readonly resourceUrl: string;
  protected readonly http = inject(HttpClient);

  list(query?: ListQuery): Observable<ListResult<TList>> { … }
  byId(id: string): Observable<T> { … }
  create(payload: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Observable<T> { … }
  update(id: string, payload: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Observable<T> { … }
  remove(id: string): Observable<void> { … }
}
```

### Concrete repositories

One-liner extensions. One per entity.

```typescript
@Injectable({ providedIn: 'root' })
export class UsersRepository extends CrudRepository<User> {
  protected override readonly resourceUrl = '/api/users';
}
```

Add feature-specific methods only when CRUD isn't enough:

```typescript
@Injectable({ providedIn: 'root' })
export class UsersRepository extends CrudRepository<User> {
  protected override readonly resourceUrl = '/api/users';

  searchByEmail(email: string): Observable<User[]> {
    return this.list({ pageSize: 5, email }).pipe(map(r => r.items));
  }
}
```

### Data models

Define as TypeScript interfaces in `data/models/`. Use union types for enums.

```typescript
export type UserStatus = 'active' | 'invited' | 'suspended' | 'disabled';
export type UserRole = 'super-admin' | 'admin' | 'auditor' | 'member';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  roles: UserRole[];
  mfaEnabled: boolean;
  locale: string;
  timezone: string;
  phone?: { countryCode: string; number: string };
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## HTTP Layer

### Interceptor stack

Interceptors are functional (`HttpInterceptorFn`) and registered in order.

```typescript
provideHttpClient(
  withInterceptors([
    authInterceptor,     // 1. Attach Bearer token
    errorInterceptor,    // 2. Handle HTTP errors globally
  ]),
),
```

### Auth interceptor

Attaches the JWT token to same-origin requests only.

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Auth).idToken();
  if (!token) return next(req);

  const isSameOrigin =
    req.url.startsWith('/') ||
    req.url.startsWith(window.location.origin + '/');

  if (!isSameOrigin) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

### Error interceptor

Handles 401 (sign out + redirect) and shows notifications for other errors.

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(Notifier);
  const auth = inject(Auth);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);

      if (err.status === 401) {
        auth.signOut();
        void router.navigate(['/login']);
      } else {
        notifier.error(toAppError(err).message);
      }

      return throwError(() => toAppError(err));
    }),
  );
};
```

### Configuration tokens

Use `InjectionToken` for environment-specific values. Never import environment files directly in services.

```typescript
// core/config/index.ts
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

export const GOOGLE_CLIENT_ID = new InjectionToken<string>('GOOGLE_CLIENT_ID', {
  providedIn: 'root',
  factory: () => '',
});
```

---

## Error Handling

### Three layers

1. **Global ErrorHandler** — Catches unhandled errors, logs them, shows a notification.
2. **HTTP Error Interceptor** — Catches HTTP errors, handles 401, shows notifications.
3. **Component-level** — Handles specific error cases (e.g., form submission failure).

### Notifier service

Wraps Material SnackBar with semantic methods.

```typescript
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, { duration: 4000, … });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 8000, … });
  }

  info(message: string): void {
    this.snackBar.open(message, undefined, { duration: 4000, … });
  }
}
```

### Error type

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

## Authentication & Guards

### Auth service pattern

Authentication state lives in a root-level `Auth` service using signals.

```typescript
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly _idToken = signal<string | null>(null);
  private readonly _currentUser = signal<User | null>(null);

  readonly idToken = this._idToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    this.restoreFromStorage();  // Restore JWT from localStorage on init
  }

  async signInWithGoogle(): Promise<void> { … }

  signOut(): void {
    this._idToken.set(null);
    this._currentUser.set(null);
    this.removeStoredToken();
  }
}
```

### Guard functions

```typescript
// Protect authenticated routes
export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  const returnUrl = '/' + segments.map(s => s.path).join('/');
  return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
};

// Prevent authenticated users from seeing login
export const guestGuard: CanMatchFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
```

---

## Internationalization (i18n)

### Transloco setup

Use `@jsverse/transloco` for runtime i18n with JSON translation files.

```typescript
// app.config.ts
provideTransloco({
  config: {
    availableLangs: ['en', 'pt-BR'],
    defaultLang: 'en',
    reRenderOnLangChange: true,
    prodMode: !isDevMode(),
  },
  loader: TranslocoHttpLoader,
}),
```

### Translation key conventions

Use dot-separated, feature-namespaced keys:

```
{feature}.{context}.{key}
```

Examples:
```
users.list.columns.name
users.form.notifications.created
users.status.active
users.roles.superAdmin
users.list.deleteDialog.title
```

### Usage in components

```typescript
// Inject and use imperatively
private readonly translocoService = inject(TranslocoService);
const t = (key: string, params?: Record<string, unknown>) =>
  this.translocoService.translate(key, params);

this.notifier.success(t('users.form.notifications.created', { name: user.displayName }));
```

```html
<!-- Template pipe -->
<span>{{ 'users.status.active' | transloco }}</span>
```

### Reactive language tracking

To recompute values when language changes (e.g., column headers, filter labels):

```typescript
private readonly activeLang = toSignal(this.translocoService.langChanges$);

protected readonly columns = computed<ColumnDef<User>[]>(() => {
  this.activeLang(); // triggers recomputation on language change
  const t = (key: string) => this.translocoService.translate(key);
  return [
    { key: 'displayName', header: t('users.list.columns.name'), … },
  ];
});
```

---

## Styling

### Angular Material as UI framework

Use Angular Material components as the design system. Import Material modules per component.

```typescript
imports: [
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
],
```

### SCSS per component

Each component has a co-located `.scss` file. Use `styleUrl` (singular).

```typescript
@Component({
  styleUrl: './user-form.scss',
})
```

### Theming

Support light/dark themes via a `data-theme` attribute on the body element.

```typescript
// Toggle theme
const theme = this.isDark() ? 'dark' : 'light';
document.body.setAttribute('data-theme', theme);
localStorage.setItem('theme:preference', theme);
```

---

## Testing

### Vitest with Angular TestBed

Use Vitest as the test runner with Jest-compatible API.

```typescript
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Auth', () => {
  let auth: Auth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        Auth,
        { provide: GOOGLE_CLIENT_ID, useValue: 'test-client-id' },
        { provide: ScriptLoader, useValue: mockScriptLoader() },
      ],
    });
    auth = TestBed.inject(Auth);
  });

  it('should start unauthenticated', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
  });
});
```

### Testing patterns

- Use `TestBed.configureTestingModule()` for DI setup.
- Mock services with factory functions or `vi.spyOn()`.
- Use `fixture.detectChanges()` to trigger change detection.
- Use `fixture.whenStable()` for async operations.
- Test component logic via public API, not internal state.

---

## Environment Configuration

### Environment files

```typescript
// environments/environment.ts (production)
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  googleClientId: '',
  useMockBackend: false,
};

// environments/environment.development.ts
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  googleClientId: 'your-dev-client-id',
  useMockBackend: true,
};
```

### File replacement in angular.json

```json
{
  "configurations": {
    "development": {
      "fileReplacements": [{
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.development.ts"
      }]
    }
  }
}
```

### Injection tokens (not direct imports)

Services consume config via injection tokens, never by importing environment files directly.

```typescript
// In service
private readonly apiBaseUrl = inject(API_BASE_URL);

// In app.config.ts
{ provide: API_BASE_URL, useValue: environment.apiBaseUrl },
```

---

## TypeScript Conventions

### Strict mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "isolatedModules": true,
    "target": "ES2022"
  }
}
```

### Type patterns

- Use `interface` for data shapes, `type` for unions and intersections.
- Use union string literals instead of enums: `type Status = 'active' | 'suspended'`.
- Use `Omit<T, 'id' | 'createdAt' | 'updatedAt'>` for create payloads.
- Use `Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>` for update payloads.

### Access modifiers

- Fields: always explicit (`private`, `protected`, or `readonly`).
- Methods: `protected` if called from template, `private` otherwise.
- No bare public fields on components.

---

## File Naming & Exports

### Naming conventions

| Type                | File name                      | Class/function name     |
|---------------------|-------------------------------|------------------------|
| Component           | `user-list.ts`                | `UserList`             |
| Service             | `auth.ts`                     | `Auth`                 |
| Guard               | `auth.guard.ts`               | `authGuard`            |
| Interceptor         | `auth.interceptor.ts`         | `authInterceptor`      |
| Directive           | `form-mode.directive.ts`      | `FormModeDirective`    |
| Validator           | `phone-number.validator.ts`   | `phoneNumber()`        |
| Model               | `user.types.ts`               | `User`, `UserStatus`   |
| Route config        | `users.routes.ts`             | `USERS_ROUTES`         |
| Utility function    | `url-state.ts`                | `urlState()`           |
| Barrel              | `index.ts`                    | re-exports             |

### Rules

- One component per file. Template and styles as separate co-located files.
- Component file uses the component name only (e.g., `user-list.ts`, not `user-list.component.ts`).
- No `Component` suffix on class names: `UserList`, not `UserListComponent`.
- No `Service` suffix on class names: `Auth`, not `AuthService`.
- Barrel `index.ts` files in `core/` subdirectories for clean imports.
- Route config constants are `UPPER_SNAKE_CASE`.

---

## Quick Reference Cheatsheet

```
Component:     standalone, OnPush, input(), output(), viewChild.required()
State:         signal(), computed(), effect()
API data:      rxResource({ params: () => …, stream: ({ params }) => … })
URL state:     urlState<T>({ defaults })
Forms:         NonNullableFormBuilder, FormGroup<TypedControls>
Form mode:     [appFormMode]="mode()" (auto enable/disable)
Repository:    extends CrudRepository<T> → override resourceUrl
Interceptors:  functional HttpInterceptorFn
Guards:        functional CanMatchFn
Routing:       loadComponent, loadChildren, withComponentInputBinding
i18n:          TranslocoService.translate(key, params), {{ key | transloco }}
Notifications: Notifier.success(), .error(), .info()
Testing:       Vitest + TestBed + vi.spyOn()
Theming:       data-theme attribute, localStorage persistence
```
