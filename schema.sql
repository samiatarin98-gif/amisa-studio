-- Amisa Studio database setup. Run this in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price text not null default '',
  description text not null default '',
  image_url text not null default '',
  affiliate_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.products enable row level security;

drop policy if exists "Admins can view admin list" on public.admin_users;
create policy "Admins can view admin list" on public.admin_users
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products" on public.products
for select to anon, authenticated using (true);

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products" on public.products
for insert to authenticated with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products" on public.products
for update to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products
for delete to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'product-images' and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images" on storage.objects
for update to authenticated using (
  bucket_id = 'product-images' and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
) with check (
  bucket_id = 'product-images' and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
for delete to authenticated using (
  bucket_id = 'product-images' and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

-- AFTER creating your own user in Supabase Authentication > Users,
-- copy that user's UUID and run this separately:
-- insert into public.admin_users (user_id) values ('PASTE-YOUR-AUTH-USER-UUID-HERE');
