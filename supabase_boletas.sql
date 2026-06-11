create table if not exists public.boletas (
    id text primary key,
    serie text not null,
    correlative text not null,
    document_format text not null,
    doc_type text not null default 'Boleta',
    issue_date timestamptz not null default now(),
    seller text,
    client_name text,
    payment_method text,
    subtotal numeric(12,2) not null default 0,
    igv numeric(12,2) not null default 0,
    total numeric(12,2) not null default 0,
    status text not null default 'emitido',
    boleta_data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.boletas enable row level security;

drop policy if exists "Allow anon select boletas" on public.boletas;
drop policy if exists "Allow anon insert boletas" on public.boletas;
drop policy if exists "Allow anon update boletas" on public.boletas;
drop policy if exists "Allow anon delete boletas" on public.boletas;

create policy "Allow anon select boletas"
    on public.boletas
    for select
    to anon
    using (true);

create policy "Allow anon insert boletas"
    on public.boletas
    for insert
    to anon
    with check (true);

create policy "Allow anon update boletas"
    on public.boletas
    for update
    to anon
    using (true)
    with check (true);

create policy "Allow anon delete boletas"
    on public.boletas
    for delete
    to anon
    using (true);

create or replace function public.set_boletas_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_set_boletas_updated_at on public.boletas;

create trigger trg_set_boletas_updated_at
before update on public.boletas
for each row
execute function public.set_boletas_updated_at();