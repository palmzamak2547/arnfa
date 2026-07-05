-- arnfa_0006_budget.sql
-- Create a table for trip expenses (Budget & Splitting) linked to a shared link ID.

create table if not exists arnfa.expense (
  id uuid primary key default gen_random_uuid(),
  shared_link_id text not null references arnfa.shared_link(id) on delete cascade,
  title text not null,
  amount numeric(10, 2) not null check (amount > 0),
  payer_name text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table arnfa.expense enable row level security;

-- Public read access for expenses belonging to a shared link
create policy expense_public_read on arnfa.expense for select using (true);

-- Public insert access
create policy expense_public_insert on arnfa.expense for insert with check (true);

-- Public delete access (optional, if we want to allow deleting)
create policy expense_public_delete on arnfa.expense for delete using (true);

-- Grants
grant select, insert, delete on arnfa.expense to anon, authenticated;
