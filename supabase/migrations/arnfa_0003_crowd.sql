-- arnfa_0003_crowd — the feedback flywheel made REAL (the moat).
--
-- The BDI field notes say it outright: "มีน้อยดีกว่าไม่มี — ถ้าไม่เริ่มใช้ มันก็ไม่มีวันพัฒนา."
-- So we START from imperfect OSM-heuristic profiles and ship the loop that refines
-- them with real visits. poi_weather_profile can't hold these (its poi_id FKs the
-- empty arnfa.poi catalog), so this is a dedicated, FK-free PUBLIC aggregate.
--
-- Design: raw events stay PRIVATE in arnfa.feedback (anti-gaming, already RLS'd).
-- The public per-POI counter (arnfa.poi_crowd) is written ONLY by the SECURITY
-- DEFINER fn below, and updates the instant a visitor votes — so the read-back
-- (and the "learning from N visits" chip) reflects feedback immediately.

create table if not exists arnfa.poi_crowd (
  poi_id     text primary key,          -- OSM id "osm-<n>", matches the seed POIs
  n          int  not null default 0,   -- total weather verdicts
  ok         int  not null default 0,   -- "โอเคตอนนี้" 👍
  bad        int  not null default 0,   -- "ไม่โอเค" 👎
  rain_ok    int  not null default 0,   -- 👍 given while it was raining
  rain_bad   int  not null default 0,   -- 👎 given while it was raining
  updated_at timestamptz not null default now()
);

alter table arnfa.poi_crowd enable row level security;
-- Public read (it's the crowd-refined catalog signal). No write policy — only the
-- SECURITY DEFINER fn (table owner) writes, so a client can't forge counts directly.
create policy poi_crowd_public_read on arnfa.poi_crowd for select using (true);
grant select on arnfa.poi_crowd to anon, authenticated;

-- The single writer. Logs the raw event (private) AND bumps the public counter,
-- atomically. SECURITY DEFINER so anon can call it without direct write grants — it
-- only does what anon could already do (insert feedback) plus maintain the aggregate.
create or replace function arnfa.record_feedback(
  p_poi_id  text,
  p_kind    text,
  p_in_rain boolean default false,
  p_context jsonb   default null
) returns void
language plpgsql
security definer
set search_path = arnfa, public
as $$
begin
  if p_poi_id is null or length(p_poi_id) = 0 then return; end if;
  if p_kind not in ('weather_ok','weather_bad','accept_swap','dismiss') then
    raise exception 'invalid feedback kind: %', p_kind;
  end if;

  insert into arnfa.feedback (poi_id, kind, context)
  values (p_poi_id, p_kind, p_context);

  if p_kind in ('weather_ok','weather_bad') then
    insert into arnfa.poi_crowd (poi_id, n, ok, bad, rain_ok, rain_bad, updated_at)
    values (
      p_poi_id, 1,
      (p_kind = 'weather_ok')::int,
      (p_kind = 'weather_bad')::int,
      (p_kind = 'weather_ok' and p_in_rain)::int,
      (p_kind = 'weather_bad' and p_in_rain)::int,
      now()
    )
    on conflict (poi_id) do update set
      n        = arnfa.poi_crowd.n   + 1,
      ok       = arnfa.poi_crowd.ok  + (p_kind = 'weather_ok')::int,
      bad      = arnfa.poi_crowd.bad + (p_kind = 'weather_bad')::int,
      rain_ok  = arnfa.poi_crowd.rain_ok  + (p_kind = 'weather_ok'  and p_in_rain)::int,
      rain_bad = arnfa.poi_crowd.rain_bad + (p_kind = 'weather_bad' and p_in_rain)::int,
      updated_at = now();
  end if;
end;
$$;

grant execute on function arnfa.record_feedback(text, text, boolean, jsonb) to anon, authenticated;
