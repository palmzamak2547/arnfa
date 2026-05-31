-- Arnfa deals rail — the HONEST monetization foundation.
-- No deals are seeded. The chip on a plan stop only ever renders a REAL row a
-- merchant added; RLS guarantees the public can read ONLY currently-active deals.
-- merchant_lead is a write-only intake for shops who want to list a weather deal.

-- 1) Deals keyed to an app POI id (e.g. 'osm-w123') with a weather trigger.
create table if not exists arnfa.deal (
  id uuid primary key default gen_random_uuid(),
  poi_id text not null,
  district_key text,
  merchant_name text not null,
  title text not null,
  weather_trigger text not null default 'any'
    check (weather_trigger in ('rain','heat','clear','any')),
  url text,
  valid_from timestamptz default now(),
  valid_to timestamptz,
  active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists deal_poi_idx on arnfa.deal (poi_id) where active;

alter table arnfa.deal enable row level security;
drop policy if exists deal_read_active on arnfa.deal;
create policy deal_read_active on arnfa.deal
  for select to anon, authenticated
  using (
    active = true
    and (valid_from is null or valid_from <= now())
    and (valid_to is null or valid_to > now())
  );

-- 2) Merchant interest intake — anyone may submit, no one may read back (write-only).
create table if not exists arnfa.merchant_lead (
  id uuid primary key default gen_random_uuid(),
  place_name text not null,
  contact text not null,
  note text,
  created_at timestamptz default now()
);
alter table arnfa.merchant_lead enable row level security;
drop policy if exists merchant_lead_insert on arnfa.merchant_lead;
create policy merchant_lead_insert on arnfa.merchant_lead
  for insert to anon, authenticated with check (true);

grant usage on schema arnfa to anon, authenticated;
grant select on arnfa.deal to anon, authenticated;
grant insert on arnfa.merchant_lead to anon, authenticated;
