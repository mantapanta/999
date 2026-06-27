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

## Taktik-Briefing-Coach (`/briefing`)

A standalone, fully client-side tactics briefing tool for one-design racing
(J70 / Dragon). No login or Supabase required — all state lives in
`localStorage`. Reach it at `/briefing`.

The UI is split into two modes, toggled in the top bar:

**🏁 Race view** (default) — the compact on-the-water briefing. A conditions
chip row (wind, current, line bias, wave), quick segmented controls for the
between-race tactical calls (shift character, favoured side), the **max. 5
prioritised rules** as the hero, a mini course diagram, and share/print. A rule
engine (`src/lib/briefing/rules.ts`) scores ~20 built-in tactical rules against
the conditions and picks the top 5 with category diversity so it never
overloads.

**⚙️ Setup / admin** — everything you configure, in three tabs:

- **Kurs & Ort** — a real nautical chart (OpenStreetMap base + OpenSeaMap
  seamark overlay, via Leaflet). Set the race-area location and drop the five
  course marks; **load weather & current** and **project the real course into
  the wind-up tactical diagram** (rotated so the wind blows straight down).
- **Wetter & Modell** — pick the forecast **model** (Auto, AROME HD, ICON-D2,
  ICON-EU, ECMWF, GFS), load weather, and manually override any condition.
- **Regeln** — the built-in rule library plus your own custom rules, triggered
  by condition tags (e.g. light wind, current from windward, persistent right
  shift). Rules are administered here only.

### Weather & current auto-load

`fetchWeather()` (`src/lib/briefing/weather.ts`) pulls wind, gusts, **ocean
current** and wave height from [Open-Meteo](https://open-meteo.com) — free, no
API key, called straight from the browser. The loaded current bearing orients
the tactical diagram's current arrow automatically.

Windy is supported as an **optional** wind source: set `WINDY_API_KEY` and the
`/api/windy-wind` route fetches wind/gusts from the Windy Point Forecast API
(preferred over Open-Meteo for wind when present). Note: Windy's *point* API
does **not** expose ocean currents, so current always comes from Open-Meteo.

Key files: `src/lib/briefing/{types,rules,storage,geo,weather}.ts`,
`src/app/briefing/`, `src/app/api/windy-wind/route.ts`.

## Tech stack

| Layer    | Choice                                              |
| -------- | --------------------------------------------------- |
| Frontend | Next.js 15 (App Router), TypeScript, React 19       |
| Styling  | Tailwind CSS, shadcn/ui (`new-york`), lucide-react  |
| Backend  | Supabase (Postgres, Auth, Storage)                  |
| AI       | OpenAI Whisper (Phase 3), Anthropic Claude (Phase 3)|
| Hosting  | Vercel                                              |

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in real values:

```bash
cp .env.example .env.local
```

| Variable                          | Required for      | Notes                                              |
| --------------------------------- | ----------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Phase 1+          | From Supabase project settings → API              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Phase 1+          | Same place                                        |
| `SUPABASE_SERVICE_ROLE_KEY`       | Phase 2+          | Server-only; never expose                         |
| `ALLOWED_EMAIL`                   | Phase 1+          | Single-user gate (your email)                     |
| `OPENAI_API_KEY`                  | Phase 3           | Whisper transcription                             |
| `ANTHROPIC_API_KEY`               | Phase 3           | Claude debrief analysis                           |
| `NEXT_PUBLIC_SITE_URL`            | Phase 1+          | Used as redirect base for magic links              |

### 3. Set up Supabase

1. Create a Supabase project at <https://supabase.com>.
2. **Auth → Providers → Email**: enable Magic Link.
3. **Auth → URL Configuration**: add your site URL and
   `${SITE_URL}/auth/callback` to the redirect allow-list.
   For local dev that's `http://localhost:3000` and
   `http://localhost:3000/auth/callback`.
4. **SQL Editor**: paste in the schema (6 tables: `base_setups`,
   `setups_library`, `races`, `audio_debriefs`, `race_debrief_links`,
   `learnings`). Provided separately — not in this repo yet.

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`. Enter your
email, click the link in your inbox, and you'll land on the Rennen tab.

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
│   ├── supabase/
│   │   ├── client.ts           # browser client
│   │   ├── server.ts           # server client (RSC, route handlers)
│   │   └── middleware.ts       # session refresh
│   └── utils.ts
└── middleware.ts               # gates everything except /login + /auth/*
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
