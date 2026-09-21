# Calorie Tracker

A mobile-first daily calorie tracker. Log meals by photo (analyzed with Claude) or
manually, get a personalized calorie/macro target based on your goal, and track
weight and progress over time.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Postgres + Prisma ORM (works with any Postgres host — Neon, Vercel Postgres,
  Supabase, etc.; swap providers by changing `provider` in
  `prisma/schema.prisma` and `DATABASE_URL`)
- NextAuth (credentials/email+password) for per-user auth
- Anthropic Claude API (`claude-sonnet-5`) for food photo analysis, called only
  from a server API route (`/api/food-logs/analyze`)
- Recharts for the weight and weekly-calories charts
- Vitest for unit tests of the calorie/BMR/TDEE math

## Getting started

### 1. Install dependencies

```bash
cd calorie-tracker
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.local.example .env.local
```

`.env.local`:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="a-long-random-string"   # generate with `openssl rand -base64 32`
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."           # your Claude API key
```

A free Postgres database works fine for `DATABASE_URL` — e.g. sign up at
[neon.tech](https://neon.tech), create a project, and copy the connection
string it gives you.

`ANTHROPIC_API_KEY` is read only on the server (inside API routes) and is never
sent to the browser. If it's missing, photo analysis returns a friendly error
and you can still log food manually.

Prisma's CLI (used for migrations) reads a plain `.env` file rather than
`.env.local`, so also create one containing just the database URL:

```bash
echo 'DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"' > .env
```

### 3. Set up the database

```bash
npx prisma migrate deploy
```

This applies the schema (`prisma/migrations/`) to your Postgres database.
`npm run build` also runs this automatically before building, so a fresh
deploy always has an up-to-date schema. If you change `prisma/schema.prisma`
during development, regenerate the migration with `npx prisma migrate dev`.

### 4. Run the app

```bash
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to sign up, then walked
through onboarding (goal setup) before landing on the Today dashboard.

### 5. Run tests

```bash
npm test
```

Runs the Vitest suite covering `src/lib/calorie-math.ts` (BMR/TDEE/macros and
the safety guardrails: minimum-calorie floors, 1%-bodyweight pace cap, BMI
warnings).

## Deploying to Vercel

1. Push this branch/repo to GitHub (already done if you're reading this from
   a PR), then go to [vercel.com/new](https://vercel.com/new) and import the
   repo.
2. Under **Root Directory**, select `calorie-tracker` (this app lives in a
   subdirectory of the repo, not the repo root).
3. Add these Environment Variables (Project Settings → Environment Variables):
   - `DATABASE_URL` — your Postgres connection string (e.g. from Neon)
   - `NEXTAUTH_SECRET` — a random string (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` — set this **after** the first deploy, once you know your
     assigned `*.vercel.app` URL (or custom domain); then redeploy
   - `ANTHROPIC_API_KEY` — your Claude API key (optional — without it, photo
     analysis shows a friendly error but manual logging still works)
4. Deploy. Vercel runs `npm run build`, which applies pending Prisma
   migrations to `DATABASE_URL` automatically before building — no manual
   migration step needed.
5. Once deployed, set `NEXTAUTH_URL` to the live URL and trigger a redeploy
   (Deployments → ⋯ → Redeploy) so auth callback URLs resolve correctly.

## Project structure

```
src/
  app/
    login/, register/         auth pages
    onboarding/                first-time profile & goal setup
    today/                      daily dashboard (progress ring, meals, logging)
    profile/                    edit profile (target recalculates)
    progress/                   weight chart, weekly chart, streaks
    api/
      auth/[...nextauth]        NextAuth handler
      auth/register              account creation
      profile                    GET/POST/PUT profile + computed target
      food-logs                  GET (by date) / POST (create) food logs
      food-logs/[id]              PUT (edit items) / DELETE
      food-logs/analyze           POST photo -> Claude analysis (server-only)
      weight                      GET/POST weight entries
  components/                   UI building blocks (charts, forms, meal cards)
  lib/
    calorie-math.ts             pure BMR/TDEE/macro/BMI math (unit tested)
    calorie-math.test.ts
    food-analysis.ts            Claude prompt, zod schema, retry logic
    profile-calc.ts             wraps a Profile row -> calorie target
    day-stats.ts                streak / weekly-range helpers
    image.ts                    client-side photo resize/compress
    prisma.ts, auth.ts, session.ts
  types/                        shared DTOs
prisma/
  schema.prisma                 User, Profile, WeightEntry, FoodLog, FoodItem
```

## Safety guardrails baked into the calorie math

- Daily target never drops below 1,500 kcal (men) / 1,200 kcal (women); if the
  chosen pace would require going lower, the target is floored and the
  estimated timeline is recalculated to match.
- Weight-loss/gain pace is capped at 1% of current bodyweight per week.
- A warning (not a block) is shown if the target weight implies a BMI under 18.5.
- All estimates are labeled as approximate and not medical advice.

## Notes

- Food photos are compressed client-side (long edge ≤ 1568px) before upload.
- The Claude prompt asks for calorie/macro estimates including common
  Indonesian/Asian dishes (nasi goreng, rendang, soto, gado-gado, etc.).
- The photo analysis response is validated with `zod`; on a parse failure it's
  retried once, then falls back to a friendly error with a manual-entry option.
- A compact thumbnail (not the full-resolution photo) is stored with each
  logged meal.
- Logging a new weight entry updates the profile's current weight, which
  automatically recalculates BMR/TDEE/target on next view.
