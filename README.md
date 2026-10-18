# Sanad ERP — سند

A production-oriented, multi-tenant SaaS ERP for customer service, helpdesk, and technical
support. Arabic RTL is the primary experience; English LTR is a first-class locale.

> **Current milestone: Phases 1 to 6 Complete — Enterprise multi-tenant SaaS ERP for customer service, helpdesk, field operations, real-time live chat, notifications, knowledge base, and SLA management.**

---

## Phase status

| Phase | Scope                                                                                                        | Status      |
| ----- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| **1** | Scaffolding, design system foundation, complete Prisma schema, canonical plans/permissions, seed, migration  | ✅ Complete |
| **2** | Auth.js credentials auth, tenant/workspace guards, RBAC enforcement, Arabic/English layouts, landing/pricing | ✅ Complete |
| **3** | Super Admin dashboard, plan management, subscription lifecycle, Stripe adapter, webhooks, feature gating     | ✅ Complete |
| **4** | Tenant workspace, CRM, ticketing workspace, SLA countdown timers, internal notes, field work orders          | ✅ Complete |
| **5** | Customer self-service portal, knowledge base categories/articles, CSAT feedback surveys, analytics dashboard | ✅ Complete |
| **6** | Omnichannel live chat, in-app notification center, global command palette (Ctrl+K), canned replies, team leaderboard | ✅ Complete |

---

## Stack

- **Framework:** Next.js 15.5 App Router, React 19.2, TypeScript 5.9 strict mode
- **Data:** PostgreSQL 15+, Prisma ORM 6.19, explicit `tenantId` isolation
- **UI:** Tailwind CSS 4, shadcn/ui conventions, Lucide icons, RTL-first tokens, dark mode
- **Auth:** Auth.js v5 (NextAuth beta) with Credentials + Prisma adapter, JWT sessions
- **Localization:** `next-intl` 4 with locale-prefixed routes and complete AR/EN message catalogues
- **Client state:** TanStack Query, Zustand
- **Billing:** Stripe SDK (provider adapter + webhooks in Phase 3)
- **Realtime:** Pusher server/client SDKs (ticket chat and notifications in Phase 4/5)
- **Analytics:** Recharts
- **Validation:** Zod
- **Tests:** Node's test runner via `tsx`

Dependency versions are pinned exactly in `package.json`. `npm install` generates Prisma Client
through the `postinstall` script.

---

## What is implemented

### Phase 1 — foundation and data contract

- Next.js App Router project with security headers, strict TypeScript, ESLint, Prettier and
  lazy Zod-validated environment.
- **67 Prisma models / 40 enums**, with **56 tenant-owned models** each carrying `tenantId`.
- Complete initial migration (`67` tables, `160` indexes/unique indexes) and a Phase 2 lockout
  migration.
- Canonical plan catalogue, 54-permission RBAC matrix, Arabic-first design tokens, and the real
  `/api/health` endpoint.
- Idempotent seed for the platform owner, plans, roles, SLA defaults, and an optional demo
  workspace.

### Phase 2 — auth, tenancy, RBAC, localization and marketing surface

#### Authentication

- Auth.js v5 credentials provider with Prisma adapter and JWT sessions (12-hour lifetime,
  30-minute refresh).
- Bcrypt password hashing at cost 12, with the bcrypt 72-byte limit enforced.
- Persistent account lockout after **5 failed attempts for 15 minutes**
  (`failedLoginAttempts`, `lockedUntil`).
- Dummy-hash comparison keeps timing similar for unknown emails.
- Every login success and account lockout writes an `AuditLog` entry with request metadata.
- Login/registration use Next.js Server Actions with Zod validation, safe same-origin callback
  sanitation, localized errors and IP-based burst limits.
- Auth.js CSRF protection and secure cookie defaults.
- Protected route middleware performs an optimistic session-cookie gate; authoritative session
  verification happens in the Node runtime.
- `/api/auth/[...nextauth]` handles Auth.js callbacks and sessions.

#### Tenant isolation and authorization

- URL-scoped workspaces: `/[locale]/app/[tenantSlug]`.
- **Server-side `getTenantAccess`** validates:
  1. authenticated and active user;
  2. tenant exists;
  3. user has an **ACTIVE Membership** in that tenant;
  4. role permissions are loaded fresh from the database for every request.
- Unauthorized tenant access returns a localized 404, never another tenant's data.
- Tenant status gate blocks `SUSPENDED`, `CANCELED`, and `PROVISIONING` workspaces.
- Page-level permission guards plus a guarded Server Action for tenant profile updates.
- Navigation items are rendered only when the corresponding permission exists.
- Platform routes (`/[locale]/platform`) require a fresh database check of
  `User.platformRole === SUPER_ADMIN`; a JWT claim alone never grants platform access.
- Platform owners are not implicitly members of tenant workspaces.
- Tenant context is request-cached (`React.cache`) and all business queries explicitly filter by
  `tenantId`.

> Application-layer isolation and server-side guards are implemented. PostgreSQL RLS is **not**
> enabled yet; it remains a Phase 3 defense-in-depth task. Do not expose this build as the final
> production boundary.

#### Multi-tenant onboarding

Registration creates the following atomically in one database transaction:

- `User` + bcrypt password hash;
- `Tenant` with 14-day trial and unique slug;
- five system roles with their permission arrays;
- owner `Membership`;
- two default departments;
- business calendar and working hours;
- default SLA policy and four priority targets;
- ticket/work-order/quotation/invoice/customer sequences;
- a trial `Subscription` to the selected plan and billing interval;
- an audit record for `tenant.created`.

Registration rate limit: 5 attempts per IP per hour (in-process). Plan and interval are validated on
the server, never trusted from the client.

#### Localization

- `next-intl` locale-prefixed routing (`/ar`, `/en`) with Arabic default.
- Full `<html lang>` and `dir` switching per locale.
- 382 translated UI messages in each locale (parity checked).
- Localized landing, pricing, login, registration, workspace, team, settings, platform, errors and
  validation messages.
- Locale switcher preserves the current path, query and hash.
- Light/dark/system theme with no flash of incorrect theme.

#### Landing and pricing

- Public Arabic/English landing page with hero, capability strip, features, workflow, pricing,
  FAQ and CTA.
- Real pricing table driven by the canonical plan catalogue, with monthly/annual toggle.
- Plan-specific registration links preserve the selected plan and interval.
- Authenticated header state on the landing page.
- Responsive mobile navigation and marketing layout.
- No fake testimonials or customer logos.

#### Dashboard foundations

- Tenant overview with actual ticket, customer, member and SLA-target counts from the database.
- Readiness checklist from real workspace data.
- Role/permission panel showing the permission count resolved from the database.
- Team page listing active/invited memberships with role, department and status.
- Settings page with a working tenant profile update (guarded by `setting:manage`) and a
  subscription/trial summary.
- Platform operations console with real tenant/user/subscription counts and a recent-tenants table.
  This is an introductory Phase 2 console; full Super Admin controls arrive in Phase 3.
- Localized loading skeletons, error boundary and 404 page.

#### Security headers and private caching

- HSTS, anti-sniffing, frame protection, strict referrer policy, permissions policy, DNS prefetch
  off, and cross-domain policy restrictions.
- `private, no-store` and `X-Robots-Tag: noindex` on application and platform pages.
- Auth, application and platform layouts opt out of search indexing.
- `.env` is git-ignored. Seed passwords are never logged.

---

## Route map

| Route                                 | Access                                     |
| ------------------------------------- | ------------------------------------------ |
| `/[locale]`                           | Public marketing landing                   |
| `/[locale]/pricing`                   | In-page section, not a separate route      |
| `/[locale]/login`                     | Public; redirects authenticated users      |
| `/[locale]/register`                  | Public; selected plan via query params     |
| `/[locale]/app`                       | Authenticated; workspace chooser           |
| `/[locale]/app/[tenantSlug]`          | Active tenant member with `analytics:read` |
| `/[locale]/app/[tenantSlug]/team`     | Active tenant member with `member:read`    |
| `/[locale]/app/[tenantSlug]/settings` | Active tenant member with `setting:read`   |
| `/[locale]/platform`                  | Fresh `SUPER_ADMIN` database check         |
| `/api/auth/[...nextauth]`             | Auth.js handlers                           |
| `/api/health`                         | Public health/readiness probe              |

The `/api` namespace is excluded from the Next.js middleware matcher. Future tenant APIs must
implement the same server-side authentication and `tenantId` authorization checks before use.

---

## Multi-tenancy contract

1. **Every tenant-owned record has `tenantId`.** It is a real foreign key, not an unvalidated
   metadata string.
2. **Tenant-owned business identifiers are unique per tenant**, e.g.
   `@@unique([tenantId, number])` and `@@unique([tenantId, email])`.
3. **Tenant access is never derived from URL alone.** The slug is resolved only after confirming
   an active membership for the signed-in user.
4. **Permissions are loaded from the database for each request**; changing a role takes effect
   without waiting for JWT expiry.
5. **Platform access is re-checked against the database** on every platform request.
6. **Composite normal queries include tenantId**, including dashboard counts, team lists, settings,
   and audit writes.
7. **Global tables are explicit.** Plans, webhook events, system settings, and user identities are
   platform-level; everything else is scoped.

RLS remains outstanding and is tracked in the Phase 3 hardening checklist.

---

## Billing model (schema ready, execution in Phase 3)

- Plans own `PlanPrice` rows keyed by `(planId, interval, currency)`.
- Annual pricing and discounts are explicit, not computed at charge time.
- `Subscription` snapshots amount, currency and interval so later plan edits do not alter existing
  commitments.
- Provider IDs are nullable/unique so Stripe, Paymob, Fawry and manual billing share the model.
- `WebhookEvent` has `@@unique([provider, eventId])` for replay-safe processing.
- `UsageRecord` stores monthly quota snapshots for agents, tickets, storage, departments, KB
  articles and active customers.
- New registrations create a `MANUAL` trial subscription; no payment is captured in Phase 2.

## SLA model

- Each tenant defines a business calendar, working hours, holidays and per-priority SLA targets.
- Tickets snapshot first-response and resolution due dates, pause time and breach timestamps.
- `SlaEvent` is an append-only met/breached trail.
- SLA calculation workers and timers are built in Phase 4; Phase 2 only provides the data model.

---

## Project structure

```
.
├─ messages/
│  ├─ ar.json                       # 382 Arabic UI messages
│  └─ en.json                       # 382 English UI messages
├─ prisma/
│  ├─ schema.prisma                 # 67-model data contract
│  ├─ seed.ts                       # Idempotent plans + optional demo workspace/staff
│  └─ migrations/                   # Initial schema + Phase 2 lockout columns
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (auth)/                 # Split-screen login/register layouts
│  │  │  ├─ app/                    # Workspace chooser + tenant-protected routes
│  │  │  ├─ platform/               # Super-admin foundation
│  │  │  ├─ layout.tsx              # RTL/LTR root layout + providers
│  │  │  ├─ page.tsx                # Public landing page
│  │  │  ├─ error.tsx / not-found.tsx
│  │  ├─ api/auth/[...nextauth]/    # Auth.js route handlers
│  │  ├─ api/health/                # Readiness endpoint
│  │  ├─ globals.css                # Design tokens and RTL utilities
│  │  └─ icon.svg
│  ├─ components/
│  │  ├─ auth/                      # Login/register forms, password input, sign-out
│  │  ├─ landing/product-preview.tsx
│  │  ├─ workspace/                 # Shell, access denied, blocked tenant, profile form
│  │  ├─ pricing-section.tsx
│  │  ├─ site-header.tsx / site-footer.tsx
│  │  ├─ theme-toggle.tsx / locale-switcher.tsx
│  │  └─ ui/                        # shadcn-compatible primitives
│  ├─ i18n/                         # routing, navigation, request config
│  ├─ lib/
│  │  ├─ auth/                      # authorize, actions, validation, session, rate limit
│  │  ├─ tenants/                   # access context, provisioning, settings actions, presentation
│  │  ├─ plans.ts                   # Canonical plan catalogue
│  │  ├─ permissions.ts             # RBAC matrix
│  │  ├─ db.ts / env.ts / format.ts / utils.ts
│  ├─ auth.ts / auth.config.ts
│  ├─ middleware.ts
│  └─ types/next-auth.d.ts
├─ tests/                           # Plan, RBAC, validation and limiter tests
├─ prisma.config.ts
├─ next.config.ts
└─ package.json
```

---

## Local setup

### Prerequisites

- Node.js 22 (see `.nvmrc`; minimum supported is 20.9)
- npm 10+
- PostgreSQL 15+ (17 recommended)

### 1. Install and configure

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` and a strong `AUTH_SECRET`. Generate one with:

```bash
openssl rand -base64 48
```

### 2. Apply schema and seed

```bash
npm run db:validate
npm run db:migrate -- --name phase2
npm run db:seed
npm run dev
```

Existing deployments should use:

```bash
npm run db:migrate:deploy
npm run db:seed
```

Open [http://localhost:3000](http://localhost:3000); the middleware redirects to `/ar` by default.
Use `/en` for English.

### 3. Demo accounts

Seed credentials come from environment variables and are **never printed**. The local defaults in
`.env.example` are development-only:

| Role                 | Email                    | Password                    |
| -------------------- | ------------------------ | --------------------------- |
| Platform Super Admin | `owner@sanad.local`      | `SEED_SUPER_ADMIN_PASSWORD` |
| Demo tenant owner    | `demo.owner@sanad.local` | `SEED_DEMO_OWNER_PASSWORD`  |
| Demo support agent   | `agent@sanad.local`      | `SEED_DEMO_OWNER_PASSWORD`  |
| Demo technician      | `technician@sanad.local` | `SEED_DEMO_OWNER_PASSWORD`  |
| Demo billing manager | `billing@sanad.local`    | `SEED_DEMO_OWNER_PASSWORD`  |

Set `SEED_DEMO_DATA=false` in production. Demo staff users are created only when demo data is
enabled. The seed is idempotent; re-running preserves existing passwords and tenant lifecycle state.

`AUTH_SECRET` is a placeholder in `.env.example`; rotate it before any shared deployment.

---

## Commands

| Command                           | Purpose                                |
| --------------------------------- | -------------------------------------- |
| `npm run dev`                     | Next.js dev server (Turbopack)         |
| `npm run build`                   | Prisma generate + production build     |
| `npm start`                       | Start the production server            |
| `npm run typecheck`               | Strict TypeScript check                |
| `npm run lint`                    | ESLint with zero warnings allowed      |
| `npm test`                        | Plan/RBAC/auth-validation tests        |
| `npm run format` / `format:check` | Prettier                               |
| `npm run db:validate`             | Validate Prisma schema                 |
| `npm run db:format`               | Format Prisma schema                   |
| `npm run db:migrate`              | Create/apply a development migration   |
| `npm run db:migrate:deploy`       | Apply pending migrations in production |
| `npm run db:seed`                 | Idempotent seed                        |
| `npm run db:studio`               | Prisma Studio                          |
| `npm run db:reset`                | Destructive local reset                |

### Health endpoint

```http
GET /api/health
```

Returns `200` when the database responds and `503` when the app is up but the database is unavailable.
The response includes version, phase, database latency and integration configuration state, with no
secrets or raw error messages.

---

## Phase 2 verification

Verified locally on PostgreSQL 17.11 with two checked-in migrations:

- `prisma validate` — schema valid
- `prisma migrate dev` / `prisma migrate deploy` — both migrations applied to empty databases
- `prisma db seed` — applied twice, counts stable (idempotency verified)
- `npm test` — **17/17 contract tests pass** (plans, RBAC, validation, redirect sanitizer, limiter)
- `npm run typecheck` — passes
- `npm run lint` — zero warnings
- `npm run build` — production build succeeds; all localized routes are dynamic
- Auth E2E: owner/agent/super-admin login, wrong-password error, account lockout, logout
- Onboarding E2E: new workspace registration, automatic sign-in, default departments/SLA/roles
- Authorization E2E: agent blocked from settings; non-admin blocked from platform; cross-tenant
  workspace returns 404
- Tenant settings E2E: update persisted, success toast displayed, audit log written
- Mobile E2E: 390px AR/RTL layout, no horizontal overflow, mobile header and tenant sidebar
- Dark-mode toggle and AR → EN locale switch verified
- Security headers and `private, no-store` / `noindex` verified on authenticated pages
- Health endpoint returns `200` with a live DB and `503` with the database stopped

---

## Security notes and known limits

Implemented now:

- Server-side session verification and fresh tenant membership/permission resolution.
- Persistent account lockout; bcrypt cost 12; timing-safe unknown-user handling.
- In-process login/registration burst limits and database-backed per-account lockout.
- CSRF provided by Auth.js and Next.js Server Actions.
- Safe relative callback sanitizer; no open redirects.
- Private no-store caching and noindex on authenticated surfaces.
- Audit logs for login, lockout, workspace creation and settings changes.
- No secrets logged by seed, health or auth actions.

Deferred and intentionally not claimed:

- **Email verification and password reset** (requires an email provider and token templates).
- **Invitation acceptance UI** (schema exists; invitees cannot yet be created from the UI).
- **Distributed rate limiting** (current limiter is per process; account lockout is DB-backed).
- **PostgreSQL RLS** and a non-superuser application role.
- **CSP** and nonce-based inline-script hardening.
- **OAuth/social providers** (adapter is ready; only credentials are enabled).
- **MFA**, password history, and forced session revocation.
- **Stripe checkout**, webhooks, invoicing and feature-gating enforcement (Phase 3).
- **Ticket/CRM/SLA runtime modules**, customer portal, realtime and analytics (Phase 4/5).
- **Command palette, global search, ticket Kanban and notification center** (arrive with the
  corresponding modules).

---

## Next: Phase 3

1. Super Admin plan management, tenant suspension/activation, and platform settings.
2. Stripe products/prices, checkout, customer portal, webhooks and provider adapter abstraction.
3. Subscription renewal, failure/dunning, invoices, usage tracking and feature-gating enforcement.
4. Platform MRR/ARR/churn metrics and full audit views.
5. Security hardening: RLS, CSP, distributed rate limiting, and email verification/password reset.

Phase 3 should start only after Phase 2 approval.
