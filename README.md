# We Relay It — Mutual Aid Route Planner

Web app for a Chicago-area mutual aid group (Logan Square and nearby) that runs weekly Saturday deliveries. Admins build each week’s run from a master address list, assign drivers, generate optimized routes, and drivers get a **mobile-first** dashboard with one-tap **Google Maps** and **Apple Maps** links.

This is a real operational tool: favor reliability, clarity, and phone usability over clever features.

## Tech stack

| Area | Choice |
|------|--------|
| App | [Next.js](https://nextjs.org) (App Router), TypeScript, [Tailwind CSS](https://tailwindcss.com) |
| Data & auth | [Supabase](https://supabase.com) (Postgres, Row Level Security, Auth) |
| Maps | Google Maps (Geocoding + routing as needed) |
| Hosting | [Vercel](https://vercel.com) |

## Roles

- **Admin** — Master addresses, drivers, weekly runs, route generation.
- **Driver** — Sees only their own route for the current week and map links.

Access is enforced with **RLS** in Supabase, not only in the UI.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

App code lives under `src/app` (App Router). Shared libraries and components are intended to live under `src/lib` and `src/components` as the app grows—see **AGENTS.md** for the target layout and feature checklist.

## Environment variables

Create a `.env.local` (gitignored) with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server only; never expose to the client
GOOGLE_MAPS_API_KEY=             # server only for geocoding / routing
NEXT_PUBLIC_GOOGLE_MAPS_KEY=     # client only if you add map UI
```

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Full product spec: schema, routing behavior (geocode → nearest-neighbor → split by driver), map URL patterns, admin and driver flows, build order, and future ideas. **[CLAUDE.md](./CLAUDE.md)** mirrors the same content for other tools.

## Deploy

Deploy on [Vercel](https://vercel.com) or any Next.js host; set the same environment variables in the project settings.
