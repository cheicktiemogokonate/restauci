# restau-platform Agent Guidelines

## Development Commands
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type check
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Apply migrations to database
- `npm run db:studio` - Open Drizzle Studio UI

## Environment Setup
Copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` (PostgreSQL URL)
- `JWT_SECRET` (min 32 chars)
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` (Upstash Redis)
- Optional: Cloudinary, VAPID, Expo, App URL

## Project Structure
- `src/app` - Next.js app router with route groups: `(auth)`, `(client)`, `(dashboard)`, `(public)`
- `src/app/api` - API route handlers (including versioned `v1` subdirectory)
- `src/infrastructure/db/schema.ts` - Drizzle database schema
- `src/proxy.ts` - Middleware for auth, rate limiting, and route protection (`/api/v1` uses Bearer token, others use cookies)

## Important Notes
- API routes under `/api/v1` are excluded from cookie authentication (use Authorization: Bearer token)
- Global rate limiting (200 requests/min) applies to all `/api/` routes via middleware
- Lint and typecheck are separate commands; run both before committing
- Database migrations are stored in `/drizzle/migrations`
- Uses Next.js 16.2.6, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM

## Architecture rules
- Find the business owner under `src/modules` before changing business logic.
- Read `model.ts`, `contracts.ts` and `server.ts` first.
- Never import another module's `_internal` files.
- `app` must not import Drizzle or `infrastructure/db`.
- Route Handlers and Server Actions are adapters, not business services.
- Do not duplicate business rules, status mappings, quota logic or money calculations.
- Use canonical commands for business writes.
- Server code must stay server-only.
- `src/lib` has been retired; do not recreate it or add compatibility bridges there.
- See `ARCHITECTURE.md` for ownership and dependency rules.

## UI implementation protocol

Before writing or changing application UI:

1. Define the screen's job, information hierarchy, actions, responsive behavior,
   accessibility needs, and empty/loading/error/success/disabled states.
2. Inventory the components required by the screen.
3. Search the components already installed in `src/components` before adding or
   recreating anything.
4. Load and follow the global `app-components-registry` skill. Its resolution
   order is absolute for application UI: search beUI first, then shadcn/ui.
   Dashboard shells and layouts use the shadcn/ui dashboard block directly.
5. Search other requested or configured UI sources only after this mandatory
   resolution step. Do not combine libraries to animate the same interaction.
6. When more than one suitable component remains, present the user with the
   library, component name, reference/demo, dependencies, strengths, limits,
   and a recommendation. Wait for the user's choice unless they explicitly
   delegate the selection.
7. Install the selected component through its registry/MCP command and adapt it
   minimally to the existing design system. Prefer a reusable product component
   over screen-specific duplicated markup.
8. Do not replace the discovery step with raw native controls or handwritten
   custom widgets merely because a component is not already installed locally.
9. After implementation, run the relevant registry audit checklist, accessibility
   checks, targeted lint/type checks, and the verification level authorized by
   the user.

### User verification preference

- Never open or launch a browser for this project unless the user explicitly
  authorizes browser use in the current message. Use static analysis, tests,
  builds and non-browser CLI diagnostics by default.

The current UI is not a visual-compatibility target during the modular-monolith
migration. Every interface may be redesigned or rebuilt when its owning domain
is migrated. A domain is not considered migrated while its affected screens
remain obsolete, incoherent, or incomplete.

Visual coherence is centralized: generic primitives and tokens stay shared and
contain no business vocabulary; domain-specific composition stays in the owning
module's `presentation/` surface. Domain components must reuse the same product
tokens, typography, spacing, variants, interaction states, accessibility rules,
and responsive patterns instead of defining a local visual language.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
