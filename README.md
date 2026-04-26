# Drachen Trimmlog

Personal trim & race log for a Dragon class sailboat. Single-user PWA — log
rigging tension, mast settings and sail trim per race, then upload audio
debriefs that get transcribed and AI-analyzed.

UI is in German; codebase is in English.

## Phase 1 status

This commit is the boilerplate only. Working pieces:

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui primitives
- Supabase SSR auth with magic-link login
- Protected app shell with bottom tab nav (4 tabs, all placeholders)
- PWA manifest + service worker + iOS/Android icons (placeholder art)

**Not yet built:** race form (Phase 2), audio recording (Phase 3),
Whisper / Claude integration (Phase 3), pattern recognition (Phase 4).

### Security model (single-user)

Three layers, defence in depth:

1. **`ALLOWED_EMAIL` gate** in the login server action: foreign emails
   never reach Supabase (no enumeration — UI always says "E-Mail
   unterwegs").
2. **Callback re-check** in `/auth/callback`: even if a magic link is
   ever issued for a foreign address, the post-exchange handler signs
   them out and redirects with `?error=forbidden`.
3. **Row-level security** in Postgres (see `supabase/policies.sql`):
   the anon and authenticated roles can only see rows where
   `auth.uid() = user_id`. Bucket `debriefs` is locked the same way.

## Tech stack

| Layer    | Choice                                              |
| -------- | --------------------------------------------------- |
| Frontend | Next.js 15 (App Router), TypeScript, React 19       |
| Styling  | Tailwind CSS, shadcn/ui (`new-york`), lucide-react  |
| Backend  | Supabase (Postgres, Auth, Storage)                  |
| AI       | OpenAI Whisper (Phase 3), Anthropic Claude (Phase 3)|
| Hosting  | Vercel                                              |

## Setup checklist

Work top to bottom — each step assumes the previous ones are done. Tick
boxes in your editor as you go.

### Local

- [ ] `npm install`
- [ ] `cp .env.example .env.local`
- [ ] Fill in `.env.local` (see env table below)
- [ ] `npm run dev` — first run will fail loudly if any required env var
      is missing; that's by design (Zod validation in `src/lib/env/`)

### Supabase (one-time, ~10 min)

- [ ] **Create project** at <https://supabase.com> (region close to you,
      e.g. Frankfurt)
- [ ] **Settings → API**: copy `Project URL`, `anon public`, and
      `service_role` keys into `.env.local`
- [ ] **Authentication → Providers → Email**: enable Email provider,
      keep "Confirm email" ON, no password needed (magic link only)
- [ ] **Authentication → URL Configuration**:
  - [ ] `Site URL` → `http://localhost:3000` (for now)
  - [ ] Add to `Redirect URLs`:
    - `http://localhost:3000/auth/callback`
    - `https://<your-vercel-url>/auth/callback` (add after first deploy)
- [ ] **SQL Editor → New query**: paste your schema (6 tables) → Run
- [ ] **SQL Editor → New query**: paste contents of
      [`supabase/policies.sql`](./supabase/policies.sql) → Run.
      Enables RLS on every table + locks the `debriefs` storage bucket.
- [ ] **Storage → New bucket**: name `debriefs`, **Private** (not used
      until Phase 3 but easier to set up now)
- [ ] **Email Templates → Magic Link**: optional — translate to German.
      Keep `{{ .ConfirmationURL }}` intact.
- [ ] After your first successful login: **Authentication → Sign-In/Up
      → "Allow new users to sign up"** OFF (defence in depth — the
      `ALLOWED_EMAIL` gate already blocks foreign sign-ins)

### Vercel (one-time, ~5 min)

- [ ] **New Project → Import** the GitHub repo `mantapanta/999`.
      Branch: `main` (Production)
- [ ] Framework auto-detects as Next.js — leave defaults
- [ ] **Settings → Environment Variables**, add for **Production** AND
      **Preview** (every required key from `.env.example`):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `ALLOWED_EMAIL`
  - [ ] `NEXT_PUBLIC_SITE_URL` ← set to your Vercel production URL
  - [ ] `OPENAI_API_KEY` (placeholder OK for now)
  - [ ] `ANTHROPIC_API_KEY` (placeholder OK for now)
- [ ] First **Deploy** → wait for green build
- [ ] Take the live URL, go back to Supabase → URL Configuration, and
      add it to `Site URL` + `Redirect URLs` (`/auth/callback`)
- [ ] Optional: **Vercel Analytics** + **Speed Insights** (free)
- [ ] Optional: **Custom Domain** → update `NEXT_PUBLIC_SITE_URL` and
      Supabase redirects to match

### Smoke test

- [ ] Open production URL → redirects to `/login`
- [ ] Type your `ALLOWED_EMAIL` → "E-Mail unterwegs" message
- [ ] Type a different email → also "E-Mail unterwegs", but no email
      arrives (gate working, no enumeration)
- [ ] Click the magic link **on the same device** → land on `/races`
      with bottom nav visible
- [ ] iPhone Safari: Share → Add to Home Screen → app opens fullscreen

### Environment variables

| Variable                          | Required for      | Notes                                              |
| --------------------------------- | ----------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Phase 1+          | From Supabase Settings → API                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Phase 1+          | Same place                                        |
| `SUPABASE_SERVICE_ROLE_KEY`       | Phase 1+          | Server-only; never expose to client                |
| `ALLOWED_EMAIL`                   | Phase 1+          | Single-user gate. Validated in login + callback    |
| `NEXT_PUBLIC_SITE_URL`            | Phase 1+          | Magic-link redirect base                           |
| `OPENAI_API_KEY`                  | Phase 3           | Whisper transcription (optional now)               |
| `ANTHROPIC_API_KEY`               | Phase 3           | Claude debrief analysis (optional now)             |

## Scripts

| Command            | What it does               |
| ------------------ | -------------------------- |
| `npm run dev`      | Local dev server           |
| `npm run build`    | Production build           |
| `npm run start`    | Start built server         |
| `npm run lint`     | ESLint                     |
| `npm run typecheck`| `tsc --noEmit`             |

## Project layout

```
src/
├── app/
│   ├── (app)/                  # protected, has bottom nav
│   │   ├── layout.tsx          # auth check + chrome
│   │   ├── races/page.tsx      # Tab 1: Rennen
│   │   ├── library/page.tsx    # Tab 2: Bibliothek (Ampel-Setups)
│   │   ├── debriefs/page.tsx   # Tab 3: Debriefs
│   │   └── learnings/page.tsx  # Tab 4: Erkenntnisse
│   ├── auth/
│   │   ├── callback/route.ts   # magic-link exchange
│   │   └── signout/route.ts
│   ├── login/page.tsx          # magic-link form
│   ├── layout.tsx              # root layout, PWA metadata
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn primitives
│   ├── bottom-nav.tsx
│   ├── page-header.tsx
│   ├── empty-state.tsx
│   └── service-worker-register.tsx
├── lib/
│   ├── env/
│   │   ├── public.ts           # Zod-validated NEXT_PUBLIC_* vars
│   │   └── server.ts           # Zod-validated server-only vars (server-only)
│   ├── supabase/
│   │   ├── client.ts           # browser client
│   │   ├── server.ts           # server client (RSC, route handlers)
│   │   └── middleware.ts       # session refresh
│   └── utils.ts
└── middleware.ts               # gates everything except /login + /auth/*

supabase/
└── policies.sql                # RLS policies — paste after schema
public/
├── manifest.webmanifest
├── sw.js                       # offline shell cache
├── icons/                      # PWA icons (replace placeholders)
└── apple-touch-icon.png
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. On Vercel: **New Project → Import** the repo.
3. **Environment Variables**: copy every key from `.env.local` into the
   Production / Preview environments. Set `NEXT_PUBLIC_SITE_URL` to the
   Vercel production URL.
4. After the first deploy, go back to Supabase **Auth → URL Configuration**
   and add `${VERCEL_URL}/auth/callback` to the redirect allow-list.

## Installing as a PWA

- **iOS**: open the deployed URL in Safari → Share → Add to Home Screen.
- **Android / desktop Chrome**: address-bar install icon.

The service worker only registers in production builds; in dev you'll see
the regular browser shell.

## Replacing the icon set

Placeholder icons live in `public/icons/` and `public/apple-touch-icon.png`
— solid navy with a white triangular sail. Replace with the real artwork
when ready (PNG, sizes 192/512/180, plus a maskable 512).
