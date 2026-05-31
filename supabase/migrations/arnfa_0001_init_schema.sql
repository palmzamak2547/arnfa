-- arnfa_0001_init_schema
-- Arnfa data plane under a dedicated `arnfa.*` Postgres schema.
--
-- Target project: miracle-investment `dcrbtlpiumqpiegzucpp` (Palm directive — share
-- the miracle Supabase, schema-namespaced to avoid any collision with public.*).
-- If that project's MCP/PAT isn't wired yet, this same file applies cleanly to ANY
-- Supabase project (it never touches public.*).
--
-- Phase 0/1 ran fully on localStorage; this adds the cloud spine for Phase 2:
-- feedback flywheel (the moat), saved trips, and per-user taste persistence.
--
-- Design refs: projects/arnfa/04-supabase-namespace.md · 02-architecture.md
-- RLS: every table owner-scoped; UPDATE splits USING / WITH CHECK; auth.uid() wrapped
-- in (select ...) for cached eval. No FK ever crosses arnfa.* <-> public.*.

create schema if not exists arnfa;
create extension if not exists postgis;

-- ─────────────────────────────────────────────────────────────────────────────
-- POI master + computed weather-fit profile (the moat lives here once the LLM
-- profiler + crowd feedback enrich it; Phase 0/1 seeds are JSON files on disk).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists arnfa.poi (
  id            text primary key,                 -- "osm-<id>"
  osm_id        bigint,
  name          text not null,
  name_th       text,
  lat           double precision not null,
  lng           double precision not null,
  geom          geography(Point, 4326),
  category      text not null,
  district      text,
  opening_hours text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists arnfa.poi_weather_profile (
  poi_id         text primary key references arnfa.poi(id) on delete cascade,
  outdoorness    real not null default 0.5,
  indoorness     real not null default 0.5,
  shade          real not null default 0.3,
  covered        real not null default 0.5,
  rain_enjoyment real not null default 0.4,
  heat_tolerance real not null default 0.5,
  confidence     real not null default 0.4,
  source         text not null default 'osm-heuristic',  -- osm-heuristic | llm | crowd
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-user taste vector (currently localStorage; this is the cloud mirror so a
-- user's taste follows them across devices once auth lands).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists arnfa.user_taste (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  vector            jsonb not null default '{}'::jsonb,
  rain_sensitivity  real not null default 0.5,
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Saved trips + their stops (the "save / share / run tomorrow" surface).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists arnfa.trip (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  district   text not null,
  budget_min int not null,
  title      text,
  created_at timestamptz not null default now()
);

create table if not exists arnfa.trip_stop (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references arnfa.trip(id) on delete cascade,
  poi_id        text,
  ordinal       int not null,
  slot_iso      text,
  planned_score real,
  was_swapped   boolean not null default false
);
create index if not exists trip_stop_trip_idx on arnfa.trip_stop(trip_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Feedback events = the flywheel. Each "ฝนตกก็โอเค 👍/👎" sharpens the profile.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists arnfa.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  poi_id     text,
  kind       text not null check (kind in ('weather_ok','weather_bad','accept_swap','dismiss')),
  context    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists feedback_poi_idx on arnfa.feedback(poi_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — owner-scoped. POI + profiles are public-read (catalog), writes service-only.
-- ─────────────────────────────────────────────────────────────────────────────
alter table arnfa.poi                  enable row level security;
alter table arnfa.poi_weather_profile  enable row level security;
alter table arnfa.user_taste           enable row level security;
alter table arnfa.trip                 enable row level security;
alter table arnfa.trip_stop            enable row level security;
alter table arnfa.feedback             enable row level security;

-- public catalog: anyone may read POI + profiles; writes via service_role only
create policy poi_public_read on arnfa.poi for select using (true);
create policy poi_profile_public_read on arnfa.poi_weather_profile for select using (true);

-- taste: owner only
create policy taste_select_own on arnfa.user_taste for select to authenticated using (user_id = (select auth.uid()));
create policy taste_insert_own on arnfa.user_taste for insert to authenticated with check (user_id = (select auth.uid()));
create policy taste_update_own on arnfa.user_taste for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- trips: owner only
create policy trip_select_own on arnfa.trip for select to authenticated using (user_id = (select auth.uid()));
create policy trip_insert_own on arnfa.trip for insert to authenticated with check (user_id = (select auth.uid()));
create policy trip_update_own on arnfa.trip for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy trip_delete_own on arnfa.trip for delete to authenticated using (user_id = (select auth.uid()));

-- trip stops: visible/editable iff you own the parent trip
create policy trip_stop_select_own on arnfa.trip_stop for select to authenticated
  using (exists (select 1 from arnfa.trip t where t.id = trip_id and t.user_id = (select auth.uid())));
create policy trip_stop_write_own on arnfa.trip_stop for insert to authenticated
  with check (exists (select 1 from arnfa.trip t where t.id = trip_id and t.user_id = (select auth.uid())));

-- feedback: a user may insert their own; reads are service/admin only (no select policy)
create policy feedback_insert_own on arnfa.feedback for insert to authenticated
  with check (user_id = (select auth.uid()) or user_id is null);

comment on schema arnfa is 'Arnfa (อ่านฟ้า) weather-trip decision engine — namespaced to share the miracle-investment Supabase without colliding with public.*';
