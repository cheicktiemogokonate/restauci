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
- `src/lib/db/schema.ts` - Drizzle database schema
- `src/proxy.ts` - Middleware for auth, rate limiting, and route protection (`/api/v1` uses Bearer token, others use cookies)

## Important Notes
- API routes under `/api/v1` are excluded from cookie authentication (use Authorization: Bearer token)
- Global rate limiting (200 requests/min) applies to all `/api/` routes via middleware
- Lint and typecheck are separate commands; run both before committing
- Database migrations are stored in `/drizzle/migrations`
- Uses Next.js 16.2.6, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM