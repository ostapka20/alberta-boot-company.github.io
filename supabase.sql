-- Run this entire file in Supabase Dashboard -> SQL Editor.
create table if not exists public.production_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  record_type text not null check (record_type in ('leather_added','scrap','production')),
  leather_type text,
  sqft numeric(12,2),
  pairs integer,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint leather_fields check (
    (record_type = 'production' and pairs is not null and pairs >= 0 and leather_type is null and sqft is null)
    or
    (record_type in ('leather_added','scrap') and leather_type is not null and length(trim(leather_type)) > 0 and sqft is not null and sqft >= 0 and pairs is null)
  )
);

create index if not exists production_records_date_idx on public.production_records(date);
create index if not exists production_records_type_idx on public.production_records(record_type);
create index if not exists production_records_leather_idx on public.production_records(leather_type);

alter table public.production_records enable row level security;

drop policy if exists "Authenticated users can read records" on public.production_records;
create policy "Authenticated users can read records"
on public.production_records for select to authenticated using (true);

drop policy if exists "Authenticated users can insert records" on public.production_records;
create policy "Authenticated users can insert records"
on public.production_records for insert to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Authenticated users can update records" on public.production_records;
create policy "Authenticated users can update records"
on public.production_records for update to authenticated
using (true)
with check (auth.uid() = created_by);

drop policy if exists "Authenticated users can delete records" on public.production_records;
create policy "Authenticated users can delete records"
on public.production_records for delete to authenticated using (true);

-- Optional: prevent accidental anonymous access explicitly.
revoke all on public.production_records from anon;
grant select, insert, update, delete on public.production_records to authenticated;
