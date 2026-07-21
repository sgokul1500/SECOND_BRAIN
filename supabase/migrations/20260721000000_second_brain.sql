create extension if not exists vector with schema extensions;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('note','link','file','pdf')) not null,
  title text,
  raw_content text,
  source_url text,
  file_path text,
  para_category text check (para_category in ('project','area','resource','archive')),
  para_reasoning text,
  tags text[] default '{}',
  summary text,
  embedding extensions.vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.items(id) on delete cascade not null,
  target_id uuid references public.items(id) on delete cascade not null,
  similarity double precision,
  relation_reasoning text,
  created_at timestamptz default now(),
  unique(source_id, target_id),
  check (source_id <> target_id)
);

create index if not exists items_embedding_idx
on public.items
using ivfflat (embedding extensions.vector_cosine_ops)
with (lists = 100);

create index if not exists items_user_created_idx
on public.items(user_id, created_at desc);

create index if not exists links_source_idx
on public.links(source_id);

create index if not exists links_target_idx
on public.links(target_id);

alter table public.items enable row level security;
alter table public.links enable row level security;

create policy "Users manage own items"
on public.items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users view own links"
on public.links
for select
using (
  exists (
    select 1
    from public.items i
    where i.id = links.source_id
      and i.user_id = auth.uid()
  )
);

create policy "Users create own links"
on public.links
for insert
with check (
  exists (
    select 1
    from public.items i
    where i.id = links.source_id
      and i.user_id = auth.uid()
  )
);

create policy "Users delete own links"
on public.links
for delete
using (
  exists (
    select 1
    from public.items i
    where i.id = links.source_id
      and i.user_id = auth.uid()
  )
);

create or replace function public.match_items(
    query_embedding extensions.vector(1536),
    match_user_id uuid,
    match_threshold float,
    match_count int
)
returns table (
    id uuid,
    title text,
    raw_content text,
    summary text,
    tags text[],
    para_category text,
    similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
    select
        i.id,
        i.title,
        i.raw_content,
        i.summary,
        i.tags,
        i.para_category,
        (1 - (i.embedding OPERATOR(extensions.<=>) query_embedding))::float as similarity
    from public.items i
    where i.user_id = match_user_id
      and i.embedding is not null
      and (1 - (i.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
    order by i.embedding OPERATOR(extensions.<=>) query_embedding
    limit match_count;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists items_updated_at on public.items;

create trigger items_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

create policy "Users upload own files"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users read own files"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
);
