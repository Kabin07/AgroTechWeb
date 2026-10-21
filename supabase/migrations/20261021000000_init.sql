-- AgroTech marketplace schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)
--
-- Design:
--   * profiles             – one row per auth user (name, role, language, location)
--   * profile_contacts     – phone numbers, private; shared only with order counterparties
--   * crop_listings        – crops farmers offer for sale
--   * buyer_requests       – crops buyers want
--   * orders               – deals between a farmer and a buyer (created only via RPC)
--   * transport_jobs       – delivery jobs taken by transporters
--   * market_prices        – daily mandi prices (Agmarknet), written by the Edge Function
-- Multi-row changes (placing an order, accepting, delivering) go through
-- SECURITY DEFINER functions so they are atomic and cannot be bypassed.

-- gen_random_uuid() is built into Postgres 13+ (Supabase runs 15+), so no extension is needed.

-- ─────────────────────────────── Types ───────────────────────────────
create type public.user_role as enum ('farmer', 'buyer', 'transporter');
create type public.listing_status as enum ('available', 'sold', 'withdrawn');
create type public.request_status as enum ('open', 'accepted', 'closed');
create type public.order_status as enum ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled');
create type public.transport_status as enum ('requested', 'assigned', 'in_transit', 'delivered', 'cancelled');

-- ─────────────────────────────── Helpers ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─────────────────────────────── Profiles ────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'farmer',
  preferred_language text not null default 'en',
  state text,
  district text,
  village text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_contacts (
  id uuid primary key references public.profiles (id) on delete cascade,
  phone text
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := meta ->> 'role';
begin
  insert into public.profiles (id, full_name, role, preferred_language, state, district, village)
  values (
    new.id,
    coalesce(meta ->> 'full_name', ''),
    case when r in ('farmer', 'buyer', 'transporter') then r::public.user_role else 'farmer' end,
    coalesce(meta ->> 'preferred_language', 'en'),
    meta ->> 'state',
    meta ->> 'district',
    meta ->> 'village'
  )
  on conflict (id) do nothing;

  insert into public.profile_contacts (id, phone)
  values (new.id, coalesce(new.phone, meta ->> 'phone'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────── Marketplace ─────────────────────────
create table public.crop_listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  crop text not null,
  variety text,
  quality_grade text not null default 'B' check (quality_grade in ('A', 'B', 'C')),
  quantity_kg numeric(12, 2) not null check (quantity_kg >= 0),
  price_per_kg numeric(10, 2) not null check (price_per_kg > 0),
  location text,
  state text,
  district text,
  notes text,
  status public.listing_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index crop_listings_status_idx on public.crop_listings (status, created_at desc);
create index crop_listings_farmer_idx on public.crop_listings (farmer_id);
create trigger crop_listings_updated_at before update on public.crop_listings
  for each row execute function public.set_updated_at();

create table public.buyer_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  crop text not null,
  quantity_kg numeric(12, 2) not null check (quantity_kg > 0),
  target_price_per_kg numeric(10, 2) check (target_price_per_kg is null or target_price_per_kg > 0),
  location text,
  state text,
  district text,
  status public.request_status not null default 'open',
  accepted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index buyer_requests_status_idx on public.buyer_requests (status, created_at desc);
create trigger buyer_requests_updated_at before update on public.buyer_requests
  for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.crop_listings (id) on delete set null,
  request_id uuid references public.buyer_requests (id) on delete set null,
  farmer_id uuid not null references public.profiles (id),
  buyer_id uuid not null references public.profiles (id),
  crop text not null,
  quantity_kg numeric(12, 2) not null check (quantity_kg > 0),
  price_per_kg numeric(10, 2) not null check (price_per_kg >= 0),
  total_amount numeric(14, 2) generated always as (quantity_kg * price_per_kg) stored,
  pickup_location text,
  drop_location text,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_farmer_idx on public.orders (farmer_id, created_at desc);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.transport_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles (id),
  transporter_id uuid references public.profiles (id),
  crop text not null,
  quantity_kg numeric(12, 2),
  from_location text not null,
  to_location text not null,
  vehicle_type text not null default 'truck' check (vehicle_type in ('pickup', 'mini_truck', 'truck')),
  distance_km numeric(8, 1),
  estimated_cost numeric(12, 2),
  status public.transport_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transport_jobs_status_idx on public.transport_jobs (status, created_at desc);
create index transport_jobs_order_idx on public.transport_jobs (order_id);
create index transport_jobs_transporter_idx on public.transport_jobs (transporter_id);
create trigger transport_jobs_updated_at before update on public.transport_jobs
  for each row execute function public.set_updated_at();

-- ─────────────────────────────── Market prices ───────────────────────
create table public.market_prices (
  id bigint generated always as identity primary key,
  commodity text not null,
  variety text not null default '',
  grade text not null default '',
  state text not null,
  district text not null default '',
  market text not null,
  arrival_date date not null,
  min_price numeric(12, 2),
  max_price numeric(12, 2),
  modal_price numeric(12, 2) not null, -- ₹ per quintal
  source text not null default 'agmarknet',
  fetched_at timestamptz not null default now(),
  unique (commodity, variety, grade, state, district, market, arrival_date)
);
create index market_prices_commodity_date_idx on public.market_prices (commodity, arrival_date desc);
create index market_prices_commodity_state_date_idx on public.market_prices (commodity, state, arrival_date desc);

create table public.price_fetch_log (
  commodity text not null,
  state text not null default '',
  fetched_at timestamptz not null default now(),
  record_count integer not null default 0,
  last_error text,
  primary key (commodity, state)
);

create view public.market_price_daily with (security_invoker = true) as
  select commodity, state, arrival_date,
         round(avg(modal_price), 2) as modal_price,
         min(min_price) as min_price,
         max(max_price) as max_price,
         count(*) as markets
  from public.market_prices
  group by commodity, state, arrival_date;

create view public.market_price_daily_national with (security_invoker = true) as
  select commodity, arrival_date,
         round(avg(modal_price), 2) as modal_price,
         min(min_price) as min_price,
         max(max_price) as max_price,
         count(*) as markets
  from public.market_prices
  group by commodity, arrival_date;

-- ─────────────────────────────── Assistant usage (rate limit) ────────
create table public.assistant_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  requests integer not null default 0,
  primary key (user_id, day)
);

create or replace function public.increment_assistant_usage(p_user_id uuid)
returns integer language sql security definer set search_path = public as $$
  insert into public.assistant_usage (user_id, day, requests)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day) do update set requests = assistant_usage.requests + 1
  returning requests;
$$;
revoke all on function public.increment_assistant_usage(uuid) from public, anon, authenticated;

-- ─────────────────────────────── Row Level Security ──────────────────
alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.crop_listings enable row level security;
alter table public.buyer_requests enable row level security;
alter table public.orders enable row level security;
alter table public.transport_jobs enable row level security;
alter table public.market_prices enable row level security;
alter table public.price_fetch_log enable row level security;
alter table public.assistant_usage enable row level security;

-- Helper used by policies (security definer avoids recursive RLS checks).
create or replace function public.is_order_party(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id and auth.uid() in (o.farmer_id, o.buyer_id)
  ) or exists (
    select 1 from public.transport_jobs j
    where j.order_id = p_order_id and j.transporter_id = auth.uid()
  );
$$;

create or replace function public.current_role_is(p_role public.user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = p_role);
$$;

-- profiles: names/roles are visible to signed-in users; only you can edit yours.
create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "profiles self insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles self update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- contacts: only your own row (others get it via get_order_contacts()).
create policy "contacts self read" on public.profile_contacts
  for select to authenticated using (id = auth.uid());
create policy "contacts self insert" on public.profile_contacts
  for insert to authenticated with check (id = auth.uid());
create policy "contacts self update" on public.profile_contacts
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- listings
create policy "listings readable" on public.crop_listings
  for select to authenticated using (status = 'available' or farmer_id = auth.uid());
create policy "listings farmer insert" on public.crop_listings
  for insert to authenticated with check (farmer_id = auth.uid() and status = 'available');
create policy "listings farmer update" on public.crop_listings
  for update to authenticated using (farmer_id = auth.uid()) with check (farmer_id = auth.uid());
create policy "listings farmer delete" on public.crop_listings
  for delete to authenticated using (farmer_id = auth.uid());

-- buyer requests
create policy "requests readable" on public.buyer_requests
  for select to authenticated using (status = 'open' or buyer_id = auth.uid() or accepted_by = auth.uid());
create policy "requests buyer insert" on public.buyer_requests
  for insert to authenticated with check (buyer_id = auth.uid() and status = 'open' and accepted_by is null);
create policy "requests buyer update" on public.buyer_requests
  for update to authenticated using (buyer_id = auth.uid() and status = 'open')
  with check (buyer_id = auth.uid() and accepted_by is null);

-- orders: read-only for the parties; all writes go through functions below.
create policy "orders readable by parties" on public.orders
  for select to authenticated using (auth.uid() in (farmer_id, buyer_id) or public.is_order_party(id));

-- transport jobs
create policy "jobs readable" on public.transport_jobs
  for select to authenticated using (
    created_by = auth.uid()
    or transporter_id = auth.uid()
    or (order_id is not null and public.is_order_party(order_id))
    or (status = 'requested' and public.current_role_is('transporter'))
  );
create policy "jobs insert own" on public.transport_jobs
  for insert to authenticated with check (
    created_by = auth.uid() and status = 'requested' and transporter_id is null
    and (order_id is null or public.is_order_party(order_id))
  );

-- market prices are public information
create policy "prices readable" on public.market_prices for select to anon, authenticated using (true);
-- price_fetch_log and assistant_usage: no policies → only the service role (Edge Functions) can access.

-- ─────────────────────────────── Business functions (RPC) ────────────
-- Errors are raised with short codes that the app translates (see src/services/backend/errors.js).

create or replace function public.place_order(p_listing_id uuid, p_quantity_kg numeric, p_drop_location text default null)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  l public.crop_listings;
  o public.orders;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  if p_quantity_kg is null or p_quantity_kg <= 0 then raise exception 'invalid_input'; end if;

  select * into l from public.crop_listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;
  if l.status <> 'available' then raise exception 'invalid_state'; end if;
  if l.farmer_id = auth.uid() then raise exception 'own_listing'; end if;
  if p_quantity_kg > l.quantity_kg then raise exception 'not_enough_quantity'; end if;

  insert into public.orders (listing_id, farmer_id, buyer_id, crop, quantity_kg, price_per_kg, pickup_location, drop_location, status)
  values (l.id, l.farmer_id, auth.uid(), l.crop, p_quantity_kg, l.price_per_kg, l.location, p_drop_location, 'pending')
  returning * into o;

  update public.crop_listings
     set quantity_kg = quantity_kg - p_quantity_kg,
         status = case when quantity_kg - p_quantity_kg <= 0 then 'sold'::public.listing_status else status end
   where id = l.id;
  return o;
end $$;

create or replace function public.respond_to_order(p_order_id uuid, p_accept boolean)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'not_found'; end if;
  if o.farmer_id <> auth.uid() then raise exception 'not_allowed'; end if;
  if o.status <> 'pending' then raise exception 'invalid_state'; end if;

  if p_accept then
    update public.orders set status = 'accepted' where id = o.id returning * into o;
    insert into public.transport_jobs (order_id, created_by, crop, quantity_kg, from_location, to_location)
    values (o.id, o.farmer_id, o.crop, o.quantity_kg, coalesce(o.pickup_location, '—'), coalesce(o.drop_location, '—'));
  else
    update public.orders set status = 'cancelled' where id = o.id returning * into o;
    update public.crop_listings
       set quantity_kg = quantity_kg + o.quantity_kg,
           status = case when status = 'sold' then 'available'::public.listing_status else status end
     where id = o.listing_id;
  end if;
  return o;
end $$;

create or replace function public.accept_buyer_request(p_request_id uuid, p_price_per_kg numeric, p_pickup_location text default null)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  r public.buyer_requests;
  o public.orders;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  if p_price_per_kg is null or p_price_per_kg <= 0 then raise exception 'invalid_input'; end if;

  select * into r from public.buyer_requests where id = p_request_id for update;
  if not found then raise exception 'not_found'; end if;
  if r.status <> 'open' then raise exception 'invalid_state'; end if;
  if r.buyer_id = auth.uid() then raise exception 'own_listing'; end if;

  insert into public.orders (request_id, farmer_id, buyer_id, crop, quantity_kg, price_per_kg, pickup_location, drop_location, status)
  values (r.id, auth.uid(), r.buyer_id, r.crop, r.quantity_kg, p_price_per_kg, p_pickup_location, r.location, 'accepted')
  returning * into o;

  update public.buyer_requests set status = 'accepted', accepted_by = auth.uid() where id = r.id;

  insert into public.transport_jobs (order_id, created_by, crop, quantity_kg, from_location, to_location)
  values (o.id, auth.uid(), o.crop, o.quantity_kg, coalesce(p_pickup_location, '—'), coalesce(r.location, '—'));
  return o;
end $$;

create or replace function public.claim_transport_job(p_job_id uuid)
returns public.transport_jobs language plpgsql security definer set search_path = public as $$
declare
  j public.transport_jobs;
begin
  if not public.current_role_is('transporter') then raise exception 'not_allowed'; end if;
  select * into j from public.transport_jobs where id = p_job_id for update;
  if not found then raise exception 'not_found'; end if;
  if j.status <> 'requested' then raise exception 'invalid_state'; end if;
  update public.transport_jobs set status = 'assigned', transporter_id = auth.uid() where id = j.id returning * into j;
  return j;
end $$;

-- assigned → in_transit → delivered; keeps the linked order in sync.
create or replace function public.advance_transport_job(p_job_id uuid)
returns public.transport_jobs language plpgsql security definer set search_path = public as $$
declare
  j public.transport_jobs;
  next_status public.transport_status;
begin
  select * into j from public.transport_jobs where id = p_job_id for update;
  if not found then raise exception 'not_found'; end if;
  if j.transporter_id is distinct from auth.uid() then raise exception 'not_allowed'; end if;
  next_status := case j.status when 'assigned' then 'in_transit' when 'in_transit' then 'delivered' end;
  if next_status is null then raise exception 'invalid_state'; end if;

  update public.transport_jobs set status = next_status where id = j.id returning * into j;
  if j.order_id is not null then
    update public.orders set status = next_status::text::public.order_status
     where id = j.order_id and status <> 'cancelled';
  end if;
  return j;
end $$;

create or replace function public.cancel_transport_job(p_job_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.transport_jobs set status = 'cancelled'
   where id = p_job_id and created_by = auth.uid() and status = 'requested';
  if not found then raise exception 'invalid_state'; end if;
end $$;

-- Phone numbers of the other people in an order (farmer, buyer, transporter).
create or replace function public.get_order_contacts(p_order_id uuid)
returns table (id uuid, full_name text, role public.user_role, phone text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_order_party(p_order_id) then raise exception 'not_allowed'; end if;
  return query
    select distinct p.id, p.full_name, p.role, c.phone
      from public.orders o
      left join public.transport_jobs j on j.order_id = o.id
      join public.profiles p on p.id in (o.farmer_id, o.buyer_id, j.transporter_id)
      left join public.profile_contacts c on c.id = p.id
     where o.id = p_order_id and p.id <> auth.uid();
end $$;

revoke all on function public.place_order(uuid, numeric, text) from public, anon;
revoke all on function public.respond_to_order(uuid, boolean) from public, anon;
revoke all on function public.accept_buyer_request(uuid, numeric, text) from public, anon;
revoke all on function public.claim_transport_job(uuid) from public, anon;
revoke all on function public.advance_transport_job(uuid) from public, anon;
revoke all on function public.cancel_transport_job(uuid) from public, anon;
revoke all on function public.get_order_contacts(uuid) from public, anon;
grant execute on function public.place_order(uuid, numeric, text) to authenticated;
grant execute on function public.respond_to_order(uuid, boolean) to authenticated;
grant execute on function public.accept_buyer_request(uuid, numeric, text) to authenticated;
grant execute on function public.claim_transport_job(uuid) to authenticated;
grant execute on function public.advance_transport_job(uuid) to authenticated;
grant execute on function public.cancel_transport_job(uuid) to authenticated;
grant execute on function public.get_order_contacts(uuid) to authenticated;

-- ─────────────────────────────── Realtime ────────────────────────────
-- Clients receive live inserts/updates (still filtered by the RLS policies above).
alter publication supabase_realtime add table public.crop_listings, public.buyer_requests, public.orders, public.transport_jobs;
