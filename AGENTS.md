# Mutual Aid Route Planner — AGENTS.md

## Project Overview

This is a web app built for a Chicago-area mutual aid organization (Logan Square area) that delivers supplies to recipients every Saturday. The app streamlines weekly route planning by letting an admin build a delivery run from a master address list, assign drivers, auto-generate optimized routes, and give each driver a mobile-friendly dashboard with one-tap Google Maps / Apple Maps navigation.

**This is a real operational tool used by real people doing mutual aid work. Prioritize reliability, clarity, and mobile usability over cleverness.**

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Use server components where appropriate |
| Database + Auth | Supabase | Postgres + Row Level Security + Auth |
| Hosting | Vercel | Free tier |
| Geocoding + Routing | Google Maps API | Geocoding API + Routes API |
| Styling | Tailwind CSS | Mobile-first throughout |
| Language | TypeScript | Strict mode |

---

## Auth & Roles

Two roles, both using Supabase Auth (email + password or magic link):

- **admin** — full access: manage master address list, manage drivers, create/manage weekly runs, generate routes
- **driver** — restricted: can only see their own current week's route and map links

Onboard new drivers by sending them a Supabase magic link signup email. They log in and immediately see their dashboard.

Row Level Security (RLS) must enforce role-based access at the database level — never rely solely on UI-level guards.

---

## Database Schema

```sql
-- Extends Supabase auth.users
create table profiles (
  id uuid references auth.users primary key,
  name text not null,
  phone text,
  role text not null check (role in ('admin', 'driver')),
  home_address text,         -- used as final stop in routing
  home_lat float,
  home_lng float,
  created_at timestamptz default now()
);

-- Master list of delivery recipients
create table addresses (
  id uuid primary key default gen_random_uuid(),
  name text,                 -- recipient name (optional)
  street text not null,
  city text not null default 'Chicago',
  state text not null default 'IL',
  zip text,
  notes text,                -- access codes, apt numbers, etc.
  lat float,                 -- geocoded, cached
  lng float,
  created_at timestamptz default now()
);

-- Each Saturday's delivery event
create table weekly_runs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  warehouse_address text not null,
  warehouse_lat float,
  warehouse_lng float,
  status text default 'draft' check (status in ('draft', 'active', 'complete')),
  created_at timestamptz default now()
);

-- Addresses selected for a given run
create table run_addresses (
  run_id uuid references weekly_runs on delete cascade,
  address_id uuid references addresses on delete cascade,
  primary key (run_id, address_id)
);

-- Drivers participating in a given run
create table run_drivers (
  run_id uuid references weekly_runs on delete cascade,
  driver_id uuid references profiles on delete cascade,
  primary key (run_id, driver_id)
);

-- Final assignments: which driver gets which stop in what order
create table assignments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references weekly_runs on delete cascade,
  driver_id uuid references profiles on delete cascade,
  address_id uuid references addresses on delete cascade,
  stop_order int not null,
  created_at timestamptz default now()
);
```

---

## Routing Logic

### Overview

When admin hits "Generate Routes":

1. **Geocode** all selected addresses for the run (use cached lat/lng if already stored, otherwise call Google Geocoding API and cache result)
2. **Optimize** stop order across the full address set using a nearest-neighbor TSP approximation (good enough for a tight geographic cluster like Logan Square / Humboldt Park / Hermosa / Belmont Cragin)
3. **Split** the sorted address list into N roughly equal chunks (N = number of drivers selected for this run)
4. **Assign** each chunk to a driver — save to `assignments` table with `stop_order`
5. Each driver's route is: **Warehouse → [their stops in order] → their home address**

### Map Link Generation

**Google Maps:**
```
https://www.google.com/maps/dir/WAREHOUSE/STOP1/STOP2/.../DRIVER_HOME/
```
Addresses should be URL-encoded. Google Maps supports up to 10 waypoints — with ~6–10 stops per driver this fits perfectly.

**Apple Maps:**
```
https://maps.apple.com/?daddr=STOP1&daddr=STOP2&...
```
Note: Apple Maps doesn't support a true multi-stop route URL the same way. Best approach is to open to the first stop and let drivers step through, or use a deep link that opens the address list.

Both buttons should appear prominently on the driver dashboard.

### Geography Note

All addresses are concentrated in the northwest Chicago neighborhoods: Logan Square, Humboldt Park, Hermosa, Belmont Cragin. This tight cluster means nearest-neighbor sorting works well — drivers won't need to criss-cross.

---

## App Structure

```
/app
  /admin
    /addresses        -- master address list CRUD
    /drivers          -- driver management
    /runs
      /new            -- create new weekly run
      /[id]           -- run detail: select addresses, select drivers, generate routes
  /dashboard          -- driver view: their stops + map buttons
  /auth
    /login
    /signup
/lib
  /supabase.ts        -- client + server clients
  /geocode.ts         -- Google Geocoding API wrapper (with caching logic)
  /routing.ts         -- nearest-neighbor TSP + split logic
  /mapLinks.ts        -- Google Maps + Apple Maps URL builders
/components
  /admin/...
  /driver/...
  /ui/...             -- shared primitives
```

---

## Weekly Admin Flow (Step by Step)

1. Admin logs in → goes to `/admin/runs/new`
2. Sets the date (defaults to upcoming Saturday)
3. Selects addresses from master list (searchable checkbox list)
4. Selects drivers available this week
5. Hits **"Generate Routes"**
   - App geocodes any un-geocoded addresses
   - Runs nearest-neighbor optimization
   - Splits into driver chunks
   - Saves assignments
   - Run status → `active`
6. Admin sees a summary: each driver's stop list + map link preview
7. Drivers get notified (manually for now — admin copies links or tells them to log in)

---

## Driver Dashboard

Mobile-first. This is used on a phone, Saturday morning, in a car.

- Driver's name + run date prominently displayed
- Numbered stop list with address + any notes (gate codes, apt #, etc.)
- **"Open in Google Maps"** — large, tappable button
- **"Open in Apple Maps"** — large, tappable button
- Keep it extremely simple — no clutter

---

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-side only, never expose to client
GOOGLE_MAPS_API_KEY=             # server-side only for geocoding/routing
NEXT_PUBLIC_GOOGLE_MAPS_KEY=     # client-side if needed for any map display
```

---

## Build Order

1. Supabase project setup — schema, RLS policies, auth config
2. Next.js scaffold — Supabase client, auth middleware, role-based route guards
3. Admin: Master address CRUD (`/admin/addresses`)
4. Admin: Driver management (`/admin/drivers`)
5. Admin: Weekly run creation — address selection + driver selection
6. Routing logic — geocode + nearest-neighbor + split + save assignments
7. Map link generation utility
8. Driver dashboard (`/dashboard`)
9. Polish: loading states, error handling, mobile QA

---

## V2 / Future Considerations

- **Manual reassignment:** Drag-and-drop addresses between drivers after auto-split (just updating `assignments` rows — schema already supports this)
- **Stop completion tracking:** Checkbox per stop on driver dashboard, stored in a `stop_completions` table
- **SMS delivery:** Send each driver their map link via Twilio when run goes active
- **Route history:** Past runs archive, useful for tracking coverage over time
- **Recurring addresses:** Flag addresses as "every week" so they auto-populate into new runs

---

## Notes & Constraints

- **Cost:** Google Maps API usage is ~4 queries/week (one per run). Negligible cost. Don't optimize around it.
- **Scale:** ~60 addresses, 6–10 drivers per week. No performance concerns. Keep logic simple and readable over clever.
- **Offline:** Not needed — drivers have data. Google Maps handles offline natively if needed.
- **This is for real people doing real work.** Prefer boring reliability over cool features.

