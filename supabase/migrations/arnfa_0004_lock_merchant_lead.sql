-- P0: merchant_lead was anon-INSERTable with check=true (unlimited spam). Route writes through a
-- validating SECURITY DEFINER fn and revoke direct anon/authenticated INSERT.
-- (Applied to the dedicated arnfa project qzrqszfxvzizlynknoxo via MCP; tracked here.)
revoke insert on arnfa.merchant_lead from anon, authenticated;
drop policy if exists merchant_lead_insert on arnfa.merchant_lead;

create or replace function arnfa.submit_lead(p_place text, p_contact text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = arnfa, public, pg_temp
as $$
declare
  v_place   text := btrim(coalesce(p_place, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
  v_recent  int;
begin
  if length(v_place) < 1 or length(v_place) > 120 then return false; end if;
  if length(v_contact) < 3 or length(v_contact) > 160 then return false; end if;
  if v_note is not null and length(v_note) > 1000 then v_note := left(v_note, 1000); end if;
  -- dedupe the same contact within 10 min (soft anti-spam); report success without storing a dup
  if exists (select 1 from arnfa.merchant_lead where contact = v_contact and created_at > now() - interval '10 minutes') then
    return true;
  end if;
  -- crude global DoS backstop for direct-RPC abuse (per-IP limit lives in /api/lead)
  select count(*) into v_recent from arnfa.merchant_lead where created_at > now() - interval '1 minute';
  if v_recent >= 20 then return false; end if;
  insert into arnfa.merchant_lead (place_name, contact, note) values (v_place, v_contact, v_note);
  return true;
end;
$$;

revoke all on function arnfa.submit_lead(text, text, text) from public;
grant execute on function arnfa.submit_lead(text, text, text) to anon, authenticated;
